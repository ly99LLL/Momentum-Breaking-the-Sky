/**
 * render/raymarch-renderer.js — WebGPU Raymarch 全屏渲染器
 *
 * 职责：
 *   - 创建全屏 Quad + 渲染管线 (使用 chaos-sdf.wgsl)
 *   - 每帧更新 Uniform Buffer (时间/分辨率/鼠标/相机)
 *   - 鼠标 orbit 相机控制
 *
 * 输入：GPUDevice, GPUCanvasContext, 鼠标状态
 * 输出：每帧渲染 SDF 混沌场景到 canvas
 *
 * 后续扩展：
 *   - P2: 鼠标坐标 → 身体关键点 (接口一致，只改数据来源)
 *   - P3: uniform 中加入 tearPath 数据
 *   - P4: uniform 中加入 brushTrails 数据
 */

import chaosShaderWGSL from './shaders/chaos-sdf.wgsl?raw';

// === 模块内状态 ===
let device = null;
let context = null;
let format = null;
let pipeline = null;
let bindGroupLayout = null;
let uniformBuffer = null;   // 复用，每帧 writeBuffer
let bindGroup = null;       // 复用，buffer 内容变但 binding 不变

// === 默认 Uniform 值 ===
const DEFAULT_CAMERA_RADIUS = 4.0;
const DEFAULT_STEP_COUNT = 64;
const DEFAULT_NOISE_LAYERS = 3;
const DEFAULT_WARP_AMPLITUDE = 0.35;
const UNIFORM_BUFFER_SIZE = 256; // bytes

/**
 * 初始化 Raymarch 渲染器
 * 复用 webgpu-setup 已创建的 device + context
 *
 * @param {GPUDevice} gpuDevice
 * @param {GPUCanvasContext} gpuContext
 * @param {GPUTextureFormat} presentationFormat
 */
export async function initRaymarch(gpuDevice, gpuContext, presentationFormat) {
  device = gpuDevice;
  context = gpuContext;
  format = presentationFormat;

  // 编译着色器并检查错误
  const shaderModule = device.createShaderModule({
    code: chaosShaderWGSL,
    label: 'chaos-sdf-shader',
  });

  // 异步获取编译信息 (调试用)
  shaderModule.getCompilationInfo().then(info => {
    for (const msg of info.messages) {
      console.log(`[WGSL] ${msg.type}: ${msg.message} (line ${msg.lineNum}:${msg.linePos})`);
    }
    if (info.messages.length === 0) {
      console.log('[WGSL] Shader 编译通过，无警告');
    }
  });

  // Bind group layout
  bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  });

  // 管线布局
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // 渲染管线
  pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  // 创建可复用的 uniform buffer
  uniformBuffer = device.createBuffer({
    size: UNIFORM_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'chaos-uniforms',
  });

  // 创建可复用的 bind group
  bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
    ],
  });

  console.log('[Raymarch] 渲染管线创建完成 (chaos-sdf.wgsl)');
  console.log(`[Raymarch] 默认: ${DEFAULT_STEP_COUNT} steps, ${DEFAULT_NOISE_LAYERS} noise layers`);
}

/**
 * 每帧渲染 SDF 混沌场景
 *
 * @param {number} timestamp — 页面运行时间 (ms)
 * @param {{x: number, y: number}} mousePos — 归一化鼠标坐标 (0-1)
 * @param {number} scrollZoom — 累积缩放值 (-3..3 范围)
 */
export function drawRaymarch(timestamp, mousePos, scrollZoom) {
  if (!device || !context || !pipeline) return;

  const seconds = timestamp / 1000;
  const canvas = context.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // 相机半径 (鼠标滚轮缩放)
  const cameraRadius = clamp(DEFAULT_CAMERA_RADIUS + scrollZoom, 2.0, 8.0);

  // === Uniform Buffer (复用，只写不重建) ===
  // 布局与 chaos-sdf.wgsl Uniforms struct 对齐 (std140)
  const uniformData = new Float32Array(64);
  uniformData[0]  = seconds;                          // iTime.x
  uniformData[1]  = DEFAULT_STEP_COUNT;               // iTime.y
  uniformData[2]  = DEFAULT_NOISE_LAYERS;             // iTime.z
  uniformData[3]  = DEFAULT_WARP_AMPLITUDE;           // iTime.w
  uniformData[4]  = width;                            // iResolution.x
  uniformData[5]  = height;                           // iResolution.y
  uniformData[6]  = mousePos.x;                       // iMouse.x
  uniformData[7]  = mousePos.y;                       // iMouse.y
  uniformData[8]  = cameraRadius;                     // iCameraRadius
  uniformData[9]  = 0.0;                              // _pad0
  // [10], [11] = implicit 8-byte padding (vec3f → 16-byte align)
  uniformData[12] = 0.0;                              // iCameraTarget.x (offset 48)
  uniformData[13] = 0.0;                              // iCameraTarget.y (offset 52)
  uniformData[14] = 0.0;                              // iCameraTarget.z (offset 56)
  uniformData[15] = 0.0;                              // _pad1
  // [16..63] = 预留 (P3 tear / P4 brush / color LUT)

  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  // === 渲染通道 ===
  const textureView = context.getCurrentTexture().createView();
  const commandEncoder = device.createCommandEncoder({ label: 'raymarch-encoder' });
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.06, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, bindGroup);
  renderPass.draw(6); // 全屏 quad = 2个三角形 = 6 顶点
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
}

/**
 * 更新场景参数 (P2 预留接口)
 * 后续由 state-machine 调用，传入动态 phase/potential
 *
 * @param {object} params — 场景参数
 */
export function updateSceneParams(params) {
  // P2: 根据 phase/potential 调整 uniform 中的 collapseRadius, colorBase 等
  // P3: 更新 tearPath 数据到 uniform
  // P4: 更新 brushTrails 数据到 uniform
  console.log('[Raymarch] updateSceneParams called (P2 stub):', params);
}

/**
 * 查询 Raymarch 渲染器状态
 * @returns {{ ready: boolean }}
 */
export function getRaymarchStatus() {
  return {
    ready: !!(device && pipeline),
  };
}

// === 工具函数 ===
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

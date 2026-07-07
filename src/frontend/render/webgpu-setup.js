/**
 * render/webgpu-setup.js — WebGPU 设备初始化 + 彩色三角形渲染
 *
 * 职责：
 *   - 检测 WebGPU 支持 → 不支持则抛出错误
 *   - 请求 GPUAdapter + GPUDevice
 *   - 配置 canvas context + swap chain
 *   - 每帧渲染一个旋转彩色三角形（验证 WebGPU 工作正常）
 *
 * 输入：<canvas> 元素
 * 输出：绑定 GPUDevice 到 canvas
 */

// === 模块内状态 ===
let device = null;
let context = null;
let presentationFormat = null;
let pipeline = null;

/**
 * 初始化 WebGPU 设备并绑定到 canvas
 * @param {HTMLCanvasElement} canvas
 */
export async function initWebGPU(canvas) {
  if (!navigator.gpu) {
    throw new Error('WebGPU 不可用：navigator.gpu 为 null。请使用支持 WebGPU 的浏览器（Chrome 113+ / Edge 113+）');
  }

  // 请求 GPU 适配器
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) {
    throw new Error('无法获取 GPUAdapter。请检查显卡驱动是否最新');
  }

  // 请求 GPU 设备
  device = await adapter.requestDevice({
    requiredLimits: {
      maxTextureDimension2D: 8192,
    },
  });
  if (!device) {
    throw new Error('无法获取 GPUDevice');
  }

  // 配置 canvas
  context = canvas.getContext('webgpu');
  presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // 创建渲染管线
  await createPipeline();

  console.log(`[WebGPU] 适配器: ${adapter.info.vendor} | ${adapter.info.device}`);
  console.log(`[WebGPU] 格式: ${presentationFormat}`);
}

/**
 * 创建着色器模块和渲染管线（彩色三角形）
 */
async function createPipeline() {
  // WGSL 着色器：旋转彩色三角形
  const shaderCode = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec4f,
    };

    struct Uniforms {
      time: f32,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn vs(@builtin(vertex_index) idx: u32) -> VertexOutput {
      // 等边三角形顶点
      var pos = array<vec2f, 3>(
        vec2f(0.0, 0.6),
        vec2f(-0.52, -0.3),
        vec2f(0.52, -0.3)
      );

      // 旋转
      let angle = uniforms.time * 0.5;
      let cosA = cos(angle);
      let sinA = sin(angle);
      let p = pos[idx];
      let rotated = vec2f(
        p.x * cosA - p.y * sinA,
        p.x * sinA + p.y * cosA
      );

      var out: VertexOutput;
      out.position = vec4f(rotated, 0.0, 1.0);

      // 每个顶点不同颜色 → 自动插值产生渐变
      let colors = array<vec3f, 3>(
        vec3f(0.9, 0.2, 0.3),  // 红
        vec3f(0.2, 0.7, 0.3),  // 绿
        vec3f(0.2, 0.3, 0.9),  // 蓝
      );
      out.color = vec4f(colors[idx], 0.85);

      return out;
    }

    @fragment
    fn fs(in: VertexOutput) -> @location(0) vec4f {
      return in.color;
    }
  `;

  const shaderModule = device.createShaderModule({ code: shaderCode });

  // 管线配置
  pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [
        {
          format: presentationFormat,
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

  console.log('[WebGPU] 渲染管线创建完成 (旋转彩色三角形)');
}

/**
 * 每帧绘制三角形
 * @param {number} timestamp — 页面运行时间 (ms)
 */
export function drawTriangle(timestamp) {
  if (!device || !context || !pipeline) return;

  const seconds = timestamp / 1000;

  // Uniform buffer：时间
  const uniformData = new Float32Array([seconds]);
  const uniformBuffer = device.createBuffer({
    size: 16, // 对齐到 16 字节
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
    ],
  });

  // 获取当前纹理
  const textureView = context.getCurrentTexture().createView();

  // 渲染通道
  const commandEncoder = device.createCommandEncoder();
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
  renderPass.draw(3); // 3 个顶点
  renderPass.end();

  // 提交
  device.queue.submit([commandEncoder.finish()]);
}

/**
 * 查询 WebGPU 状态
 * @returns {{ ready: boolean, vendor: string }}
 */
export function getWebGPUStatus() {
  return {
    ready: !!device,
    vendor: device ? '见控制台 log' : 'N/A',
  };
}

/**
 * 获取 GPUDevice (供其他渲染模块复用)
 * @returns {GPUDevice|null}
 */
export function getDevice() {
  return device;
}

/**
 * 获取 GPUCanvasContext (供其他渲染模块复用)
 * @returns {GPUCanvasContext|null}
 */
export function getContext() {
  return context;
}

/**
 * 获取 presentationFormat (供其他渲染模块复用)
 * @returns {GPUTextureFormat|null}
 */
export function getFormat() {
  return presentationFormat;
}

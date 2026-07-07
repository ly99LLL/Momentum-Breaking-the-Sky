/**
 * app/main.js — 应用生命周期协调
 *
 * 初始化序列：
 *   1. WebGPU 设备 + 渲染三角形
 *   2. 摄像头访问
 *   3. MediaPipe 姿态检测
 *   4. 三者共存验证
 *
 * 每个模块独立初始化，失败不阻塞其他模块。
 */
import { initWebGPU, drawTriangle, getWebGPUStatus, getDevice, getContext, getFormat } from '../render/webgpu-setup.js';
import { initRaymarch, drawRaymarch, getRaymarchStatus } from '../render/raymarch-renderer.js';
import { initCamera, getCameraStatus } from '../input/camera-manager.js';
import { initMediaPipe, startPoseDetection, detectPose, getMediaPipeStatus } from '../input/mediapipe-runner.js';

// === DOM 引用 ===
const webgpuCanvas = document.getElementById('webgpu-canvas');
const skeletonCanvas = document.getElementById('skeleton-canvas');
const dotWebGPU = document.getElementById('dot-webgpu');
const dotCamera = document.getElementById('dot-camera');
const dotMediaPipe = document.getElementById('dot-mediapipe');
const fpsDisplay = document.getElementById('fps-display');

// === 状态 ===
const state = {
  webgpuReady: false,
  raymarchReady: false,
  cameraReady: false,
  mediapipeReady: false,
  frameCount: 0,
  fpsTimer: 0,
};

// === 鼠标追踪 (P2 起用身体数据替换此来源) ===
const mouse = {
  x: 0.5,   // 归一化 X (0-1)
  y: 0.5,   // 归一化 Y (0-1)
  zoom: 0,  // 累积缩放 (-3..3)
};

// === FPS 计算 ===
function updateFPS(timestamp) {
  state.frameCount++;
  if (timestamp - state.fpsTimer >= 1000) {
    const fps = Math.round(state.frameCount / ((timestamp - state.fpsTimer) / 1000));
    fpsDisplay.textContent = fps;
    state.frameCount = 0;
    state.fpsTimer = timestamp;
  }
}

// === 状态指示灯 ===
function setDot(el, status) {
  el.className = 'dot ' + status; // green, red, yellow
}

// === WebGPU 初始化 ===
async function bootWebGPU() {
  try {
    await initWebGPU(webgpuCanvas);
    state.webgpuReady = true;
    setDot(dotWebGPU, 'green');
    console.log('[P0] WebGPU ✅ 设备就绪');

    // P1: 初始化 Raymarch 渲染器
    try {
      await initRaymarch(getDevice(), getContext(), getFormat());
      state.raymarchReady = true;
      console.log('[P1] Raymarch ✅ 渲染器就绪');
    } catch (err) {
      console.warn('[P1] Raymarch 初始化失败，回退到三角形渲染', err);
      // raymarchReady 保持 false → 回退 drawTriangle
    }
  } catch (err) {
    setDot(dotWebGPU, 'red');
    console.error('[P0] WebGPU ❌', err);
  }
}

// === 摄像头初始化 ===
async function bootCamera() {
  try {
    const video = document.getElementById('input-video');
    await initCamera(video);
    state.cameraReady = true;
    setDot(dotCamera, 'green');
    console.log('[P0] Camera ✅ 摄像头就绪');
  } catch (err) {
    setDot(dotCamera, 'red');
    console.error('[P0] Camera ❌', err);
  }
}

// === MediaPipe 初始化 ===
async function bootMediaPipe() {
  try {
    const video = document.getElementById('input-video');
    await initMediaPipe(video, skeletonCanvas);
    state.mediapipeReady = true;
    setDot(dotMediaPipe, 'green');
    console.log('[P0] MediaPipe ✅ 姿态检测就绪');
  } catch (err) {
    setDot(dotMediaPipe, 'red');
    console.error('[P0] MediaPipe ❌', err);
  }
}

// === 渲染循环 ===
function renderLoop(timestamp) {
  updateFPS(timestamp);

  // P1: Raymarch 混沌场景 (优先) / P0: 三角形 (降级)
  if (state.raymarchReady) {
    drawRaymarch(timestamp, mouse, mouse.zoom);
  } else if (state.webgpuReady) {
    drawTriangle(timestamp);
  }

  // MediaPipe 姿态检测（每帧调用，内部帧率控制）
  if (state.mediapipeReady) {
    const video = document.getElementById('input-video');
    detectPose(video, timestamp);
  }

  requestAnimationFrame(renderLoop);
}

// === 启动序列 ===
async function main() {
  console.log('=== 势·破空 P1 混沌渲染验证 ===');
  console.log('[P1] 目标：SDF 混沌场景 + 鼠标 Orbit + WebGPU 三角形共存');

  // 鼠标追踪 (P2 起用身体数据替换)
  const container = document.getElementById('container');
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
    mouse.x = Math.max(0, Math.min(1, mouse.x));
    mouse.y = Math.max(0, Math.min(1, mouse.y));
  });
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    mouse.zoom -= e.deltaY * 0.001;
    mouse.zoom = Math.max(-3, Math.min(3, mouse.zoom));
  }, { passive: false });

  // 并行初始化 WebGPU + 摄像头
  await Promise.allSettled([
    bootWebGPU(),
    bootCamera(),
  ]);

  // MediaPipe 依赖摄像头就绪
  if (state.cameraReady) {
    await bootMediaPipe();
    if (state.mediapipeReady) {
      startPoseDetection();
    }
  }

  // 报告结果
  console.log('---');
  console.log(`WebGPU:    ${state.webgpuReady ? '✅' : '❌'}`);
  console.log(`Raymarch:  ${state.raymarchReady ? '✅' : '❌'}`);
  console.log(`Camera:    ${state.cameraReady ? '✅' : '❌'}`);
  console.log(`MediaPipe: ${state.mediapipeReady ? '✅' : '❌'}`);

  const allReady = state.webgpuReady && state.cameraReady && state.mediapipeReady;
  if (state.raymarchReady) {
    console.log('🎉 P1 混沌渲染就绪！移动鼠标 → Orbit，滚轮 → Zoom');
  } else if (allReady) {
    console.log('🎉 P0 三件套验证通过！(Raymarch 降级为三角形)');
  } else {
    console.warn('⚠️ 部分组件未就绪，检查上面 ❌ 项');
  }

  // 启动渲染循环
  requestAnimationFrame(renderLoop);
}

// 入口
main().catch(err => {
  console.error('[P0] 启动失败', err);
  setDot(dotWebGPU, 'red');
  setDot(dotCamera, 'red');
  setDot(dotMediaPipe, 'red');
});

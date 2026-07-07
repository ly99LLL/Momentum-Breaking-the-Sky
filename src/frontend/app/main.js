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
import { initWebGPU, drawTriangle, getWebGPUStatus } from '../render/webgpu-setup.js';
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
  cameraReady: false,
  mediapipeReady: false,
  frameCount: 0,
  fpsTimer: 0,
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

  // WebGPU 三角形动画
  if (state.webgpuReady) {
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
  console.log('=== 势·破空 P0 三件套验证 ===');
  console.log('[P0] 目标：WebGPU 三角形 + MediaPipe 骨骼点 = 同屏共存');

  // 并行初始化三个模块（互不依赖）
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
  console.log(`Camera:    ${state.cameraReady ? '✅' : '❌'}`);
  console.log(`MediaPipe: ${state.mediapipeReady ? '✅' : '❌'}`);

  const allReady = state.webgpuReady && state.cameraReady && state.mediapipeReady;
  if (allReady) {
    console.log('🎉 P0 三件套验证通过！');
  } else {
    console.warn('⚠️ P0 部分组件未就绪，检查上面 ❌ 项');
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

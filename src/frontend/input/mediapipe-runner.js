/**
 * input/mediapipe-runner.js — MediaPipe Pose 加载与推理
 *
 * 职责：
 *   - 加载 MediaPipe PoseLandmarker（WASM 模型，约 15MB）
 *   - 每 N 帧调用 detect() 进行姿态推理
 *   - 将 33 个关键点绘制到骨架 Canvas 上
 *
 * 输入：<video> 元素（摄像头流）
 * 输出：33 个 NormalizedLandmark → 骨架 Canvas
 */

import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// === 模块内状态 ===
let poseLandmarker = null;
let running = false;
let lastVideoTime = -1;
let frameSkip = 2;   // 每 2 帧推理一次（约 15fps），减轻负载
let frameCounter = 0;

// === Canvas 2D 上下文（骨架绘制） ===
let skeletonCtx = null;
let canvasWidth = 0;
let canvasHeight = 0;

// === 关键点连线（MediaPipe POSE_CONNECTIONS） ===
const CONNECTIONS = [
  // 身体躯干
  [11, 12], [11, 23], [12, 24], [23, 24],
  // 左臂
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // 右臂
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // 左腿
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // 右腿
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  // 面部
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
  [5, 7], [6, 8], [7, 9], [8, 10],
];

/**
 * 初始化 MediaPipe PoseLandmarker
 * @param {HTMLVideoElement} video — 摄像头 video 元素
 * @param {HTMLCanvasElement} canvas — 骨架绘制画布
 */
export async function initMediaPipe(video, canvas) {
  // 设置骨架 Canvas 尺寸
  canvasWidth = canvas.clientWidth;
  canvasHeight = canvas.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  skeletonCtx = canvas.getContext('2d');

  try {
    // 加载 WASM 文件（从 CDN）
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );

    // 创建 PoseLandmarker 实例
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU', // 使用 GPU 加速推理
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    console.log('[MediaPipe] PoseLandmarker 模型加载完成 (lite, GPU delegate)');
  } catch (err) {
    throw new Error(`MediaPipe 初始化失败: ${err.message}`);
  }
}

/**
 * 开始持续姿态检测（在 requestAnimationFrame 中调用）
 */
export function startPoseDetection() {
  if (!poseLandmarker) {
    console.warn('[MediaPipe] 尚未初始化，跳过检测');
    return;
  }
  running = true;
  console.log('[MediaPipe] 姿态检测已启动');
}

/**
 * 停止姿态检测
 */
export function stopPoseDetection() {
  running = false;
}

/**
 * 每帧调用：对当前视频帧进行姿态推理并绘制骨架
 * 由外部渲染循环驱动
 *
 * @param {HTMLVideoElement} video
 * @param {number} timestamp
 */
export function detectPose(video, timestamp) {
  if (!running || !poseLandmarker || !skeletonCtx) return;

  // 帧率控制：跳过部分帧
  frameCounter++;
  if (frameCounter % frameSkip !== 0) return;

  // 确保视频帧已更新
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;

  try {
    const results = poseLandmarker.detectForVideo(video, timestamp);

    // 清除上一帧
    skeletonCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      drawSkeleton(landmarks);
    }
  } catch (err) {
    // 推理失败时静默（可能是视频帧未就绪）
  }
}

/**
 * 绘制骨架到 Canvas 2D
 * @param {Array<{x: number, y: number, z: number}>} landmarks — 33 个归一化关键点
 */
function drawSkeleton(landmarks) {
  const ctx = skeletonCtx;
  const w = canvasWidth;
  const h = canvasHeight;

  // === 绘制连线 ===
  ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
  ctx.lineWidth = 1.5;

  for (const [i, j] of CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) continue;

    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }

  // === 绘制关键点 ===
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (!pt) continue;

    const x = pt.x * w;
    const y = pt.y * h;

    // 手腕（15=左, 16=右）高亮
    if (i === 15 || i === 16) {
      ctx.fillStyle = 'rgba(255, 200, 50, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // 肩肘（11-14）中号
    else if (i >= 11 && i <= 14) {
      ctx.fillStyle = 'rgba(150, 200, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 其他点小号
    else {
      ctx.fillStyle = 'rgba(180, 200, 220, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 查询 MediaPipe 状态
 * @returns {{ ready: boolean, running: boolean }}
 */
export function getMediaPipeStatus() {
  return {
    ready: !!poseLandmarker,
    running,
  };
}

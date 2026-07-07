/**
 * input/camera-manager.js — 摄像头访问与管理
 *
 * 职责：
 *   - 请求摄像头权限（1280×720, 30fps）
 *   - 输出 <video> 元素流（隐藏，用于 MediaPipe 输入）
 *   - 失败时给出用户可理解的提示
 *
 * 注意：摄像头数据仅用于实时推理，不存储、不传输、不留痕。
 */

/**
 * 初始化摄像头并将流绑定到 video 元素
 * @param {HTMLVideoElement} video — 隐藏的 video 元素
 * @returns {Promise<MediaStream>} 摄像头流
 */
export async function initCamera(video) {
  // 检查浏览器支持
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('浏览器不支持摄像头访问。请使用 Chrome 113+ 或 Edge 113+');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user', // 前置摄像头（笔记本）
      },
      audio: false,
    });

    video.srcObject = stream;
    video.playsInline = true;

    // 等待视频元数据加载完成
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
    });

    console.log(`[Camera] 分辨率: ${video.videoWidth}×${video.videoHeight}`);
    console.log(`[Camera] 帧率: ${stream.getVideoTracks()[0]?.getSettings().frameRate || 'auto'}`);

    return stream;
  } catch (err) {
    // 翻译常见错误为用户可理解的中文
    if (err.name === 'NotAllowedError') {
      throw new Error('摄像头权限被拒绝。请在浏览器设置中允许摄像头访问，然后刷新页面');
    }
    if (err.name === 'NotFoundError') {
      throw new Error('未检测到摄像头。请确认摄像头已连接且未被其他应用占用');
    }
    if (err.name === 'NotReadableError') {
      throw new Error('摄像头被其他应用占用。请关闭其他使用摄像头的程序后重试');
    }
    throw err;
  }
}

/**
 * 查询摄像头状态
 * @returns {{ ready: boolean }}
 */
export function getCameraStatus() {
  const video = document.getElementById('input-video');
  return {
    ready: !!(video && video.srcObject && video.videoWidth > 0),
  };
}

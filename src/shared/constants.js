/**
 * 势·破空 (SHI: Shattering the Void)
 * src/shared/constants.js — 全局常量定义
 *
 * 纪律：
 *   - 所有魔法数字必须在这里定义
 *   - 命名：全大写 + 下划线 (MAX_RETRY_COUNT, BAUD_RATE)
 *   - 按模块分组
 *   - 修改任何常量 = 更新本文件 + 同步相关模块
 *
 * @version 1.0.0
 * @date 2026-07-07
 */

// ═══════════════════════════════════════════════════════════
// 1. 应用级常量
// ═══════════════════════════════════════════════════════════

export const APP_NAME = '势·破空';
export const APP_NAME_EN = 'SHI: Shattering the Void';
export const APP_VERSION = '0.1.0';
export const APP_DATA_DIR = '势破空'; // %APPDATA% 下目录名
export const MAX_SINGLE_SESSION_DURATION = 300; // 单次体验最长 5 分钟（秒）

// ═══════════════════════════════════════════════════════════
// 2. 摄像头与输入常量
// ═══════════════════════════════════════════════════════════

export const CAMERA_WIDTH = 1280;
export const CAMERA_HEIGHT = 720;
export const CAMERA_FPS = 30;
export const CAMERA_FACING_MODE = 'user'; // 前置摄像头

// MediaPipe 关键点索引
export const KP = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

// 卡尔曼滤波参数
export const KALMAN_PROCESS_NOISE = 0.01;       // Q
export const KALMAN_MEASUREMENT_NOISE = 0.1;    // R
export const KALMAN_INITIAL_ERROR = 1.0;        // P₀
export const KALMAN_DT = 1 / CAMERA_FPS;        // 时间步长

// 置信度阈值
export const MIN_KEYPOINT_CONFIDENCE = 0.4;      // 最小关键点置信度
export const CONFIDENCE_PENALTY_FACTOR = 0.3;    // 低置信度时权重降为30%
export const WRIST_DEGRADE_FACTOR = 1.5;         // 手腕丢失时肘部速度乘数

// 卡尔曼滤波平滑 (手腕轨迹)
export const WRIST_SMOOTH_TAU = 0.15;            // 平滑时间常数 (秒)

// ═══════════════════════════════════════════════════════════
// 3. 手势检测阈值
// ═══════════════════════════════════════════════════════════

// 试探
export const PROBE_MAX_SPEED = 15;               // cm/s, 试探动作的速度上限

// 合拢
export const CLOSE_MIN_DURATION = 1000;           // ms, 合拢动作最短持续
export const SHOULDER_ELBOW_ANGLE_CLOSE = 30;    // 度, 合拢时肘部夹角上限

// 前倾
export const LEAN_FORWARD_MIN = 0.02;            // Z轴归一化变化最小值

// 撕裂阈值
export const TEAR_ANGLE_DELTA_MIN = 30;          // 度, 肩肘角突变最小值
export const TEAR_ANGLE_DELTA_WINDOW = 300;      // ms, 突变检测窗口
export const TEAR_WRIST_SPEED_VERTICAL = 50;     // cm/s, 纵斩腕速阈值
export const TEAR_Z_DELTA_MIN = 0.03;            // Z轴突变最小值 (推破)

// 顿 (速度骤降)
export const DUN_SPEED_BEFORE = 15;              // cm/s, 骤降前最小速度
export const DUN_SPEED_AFTER = 3;                // cm/s, 骤降后最大速度
export const DUN_WINDOW = 300;                   // ms, 骤降检测窗口
export const DUN_MIN_HOLD = 400;                 // ms, 停顿最短持续

// 挫 (方向突变)
export const CUO_ANGLE_MIN = 60;                 // 度, 方向变化最小角度
export const CUO_WINDOW = 300;                   // ms, 方向突变检测窗口

// 收锋
export const SHOUFENG_MAX_SPEED = 10;            // cm/s, 收锋速度上限
export const SHOUFENG_MIN_DURATION = 2000;       // ms, 收锋最短持续

// 静止
export const STILL_MAX_SPEED = 5;                // cm/s, 静止判定速度上限
export const STILL_MIN_DURATION = 3000;          // ms, 静止最短持续

// 分心
export const DISTRACT_HEAD_ANGLE = 25;           // 度, 头部偏转阈值
export const DISTRACT_MIN_DURATION = 3000;       // ms, 分心最短持续

// 呼吸检测
export const BREATH_FREQ_MIN = 0.1;              // Hz, 呼吸频率下限 (6次/分钟)
export const BREATH_FREQ_MAX = 0.5;              // Hz, 呼吸频率上限 (30次/分钟)
export const BREATH_SYNC_TOLERANCE = 0.03;       // Hz, 呼吸同步容许误差
export const BREATH_SYNC_MIN_DURATION = 8000;    // ms, 呼吸同步最短持续

// ═══════════════════════════════════════════════════════════
// 4. 势能模型常量
// ═══════════════════════════════════════════════════════════

export const POTENTIAL_WINDOW = 3.0;              // 秒, 势能累积窗口
export const POTENTIAL_THRESHOLD = 75;            // 触发撕裂的最低势能值 (0-100)
export const POTENTIAL_THRESHOLD_REDUCED = 60;    // 引导后降低的阈值
export const POTENTIAL_NEAR_THRESHOLD = 0.6;      // "接近阈值"的相对比例
export const POTENTIAL_CRITICAL = 0.85;           // "临界"的相对比例（意在笔先光痕亮度提升）

// 势能权重
export const POTENTIAL_WEIGHTS = {
  shoulderElbowAngle: 0.40,   // 肩肘角变化
  wristSpeed: 0.35,           // 手腕运动强度
  leanForward: 0.25,          // 身体前倾度
};

// 意图方向权重
export const INTENT_WEIGHTS = {
  shoulderElbow: 0.40,   // 肩肘张开方向
  wristTrend: 0.35,      // 手腕最近 0.5s 运动趋势
  lean: 0.25,            // 身体前倾方向
};
export const INTENT_TREND_WINDOW = 0.5;          // 秒, 手腕趋势分析窗口

// 呼吸同步势能加成
export const BREATH_SYNC_POTENTIAL_MULTIPLIER = 1.4;

// ═══════════════════════════════════════════════════════════
// 5. 状态机超时（毫秒）
// ═══════════════════════════════════════════════════════════

export const TIMEOUT_STARTUP = 3000;        // 启动序列
export const TIMEOUT_CAMERA_CHECK = 5000;   // 摄像头检查
export const TIMEOUT_READY = 2000;          // 就绪过渡
export const TIMEOUT_KUNJU_GUIDANCE = 120000; // 困局 → 隐性引导 (120s)
export const TIMEOUT_POKONG = 5000;         // 撕裂动画
export const TIMEOUT_SHUXIE = 40000;        // 书写阶段最长
export const TIMEOUT_SHOUFENG = 15000;      // 收锋最长
export const TIMEOUT_QINGMING = 30000;      // 清明欣赏最长
export const TIMEOUT_IMPRINT = 5000;        // 印记生成

// 隐性引导
export const GUIDANCE_DEMO_DURATION = 3000;   // 光斑演示时长 (ms)
export const GUIDANCE_SPEED_DEMO = 60000;     // 速度示范触发时间 (ms, 书写阶段)
export const GUIDANCE_SPEED_DEMO_DURATION = 3000; // 速度示范时长 (ms)

// ═══════════════════════════════════════════════════════════
// 6. 复笔常量
// ═══════════════════════════════════════════════════════════

export const MAX_TEAR_COUNT = 3;             // 最多撕裂次数
export const TEAR_COOLDOWN = 5000;           // 两次撕裂最小间隔 (ms)
export const RETEAR_REMAINING_RATIO = 0.40;  // 第二次蓄势时剩余撕裂比例
export const THIRD_TEAR_REMAINING_RATIO = 0.15; // 第三次蓄势时剩余撕裂比例

export const COMPOUND_LABELS = {
  1: '獨筆',
  2: '雙飛',
  3: '三疊',
};

// 复笔裂缝颜色
export const TEAR_COLORS = [
  { r: 0.831, g: 0.647, b: 0.455 },  // #D4A574 金色偏暖 (横撕)
  { r: 0.773, g: 0.722, b: 0.624 },  // #C5B89E 金色偏冷 (纵斩)
  { r: 0.910, g: 0.835, b: 0.690 },  // #E8D5B0 金色最亮 (推破)
];

// ═══════════════════════════════════════════════════════════
// 7. 渲染常量
// ═══════════════════════════════════════════════════════════

// 自适应渲染区域
export const RENDER_ZONES = {
  center: { radius: 0.3, steps: 64, warpingLayers: 3, scale: 1.0   },
  middle: { radius: 0.7, steps: 32, warpingLayers: 2, scale: 0.5   },
  edge:   { radius: 1.0, steps: 16, warpingLayers: 1, scale: 0.25  },
};
export const ZONE_BLUR_PX = 3; // 区域间高斯模糊半径 (px)

// GPU 温度自适应
export const GPU_TEMP_NORMAL = 78;   // °C, 正常上限
export const GPU_TEMP_WARN = 82;     // °C, 警告 → 降级
export const GPU_TEMP_CRITICAL = 88; // °C, 严重 → 强制降级
export const GPU_TEMP_EMERGENCY = 92; // °C, 紧急 → 最低质量
export const GPU_TEMP_CHECK_INTERVAL = 5000; // ms, 温度检查间隔

// 帧率目标
export const TARGET_FPS = 60;
export const TARGET_FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms
export const MIN_ACCEPTABLE_FPS = 30;

// 屏幕
export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;
export const SCREEN_ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;

// 暗角
export const VIGNETTE_STRENGTH = 0.08; // 暗角最大暗度 (0-1)

// 意在笔先光痕
export const INTENT_GLOW_BRIGHTNESS_LOW = 0.05;   // 势能>60%时亮度
export const INTENT_GLOW_BRIGHTNESS_HIGH = 0.12;  // 势能>85%时亮度
export const INTENT_GLOW_LENGTH_BASE = 30;        // px, 基础光痕长度
export const INTENT_GLOW_COLOR = { r: 0.545, g: 0.459, b: 0.333 }; // #8B7355 淡赭金

// ═══════════════════════════════════════════════════════════
// 8. 狂草笔触常量 (✨ v31新增)
// ═══════════════════════════════════════════════════════════

// 速度→飞白映射参数
export const BRUSH_MAX_SPEED = 80;          // cm/s, 归一化上限
export const BRUSH_BASE_WIDTH = 12;         // px, 笔触基础宽度
export const BRUSH_WIDTH_REDUCTION = 0.4;   // 高速时宽度缩减比例
export const BRUSH_MIN_WIDTH = BRUSH_BASE_WIDTH * (1 - BRUSH_WIDTH_REDUCTION); // px

// 顿的视觉效果
export const DUN_RADIUS_MULTIPLIER = 1.8;   // 顿处笔触半径倍率
export const DUN_PULSE_DURATION = 500;      // ms, 脉冲持续时间
export const DUN_GLOW_RADIUS_MIN = 5;       // px, 金光脉冲起始半径
export const DUN_GLOW_RADIUS_MAX = 30;      // px, 金光脉冲结束半径
export const DUN_GLOW_FADE = 1000;          // ms, 脉冲淡出时间

// 挫的粒子效果
export const CUO_PARTICLE_COUNT_MIN = 8;    // 最少飞散粒子
export const CUO_PARTICLE_COUNT_MAX = 15;   // 最多飞散粒子
export const CUO_PARTICLE_SPEED_MIN = 50;   // px/s, 粒子最低速度
export const CUO_PARTICLE_SPEED_MAX = 150;  // px/s, 粒子最高速度
export const CUO_PARTICLE_LIFE_MIN = 500;   // ms, 粒子最短寿命
export const CUO_PARTICLE_LIFE_MAX = 1500;  // ms, 粒子最长寿命

// 飞白粒子
export const FEIBAI_MAX_PARTICLES = 20;     // 每帧最多飞白粒子

// 书写轨迹
export const BRUSH_TRAIL_MAX_POINTS = 500;  // 每条轨迹最多保留的点数
export const BRUSH_TRAIL_MIN_SPEED = 3;     // cm/s, 低于此速度不生成新点

// 风格判定阈值
export const STYLE_THRESHOLDS = {
  dunCuoForNingSe: 5,    // 顿挫次数≥5 → 凝涩
  dunCuoForLiuChang: 2,  // 顿挫次数2-4 → 流畅
  // 其他情况 → 刚猛
};

// ═══════════════════════════════════════════════════════════
// 9. 色彩系统 (sRGB HEX)
// ═══════════════════════════════════════════════════════════

export const COLORS = {
  // 阶段色彩
  KUNJU_BG:    [0.039, 0.039, 0.059],  // #0A0A0F 深暗
  KUNJU_MID:   [0.102, 0.102, 0.180],  // #1A1A2E
  XUSHI_BG:    [0.102, 0.063, 0.031],  // #1A1008
  XUSHI_GOLD:  [0.545, 0.271, 0.000],  // #8B4500 暗金
  POKONG_CORE: [1.000, 1.000, 1.000],  // #FFFFFF 白光核心
  POKONG_QING: [0.910, 0.925, 0.937],  // #E8ECEF 清气
  POKONG_ZHUO: [0.176, 0.106, 0.102],  // #2D1B1A 浊气
  SHUXIE_GOLD: [0.831, 0.647, 0.455],  // #D4A574 金色轨迹
  SHUXIE_FEIBO:[0.773, 0.722, 0.624],  // #C5B89E 飞白枯
  SHUXIE_BG:   [0.910, 0.925, 0.937],  // #E8ECEF 青白背景
  SHOUFENG_WARM:[0.769, 0.749, 0.710], // #C4BFB5 暖灰
  SHOUFENG_FADE:[0.545, 0.490, 0.420], // #8B7D6B 金色淡出
  QINGMING_SKY:[0.910, 0.925, 0.937],  // #E8ECEF 天青
  QINGMING_INK:[0.545, 0.490, 0.420],  // #8B7D6B 赭墨

  // UI
  PANEL_BG:     [0.059, 0.059, 0.078, 0.85], // 半透明深底
  PANEL_LINE:   [1.000, 1.000, 1.000],        // 白色细线
  PANEL_HOVER:  [0.831, 0.647, 0.455],        // #D4A574 悬停金
};

// ═══════════════════════════════════════════════════════════
// 10. 音频常量
// ═══════════════════════════════════════════════════════════

export const AUDIO_SAMPLE_RATE = 44100;       // Hz (回退: 48000)
export const AUDIO_WORKLET_BUFFER_SIZE = 128; // 采样帧
export const AUDIO_SAB_FLOAT_COUNT = 256;     // SharedArrayBuffer float count
export const AUDIO_SAB_BYTE_SIZE = AUDIO_SAB_FLOAT_COUNT * 4; // 1024 bytes

// L1 呼吸层
export const BREATH_FREQ_INITIAL = 0.12;  // Hz, 初始 (5s吸/7s呼)
export const BREATH_FREQ_XUSHI = 0.25;    // Hz, 蓄势 (2s/2s)
export const BREATH_FREQ_QINGMING = 0.17; // Hz, 清明 (6s/6s)
export const BREATH_NOISE_CENTER = 400;   // Hz, 带通噪声中心频率
export const BREATH_NOISE_Q = 2.0;        // Q值

// L2 纹理层
export const GRAIN_DENSITY_MIN = 10;      // 粒子/秒
export const GRAIN_DENSITY_MAX = 30;
export const GRAIN_DURATION_MIN = 50;     // ms
export const GRAIN_DURATION_MAX = 200;    // ms
export const GRAIN_FREQ_MIN = 300;        // Hz
export const GRAIN_FREQ_MAX = 2000;       // Hz

// L3 张力层
export const TENSION_FREQ_MIN = 300;      // Hz, 基频起始
export const TENSION_FREQ_MAX = 900;      // Hz, 基频上限（势能100%时）
export const TRITONE_RATIO = Math.pow(2, 6/12); // 增四度 = √2 ≈ 1.414
export const TRITONE_FADE_START = 3.0;    // 秒, 临界前开始渐入增四度
export const TENSION_MAX_HARMONICS = 7;   // 最多奇数泛音

// L4 撕裂瞬间
export const TEAR_SILENCE_DURATION = 300; // ms, 爆发前静默
export const TEAR_BURST_DURATION = 200;   // ms, 中高频爆发持续
export const TEAR_BURST_FREQ_MIN = 800;   // Hz
export const TEAR_BURST_FREQ_MAX = 4000;  // Hz
export const TEAR_OVERTONE_DECAY_MIN = 500;   // ms, 最快衰减
export const TEAR_OVERTONE_DECAY_MAX = 15000; // ms, 最慢衰减
export const TEAR_FADE_DURATION = 1500;   // ms, 爆发后过渡时长

// L5 清明泛音层
export const PENTATONIC_BASE = 523;       // Hz, C5 = 宫
export const PENTATONIC_RATIOS = [1, 9/8, 5/4, 3/2, 5/3]; // 宫商角徵羽
export const QINGMING_DECAY_MIN = 500;    // ms
export const QINGMING_DECAY_MAX = 15000;  // ms

// 主控
export const MASTER_VOLUME_DEFAULT = 0.7;
export const MASTER_LIMITER_THRESHOLD = 0.95; // 软限幅阈值

// ═══════════════════════════════════════════════════════════
// 11. 印记常量
// ═══════════════════════════════════════════════════════════

// 导出分辨率
export const IMPRINT_STANDARD_W = 2400;
export const IMPRINT_STANDARD_H = 3200;
export const IMPRINT_HIGH_W = 4800;
export const IMPRINT_HIGH_H = 6400;
export const IMPRINT_INSTAGRAM = 1080;     // 1:1
export const IMPRINT_DESKTOP_W = 3840;
export const IMPRINT_DESKTOP_H = 2160;

// 渲染品质（印记用最高品质）
export const IMPRINT_RAYMARCH_STEPS = 64;
export const IMPRINT_WARPING_LAYERS = 3;
export const IMPRINT_PAPER_NOISE_STRENGTH = 0.03; // 宣纸纹理强度

// 题跋
export const COLOPHON_FONT_SIZE = 24;     // px
export const COLOPHON_FONT_COLOR = '#3D3027'; // 深褐色
export const COLOPHON_LINE_HEIGHT = 1.8;

// ═══════════════════════════════════════════════════════════
// 12. 文件路径常量
// ═══════════════════════════════════════════════════════════

export const PATH_IMPRINTS = 'imprints/';
export const FILE_METADATA = 'metadata.json';
export const FILE_SETTINGS = 'settings.json';
export const FILE_STATS = 'stats.json';
export const IMPRINT_FILENAME_FORMAT = 'YYYY-MM-DD_HH-MM-SS_Lv{N}.png';

// Tauri 应用数据目录 (运行时从 Rust 获取)
// %APPDATA%/势破空/

// ═══════════════════════════════════════════════════════════
// 13. 调试常量
// ═══════════════════════════════════════════════════════════

export const DEBUG = false;                   // 全局调试开关
export const DEBUG_SHOW_FPS = false;          // 显示帧率
export const DEBUG_SHOW_SKELETON = false;     // 显示骨骼线
export const DEBUG_SHOW_POTENTIAL_BAR = false;// 显示势能条
export const DEBUG_SKIP_STARTUP = false;      // 跳过启动序列
export const DEBUG_MOUSE_SIMULATE = false;    // 鼠标模拟手部位置

/**
 * 势·破空 (SHI: Shattering the Void)
 * src/shared/types.js — 跨模块共享类型定义 (JSDoc)
 *
 * 纪律：
 *   - 本文件只放纯类型定义（JSDoc + 轻量工厂函数），不放业务逻辑
 *   - 所有模块通过 import 本文件获得类型契约
 *   - 修改类型 = 修改契约，需要同步检查所有消费者
 *
 * @version 1.0.0
 * @date 2026-07-07
 */

// ═══════════════════════════════════════════════════════════
// 1. 姿态与输入类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {Object} Landmark
 * @property {number} x — 归一化 X 坐标 (0-1, 图像宽度比)
 * @property {number} y — 归一化 Y 坐标 (0-1, 图像高度比)
 * @property {number} z — 归一化 Z 坐标 (相对深度, 以髋部中点为原点)
 * @property {number} visibility — 置信度 (0-1, MediaPipe 输出)
 */

/**
 * @typedef {Object.<number, Landmark>} LandmarkMap
 * @description key = MediaPipe Pose landmark index (0-32)
 * @see https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */

/**
 * @typedef {Object} FilteredKeypoints
 * @property {number} timestamp — 帧时间戳 (ms, performance.now)
 * @property {LandmarkMap} landmarks — 卡尔曼滤波后的关键点
 * @property {number} avgConfidence — 所有可见关键点的平均置信度 (0-1)
 */

/**
 * @typedef {'left'|'right'} HandSide
 */

// ═══════════════════════════════════════════════════════════
// 2. 手势事件类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {Object} GestureWriteData
 * @property {HandSide} hand — 哪只手在书写
 * @property {{x:number, y:number}} position — 归一化屏幕位置
 * @property {number} speed — 瞬时速度 (cm/s, 物理空间估算)
 * @property {number} direction — 运动方向 (弧度, 0=右)
 */

/**
 * @typedef {Object} GestureDunData
 * @property {HandSide} hand
 * @property {{x:number, y:number}} position
 * @property {number} holdDuration — 停顿持续时长 (ms)
 */

/**
 * @typedef {Object} GestureCuoData
 * @property {HandSide} hand
 * @property {{x:number, y:number}} position
 * @property {number} angleChange — 方向变化角 (度)
 */

/**
 * @typedef {Object} GestureTearData
 * @property {'h'|'v'|'push'} direction — 横撕/纵斩/推破
 * @property {number} intensity — 爆发强度 (0-1)
 * @property {Array<{x:number,y:number}>} path — 撕裂轨迹点
 */

/**
 * @typedef {Object} GestureEvent
 * @property {string} type — 事件类型名 (对应 Events 枚举)
 * @property {number} timestamp — 触发时间 (ms)
 * @property {string} phase — 当前阶段
 * @property {GestureWriteData|GestureDunData|GestureCuoData|GestureTearData|Object} data
 */

// ═══════════════════════════════════════════════════════════
// 3. 状态机类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {'idle'|'startup'|'camera-check'|'ready'|'kunju'|'xushi'|
 *           'pokong'|'shuxie'|'shoufeng'|'qingming'|'imprint'} PhaseName
 */

/**
 * @typedef {Object} PhaseTransition
 * @property {PhaseName} from
 * @property {PhaseName} to
 * @property {string} trigger — 触发原因 (gesture 类型名 或 'timeout')
 * @property {number} elapsed — 在前阶段的停留时长 (ms)
 * @property {number} timestamp — 转换时间 (ms)
 */

/**
 * @typedef {Object} PotentialState
 * @property {number} value — 当前势能值 (0-100)
 * @property {number} normalized — 归一化势能 (0-1)
 * @property {number} rateOfChange — 势能变化率 (单位/秒)
 * @property {boolean} nearThreshold — 是否接近撕裂阈值 (>60%)
 * @property {boolean} atThreshold — 是否达到撕裂阈值 (≥75)
 */

/**
 * @typedef {Object} IntentPrediction
 * @property {{x:number, y:number}} direction — 预判的意图方向 (2D单位向量)
 * @property {number} confidence — 预判置信度 (0-1)
 * @property {number} estimatedDistance — 预估撕裂距离 (px)
 */

// ═══════════════════════════════════════════════════════════
// 4. 渲染类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {Object} TearPathPoint
 * @property {number} x — 屏幕空间 X (0-1)
 * @property {number} y — 屏幕空间 Y (0-1)
 * @property {number} t — 参数 t (0-1, 沿路径)
 * @property {number} intensity — 该点的撕裂强度
 */

/**
 * @typedef {Object} BrushTrail
 * @property {HandSide} hand — 哪只手
 * @property {Array<{x:number,y:number}>} points — 轨迹点
 * @property {number[]} speeds — 各点速度 (cm/s)
 * @property {number} feibaiRatio — 飞白比例 (快速段占总长的比)
 */

/**
 * @typedef {Object} RenderParams
 * @property {PhaseName} phase — 当前阶段
 * @property {number} phaseProgress — 阶段内进度 (0-1)
 * @property {number} phaseElapsed — 阶段已过时间 (s)
 * @property {PotentialState} potential — 势能状态
 * @property {TearPathPoint[]} tearPath — 当前撕裂路径
 * @property {number} tearCount — 撕裂次数 (0-3)
 * @property {BrushTrail[]} brushTrails — 当前书写轨迹
 * @property {IntentPrediction} intent — 意图预判
 * @property {{x:number, y:number}} collapseCenter — 坍缩中心 (归一化坐标)
 * @property {number} time — 着色器全局时间 (s)
 * @property {number} gpuTemp — GPU 温度 (°C, 用于自适应降质)
 */

// ═══════════════════════════════════════════════════════════
// 5. 音频类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {Object} AudioLayerParams
 * @property {number} breathFreq — L1 呼吸频率 (Hz, 0.08-0.50)
 * @property {number} breathDepth — L1 呼吸深度 (0.1-0.8)
 * @property {number} noiseQ — L1 噪声Q值 (0.5-3.0)
 * @property {number} grainDensity — L2 粒子密度 (5-40)
 * @property {number} grainSpread — L2 立体声散布 (0-1)
 * @property {number} tensionFreq — L3 谐波基频 (300-900 Hz)
 * @property {number} tritoneMix — L3 增四度混合 (0-0.6)
 * @property {number} harmonicCount — L3 泛音数 (1-7)
 * @property {boolean} tearTrigger — L4 撕裂触发
 * @property {number} tearBurstDur — L4 爆发持续 (ms)
 * @property {number[]} overtoneDecay — L4 泛音衰减率 [5]
 * @property {number} pentatonicBase — L5 宫音基频 (Hz)
 * @property {number[]} overtoneLevels — L5 各音音量 [5]
 * @property {number[]} decayRates — L5 各音衰减率 [5]
 * @property {number} masterGain — 主音量 (0-1)
 * @property {boolean} masterMute — 全局静音
 */

// ═══════════════════════════════════════════════════════════
// 6. 印记类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {'刚猛'|'流畅'|'凝涩'} CalligraphyStyle
 */

/**
 * @typedef {Object} ImprintMetadata
 * @property {string} id — 唯一标识 "YYYY-MM-DD_HH-MM-SS"
 * @property {string} timestamp — ISO 8601 时间戳
 * @property {number} tearDepth — 撕裂深度 (1-10)
 * @property {number} strokeCount — 笔数 (1='独笔', 2='双飞', 3='三叠')
 * @property {CalligraphyStyle} style — 风格标签
 * @property {number} duration — 体验时长 (秒)
 * @property {string[]} tearDirections — 撕裂方向数组 ['横撕', '纵斩', '推破']
 * @property {number} dunCount — 顿的次数
 * @property {number} cuoCount — 挫的次数
 * @property {number} feibaiRatio — 飞白比例 (0-1)
 * @property {boolean} breathSynced — 是否触发呼吸同步
 * @property {string} filename — 对应 PNG 文件名
 */

/**
 * @typedef {'standard'|'high'} ImprintResolution
 * @property standard — 2400×3200px
 * @property high — 4800×6400px
 */

// ═══════════════════════════════════════════════════════════
// 7. 设置与统计类型
// ═══════════════════════════════════════════════════════════

/**
 * @typedef {Object} AppSettings
 * @property {'high'|'medium'|'low'} renderQuality
 * @property {number} frameLimit — 60 | 120 | 0(无限制)
 * @property {number} volume — 0-1
 * @property {'full'|'simplified'|'skip'} startupSequence
 * @property {'standard'|'high'} imprintResolution
 * @property {boolean} autoSave — 是否自动保存印记
 * @property {'zh'|'en'} language
 */

/**
 * @typedef {Object} AppStats
 * @property {number} totalSessions — 总体验次数
 * @property {number} highestTearDepth — 最高撕裂深度
 * @property {number} consecutiveDays — 连续使用天数
 * @property {string} firstSession — 首次使用 ISO 8601
 * @property {string} lastSession — 最近使用 ISO 8601
 */

// ═══════════════════════════════════════════════════════════
// 8. 工厂函数（创建默认值，不作为逻辑）
// ═══════════════════════════════════════════════════════════

export function createDefaultSettings() {
  return /** @type {AppSettings} */ ({
    renderQuality: 'high',
    frameLimit: 60,
    volume: 0.7,
    startupSequence: 'full',
    imprintResolution: 'standard',
    autoSave: true,
    language: 'zh',
  });
}

export function createDefaultStats() {
  return /** @type {AppStats} */ ({
    totalSessions: 0,
    highestTearDepth: 0,
    consecutiveDays: 0,
    firstSession: new Date().toISOString(),
    lastSession: new Date().toISOString(),
  });
}

export function createDefaultPotentialState() {
  return /** @type {PotentialState} */ ({
    value: 0,
    normalized: 0,
    rateOfChange: 0,
    nearThreshold: false,
    atThreshold: false,
  });
}

/**
 * 势·破空 (SHI: Shattering the Void)
 * src/shared/events.js — 事件总线事件名称枚举
 *
 * 纪律：
 *   - 所有模块间通信的事件名在此唯一定义
 *   - 命名格式：domain:action (如 gesture:probe, phase:enter)
 *   - 新增事件 = 更新本文件 + 文档说明 payload 格式
 *   - 本文件不是 EventBus 实现，只是事件名注册表
 *
 * @version 1.0.0
 * @date 2026-07-07
 */

const Events = /** @type {const} */ ({

  // ═══════════════════════════════════════════════════════
  // 应用生命周期
  // ═══════════════════════════════════════════════════════
  /** 所有模块初始化完成，可以开始启动序列 */
  APP_READY:        'app:ready',
  /** 初始化失败 {error: Error, module: string} */
  APP_ERROR:        'app:error',
  /** 用户请求退出 */
  APP_QUIT:         'app:quit',

  // ═══════════════════════════════════════════════════════
  // 摄像头状态
  // ═══════════════════════════════════════════════════════
  /** 摄像头权限已获得，流已就绪 */
  CAMERA_READY:     'camera:ready',
  /** 摄像头权限被拒或设备不可用 {reason: string} */
  CAMERA_DENIED:    'camera:denied',
  /** 摄像头帧亮度不足 {brightness: number} */
  CAMERA_LOW_LIGHT: 'camera:low-light',

  // ═══════════════════════════════════════════════════════
  // 手势事件 (input/gesture-detector → state/state-machine)
  // ═══════════════════════════════════════════════════════
  /** 试探：单手小幅移动 {hand, speed} */
  GESTURE_PROBE:       'gesture:probe',
  /** 合拢：双肘内收持续>1s */
  GESTURE_CLOSE:       'gesture:close',
  /** 前倾：身体Z轴靠近摄像头 */
  GESTURE_LEAN:        'gesture:lean',
  /** 撕裂·横：肘部外展爆发 */
  GESTURE_TEAR_H:      'gesture:tear-h',
  /** 撕裂·纵：手腕高速垂直移动 */
  GESTURE_TEAR_V:      'gesture:tear-v',
  /** 撕裂·推：身体后仰+前推 */
  GESTURE_TEAR_PUSH:   'gesture:tear-push',
  /** 空中书写：手腕在FOV内移动 {hand, position, speed, direction} */
  GESTURE_WRITE:       'gesture:write',
  /** 顿：速度骤停 {hand, position, holdDuration} */
  GESTURE_DUN:         'gesture:dun',
  /** 挫：方向突变 {hand, position, angleChange} */
  GESTURE_CUO:         'gesture:cuo',
  /** 收锋：双手回收 {speed} */
  GESTURE_SHOUFENG:    'gesture:shoufeng',
  /** 静止：长时间不动 */
  GESTURE_STILL:       'gesture:still',
  /** 分心：头部偏转>25° */
  GESTURE_DISTRACT:    'gesture:distract',

  // ═══════════════════════════════════════════════════════
  // 阶段生命周期 (state/state-machine → 所有模块)
  // ═══════════════════════════════════════════════════════
  /** 进入某个阶段 {phase: PhaseName, timestamp: number} */
  PHASE_ENTER:      'phase:enter',
  /** 离开某个阶段 {phase: PhaseName, duration: number} */
  PHASE_EXIT:       'phase:exit',

  // ═══════════════════════════════════════════════════════
  // 势能状态 (state/势能-calculator → render, audio)
  // ═══════════════════════════════════════════════════════
  /** 势能变化 {value, normalized, rateOfChange, nearThreshold, atThreshold} */
  POTENTIAL_CHANGED: '势能:changed',
  /** 势能达到临界值 (≥85%) */
  POTENTIAL_CRITICAL: '势能:critical',

  // ═══════════════════════════════════════════════════════
  // 撕裂事件 (state/state-machine → render, audio, imprint)
  // ═══════════════════════════════════════════════════════
  /** 单次撕裂触发 {direction, intensity, path, tearCount} */
  TEAR_TRIGGERED:   'tear:triggered',
  /** 复合撕裂（第2/3次撕裂后）{tearCount, crossPoints} */
  TEAR_COMPOUND:    'tear:compound',

  // ═══════════════════════════════════════════════════════
  // 渲染参数 (state/state-machine → render/*)
  // ═══════════════════════════════════════════════════════
  /** 每帧场景参数更新 (高频 60Hz) */
  RENDER_PARAMS:    'render:params',
  /** 自适应渲染质量变化 {quality: 'normal'|'reduced'|'emergency'} */
  RENDER_QUALITY:   'render:quality',

  // ═══════════════════════════════════════════════════════
  // UI事件
  // ═══════════════════════════════════════════════════════
  /** 打开控制面板 */
  UI_SHOW_PANEL:    'ui:show-panel',
  /** 关闭控制面板 */
  UI_HIDE_PANEL:    'ui:hide-panel',
  /** 隐性引导触发 {type: 'gesture-demo'|'speed-demo'|'retear-hint'} */
  UI_GUIDANCE:      'ui:guidance',
  /** 用户点击"再来一次" */
  UI_RESTART:       'ui:restart',
  /** 用户点击"保存印记" */
  UI_SAVE_IMPRINT:  'ui:save-imprint',

  // ═══════════════════════════════════════════════════════
  // 印记事件
  // ═══════════════════════════════════════════════════════
  /** 请求生成印记 */
  IMPRINT_GENERATE: 'imprint:generate',
  /** 印记生成完成 {metadata: ImprintMetadata} */
  IMPRINT_READY:    'imprint:ready',
  /** 请求导出印记 {id: string, resolution: ImprintResolution} */
  IMPRINT_EXPORT:   'imprint:export',
  /** 印记已保存到文件 {filename: string} */
  IMPRINT_SAVED:    'imprint:saved',

  // ═══════════════════════════════════════════════════════
  // 音频事件
  // ═══════════════════════════════════════════════════════
  /** AudioWorklet 已加载并运行 */
  AUDIO_READY:      'audio:ready',
  /** 音频参数更新（指向 SharedArrayBuffer 的信号） */
  AUDIO_PARAMS:     'audio:params',

  // ═══════════════════════════════════════════════════════
  // 存储事件
  // ═══════════════════════════════════════════════════════
  /** 设置已读取 {settings: AppSettings} */
  STORAGE_SETTINGS_LOADED: 'storage:settings-loaded',
  /** 统计数据已读取 {stats: AppStats} */
  STORAGE_STATS_LOADED: 'storage:stats-loaded',
  /** 元数据列表已读取 {imprints: ImprintMetadata[]} */
  STORAGE_METADATA_LOADED: 'storage:metadata-loaded',
});

// 冻结防止意外修改
Object.freeze(Events);

// 同时提供按模块分组的映射（方便IDE自动补全）
export const EventGroups = {
  APP: ['app:ready', 'app:error', 'app:quit'],
  CAMERA: ['camera:ready', 'camera:denied', 'camera:low-light'],
  GESTURE: [
    'gesture:probe', 'gesture:close', 'gesture:lean',
    'gesture:tear-h', 'gesture:tear-v', 'gesture:tear-push',
    'gesture:write', 'gesture:dun', 'gesture:cuo',
    'gesture:shoufeng', 'gesture:still', 'gesture:distract',
  ],
  PHASE: ['phase:enter', 'phase:exit'],
  POTENTIAL: ['势能:changed', '势能:critical'],
  TEAR: ['tear:triggered', 'tear:compound'],
  RENDER: ['render:params', 'render:quality'],
  UI: ['ui:show-panel', 'ui:hide-panel', 'ui:guidance', 'ui:restart', 'ui:save-imprint'],
  IMPRINT: ['imprint:generate', 'imprint:ready', 'imprint:export', 'imprint:saved'],
  AUDIO: ['audio:ready', 'audio:params'],
  STORAGE: ['storage:settings-loaded', 'storage:stats-loaded', 'storage:metadata-loaded'],
};

export default Events;

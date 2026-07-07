/**
 * render/sdf-scene.js — SDF 场景参数管理
 *
 * 职责：
 *   - 定义场景参数结构（混沌、裂缝、书写轨迹）
 *   - 根据体验阶段生成对应的场景参数
 *   - P1 硬编码默认混沌参数，P2 起接受 phase + potential 动态映射
 *
 * 输入：phase (可选), potential (可选)
 * 输出：SceneParams 对象 → 传给 raymarch-renderer 的 uniform
 */

import { COLORS } from '../../shared/constants.js';

// ═══════════════════════════════════════════════════
// 默认场景参数 (P1: 仅混沌层)
// ═══════════════════════════════════════════════════

/** @type {SceneParams} */
const DEFAULT_SCENE = {
  chaos: {
    noiseScale: 1.5,         // FBM 空间频率基础值
    warpAmplitude: 0.35,     // Domain warping 振幅 (0-1)
    collapseRadius: 1.0,     // 坍缩球半径 (P2 起由势能驱动)
    colorBase: COLORS.KUNJU_BG,       // 基础暗色
    colorAccent: COLORS.XUSHI_GOLD,   // 强调暗金色
  },
  // P3 扩展:
  // tear: { paths: [], intensities: [] },
  // P4 扩展:
  // brush: { trails: [], feibaiRatios: [] },
};

// ═══════════════════════════════════════════════════
// 公共 API
// ═══════════════════════════════════════════════════

/**
 * 创建默认场景参数 (P1 使用)
 * @returns {SceneParams}
 */
export function createDefaultScene() {
  return structuredClone(DEFAULT_SCENE);
}

/**
 * 根据体验阶段更新场景参数 (P2 起用)
 * 当前 P1 阶段恒返回默认值
 *
 * @param {string} phase — 阶段名 (PhaseName)
 * @param {number} potential — 势能值 0-100 (可选)
 * @returns {SceneParams}
 */
export function updateSceneForPhase(phase, potential = 0) {
  const scene = createDefaultScene();

  // P1: 所有阶段用同样参数
  // P2: 根据 phase 调整 collapseRadius / colorBase / colorAccent
  // P3: 根据 tearCount 添加 tear paths
  // P4: 根据 brushTrails 添加书写轨迹

  switch (phase) {
    case 'kunju':
      // 困局：大半径混沌，偏冷色
      scene.chaos.collapseRadius = 1.5;
      scene.chaos.warpAmplitude = 0.30;
      break;
    case 'xushi':
      // 蓄势：坍缩中心缩小，偏暖金
      scene.chaos.collapseRadius = 1.5 - (potential / 100) * 1.3;
      scene.chaos.warpAmplitude = 0.35 + (potential / 100) * 0.15;
      break;
    case 'pokong':
      // 破空：坍缩到最小，白光
      scene.chaos.collapseRadius = 0.2;
      scene.chaos.warpAmplitude = 0.50;
      break;
    case 'qingming':
      // 清明：稳定、通透
      scene.chaos.collapseRadius = 1.2;
      scene.chaos.warpAmplitude = 0.20;
      break;
    default:
      // P1 默认
      break;
  }

  return scene;
}

/**
 * 将场景参数展平为 shader uniform 可写数组
 * 布局与 chaos-sdf.wgsl 中 Uniforms struct 一致
 *
 * @param {SceneParams} scene
 * @returns {Float32Array} — 256 bytes = 64 floats
 */
export function sceneToUniformArray(scene) {
  // 当前 P1: 只填充已用字段，其余为零 (预留)
  const arr = new Float32Array(64);
  // 索引 0-3: time, stepCount, noiseLayers, warpAmplitude — 由 raymarch-renderer 写入
  // 索引 4-15: resolution, mouse, cameraRadius, cameraTarget — 由 raymarch-renderer 写入
  // 预留字段保持 0
  return arr;
}

// ═══════════════════════════════════════════════════
// 类型注解 (JSDoc)
// ═══════════════════════════════════════════════════

/**
 * @typedef {Object} ChaosParams
 * @property {number} noiseScale
 * @property {number} warpAmplitude
 * @property {number} collapseRadius
 * @property {number[]} colorBase — [r, g, b] 0-1
 * @property {number[]} colorAccent
 */

/**
 * @typedef {Object} SceneParams
 * @property {ChaosParams} chaos
 * // P3: tear: TearParams
 * // P4: brush: BrushParams
 */

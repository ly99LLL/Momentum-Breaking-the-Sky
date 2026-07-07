// chaos-sdf.wgsl — 多层 Domain Warping SDF 混沌场景
//
// 职责：全屏 Raymarch，渲染被 FBM 噪声扭曲的球形 SDF
//
// 后续扩展点：
//   - tearSDF(p) → SDF 裂缝减法 (P3)
//   - brushTrailSDF(p) → 书写轨迹并集 (P4)
//   - 色彩映射 LUT 查找 (P4)
//   - 自适应 stepCount/noiseLayers (P3 自适应分辨率)

// === 常量 ===
const MAX_STEPS = 128;       // 着色器编译时上限 (uniform 实际步数 ≤ 此值)
const MAX_DIST = 20.0;       // 最大 raymarch 距离
const SURF_DIST = 0.001;     // 表面命中精度
const PI = 3.14159265;

// === Uniforms ===
// 布局: 对齐到 16 字节边界, 预留空间到 256 bytes (P3/4 扩展用)
struct Uniforms {
  iTime: f32,                // 0:   全局时间 (秒)
  iStepCount: f32,           // 4:   实际 raymarch 步数 (≤MAX_STEPS)
  iNoiseLayers: f32,         // 8:   FBM 层数 (1-3)
  iWarpAmplitude: f32,       // 12:  Domain warp 振幅
  iResolution: vec2f,        // 16:  屏幕分辨率
  iMouse: vec2f,             // 24:  鼠标归一化坐标 (0-1)
  iCameraRadius: f32,        // 32:  相机 orbit 半径
  _pad0: f32,                // 36:  padding
  iCameraTarget: vec3f,      // 48:  相机注视点
  _pad1: f32,                // 60:  padding
  // 预留 192 bytes 给后续 tear/brush/color LUT 参数
  _reserved: vec4f,          // 64
  _reserved2: vec4f,         // 80
  _reserved3: vec4f,         // 96
  _reserved4: vec4f,         // 112
};

// === 噪声函数 ===

/// 3D 哈希 → 伪随机值 [0, 1)
fn hash(p: vec3f) -> f32 {
  let h = dot(p, vec3f(127.1, 311.7, 74.7));
  return fract(sin(h) * 43758.5453);
}

/// 3D 值噪声 (smoothstep 插值)
fn noise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f); // smoothstep

  return mix(
    mix(
      mix(hash(i + vec3f(0, 0, 0)), hash(i + vec3f(1, 0, 0)), u.x),
      mix(hash(i + vec3f(0, 1, 0)), hash(i + vec3f(1, 1, 0)), u.x),
      u.y
    ),
    mix(
      mix(hash(i + vec3f(0, 0, 1)), hash(i + vec3f(1, 0, 1)), u.x),
      mix(hash(i + vec3f(0, 1, 1)), hash(i + vec3f(1, 1, 1)), u.x),
      u.y
    ),
    u.z
  );
}

/// FBM (Fractal Brownian Motion) — 多层噪声叠加
fn fbm(p: vec3f, octaves: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var maxValue = 0.0;

  for (var i = 0.0; i < octaves; i += 1.0) {
    value += amplitude * noise(p * frequency);
    maxValue += amplitude;
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value / maxValue; // 归一化到 [0, 1]
}

// === SDF 场景 ===

/// 主 SDF: 被噪声扭曲的球体
/// 后续扩展：减 tearSDF(p) → 裂缝, 加 brushTrailSDF(p) → 轨迹
fn chaosSDF(p: vec3f) -> f32 {
  // Domain warping: 用噪声扭曲空间坐标
  let warp1 = noise(p * 2.0 + iTime * 0.1) * uniforms.iWarpAmplitude;
  let warp2 = noise(p * 3.0 - iTime * 0.07 + vec3f(1.0, 2.0, 0.5)) * uniforms.iWarpAmplitude * 0.6;
  let q = p + vec3f(warp1, warp2, warp1 * 0.5);

  // 噪声变形球体
  let displacement = (fbm(q * 1.5, uniforms.iNoiseLayers) - 0.5) * 0.6;
  let d = length(q) - 1.0 + displacement;

  return d;
}

/// 场景距离 + 材质 ID (后续扩展：不同 SDF 项返回不同 material)
fn map(p: vec3f) -> f32 {
  return chaosSDF(p);
  // P3: return min(d, tearSDF(p));  // 裂缝 = SDF 减法 (取 min 的负值)
  // P4: return min(d, brushTrailSDF(p)); // 轨迹 = SDF 并集
}

// === 法线计算 ===
fn calcNormal(p: vec3f) -> vec3f {
  let h = 0.0005;
  return normalize(vec3f(
    map(p + vec3f(h, 0, 0)) - map(p - vec3f(h, 0, 0)),
    map(p + vec3f(0, h, 0)) - map(p - vec3f(0, h, 0)),
    map(p + vec3f(0, 0, h)) - map(p - vec3f(0, 0, h)),
  ));
}

// === 简易调色板 ===
fn palette(t: f32, d: f32) -> vec3f {
  // 基础色调: 深蓝紫 → 暗金
  let a = vec3f(0.5, 0.5, 0.5);
  let b = vec3f(0.5, 0.5, 0.5);
  let c = vec3f(1.0, 1.0, 1.0);
  let dcol = vec3f(0.00, 0.10, 0.20);

  // 噪声值映射到色彩
  let n = noise(p * 2.0) * 0.3;
  return a + b * cos(6.28318 * (c * (t * 0.6 + n + d * 0.15) + dcol));
}

// === Raymarch ===
fn raymarch(ro: vec3f, rd: vec3f) -> vec4f {
  var t = 0.0;
  var steps = i32(uniforms.iStepCount);

  for (var i = 0; i < min(steps, MAX_STEPS); i += 1) {
    let p = ro + rd * t;
    let d = map(p);

    if (d < SURF_DIST) {
      // 命中 → 计算着色
      let normal = calcNormal(p);
      let lightDir = normalize(vec3f(1.0, 1.5, 2.0));

      // Lambert 漫反射
      let diff = max(dot(normal, lightDir), 0.0);

      // 环境光
      let ambient = 0.15;

      // 雾
      let fogFactor = 1.0 - exp(-t * 0.08);

      // 调色
      let col = palette(p, noise(p * 3.0));
      let lit = col * (ambient + diff * 0.85);

      // 混合雾色 (深空背景)
      let fogColor = vec3f(0.02, 0.02, 0.06);
      let finalColor = mix(lit, fogColor, fogFactor);

      return vec4f(finalColor, 1.0);
    }

    if (t > MAX_DIST) {
      break;
    }

    t += d * 0.8; // 安全因子，避免穿透
  }

  // 未命中 → 深空背景 + 淡淡噪声纹理
  let bg = vec3f(0.02, 0.02, 0.06);
  let grain = noise(rd * 80.0 + iTime * 0.05) * 0.03;
  return vec4f(bg + grain, 1.0);
}

// === 相机 ===
fn getCameraRay(ro: vec3f, uv: vec2f) -> vec3f {
  // 简易 look-at: 从 ro 看向原点
  let forward = normalize(uniforms.iCameraTarget - ro);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, forward);

  let aspect = uniforms.iResolution.x / uniforms.iResolution.y;
  let px = (uv.x - 0.5) * aspect;
  let py = uv.y - 0.5;

  return normalize(forward + right * px + up * py);
}

// === 入口 ===
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var out: VertexOutput;
  // 全屏 quad (6个顶点, 2个三角形)
  let positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0),
  );
  out.pos = vec4f(positions[idx], 0.0, 1.0);
  out.uv = (positions[idx] + 1.0) * 0.5; // [-1,1] → [0,1]
  out.uv.y = 1.0 - out.uv.y; // 翻转 Y
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  // 球坐标 orbit 相机 (鼠标驱动)
  let mx = uniforms.iMouse.x * 2.0 * PI;
  let my = uniforms.iMouse.y * PI * 0.6 + 0.3;

  let ro = uniforms.iCameraTarget + vec3f(
    cos(mx) * cos(my) * uniforms.iCameraRadius,
    sin(my) * uniforms.iCameraRadius,
    sin(mx) * cos(my) * uniforms.iCameraRadius,
  );

  let rd = getCameraRay(ro, in.uv);
  return raymarch(ro, rd);
}

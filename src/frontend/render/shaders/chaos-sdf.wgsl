// chaos-sdf.wgsl — 多层 Domain Warping SDF 混沌场景
//
// 职责：全屏 Raymarch，渲染被 FBM 噪声扭曲的球形 SDF
// 后续：P3 +裂缝减法, P4 +书写轨迹并集

const MAX_STEPS = 128;
const MAX_DIST = 20.0;
const SURF_DIST = 0.001;
const PI = 3.14159265;

// === Uniforms (std140 布局) ===
struct Uniforms {
  iTime: vec4f,              // offset 0:  x=time, y=stepCount, z=noiseLayers, w=warpAmplitude
  iResolution: vec2f,        // offset 16: width, height
  iMouse: vec2f,             // offset 24: mouseX, mouseY
  iCameraRadius: f32,        // offset 32
  _pad0: f32,                // offset 36
  // offset 40-47: implicit 8-byte padding (vec3f needs 16-byte alignment)
  iCameraTarget: vec3f,      // offset 48: camera look-at target
  _pad1: f32,                // offset 60
};

@group(0) @binding(0) var<uniform> u: Uniforms;

// === 噪声 ===

fn hash(p: vec3f) -> f32 {
  return fract(sin(dot(p, vec3f(127.1, 311.7, 74.7))) * 43758.5453);
}

fn noise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash(i), hash(i + vec3f(1, 0, 0)), s.x),
      mix(hash(i + vec3f(0, 1, 0)), hash(i + vec3f(1, 1, 0)), s.x),
      s.y
    ),
    mix(
      mix(hash(i + vec3f(0, 0, 1)), hash(i + vec3f(1, 0, 1)), s.x),
      mix(hash(i + vec3f(0, 1, 1)), hash(i + vec3f(1, 1, 1)), s.x),
      s.y
    ),
    s.z
  );
}

fn fbm(p: vec3f, octaves: f32) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var freq = 1.0;
  var maxVal = 0.0;

  // WGSL: for 循环用 i32 迭代器
  let n = i32(octaves);
  for (var i = 0; i < n; i = i + 1) {
    value = value + amp * noise(p * freq);
    maxVal = maxVal + amp;
    freq = freq * 2.0;
    amp = amp * 0.5;
  }
  return value / maxVal;
}

// === SDF ===

fn chaosSDF(p: vec3f) -> f32 {
  // Domain warping
  let w1 = noise(p * 2.0 + u.iTime.x * 0.1) * u.iTime.w;
  let w2 = noise(p * 3.0 - u.iTime.x * 0.07 + vec3f(1, 2, 0.5)) * u.iTime.w * 0.6;
  let q = p + vec3f(w1, w2, w1 * 0.5);

  // 噪声变形球体
  let d0 = (fbm(q * 1.5, u.iTime.z) - 0.5) * 0.6;
  return length(q) - 1.0 + d0;
}

fn map(p: vec3f) -> f32 {
  return chaosSDF(p);
}

fn calcNormal(p: vec3f) -> vec3f {
  let h = 0.0005;
  return normalize(vec3f(
    map(p + vec3f(h, 0, 0)) - map(p - vec3f(h, 0, 0)),
    map(p + vec3f(0, h, 0)) - map(p - vec3f(0, h, 0)),
    map(p + vec3f(0, 0, h)) - map(p - vec3f(0, 0, h)),
  ));
}

// === 色彩 (cosine palette) ===
fn palette(t: f32) -> vec3f {
  let a = vec3f(0.5, 0.5, 0.5);
  let b = vec3f(0.5, 0.5, 0.5);
  let c = vec3f(1.0, 1.0, 1.0);
  let d = vec3f(0.00, 0.10, 0.20);
  return a + b * cos(6.28318 * (c * t + d));
}

// === Raymarch ===
fn raymarch(ro: vec3f, rd: vec3f) -> vec4f {
  var t = 0.0;
  let maxSteps = i32(u.iTime.y);

  for (var i = 0; i < maxSteps; i = i + 1) {
    let p = ro + rd * t;
    let d = map(p);

    if d < SURF_DIST {
      let n = calcNormal(p);
      let lightDir = normalize(vec3f(1.0, 1.5, 2.0));
      let diff = max(dot(n, lightDir), 0.0);
      let ambient = 0.12;
      let fog = 1.0 - exp(-t * 0.07);

      // 用命中点的噪声值偏移调色板
      let noiseVal = noise(p * 3.0);
      let col = palette(noiseVal * 0.5 + t * 0.04);
      let lit = col * (ambient + diff * 0.88);

      let fogColor = vec3f(0.02, 0.02, 0.06);
      return vec4f(mix(lit, fogColor, fog), 1.0);
    }

    if t > MAX_DIST { break; }
    t = t + d * 0.75;
  }

  // 未命中 → 深空背景
  let bg = vec3f(0.02, 0.02, 0.06);
  let grain = noise(rd * 80.0 + u.iTime.x * 0.05) * 0.025;
  return vec4f(bg + grain, 1.0);
}

// === 相机 ===
fn getRay(ro: vec3f, uv: vec2f) -> vec3f {
  let forward = normalize(u.iCameraTarget - ro);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, forward);
  let aspect = u.iResolution.x / u.iResolution.y;
  return normalize(forward + right * (uv.x - 0.5) * aspect + up * (uv.y - 0.5));
}

// === VS/FS 入口 ===
struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VertexOutput {
  let positions = array<vec2f, 6>(
    vec2f(-1, -1), vec2f( 1, -1), vec2f(-1,  1),
    vec2f(-1,  1), vec2f( 1, -1), vec2f( 1,  1),
  );
  var out: VertexOutput;
  out.pos = vec4f(positions[idx], 0.0, 1.0);
  out.uv = (positions[idx] + 1.0) * 0.5;
  out.uv.y = 1.0 - out.uv.y;
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let mx = u.iMouse.x * 2.0 * PI;
  let my = u.iMouse.y * PI * 0.55 + 0.3;

  let ro = u.iCameraTarget + vec3f(
    cos(mx) * cos(my) * u.iCameraRadius,
    sin(my) * u.iCameraRadius,
    sin(mx) * cos(my) * u.iCameraRadius,
  );

  let rd = getRay(ro, in.uv);
  return raymarch(ro, rd);
}

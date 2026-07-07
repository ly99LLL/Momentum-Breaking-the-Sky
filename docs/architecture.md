# 势·破空 (SHI: Shattering the Void) — 技术架构文档

> **版本：** v1.0
> **制定日期：** 2026-07-07
> **对应PRD：** v31.0（交互丰富化版）
> **状态：** 架构设计完成，待P0验证

---

## 目录

1. [系统总览](#1-系统总览)
2. [技术栈与选型理由](#2-技术栈与选型理由)
3. [目录结构](#3-目录结构)
4. [模块架构](#4-模块架构)
5. [数据流与模块间通信](#5-数据流与模块间通信)
6. [状态机设计](#6-状态机设计)
7. [渲染管线设计](#7-渲染管线设计)
8. [音频管线设计](#8-音频管线设计)
9. [输入管线设计](#9-输入管线设计)
10. [接口契约](#10-接口契约)
11. [存储方案](#11-存储方案)
12. [性能预算与自适应策略](#12-性能预算与自适应策略)
13. [构建与部署](#13-构建与部署)
14. [风险应对实现](#14-风险应对实现)
15. [开发序列](#15-开发序列)
16. [附录：依赖清单](#16-附录依赖清单)

---

## 1. 系统总览

### 1.1 一句话架构

> **Tauri 2.x 桌面壳 → WebView 内运行 Vanilla JS 应用 → WebGPU 渲染 SDF 混沌空间 → MediaPipe Web 追踪身体 → Web Audio API 合成声音 → 本地文件系统存储印记**

### 1.2 系统分层

```
┌──────────────────────────────────────────────────────────────┐
│                    🖥️ 用户可见层                               │
│  笔记本屏幕（1920×1080 全屏）  +  内置扬声器  +  内置摄像头     │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                 📦 应用壳层 (Tauri 2.x / Rust)                 │
│  window.rs: 原生全屏窗口  │  fs.rs: 文件读写  │  main.rs: 入口  │
│  职责：创建无边框全屏窗口、处理摄像头权限、提供文件系统API        │
└──────────────────────────┬───────────────────────────────────┘
                           │ IPC (invoke / event)
┌──────────────────────────▼───────────────────────────────────┐
│                  🌐 前端应用层 (Vanilla JS)                     │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 输入模块  │  │ 状态机   │  │ 渲染引擎  │  │ 音频引擎  │     │
│  │ Camera→  │  │ 9阶段    │  │ WebGPU   │  │ Audio    │     │
│  │ MediaPipe│──│ 状态管理 │──│ SDF      │  │ Worklet  │     │
│  │ →Gesture │  │          │  │ Raymarch │  │ 5层合成  │     │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────┘     │
│                     │                                         │
│            ┌────────▼────────┐                                │
│            │   EventBus      │  ← 模块间通信中枢               │
│            │   (CustomEvent) │                                │
│            └────────┬────────┘                                │
│                     │                                         │
│  ┌──────────┐  ┌────▼─────┐  ┌──────────┐                   │
│  │ UI层     │  │ 印记系统  │  │ 存储层   │                   │
│  │ 控制面板  │  │ 生成/导出 │  │ IndexedDB│                   │
│  │ 画廊     │  │ 题跋/元数据│  │ +本地文件│                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 核心架构原则

| # | 原则 | 含义 |
|---|------|------|
| 1 | **模块零耦合** | 所有模块通过 EventBus 通信，不直接引用对方 |
| 2 | **主线程神圣** | 渲染在主线程，输入/音频在独立线程，永不阻塞主线程 |
| 3 | **降级优雅** | 每个性能敏感模块都有至少两级降级路径 |
| 4 | **数据本地** | 摄像头数据仅用于实时推理，不存储、不传输、不留痕 |
| 5 | **单文件≤300行** | 每个.js文件不超过300行，超过即拆分 |

---

## 2. 技术栈与选型理由

### 2.1 最终技术栈

| 层 | 技术 | 版本 | 理由 |
|----|------|------|------|
| **应用壳** | Tauri | 2.x | .exe约35MB；原生全屏窗口；无需浏览器；Rust提供fs API |
| **渲染** | WebGPU (WGSL) | 1.0 | RTX 5070原生支持；比WebGL 2.0快约3-8倍（compute shader）；降级路径WebGL 2.0 |
| **姿态检测** | MediaPipe Pose (Web) | 0.10+ | 浏览器内WASM运行，零外部依赖；33关键点；笔记本摄像头直接输入 |
| **音频合成** | Web Audio API + AudioWorklet | — | 独立音频线程；<5ms延迟；无需外部音频文件 |
| **前端逻辑** | Vanilla JS (ES2022+) | — | 零框架开销；最小GC抖动；完全控制渲染路径 |
| **前端样式** | CSS + Canvas 2D | — | 轻量UI层；Canvas用于印记叠加 |
| **数据存储** | IndexedDB + Tauri fs API | — | 元数据在IndexedDB；印记PNG在本地文件系统 |
| **打包** | Tauri Bundler (.msi/.exe) | — | 单文件安装；自动处理WebView2依赖 |
| **构建** | Vite (仅用于dev) | 5.x | 开发热重载；生产构建用Tauri内置bundler |

### 2.2 技术选型否决记录

| 否决方案 | 原因 |
|---------|------|
| Electron | 打包体积>150MB，Tauri只需35MB |
| React/Vue | 渲染路径上的框架GC会掉帧；Vanilla JS直接控制每一帧 |
| Python + OpenCV | 用户需安装Python环境，违背"双击即用" |
| Unity/Unreal | 启动慢（>10秒），不适合3分钟快速体验 |
| WebGL 2.0（首选） | Compute shader不可用，SDF布尔运算需CPU端计算再上传 |
| Rust全栈渲染 | 开发周期过长；WebGPU在浏览器内已有成熟生态 |
| 云端API调用 | 要求网络连接；违背"纯本地"；延迟不可控 |

---

## 3. 目录结构

```
势破空/
├── CLAUDE.md                     ← 项目宪法（每次会话先读）
├── README.md                     ← 用户面向的说明
├── PRD.md                        ← 产品需求文档 v31.0
├── .gitignore
│
├── docs/
│   ├── architecture.md           ← 本文件：技术架构
│   ├── api-contracts.md          ← 模块间接口详细规格
│   ├── state-machine.md          ← 状态机详细设计
│   └── sessions/                 ← 开发会话记录
│
├── src/
│   ├── frontend/                 ← 🌐 所有前端代码
│   │   ├── index.html            ←   单页应用入口
│   │   ├── app/
│   │   │   └── main.js           ←   应用生命周期：初始化→启动→运行→退出
│   │   ├── state/
│   │   │   ├── state-machine.js  ←   9阶段有限状态机
│   │   │   └──势能-calculator.js ←   势能累积算法（E(t)积分）
│   │   ├── input/
│   │   │   ├── camera-manager.js ←   摄像头访问与管理
│   │   │   ├── mediapipe-runner.js←  MediaPipe Pose WASM 加载与推理
│   │   │   ├── gesture-detector.js←  关键点→手势→交互事件
│   │   │   └── keypoint-filter.js ←   卡尔曼滤波 + 置信度衰减
│   │   ├── render/
│   │   │   ├── webgpu-setup.js   ←   WebGPU 设备初始化
│   │   │   ├── raymarch-renderer.js← 全屏Quad + Raymarch调度
│   │   │   ├── sdf-scene.js      ←   SDF场景图：混沌、裂缝、书写轨迹
│   │   │   ├── post-process.js   ←   后处理：自适应缩放、色彩映射、暗角
│   │   │   ├── brush-renderer.js ←   ✨ 狂草笔触渲染（Canvas 2D叠加）
│   │   │   └── shaders/
│   │   │       ├── chaos-sdf.wgsl    ← 多层domain warping噪声
│   │   │       ├── tear-bool.wgsl    ← SDF布尔相减（裂缝）
│   │   │       ├── post-tonemap.wgsl ← 色调映射 + 暗角
│   │   │       └── brush-noise.wgsl  ← 飞白噪声纹理生成
│   │   ├── audio/
│   │   │   ├── audio-manager.js  ←   Web Audio上下文管理
│   │   │   ├── synth-engine.js   ←   5层合成引擎调度
│   │   │   ├── worklet-processor.js← AudioWorklet处理器（独立线程）
│   │   │   └── audio-params.js   ←   SharedArrayBuffer参数结构
│   │   ├── ui/
│   │   │   ├── overlay-manager.js←   启动序列、HUD、提示叠加层
│   │   │   ├── control-panel.js  ←   Esc控制面板
│   │   │   ├── gallery.js        ←   印记画廊（网格浏览）
│   │   │   └── settings.js       ←   设置面板
│   │   └── imprint/
│   │       ├── generator.js      ←   印记生成（高分辨率重渲染+叠加）
│   │       ├── calligraphy.js    ←   题跋生成（竖排繁体文本布局）
│   │       └── exporter.js       ←   PNG导出（Tauri fs）
│   │
│   ├── backend/                  ← 🦀 Rust后端（Tauri命令）
│   │   └── tauri/
│   │       ├── main.rs           ←   Tauri应用入口
│   │       ├── window.rs         ←   全屏窗口管理
│   │       └── fs.rs             ←   文件系统命令（保存/读取印记）
│   │
│   └── shared/                   ← 🔗 跨模块共享
│       ├── types.js              ←   JSDoc类型定义（PoseData, GestureEvent, ...）
│       ├── constants.js          ←   所有魔法数字（阈值、色彩、时序、音频参数）
│       └── events.js             ←   事件名称枚举（EventBus topic列表）
│
├── tests/
│   ├── frontend/                 ← 前端模块测试（镜像 src/frontend/ 结构）
│   │   ├── state-machine.test.js
│   │   ├──势能-calculator.test.js
│   │   ├── gesture-detector.test.js
│   │   └── keypoint-filter.test.js
│   └── backend/                  ← Rust测试
│
├── scripts/
│   ├── dev.ps1                   ← 开发启动脚本
│   ├── build.ps1                 ← 生产构建脚本
│   └── check-deps.ps1            ← 依赖检查脚本
│
└── src-tauri/                    ← Tauri Rust项目（Tauri CLI生成）
    ├── Cargo.toml
    ├── tauri.conf.json           ← Tauri配置（窗口、权限、打包）
    ├── icons/                    ← 应用图标
    └── src/
        ├── main.rs
        └── lib.rs
```

> **纪律重申：** `src/frontend/` 下每个子目录是一个独立模块。每个 `.js` 文件 ≤ 300 行。模块间通过 EventBus 通信，不直接 import 对方的具体实现。

---

## 4. 模块架构

### 4.1 模块依赖图（允许的依赖方向）

```
                    ┌──────────────┐
                    │  shared/     │  ← 所有模块都可以 import
                    │  types.js    │
                    │  constants.js│
                    │  events.js   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐      ┌─────▼──────┐    ┌─────▼──────┐
   │  input/  │      │  state/    │    │  audio/    │
   │  (生产   │─────→│  (消费手势 │    │  (消费状态 │
   │  手势事件)│      │   事件)    │    │   参数)    │
   └──────────┘      └─────┬──────┘    └────────────┘
                           │
                           │ EventBus
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐      ┌─────▼──────┐    ┌─────▼──────┐
   │  render/ │      │   ui/      │    │  imprint/  │
   │  (消费   │      │  (消费状态 │    │  (消费撕裂 │
   │  场景参数)│      │   事件)    │    │   事件)    │
   └──────────┘      └────────────┘    └────────────┘
                           │
                    ┌──────▼───────┐
                    │  app/        │
                    │  (生命周期   │
                    │   协调者)    │
                    └──────────────┘
```

**纪律：**
- `shared/` ← 纯数据定义，零逻辑
- `input/` → 生产手势事件，不消费其他模块
- `state/` → 消费手势事件，生产状态变化事件
- `render/` → 消费状态变化事件，更新场景参数
- `audio/` → 消费状态变化事件，更新合成参数
- `ui/` → 消费状态变化事件，更新叠加层
- `imprint/` → 消费撕裂完成事件，生成印记
- `app/` → 协调生命周期，消费所有模块的准备就绪信号

### 4.2 模块详细规格

#### 4.2.1 app/main.js — 应用生命周期

```
职责：初始化顺序控制、全局错误处理、优雅退出
输入：无
输出：生命周期事件 (app:ready, app:error, app:quit)

初始化序列：
  1. 检测 WebGPU 支持 → 不支持则降级 WebGL
  2. 检测摄像头权限 → 被拒则显示引导页
  3. 加载 MediaPipe WASM 模型（15MB，异步）
  4. 初始化 WebGPU 设备 + 编译 Shader
  5. 初始化 AudioContext + 加载 AudioWorklet
  6. 所有模块就绪 → 触发启动序列
  7. 启动序列完成 → 进入体验循环
```

#### 4.2.2 state/state-machine.js — 状态机

```
职责：管理9个体验阶段、阶段转换条件、势能累积状态
输入：gesture:* 事件
输出：phase:enter, phase:exit,势能:changed 事件

9个阶段（对应 PRD §2.3 时间线）：
  IDLE → STARTUP → CAMERA_CHECK → READY →
  KUNJU (困局) → XUSHI (蓄势) → POKONG (破空) →
  SHUXIE (书写) → SHOUFENG (收锋) → QINGMING (清明) →
  IMPRINT (印记生成)

内部状态：
  - currentPhase: string
  - phaseElapsed: number (ms)
  -势能: number (0-100)
  - tearCount: number (0-3)
  - tearDirections: string[]
  -书写Trajectory: Point[][]
  - dunCount: number
  - cuoCount: number
```

#### 4.2.3 input/ — 输入管线

```
camera-manager.js
  → 请求摄像头权限（1280×720, 30fps）
  → 输出 <video> 元素（隐藏，用于 MediaPipe 输入）

mediapipe-runner.js
  → 加载 MediaPipe Pose (PoseLandmarker)
  → 每帧调用 detect(videoFrame)
  → 输出 33 个 NormalizedLandmark

keypoint-filter.js
  → 卡尔曼滤波平滑关键点位置
  → 计算 confidencePenalty（低置信度关键点权重衰减）
  → 输出 FilteredKeypoints

gesture-detector.js
  → 从关键点计算交互指标：
    - shoulderElbowAngle (左/右)
    - wristSpeed (左/右，含 elbow 退化)
    - leanForward (肩部Z轴)
    - intentDirection (2D向量，意在笔先)
    - breathFrequency (肩部Z轴带通滤波)
  → 检测离散手势：试探、合拢、前倾、撕裂·横/纵/推、空中书写、疾书、徐行、顿、挫、收锋、复笔、分心
  → 输出 gesture:* 事件
```

#### 4.2.4 render/ — 渲染引擎

```
webgpu-setup.js
  → 请求 GPUAdapter + GPUDevice
  → 检测 WebGPU 是否可用 → 不可用则 WebGL fallback
  → 创建 swapChain (canvas.getContext('webgpu'))

raymarch-renderer.js
  → 全屏 Quad（两个三角形覆盖整个 canvas）
  → 顶点 Shader：直通
  → 片元 Shader：对每个像素发射射线，raymarch 64步
  → 每帧从 state/ 读取场景参数写入 Uniform Buffer

sdf-scene.js
  → 组合 SDF 场景图：
    - 基础混沌层：多层 domain warping（3层 FBM + 旋转噪声）
    - 坍缩中心：球形引力场（位置由势能决定）
    - 裂缝：SDF 减法（沿撕裂路径）
    - 书写轨迹：Tube SDF（沿手腕轨迹）
    - 脆弱面：预计算的方向场（引导撕裂路径）
  → 返回场景描述对象 → 传给 raymarch shader

brush-renderer.js (✨ v31新增)
  → 独立 Canvas 2D 叠加层
  → 速度→飞白映射函数 C(s), N(s), W(s), P(s)
  → 每帧读取 wristSpeed → 计算笔触参数 → 绘制
  → 顿挫事件 → 脉冲光晕 + 墨溅粒子

post-process.js
  → 自适应分辨率区域混合
  → 暗角叠加（屏幕四边<8%暗角）
  → 色彩映射（LUT：混沌→蓄势→清明各阶段色彩）
  → 最终输出到 canvas
```

#### 4.2.5 audio/ — 音频引擎

```
audio-manager.js
  → 创建 AudioContext (sampleRate: 44100 或 48000)
  → 加载 AudioWorklet 模块
  → 创建 SharedArrayBuffer (256 floats, 60fps 更新)

synth-engine.js
  → 管理 5 层合成：
    L1: 呼吸层 — 带通白噪声 + LFO 音量调制
    L2: 纹理层 — 粒状合成（噪声粒子随机散布）
    L3: 张力层 — 谐波叠加（基频300Hz + 奇数泛音，音高跟随势能）
    L4: 撕裂层 — 一次性触发（0.3s静默→中高频爆发→泛音散开）
    L5: 清明层 — 五声音阶泛音（523Hz基频，各音不同衰减）
  → 每帧写入 SharedArrayBuffer

worklet-processor.js
  → AudioWorkletProcessor（独立音频线程）
  → 每 128 个采样帧读取 SharedArrayBuffer
  → 插值参数 → 合成音频 → 输出
```

#### 4.2.6 ui/ — 用户界面

```
overlay-manager.js
  → 启动序列：标题浮现 → 摄像头小窗 → 倒计时
  → HUD：势能条（可选）、帧率显示（debug）
  → 隐性引导：光斑演示、淡影示范、复笔暗示
  → 文字提示层（首次使用时）

control-panel.js
  → Esc 触发
  → 菜单项：继续体验、印记画廊、导出、设置、退出
  → 半透明深色底 + 白色细线 + 金色悬停

gallery.js
  → 网格布局显示所有印记缩略图
  → 排序：最新/最深撕裂/风格
  → 点击 → 全屏查看 → 导出/删除

settings.js
  → 渲染质量、帧率限制、音量、语言
  → 启动序列偏好
  → 印记导出分辨率
```

#### 4.2.7 imprint/ — 印记系统

```
generator.js
  → 清明阶段选择最佳画面帧
  → 高分辨率离屏渲染（4800×6400 → 2400×3200）
  → 叠加撕裂路径（狂草笔触风格）
  → 叠加书写轨迹（金色，飞白保留，顿挫渲染）
  → 覆盖宣纸纹理（<3%噪声）

calligraphy.js
  → 竖排繁体题跋布局
  → 格式：[年月日] 於 [城市] · 第[N]度開天\n撕裂深度 [Lv.X]\n筆數 [獨筆/雙飛/三疊]\n風格 [剛猛/流暢/凝澀]\n頓挫 [N]處 · 飛白 [M]筆
  → Canvas 2D 竖排文字渲染

exporter.js
  → 调用 Tauri fs API 保存 PNG
  → 更新 IndexedDB 元数据
  → 文件名格式：YYYY-MM-DD_HH-MM-SS_Lv{N}.png
```

#### 4.2.8 backend/tauri/ — Rust 后端

```rust
// main.rs — 应用入口
// window.rs — 全屏窗口管理
//   - 创建无边框全屏窗口
//   - 监听 Esc 键 → 发送事件到前端
//   - 处理窗口关闭
// fs.rs — 文件系统命令
//   - save_imprint(path, data) → 保存印记 PNG
//   - read_imprint(path) → 读取印记
//   - list_imprints() → 列出印记目录
//   - delete_imprint(path) → 删除印记
//   - read_settings() / write_settings() → 读写设置
```

---

## 5. 数据流与模块间通信

### 5.1 EventBus 设计

```javascript
// src/shared/events.js — 所有事件的唯一真相来源

const Events = {
  // === 应用生命周期 ===
  APP_READY:      'app:ready',
  APP_ERROR:      'app:error',
  APP_QUIT:       'app:quit',

  // === 输入 → 状态机 ===
  GESTURE_PROBE:      'gesture:probe',       // 试探
  GESTURE_CLOSE:      'gesture:close',       // 合拢
  GESTURE_LEAN:       'gesture:lean',        // 前倾
  GESTURE_TEAR_H:     'gesture:tear-h',      // 横撕
  GESTURE_TEAR_V:     'gesture:tear-v',      // 纵斩
  GESTURE_TEAR_PUSH:  'gesture:tear-push',   // 推破
  GESTURE_WRITE:      'gesture:write',       // 空中书写 {position, speed}
  GESTURE_DUN:        'gesture:dun',         // 顿 {position}
  GESTURE_CUO:        'gesture:cuo',         // 挫 {position, angle}
  GESTURE_SHOUFENG:   'gesture:shoufeng',    // 收锋 {speed}
  GESTURE_STILL:      'gesture:still',       // 静止
  GESTURE_DISTRACT:   'gesture:distract',    // 分心

  // === 状态机 → 其他模块 ===
  PHASE_ENTER:    'phase:enter',        // {phase, timestamp}
  PHASE_EXIT:     'phase:exit',         // {phase, duration}
  POTENTIAL_CHANGED: '势能:changed',    // {value, normalized, rateOfChange}
  TEAR_TRIGGERED: 'tear:triggered',     // {direction, depth, path}
  TEAR_COMPOUND:  'tear:compound',      // {tearCount, crossPoints}

  // === 渲染参数 ===
  RENDER_PARAMS:  'render:params',      // 每帧场景参数（高频）
  RENDER_QUALITY: 'render:quality',     // 自适应降质

  // === 音频参数 ===
  AUDIO_PARAMS:   'audio:params',       // 每帧音频参数（高频，SharedArrayBuffer）

  // === UI事件 ===
  UI_SHOW_PANEL:  'ui:show-panel',
  UI_HIDE_PANEL:  'ui:hide-panel',
  UI_GUIDANCE:    'ui:guidance',        // 隐性引导触发

  // === 印记事件 ===
  IMPRINT_GENERATE: 'imprint:generate',
  IMPRINT_READY:    'imprint:ready',
  IMPRINT_EXPORT:   'imprint:export',
  IMPRINT_SAVED:    'imprint:saved',
};
```

### 5.2 高频数据路径（每帧更新）

```
每帧 (目标60fps):
  Camera → MediaPipe → FilteredKeypoints
    → gesture-detector.js
      → EventBus: gesture:write {position, speed}  (如有书写)
      → EventBus:势能:changed {value, normalized}
    → state-machine.js
      → EventBus: render:params {phase,势能, tearPath, brushTrails, intentDir}
      → SharedArrayBuffer: audio params (256 floats)
    → raymarch-renderer.js (读 render:params → 更新 Uniform Buffer → draw)
    → brush-renderer.js (读 render:params → 更新 Canvas 2D)
    → worklet-processor.js (读 SharedArrayBuffer → 合成音频)
```

### 5.3 低频数据路径（事件触发）

```
事件触发:
  手势触发 → EventBus → 状态机判断转换条件 → 阶段切换
    → render: 更新色彩映射
    → audio: 更新合成层
    → ui: 更新叠加提示
    → imprint: (如是清明结束) 触发生成
```

---

## 6. 状态机设计

### 6.1 状态定义

```javascript
// 9个主阶段 + 2个元状态
const Phases = {
  IDLE:           'idle',           // 应用刚启动，未初始化
  STARTUP:        'startup',        // 启动序列（标题浮现3s）
  CAMERA_CHECK:   'camera-check',   // 摄像头检查（5s）
  READY:          'ready',          // 就绪（2s过渡）
  KUNJU:          'kunju',          // 困局·元气（试探阶段，默认50s）
  XUSHI:          'xushi',          // 蓄势·凝势（合拢+前倾，势能累积）
  POKONG:         'pokong',         // 破空·裂势（撕裂瞬间，5s）
  SHUXIE:         'shuxie',         // 书写·走笔（空中书写，40s）
  SHOUFENG:       'shoufeng',       // 收锋·回势（回收15s）
  QINGMING:       'qingming',       // 清明·气韵（欣赏30s）
  IMPRINT:        'imprint',        // 印记生成（5s）
};
```

### 6.2 状态转换图

```
IDLE → STARTUP → CAMERA_CHECK → READY → KUNJU
                                              │
                                    ┌─────────┼─────────┐
                                    │ 试探     │ 120s超时  │
                                    ▼         ▼          │
                                  KUNJU   120s引导演示    │
                                  (涟漪)  (仅一次)       │
                                    │                    │
                                    │ 合拢+前倾           │
                                    ▼                    │
                                  XUSHI                  │
                              (势能累积中)               │
                                    │                    │
                                    │ 势能≥阈值 + 爆发   │
                                    ▼                    │
                                  POKONG                 │
                              (撕裂! 0.3s静默)           │
                                    │                    │
                                    ▼                    │
                                  SHUXIE                 │
                              (空中书写)                 │
                               │         │               │
                               │ 收锋    │ 复笔(合拢+前倾)
                               ▼         ▼               │
                           SHOUFENG   XUSHI (2nd/3rd)    │
                               │         │               │
                               ▼         ▼               │
                           QINGMING  POKONG → SHUXIE     │
                               │                         │
                               │ 30s或用户确认            │
                               ▼                         │
                             IMPRINT                     │
                               │                         │
                    ┌──────────┼──────────┐              │
                    │ 再来一次  │ 保存     │ 退出         │
                    ▼          ▼          ▼              │
                  READY      IMPRINT   应用关闭           │
```

### 6.3 势能累积模型（核心算法）

```javascript
// 势能 E(t) = ∫[t-T, t] w(τ) × Σ 指标 × confidencePenalty dτ

const POTENTIAL_WINDOW = 3.0;  // 累积窗口（秒）
const POTENTIAL_THRESHOLD = 75; // 触发撕裂的最低势能值

const weights = {
  shoulderElbowAngle: 0.40,  // 肩肘角变化（肘部收拢→外展）
  wristSpeed:         0.35,  // 手腕运动强度
  leanForward:        0.25,  // 身体前倾度
};

function calculatePotential(history, t) {
  let integral = 0;
  const windowStart = t - POTENTIAL_WINDOW;

  for (const frame of history) {
    if (frame.t < windowStart) continue;

    const w = 1.0; // 时间权重（可扩展为指数衰减）
    const indicators =
      weights.shoulderElbowAngle * frame.deltaShoulderElbow +
      weights.wristSpeed          * frame.wristSpeed +
      weights.leanForward         * frame.leanForward;

    const penalty = frame.keypointConfidence < 0.4 ? 0.3 : 1.0;

    integral += w * indicators * penalty * frame.dt;
  }

  return clamp(integral, 0, 100);
}
```

### 6.4 状态转换条件表

| 从 | 到 | 条件 | 超时处理 |
|----|----|------|---------|
| STARTUP | CAMERA_CHECK | 标题动画完成 | 3s强制 |
| CAMERA_CHECK | READY | 面部+双肩检测通过 + 倒计时完成 | — |
| CAMERA_CHECK | CAMERA_CHECK | 未检测到面部 | 循环等待，提示"请面对屏幕" |
| READY | KUNJU | 过渡动画完成 | 2s强制 |
| KUNJU | XUSHI | 合拢检测 (双肘内收>1s) + 前倾检测 | 无（用户自由探索） |
| KUNJU | KUNJU | 120s未触发 | 触发隐性引导（光斑演示），势能阈值降低20% |
| XUSHI | POKONG | 势能 ≥ 75 + 爆发检测（肘关节角突变 + 手腕速度峰值） | — |
| XUSHI | KUNJU | 分心检测（头部偏转>25°）持续>3s → 势能重置，回到困局 | — |
| POKONG | SHUXIE | 撕裂动画完成 | 5s强制 |
| SHUXIE | SHOUFENG | 收锋检测（手腕速度<10cm/s持续>2s） | 40s后自动触发收锋 |
| SHUXIE | XUSHI | 复笔检测（再次合拢+前倾，撕裂次数<3） | - |
| SHOUFENG | QINGMING | 轨迹消散完成 | 15s强制 |
| QINGMING | IMPRINT | 30s后或用户按键（空格） | 30s强制 |
| IMPRINT | READY | 用户点击"再来一次" | - |
| IMPRINT | IMPRINT | 用户点击"保存印记" | - |
| IMPRINT | IDLE | 用户点击"退出" | - |

---

## 7. 渲染管线设计

### 7.1 渲染架构

```
┌─────────────────────────────────────────────────────────┐
│                  每帧渲染循环 (60fps目标)                  │
│                                                          │
│  1. 读取当前 phase + 势能 + 场景参数                       │
│  2. 更新 Uniform Buffer                                  │
│  3. 自适应分辨率决策（当前GPU温度 → 区域分辨率）            │
│  4. ┌─────────────────────────────────────┐              │
│     │ Raymarch Pass (WebGPU compute/片元)  │              │
│     │ - 64步 raymarch                      │              │
│     │ - 3层 domain warping                 │              │
│     │ - SDF 场景查询（混沌+裂缝+轨迹）      │              │
│     │ - 输出：原始颜色 + 深度 + 法线        │              │
│     └──────────────┬──────────────────────┘              │
│                    ▼                                     │
│  5. ┌─────────────────────────────────────┐              │
│     │ 后处理 Pass                           │              │
│     │ - 三区域分辨率混合（高斯模糊边界）     │              │
│     │ - 色彩映射 LUT（根据phase）           │              │
│     │ - 暗角叠加                            │              │
│     │ - 输出：最终帧到 canvas               │              │
│     └──────────────┬──────────────────────┘              │
│                    ▼                                     │
│  6. ┌─────────────────────────────────────┐              │
│     │ ✨ 笔触叠加 Pass (Canvas 2D)          │              │
│     │ - 手腕轨迹 → 金色狂草笔触             │              │
│     │ - 速度→飞白参数 C(s),N(s),W(s),P(s)  │              │
│     │ - 顿挫效果叠加                        │              │
│     │ - 输出：叠加到 WebGPU 输出之上        │              │
│     └─────────────────────────────────────┘              │
│                    ▼                                     │
│  7. Present to screen (GPUQueue.submit)                  │
└─────────────────────────────────────────────────────────┘
```

### 7.2 SDF 场景层次

```
SDF场景 = 基础混沌 ∪ 坍缩球 ∪ 裂缝(减法) ∪ 书写轨迹(并集)

基础混沌:
  float chaosSDF(vec3 p) {
    // FBM (Fractal Brownian Motion) — 3层
    float fbm = fbm_3octaves(p, 2.0, 0.5);
    // Domain warping — 用噪声扭曲采样位置
    vec3 q = p + vec3(
      noise_3d(p * 2.0),
      noise_3d(p * 2.0 + vec3(0, 0, 1)),
      noise_3d(p * 2.0 + vec3(0, 1, 0))
    ) * 0.5;
    return length(q) - 1.0 + fbm * 0.3;
  }

坍缩中心:
  float collapseSDF(vec3 p) {
    // 球体，半径随势能减小 (1.5 → 0.2)
    float r = 1.5 -势能_normalized * 1.3;
    return length(p - collapse_center) - r;
  }

裂缝 (SDF减法):
  float tearSDF(vec3 p) {
    // 沿撕裂路径构建 tube-ish 减形体
    // 不是简单的 tube——沿脆弱面方向场变形
    float d = signedDistanceToTearPath(p, tearPath,脆弱面Field);
    return -d; // 负数 = 减法（挖空）
  }

书写轨迹 (SDF并集):
  float brushTrailSDF(vec3 p) {
    // 手腕轨迹 → tube SDF（半径0.02-0.05）
    // 半径由速度映射：慢→粗，快→细
    return tubeSDF(p, brushPoints, variableRadius);
  }
```

### 7.3 自适应分辨率策略

```javascript
// 三区域自适应渲染（笔记本散热保护）
const ZONES = {
  center: { r: 0.3, steps: 64, warping: 3, scale: 1.0   }, // 全分辨率
  middle: { r: 0.7, steps: 32, warping: 2, scale: 0.5   }, // 半分辨率
  edge:   { r: 1.0, steps: 16, warping: 1, scale: 0.25  }, // 1/4分辨率
};

// GPU温度自适应降级
function adaptiveQuality(gpuTemp) {
  if (gpuTemp > 88) return 'emergency';  // 全部降为1/4分辨率
  if (gpuTemp > 82) return 'reduced';    // 中间区降为1/4
  return 'normal';
}
```

### 7.4 WebGPU Fallback 路径

```
WebGPU 可用?
  ├── YES → 使用 WGSL shader + compute shader
  │         性能：60fps @ 1080p (区域自适应)
  │
  └── NO  → WebGL 2.0 fallback
            ├── 使用 GLSL shader（手动转换WGSL→GLSL）
            ├── 无 compute shader → SDF布尔运算在主线程完成
            ├── 单分辨率（无自适应区域）
            └── 性能：30fps @ 720p（预估）
```

---

## 8. 音频管线设计

### 8.1 架构

```
┌───────────────────────────────────────────────────────┐
│              AudioWorklet 独立线程                      │
│                                                        │
│  每 128 samples (~2.9ms @ 44100Hz):                    │
│    ├── 读取 SharedArrayBuffer[0..255]                  │
│    ├── 插值参数（线性插值，避免pop）                     │
│    ├── 合成 L1-L5                                      │
│    ├── 混合 (Master Gain)                              │
│    ├── 软限幅 (tanh)                                   │
│    └── 输出到 output[][]                               │
└────────────────────┬──────────────────────────────────┘
                     │ SharedArrayBuffer (256 Float32)
┌────────────────────▼──────────────────────────────────┐
│              主线程 (synth-engine.js)                   │
│                                                        │
│  每帧 (~16ms @ 60fps):                                 │
│    ├── 读取当前 phase + 势能 + 手势事件                  │
│    ├── 计算 5 层参数                                    │
│    ├── 写入 SharedArrayBuffer[0..255]                  │
│    └── Atomics.notify (可选，worklet用polling)          │
└───────────────────────────────────────────────────────┘
```

### 8.2 五层参数规格

| 层 | 参数 | 范围 | 含义 |
|----|------|------|------|
| **L1 呼吸** | `breathFreq` | 0.08-0.50 Hz | 呼吸频率（困局慢→蓄势快） |
| | `breathDepth` | 0.1-0.8 | 呼吸深度（音量调制幅度） |
| | `noiseQ` | 0.5-3.0 | 噪声Q值（音色明暗） |
| **L2 纹理** | `grainDensity` | 5-40 粒子/秒 | 噪声粒子密度（手部运动→密度增） |
| | `grainSpread` | 0.0-1.0 | 粒子左右声道散布 |
| **L3 张力** | `tensionFreq` | 300-900 Hz | 谐波基频（势能→频率上升） |
| | `tritoneMix` | 0.0-0.6 | 增四度混合比（临界前3秒渐入） |
| | `harmonicCount` | 1-7 | 奇数泛音数量 |
| **L4 撕裂** | `tearTrigger` | bool | 触发撕裂瞬间（一次性） |
| | `tearBurstDur` | 200 ms | 中高频爆发持续 |
| | `overtoneDecay` | [5, 5] floats | 各泛音衰减时间 |
| **L5 清明** | `pentatonicBase` | 523 Hz | 五声音阶基频（宫=523Hz） |
| | `overtoneLevels` | [5, 5] floats | 各音音量 |
| | `decayRates` | [5, 5] floats | 各音衰减速率 |

### 8.3 SharedArrayBuffer 布局

```
Offset  Size    Parameter
0       1       L1.breathFreq
1       1       L1.breathDepth
2       1       L1.noiseQ
3       1       L2.grainDensity
4       1       L2.grainSpread
5       1       L3.tensionFreq
6       1       L3.tritoneMix
7       1       L3.harmonicCount
8       1       L4.tearTrigger (0→1 edge)
9       1       L4.tearBurstDur
10      5       L4.overtoneDecay[0..4]
15      1       L5.pentatonicBase
16      5       L5.overtoneLevels[0..4]
21      5       L5.decayRates[0..4]
26      1       Master.gain
27      1       Master.mute (0/1)
28      228     reserved
----------------
Total:  256 Float32 = 1024 bytes
```

---

## 9. 输入管线设计

### 9.1 数据流

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ 笔记本摄像头   │───→│ MediaPipe    │───→│ keypoint-filter  │
│ 720p 30fps   │    │ Pose WASM    │    │ 卡尔曼 + 置信度   │
│ video元素    │    │ 33 landmarks │    │ FilteredKeypoints│
└──────────────┘    └──────────────┘    └────────┬─────────┘
                                                  │
                                                  ▼
┌──────────────────────────────────────────────────────────┐
│                  gesture-detector.js                      │
│                                                           │
│  关键点 → 交互指标计算：                                   │
│    shoulderElbowAngle = angle(shoulder, elbow, hip_est)   │
│    wristSpeed = |wrist(t) - wrist(t-1)| / dt              │
│    leanForward = shoulderZ_avg - baselineZ                │
│    intentDirection = 0.4*肩肘方向 + 0.35*腕趋势 + 0.25*倾 │
│    breathFreq = bandpass(shoulderZ, 0.1-0.5Hz)           │
│                                                           │
│  指标 → 手势检测（启发式规则）：                            │
│    试探: 单手速度<15cm/s                                  │
│    合拢: 肩肘角缩小持续>1s                                 │
│    撕裂·横: 肩肘角突变(Δ>30° in <0.3s)                   │
│    撕裂·纵: 腕速>50cm/s + 垂直方向                        │
│    撕裂·推: Z轴突然后退 + 腕前推                          │
│    顿: 腕速>15→<3 in <0.3s                               │
│    挫: 方向变化>60° in <0.3s                             │
│    收锋: 腕速<10cm/s 持续>2s                              │
│                                                           │
│  输出：EventBus gesture:* events                           │
└──────────────────────────────────────────────────────────┘
```

### 9.2 手腕置信度退化策略

```javascript
// 手腕在摄像头FOV边缘时常丢失
// 退化为肘部速度 × 1.5 作为近似
function getWristSpeed(landmarks, prevLandmarks, side) {
  const wrist = landmarks[side === 'left' ? 15 : 16];
  const elbow = landmarks[side === 'left' ? 13 : 14];

  if (wrist.visibility > 0.4) {
    // 主路径：直接使用手腕位置
    const prevWrist = prevLandmarks[side === 'left' ? 15 : 16];
    return distance(wrist, prevWrist) / deltaTime;
  } else {
    // 退化路径：用肘部推断
    const prevElbow = prevLandmarks[side === 'left' ? 13 : 14];
    return (distance(elbow, prevElbow) / deltaTime) * 1.5;
  }
}
```

### 9.3 卡尔曼滤波参数

```javascript
// 用于手腕位置平滑的卡尔曼滤波器
const KALMAN_PARAMS = {
  processNoise: 0.01,       // Q — 过程噪声（假设恒定速度模型）
  measurementNoise: 0.1,    // R — 测量噪声（MediaPipe 约2-5px抖动）
  initialError: 1.0,        // P₀ — 初始状态误差
  dt: 1/30,                 // 时间步长 (30fps)
};

// 状态向量: [x, y, vx, vy]
// 观测向量: [x_observed, y_observed]
```

---

## 10. 接口契约

### 10.1 核心数据结构

```javascript
/**
 * @typedef {Object} FilteredKeypoints
 * @property {number} timestamp — 帧时间戳 (ms)
 * @property {Object<number, {x:number, y:number, z:number, visibility:number}>} landmarks
 *           key = MediaPipe landmark index (0-32)
 * @property {number} avgConfidence — 所有可见关键点的平均置信度
 */

/**
 * @typedef {Object} GestureEvent
 * @property {string} type — gesture:* 事件类型
 * @property {number} timestamp — 触发时间 (ms)
 * @property {string} phase — 当前阶段
 * @property {Object} data — 手势特有数据
 *   For GESTURE_WRITE:
 *     {hand: 'left'|'right', position: {x,y}, speed: number, direction: number}
 *   For GESTURE_DUN:
 *     {hand: 'left'|'right', position: {x,y}, holdDuration: number}
 *   For GESTURE_CUO:
 *     {hand: 'left'|'right', position: {x,y}, angleChange: number}
 *   For GESTURE_TEAR_*:
 *     {direction: 'h'|'v'|'push', intensity: number, path: {x,y}[]}
 */

/**
 * @typedef {Object} PhaseTransition
 * @property {string} from — 离开的阶段
 * @property {string} to — 进入的阶段
 * @property {string} trigger — 触发原因（gesture类型 或 'timeout'）
 * @property {number} elapsed — 在前阶段停留的时长 (ms)
 * @property {number} timestamp — 转换时间 (ms)
 */

/**
 * @typedef {Object} ImprintMetadata
 * @property {string} id — 唯一标识 "YYYY-MM-DD_HH-MM-SS"
 * @property {string} timestamp — ISO 8601 时间戳
 * @property {number} tearDepth — 撕裂深度 1-10
 * @property {number} strokeCount — 笔数 1-3
 * @property {'刚猛'|'流畅'|'凝涩'} style — 风格标签
 * @property {number} duration — 体验时长(秒)
 * @property {string[]} tearDirections — ['横撕', '纵斩', '推破']
 * @property {number} dunCount — 顿次数
 * @property {number} cuoCount — 挫次数
 * @property {number} feibaiRatio — 飞白比例
 * @property {boolean} breathSynced — 是否触发呼吸同步
 * @property {string} filename — 文件名
 */

/**
 * @typedef {Object} RenderParams
 * @property {string} phase — 当前阶段
 * @property {number} phaseProgress — 阶段内进度 0-1
 * @property {number}势能 — 当前势能值 0-100
 * @property {number}势能Normalized — 归一化势能 0-1
 * @property {{x:number,y:number}[]} tearPath — 当前撕裂路径点
 * @property {{hand:string, points:{x:number,y:number}[], speeds:number[]}[]} brushTrails
 * @property {{x:number,y:number}} intentDirection — 意在笔先方向向量
 * @property {{x:number,y:number}} collapseCenter — 坍缩中心位置
 * @property {number} time — 着色器时间 (秒)
 */
```

### 10.2 Tauri IPC 接口

```rust
// 前端 invoke → Rust 后端

// 保存印记 PNG
#[tauri::command]
fn save_imprint(filename: String, data: Vec<u8>) -> Result<String, String>;

// 读取印记
#[tauri::command]
fn read_imprint(filename: String) -> Result<Vec<u8>, String>;

// 列出所有印记
#[tauri::command]
fn list_imprints() -> Result<Vec<String>, String>;

// 删除印记
#[tauri::command]
fn delete_imprint(filename: String) -> Result<(), String>;

// 读写设置
#[tauri::command]
fn read_settings() -> Result<Settings, String>;
#[tauri::command]
fn write_settings(settings: Settings) -> Result<(), String>;

// 获取应用数据目录
#[tauri::command]
fn get_app_data_dir() -> Result<String, String>;
```

---

## 11. 存储方案

### 11.1 存储分层

| 数据类型 | 存储位置 | 格式 | 预估大小 |
|---------|---------|------|---------|
| 印记 PNG | `%APPDATA%/势破空/imprints/` | PNG 2400×3200 | ~2-5MB/张 |
| 印记元数据 | IndexedDB → `metadata` store | JSON | ~1KB/张 |
| 用户设置 | IndexedDB → `settings` store | JSON | <1KB |
| 使用统计 | IndexedDB → `stats` store | JSON | <1KB |
| 首次使用标记 | localStorage | boolean | 1 byte |

### 11.2 IndexedDB Schema

```javascript
// 数据库名：shi-pokong-db, 版本：1

// Object Store: metadata
// keyPath: 'id'
{
  id: '2026-07-07_14-23-01',
  timestamp: '2026-07-07T14:23:01+08:00',
  tearDepth: 3,
  strokeCount: 2,
  style: '流畅',
  duration: 187,
  tearDirections: ['横撕', '纵斩'],
  dunCount: 4,
  cuoCount: 2,
  feibaiRatio: 0.35,
  breathSynced: true,
  filename: '2026-07-07_14-23-01_Lv3.png',
}

// Object Store: settings
// keyPath: 'key'
{ key: 'renderQuality', value: 'high' }
{ key: 'frameLimit', value: 60 }
{ key: 'volume', value: 0.7 }
{ key: 'startupSequence', value: 'simplified' }
{ key: 'imprintResolution', value: 'standard' }
{ key: 'autoSave', value: true }
{ key: 'language', value: 'zh' }

// Object Store: stats
// keyPath: 'key'
{ key: 'totalSessions', value: 23 }
{ key: 'highestTearDepth', value: 8 }
{ key: 'consecutiveDays', value: 4 }
{ key: 'firstSession', value: '2026-07-07T14:23:01+08:00' }
{ key: 'lastSession', value: '2026-07-11T21:45:33+08:00' }
```

---

## 12. 性能预算与自适应策略

### 12.1 帧预算 (60fps = 16.67ms/frame)

| 组件 | 预算 | 备注 |
|------|------|------|
| MediaPipe 推理 | 5-8ms | WASM，在GPU上运行 |
| 手势检测 | <0.5ms | 纯JS计算 |
| SDF Raymarch (WebGPU) | 6-8ms | 自适应分辨率 |
| 后处理 | <1ms | 简单混合+LUT |
| 笔触叠加 (Canvas 2D) | <1ms | 仅 SHUXIE/SHOUFENG 阶段 |
| 音频参数更新 | <0.2ms | 写入 SharedArrayBuffer |
| 总计 | **12-18ms** | 8ms余量给JS引擎GC |

### 12.2 GPU温度响应

| GPU温度 | 动作 | 视觉影响 |
|---------|------|---------|
| <78°C | 正常 | 全质量 |
| 78-82°C | 中间区域降为半分辨率 | 几乎不可见 |
| 82-88°C | 中间区域降为1/4，边缘更激进 | 轻微可见（高斯模糊补偿） |
| >88°C | 全部降为半分辨率，帧率目标降至30fps | 可见但可接受 |
| >92°C | 强制降低至全1/4分辨率，暂停音频合成 | 明显退化，但防止GPU过热关机 |

### 12.3 内存预算

| 组件 | 预估内存 |
|------|---------|
| MediaPipe WASM 模型 | ~40MB |
| WebGPU 纹理 + Buffer | ~50MB |
| Canvas 元素（最多3个） | ~30MB |
| JS 堆 | ~10MB |
| IndexedDB | ~5MB |
| 总计 | **~135MB**（16GB内存的<1%） |

---

## 13. 构建与部署

### 13.1 开发环境

```bash
# 前置依赖
- Node.js 20+ (LTS)
- Rust 1.80+ (stable)
- Windows 10/11 SDK
- WebView2 Runtime (Windows 11已内置，Windows 10需安装)

# 初始化
npm create tauri-app@latest 势破空 -- --template vanilla
cd 势破空
npm install @mediapipe/tasks-vision  # MediaPipe Web
```

### 13.2 项目配置关键点

```json
// src-tauri/tauri.conf.json 关键配置
{
  "app": {
    "windows": [
      {
        "title": "势·破空",
        "fullscreen": true,
        "decorations": false,
        "resizable": false,
        "width": 1920,
        "height": 1080
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "icon": ["icons/icon.ico"],
    "resources": [
      "assets/mediapipe/*",   // MediaPipe WASM模型
      "assets/shaders/*",     // WGSL shader文件
      "assets/fonts/*"        // 中文字体
    ]
  },
  "allowlist": {
    "fs": { "scope": ["$APPDATA/势破空/**"] }
  }
}
```

### 13.3 构建脚本

```powershell
# scripts/build.ps1 — 生产构建
npm run build          # Vite 构建前端
cargo tauri build      # Tauri 打包 .exe/.msi
# 输出：src-tauri/target/release/bundle/
```

---

## 14. 风险应对实现

| 风险 | 架构层面的应对 |
|------|--------------|
| **WebGPU不可用** | `webgpu-setup.js` 检测 → 自动降级 WebGL 2.0；WGSL→GLSL shader 提供两份 |
| **摄像头被拒** | `camera-manager.js` 显示引导页："请在系统设置中允许摄像头访问" |
| **低光追踪失败** | `keypoint-filter.js` 对比度检测 → 提示"建议打开房间灯光"；confidencePenalty 机制 |
| **GPU降频** | 自适应分辨率（§12.2）+ GPU温度监控（每5秒查询 `nvidia-smi` 或浏览器API） |
| **MediaPipe加载慢** | P0测量加载时间；启动序列中异步预加载；显示加载进度 |
| **隐性引导失效** | 120s未触发→光斑演示（仅一次）→阈值降低20%；超时后自动演示 |

---

## 15. 开发序列

### 15.1 P0: 三件套验证 (Week 1)

**目标：** Tauri窗口 + WebGPU三角形 + MediaPipe骨骼点 = 共存于同一窗口

**步骤：**
1. `cargo tauri init` 创建项目骨架
2. 前端 index.html 加载 WebGPU，渲染一个彩色三角形
3. 同一页面加载 MediaPipe Pose，打开摄像头，在Canvas上绘制骨骼点
4. 验证：三角形和骨骼点同时显示，无明显性能问题

**文件：**
- `src/frontend/index.html`
- `src/frontend/app/main.js`
- `src/frontend/render/webgpu-setup.js`
- `src/frontend/input/camera-manager.js`
- `src/frontend/input/mediapipe-runner.js`
- `src-tauri/` (Tauri CLI生成)

### 15.2 后续阶段概要

| 阶段 | 周 | 核心产出 | 前置依赖 |
|------|---|---------|---------|
| P1 混沌渲染 | W2-5 | SDF噪声场景可鼠标探索 | P0通过 |
| P2 身体驱动 | W6-9 | 身体动作→涟漪 | P1通过 |
| P3 撕裂 | W10-12 | 势能累积+裂缝 | P2通过 |
| P4 完整闭环 | W13-16 | 声音+印记+启动序列 | P3通过 |
| P5 印记画廊 | W17-18 | 画廊UI+导出 | P4通过 |
| P6 测试打磨 | W19-22 | 用户测试+性能优化 | P5通过 |
| P7 打包发布 | W23-24 | .exe安装包 | P6通过 |

---

## 16. 附录：依赖清单

### 16.1 NPM 依赖

| 包 | 版本 | 用途 | 选型理由 |
|----|------|------|---------|
| `@mediapipe/tasks-vision` | ^0.10.x | 姿态检测 | Google官方，WASM，浏览器内运行 |
| `@tauri-apps/api` | ^2.x | Tauri IPC | 前端调用Rust命令 |
| `@tauri-apps/cli` | ^2.x | Tauri CLI | 构建/开发工具 |

> 注意：不依赖任何前端框架。Vanilla JS only。

### 16.2 Rust (Cargo) 依赖

| crate | 版本 | 用途 |
|-------|------|------|
| `tauri` | 2.x | 应用框架 |
| `tauri-plugin-fs` | 2.x | 文件系统插件 |
| `serde` | 1.x | 序列化（JSON配置） |
| `serde_json` | 1.x | JSON处理 |

### 16.3 系统依赖

| 组件 | 版本要求 | 备注 |
|------|---------|------|
| Windows | 10 (build 19041+) 或 11 | WebView2 Runtime |
| GPU | NVIDIA RTX 5070 笔记本 | 支持 WebGPU |
| 摄像头 | 内置，720p+ | 30fps |
| 内存 | ≥16GB | MediaPipe WASM约需40MB |

---

> **架构文档版本：** v1.0 | 2026-07-07
> **下次更新触发：** P0验证完成后，根据三件套实测结果调整
> **关联文档：** PRD.md v31.0, CLAUDE.md, docs/api-contracts.md (待创建), docs/state-machine.md (待创建)

# 势·破空 (SHI: Shattering the Void)

<p align="center">
  <img src="https://img.shields.io/badge/status-pre--alpha-red?style=flat-square" alt="status: pre-alpha">
  <img src="https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square" alt="platform: Windows">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license: MIT">
  <img src="https://img.shields.io/badge/engine-Tauri%202.x%20%2B%20WebGPU-orange?style=flat-square" alt="engine: Tauri + WebGPU">
</p>

> 双击即开的 `.exe` 桌面应用 —— 打开笔记本摄像头，用双手蓄力、撕裂 SDF 数学混沌空间，生成数字狂草拓片。

---

## 这是什么？

每天早上打开笔记本，面对的是信息的混沌——邮件、消息、推荐流。

这件作品把这个日常体验变成了一个 **3 分钟的仪式**：

> **双手撕开混沌 = 用意志力在信息洪流中开辟秩序。**

---

## 怎么运行？

### 前置要求

| 组件 | 最低要求 |
|------|---------|
| 操作系统 | Windows 10 (build 19041+) 或 Windows 11 |
| GPU | 支持 WebGPU（NVIDIA RTX 20 系列+ / AMD RX 6000 系列+） |
| 摄像头 | 内置，720p+，30fps |
| 内存 | ≥ 8GB（推荐 16GB） |

### 安装

1. 从 [Releases](../../releases) 下载 `势破空-Setup.exe` (~35MB)
2. 双击安装
3. 双击桌面图标 → 自动全屏
4. 允许摄像头权限
5. 面对屏幕，用双手探索混沌 → 蓄力 → 撕裂 → 书写 → 带走印记

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| **应用壳** | [Tauri 2.x](https://v2.tauri.app/) (Rust) | .exe 约 35MB，原生全屏窗口 |
| **渲染引擎** | WebGPU (WGSL) + SDF Raymarching | 64 步光线步进，自适应分辨率 |
| **姿态检测** | [MediaPipe Pose](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) (Web) | WASM 浏览器内运行，33 关键点 |
| **音频合成** | Web Audio API + AudioWorklet | 独立音频线程，5 层合成引擎 |
| **前端** | Vanilla JS (ES2022+) + Canvas 2D | 零框架开销，手动控制渲染路径 |
| **存储** | IndexedDB + 本地文件系统 | 元数据在浏览器，印记 PNG 在本地 |

### 选型哲学

| 我们不选 | 原因 |
|---------|------|
| Electron | 打包体积 > 150MB |
| React / Vue | GC 抖动导致渲染掉帧 |
| Python + OpenCV | 用户需安装 Python，违背"双击即用" |
| Unity / Unreal | 启动慢（> 10s），不适合 3 分钟体验 |
| 云端 API | 要求网络连接，违背"纯本地"原则 |

---

## 项目结构

```
势破空/
├── src/
│   ├── frontend/          ← Web 前端
│   │   ├── app/           ←   应用生命周期
│   │   ├── state/         ←   状态机 + 势能算法
│   │   ├── input/         ←   摄像头 → MediaPipe → 手势检测
│   │   ├── render/        ←   WebGPU SDF Raymarching
│   │   ├── audio/         ←   Web Audio API 5 层合成
│   │   ├── ui/            ←   叠加层 / 控制面板 / 画廊
│   │   └── imprint/       ←   印记生成 / 题跋 / 导出
│   ├── backend/           ← Rust 后端（Tauri 命令）
│   │   └── tauri/         ←   窗口管理 / 文件系统
│   └── shared/            ← 跨模块类型 / 常量 / 事件
├── docs/                  ← 产品需求 + 技术架构
├── tests/                 ← 测试（镜像 src/ 结构）
├── scripts/               ← 构建 / 部署脚本
└── .github/               ← Issue / PR 模板 + CI
```

详见 [`docs/architecture.md`](docs/architecture.md)

---

## 开发

### 环境搭建

```bash
# 前置依赖
- Node.js 20+ (LTS)
- Rust 1.80+ (stable)
- Windows 10/11 SDK
- WebView2 Runtime (Windows 11 已内置)

# 克隆与安装
git clone https://github.com/ly99LLL/Momentum-Breaking-the-Sky.git
cd Momentum-Breaking-the-Sky
npm install
```

### 常用命令

```bash
npm run dev          # 开发模式（热重载）
npm run build        # 生产构建
cargo tauri build    # 打包 .exe / .msi
```

### 项目纪律

- **每个 `.js` 文件 ≤ 300 行**，超过必须拆分
- **所有模块通过 EventBus 通信**，禁止直接 import 具体实现
- **所有外部依赖记录在 [`docs/architecture.md`](docs/architecture.md) §16**
- 详见 [`CLAUDE.md`](CLAUDE.md)（项目宪法）

---

## 开发路线图

| 阶段 | 周期 | 目标 |
|------|------|------|
| **P0** 三件套验证 | Week 1 | Tauri + WebGPU + MediaPipe 共存 |
| **P1** 混沌渲染 | Week 2-5 | SDF 噪声场景可鼠标探索 |
| **P2** 身体驱动 | Week 6-9 | 身体动作 → 涟漪 |
| **P3** 撕裂 | Week 10-12 | 势能累积 + 裂缝 |
| **P4** 完整闭环 | Week 13-16 | 声音 + 印记 + 启动序列 |
| **P5** 印记画廊 | Week 17-18 | 画廊 UI + 导出 |
| **P6** 测试打磨 | Week 19-22 | 用户测试 + 性能优化 |
| **P7** 打包发布 | Week 23-24 | .exe 安装包 |

---

## 文档

| 文档 | 内容 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 产品需求文档（v31.0） |
| [`docs/architecture.md`](docs/architecture.md) | 技术架构文档 |
| [`CLAUDE.md`](CLAUDE.md) | 项目宪法（AI 协作约束） |
| [`CHANGELOG.md`](CHANGELOG.md) | 变更日志 |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | 贡献指南 |

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

*"在自己的笔记本上，用自己的双手，撕开数学的混沌——然后，写下属于自己的那笔狂草。"*

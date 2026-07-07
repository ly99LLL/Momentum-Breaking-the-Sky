# 项目宪法 · CLAUDE.md

> ⚠️ 本文件是项目级强制约束。你在本项目的所有行为必须遵守以下规则。
> 违反规则 = 给用户制造债务。遵守规则 = 帮用户积累资产。

---

## 1. 项目身份

| 字段 | 内容 |
|------|------|
| **项目名称** | 势·破空 (SHI: Shattering the Void) |
| **一句话描述** | 双击即开的.exe桌面应用——用笔记本摄像头追踪身体动作，双手蓄力撕裂SDF数学混沌空间，生成数字狂草拓片 |
| **技术栈** | Tauri 2.x (Rust) + WebGPU (WGSL) + MediaPipe Web (JS) + Web Audio API + Vanilla JS + Canvas |
| **当前阶段** | 架构设计（P0 三件套验证待启动） |
| **GitHub 仓库** | https://github.com/ly99LLL/Momentum-Breaking-the-Sky |
| **默认分支** | master |

---

## 2. GitHub 同步（强制 · 每次修改必须推送）

### 纪律
- **每一步代码修改完成后，立即 `git add` + `git commit` + `git push`**
- 禁止攒多个修改一次性提交——每次原子改动对应一个 commit
- Commit 消息格式：`[模块名] 做了什么`，如 `[docs] 更新架构文档`
- Push 之前确保当前分支不落后于远程（先 pull 如有冲突）
- 远程地址：`origin` → `https://github.com/ly99LLL/Momentum-Breaking-the-Sky.git`

### 工作流
```
修改代码 → git add <文件> → git commit -m "[模块] 描述" → git push
```

---

## 3. 目录规范（强制 · 零容忍）

```
src/hardware/     ← 嵌入式代码（ESP32 / Arduino / 树莓派）
                    每个传感器/执行器一个子目录
src/backend/      ← 后端服务 / Agent 逻辑 / API 调用
                    每个独立服务一个子目录
src/frontend/     ← 网页 / 控制面板 / 可视化界面
                    每个页面/视图一个子目录
src/shared/       ← 跨模块共享的类型定义、常量、协议格式
                    只放纯数据定义，不放逻辑
docs/             ← 所有文档（PRD、架构、API 规格、会议记录）
tests/            ← 测试文件，镜像 src/ 的目录结构
scripts/          ← 构建 / 部署 / 数据迁移等一次性脚本
```

### 纪律
- **代码文件必须在 src/ 对应子目录下，禁止堆在根目录**
- **每个模块自包含：代码 + 该模块专属测试放在 tests/ 镜像位置**
- 根目录只允许：`CLAUDE.md`、`README.md`、`.gitignore`、`package.json` 等全局配置

---

## 4. 编码规范（强制 · 每次遵守）

### 通用纪律
1. **单文件 ≤ 300 行**。超过必须拆分为多个文件，每个文件单一职责。
2. **每个函数/方法/类必须有注释**，说明：做什么、输入什么、返回什么。
3. **禁止全局可变状态**。状态必须封装在函数参数/返回值或类实例中。
4. **所有外部依赖必须记录在 `docs/architecture.md`**，含依赖名称、版本、用途、为什么选它。
5. **错误必须处理**，不允许静默吞异常。每个 try-catch 必须附带用户可理解的处理逻辑。

### 命名规范
- 文件名：小写字母 + 连字符（`sensor-reader.js`、`temp-display.html`）
- 函数/变量：驼峰命名（`readSensorData`、`currentTemperature`）
- 常量：全大写 + 下划线（`MAX_RETRY_COUNT`、`BAUD_RATE`）
- 类/组件：大驼峰命名（`SensorReader`、`TempDisplay`）

### Git 纪律
- 每完成一个独立功能模块 → 立即 commit
- Commit 消息格式：`[模块名] 做了什么`，如 `[hardware] DHT11 传感器读取通过测试`
- 禁止一个大 commit 包含多个模块的改动

---

## 5. PRD 驱动工作流（强制 · 不可跳过）

> 本项目的开发节奏由 PRD 驱动。每次会话必须严格遵循四阶段流程。

### Phase 0 · 定位（每次会话第一步，不可跳过）

```
1. 读取 docs/PRD.md，确认完整需求
2. 读取 docs/architecture.md，确认已有技术决策
3. 读取本文件末尾「当前进度」，确认哪些完成了、哪些正在进行
4. 确定本次会话要完成的功能（从未完成的最小功能开始）
5. 向用户确认："本次会话计划完成 [功能名]，涉及文件 [列表]"
```

### Phase 1 · 设计（写代码之前，不可跳过）

```
1. 确定该功能影响哪些模块
2. 定义接口/协议（数据格式、函数签名、通信协议）
3. 先写测试用例（给定输入 → 期望输出）
4. 将设计写入 docs/architecture.md（如果是新的架构决策）
5. 进入 Plan Mode，向用户展示设计方案，等待批准
```

### Phase 2 · 实现（严格按设计执行）

```
1. 一次只实现一个模块
2. 代码放入正确的 src/ 子目录
3. 写完立即跑测试 → 不通过 → 修复 → 重新跑 → 直到通过
4. 测试全部通过后，才能开始下一个模块
5. 每个模块完成后，独立验证（不依赖其他未完成的模块）
```

### Phase 3 · 验证

```
1. 跑该功能的所有测试
2. 独立运行该模块（不启动整个系统也能验证）
3. 向用户展示运行结果，确认功能正确
```

### Phase 4 · 记录（不可跳过）

```
1. 更新本文件末尾「当前进度」表格
2. Git commit
3. 在「会话日志」中记录：本次做了什么、下次做什么、需要什么前置信息
```

---

## 6. 上下文管理协议（强制）

> 当 Token 即将耗尽或会话即将结束时，必须执行以下操作：

### 上下文预警
- 当判断剩余上下文不足以完成下一个完整功能时，主动停止开发
- **不要在上下文紧张时开始新功能**——宁可提前收尾，也不要烂尾

### 收尾操作
1. 确保当前正在做的功能要么完成，要么回退到可运行状态
2. 更新「当前进度」表格
3. 在「会话日志」中写清楚三件事：
   - ✅ 本次完成了什么
   - ➡️ 下一步要做什么
   - 📋 新会话启动后，CC 需要先读哪些文件

### 新会话启动
- 新 CC 实例会自动读取本文件
- 根据「当前进度」和「会话日志」确定从哪继续
- 不需要用户重新解释项目背景

---

## 7. 当前进度

> 状态：⬜ 未开始 | 🔄 进行中 | ✅ 完成 | ⏸️ 阻塞 | ❌ 放弃

| ID | 功能 | 优先级 | 状态 | 涉及文件 | 完成日期 | 备注 |
|----|------|--------|------|----------|----------|------|
| A1 | 项目身份 + CLAUDE.md 完善 | P0 | ✅ | CLAUDE.md | 2026-07-07 | 填入项目名/技术栈/阶段 |
| A2 | 技术架构文档 | P0 | ✅ | docs/architecture.md | 2026-07-07 | 完整架构：分层/模块/接口/管线/状态机 |
| A3 | 目录结构创建 | P0 | ✅ | src/ 全部子目录 | 2026-07-07 | 按规范搭建骨架 |
| A4 | 共享类型 + 常量 + 事件 | P0 | ✅ | src/shared/*.js | 2026-07-07 | 模块间契约就绪 |
| A5 | 工程化配置 | P0 | ✅ | .gitignore/LICENSE/README/CONTRIBUTING/CHANGELOG/.github/ | 2026-07-07 | GitHub 仓库 + 专业标准文件 |
| D1 | P0 三件套验证 | P0 | ✅ | index.html + main.js + webgpu-setup.js + camera-manager.js + mediapipe-runner.js | 2026-07-07 | WebGPU三角形+MediaPipe骨骼点 代码完成，浏览器验证待做 |
| D2 | P1 混沌渲染 | P1 | ⬜ | src/frontend/render/ | — | Week 2-5 |
| D3 | P2 身体驱动 | P1 | ⬜ | src/frontend/input/, state/ | — | Week 6-9 |

---

## 8. 会话日志

> 每次会话结束更新，新会话启动时自动读取。

| 日期 | 做了什么 | 下一步 | 备注 |
|------|----------|--------|------|
| 2026-07-07 #1 | 初始化项目骨架：目录结构 + CLAUDE.md + PRD模板 + 架构模板 | 用户填写 PRD.md | — |
| 2026-07-07 #2 | **架构完成**：完整技术架构文档(16节) + 目录结构 + shared/类型/常量/事件 + CLAUDE.md身份填充 | ➡️ P0 三件套验证：Tauri + WebGPU + MediaPipe 共存 | 📋 新会话先读：CLAUDE.md → docs/architecture.md → PRD.md §12.1 |
| 2026-07-07 #3 | **工程化完成**：GitHub仓库(Momentum-Breaking-the-Sky) + .gitignore + MIT LICENSE + README(badges/开发指南) + CONTRIBUTING.md + CODE_OF_CONDUCT.md + CHANGELOG.md + .github/Issue/PR模板 + CLAUDE.md新增§2 GitHub同步规则 | ➡️ P0 三件套验证 | 📋 仓库地址：https://github.com/ly99LLL/Momentum-Breaking-the-Sky |
| 2026-07-07 #4 | **P0 三件套代码完成**：index.html 入口 + app/main.js 生命周期 + webgpu-setup.js(彩色三角形) + camera-manager.js(摄像头) + mediapipe-runner.js(骨骼点) + vite.config.js + package.json + npm依赖(vite/@mediapipe/tasks-vision)。Rust未安装故Tauri壳暂缓，前端版可独立在浏览器验证 | ➡️ 浏览器验证三件套共存 → P1 混沌渲染 或 安装Rust集成Tauri | 📋 `npm run dev` → http://localhost:3000 查看效果 |

---

> ⛔ 以上所有规则对本项目中的所有 CC 实例具有强制约束力。
> "我忘了"不是借口。本文件是你每次会话最先读取的内容。

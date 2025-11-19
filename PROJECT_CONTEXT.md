# 项目上下文指令：Boxhead (僵尸危机 3) React 重制版

## 1. 项目简介
这是一个基于 Web 技术复刻经典 Flash 游戏《僵尸危机 3 (Boxhead: The Zombie Wars)》的项目。
游戏核心是一个 **2.5D 上帝视角射击游戏**，特色在于海量的僵尸潮、物理击退效果、以及建造防御工事（墙/油桶）。

## 2. 技术栈
*   **核心框架**: React 19 + TypeScript
*   **样式**: Tailwind CSS
*   **渲染引擎**: HTML5 Canvas 2D API (非 WebGL/Three.js，保持复古风格)
*   **物理引擎**: Matter.js (用于碰撞检测、刚体动力学、击退效果)
*   **音频**: Web Audio API (纯代码实时合成音效，不依赖外部静态资源)
*   **打包/运行**: Vite (无需配置，直接支持 ESM)

## 3. 核心架构 (CRITICAL)
**注意：为了保证 60FPS 的游戏性能，本项目采用了特殊的架构模式，请严格遵守：**

1.  **状态管理 (GameRefs Pattern)**:
    *   **严禁**在游戏主循环 (`updateGame`, `renderGame`) 中使用 React 的 `useState` 或 `useEffect`。
    *   所有高频变化的游戏状态（实体位置、子弹、粒子、物理引擎实例）都存储在 `components/game/types.ts` 定义的 `GameRefs` 对象中。
    *   `GameRefs` 是一个包含多个 `MutableRefObject` 的大对象，并在各个子系统间传递。
    *   React 的 State (`score`, `hp`) 仅用于低频的 UI 更新 (`UIOverlay.tsx`)。

2.  **模块化子系统 (`src/components/game/`)**:
    *   **`GameCanvas.tsx`**: 编排器。负责初始化 Refs，启动 `requestAnimationFrame` 循环，挂载输入监听。
    *   **`physicsSystem.ts`**: 物理层。处理 Matter.js 初始化、碰撞事件监听 (`collisionStart`, `collisionActive`)、爆炸逻辑。
    *   **`updateSystem.ts`**: 逻辑层。处理 AI 寻路、WASD 移动、武器开火、实体生成、清理死亡对象。
    *   **`renderSystem.ts`**: 表现层。纯 Canvas 绘图指令。
    *   **`soundSystem.ts`**: 音频层。使用 Oscillator 和 GainNode 合成声音。

3.  **物理与交互规则**:
    *   **玩家**: 极高密度 (`density: 100`)，不可被僵尸推动，但会受到持续接触伤害。
    *   **僵尸**: 低密度，受击时会被施加物理力 (`Matter.Body.applyForce`) 产生击退，且击退力会在尸潮中传递。
    *   **子弹**: 设为传感器 (`isSensor: true`) 或通过 `collisionFilter` 穿透玩家建造的假墙，但击中敌人或油桶时生效。

## 4. 碰撞类别 (Collision Categories)
在 `constants.ts` 中定义了位掩码，用于过滤碰撞：
*   `CAT_PLAYER`: 玩家 (不与自己放置的物体碰撞，防止卡住)
*   `CAT_ENEMY`: 僵尸/恶魔
*   `CAT_BULLET`: 玩家子弹 (穿透假墙)
*   `CAT_WALL`: 地图边界和固定墙体
*   `CAT_OBSTACLE`: 玩家放置的假墙/油桶
*   `CAT_ENEMY_BULLET`: 恶魔病毒 (被墙挡住，击中玩家)
*   `CAT_ITEM`: 掉落物 (血包)

## 5. 当前游戏特性 (已实现)
*   **武器系统**:
    *   [1] 手枪: 无限弹药，高击退。
    *   [2] UZI: 高射速。
    *   [3] 霰弹枪: 扇形攻击。
    *   [4] 假墙: 建造障碍物，对齐网格 (16px)。
    *   [5] 油桶: 易爆物，被击中或接触僵尸爆炸。
*   **敌人**:
    *   普通僵尸: 数量多，速度中等。
    *   恶魔 (Devil): 红色，血厚，发射绿色病毒，死亡掉落血包。
*   **机制**:
    *   **连击系统**: 快速杀敌增加分数倍率。
    *   **难度动态调整**: 每 10000 分提升怪物生成上限和频率。
    *   **摄像机跟随**: 平滑跟随玩家。
    *   **智能辅助**: 持枪时自动瞄准最近敌人。

## 6. 开发规范 (Do's & Don'ts)
*   **DO**: 修改物理逻辑时，请同时检查 `physicsSystem.ts` (事件) 和 `updateSystem.ts` (力/速度)。
*   **DO**: 新增实体类型时，记得在 `types.ts` 的 `EntityType` 和 `constants.ts` 的 `collisionFilter` 中注册。
*   **DON'T**: 不要引入 `.png`, `.mp3` 等外部文件。所有图形使用 Canvas API 绘制 (矩形/圆/路径)，所有声音使用代码生成。
*   **DON'T**: 不要在 `renderGame` 中执行复杂的逻辑计算，保持渲染层纯净。

## 7. 文件清单速查
*   `src/constants.ts`: 数值策划中心（速度、血量、伤害、碰撞位掩码）。
*   `src/types.ts`: 核心类型定义。
*   `src/components/game/mapSystem.ts`: 地图墙体布局生成。

---
**给 AI 的指令**:
你现在是这个项目的高级前端游戏工程师。请根据上述上下文，继续完成用户的需求。在修改代码时，请保持现有的“Ref驱动”架构，不要引入 React 重渲染性能问题。

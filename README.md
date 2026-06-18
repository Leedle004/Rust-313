# 星际射击 · Star Striker

一款使用原生 HTML5 Canvas + JavaScript（ES Modules）开发的太空射击游戏，**零依赖、零构建**，直接在浏览器中即可运行。支持键盘、鼠标和触屏操作。

![type](https://img.shields.io/badge/type-game-38e1ff) ![stack](https://img.shields.io/badge/stack-HTML5%20Canvas-ff4d8d) ![deps](https://img.shields.io/badge/dependencies-0-success)

## 玩法

- 驾驶飞船消灭从上方来袭的敌人，存活并刷新更高分数。
- 每隔一段时间进入新的一波（wave），敌人种类更多、出现更快、更具威胁。
- 击毁敌人有几率掉落道具：
  - **W（武器）**：升级武器（单发 → 双发 → 三向散射），有时限。
  - **+（生命）**：恢复 1 点生命（上限 5）。
- 撞到敌人或被敌方子弹击中会损失 1 点生命，归零即游戏结束。

## 操作

| 操作 | 按键 / 方式 |
| --- | --- |
| 移动 | 方向键 / `WASD` / 鼠标移动 / 触屏拖动 |
| 射击 | `空格` / 鼠标左键（按住自动连发）/ 触屏按住 |
| 暂停 | `P` 或 `Esc`，或点击右上角 ⏸ |

## 敌人类型

| 类型 | 特点 |
| --- | --- |
| Grunt（圆形） | 基础敌人，左右摆动下降 |
| Diver（三角） | 直线高速俯冲 |
| Shooter（菱形） | 会朝玩家方向开火 |
| Tank（六边形） | 高血量，火力强，分数高 |

## 运行方式

由于使用了 ES Modules，需要通过本地 HTTP 服务器打开（直接双击 `index.html` 在部分浏览器会受到 `file://` 跨域限制）。

```bash
# 任选其一
python3 -m http.server 8000
# 或
npx serve .
```

然后浏览器访问 <http://localhost:8000>。

## 项目结构

```
.
├── index.html        # 页面结构与 UI（菜单 / HUD / 暂停 / 结算）
├── css/style.css     # 视觉样式与霓虹风格主题
└── js/
    ├── main.js       # 入口：DOM 与游戏逻辑的绑定
    ├── game.js       # 核心：状态机、生成、碰撞、主循环
    ├── entities.js   # 实体：玩家、敌人、子弹、道具、粒子
    ├── input.js      # 统一输入：键盘 / 鼠标 / 触屏
    ├── audio.js      # Web Audio 合成音效（无音频文件）
    ├── starfield.js  # 视差星空背景
    └── utils.js      # 数学与碰撞辅助函数
```

## 特性

- 视差星空、爆炸粒子、命中屏幕震动等视觉反馈。
- 全程由 Web Audio API 实时合成音效，无需任何外部资源。
- 最高分通过 `localStorage` 本地保存。
- 自适应窗口大小，桌面与移动端均可游玩。

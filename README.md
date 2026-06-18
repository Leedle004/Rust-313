# 星际战机 · Star Striker

一款纯前端、零依赖的竖版太空射击游戏（top-down space shooter）。使用原生
HTML5 Canvas + ES Modules + Web Audio 实现，无需任何构建步骤或第三方库，
开箱即玩，同时支持 **键盘** 与 **手机触屏**。

![type](https://img.shields.io/badge/type-game-blue) ![stack](https://img.shields.io/badge/stack-vanilla%20JS-yellow) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

## ✨ 特性

- 🚀 流畅的 60 FPS 游戏循环，基于 `requestAnimationFrame` 与帧间隔（dt）的物理更新
- 🔫 5 级渐进式武器系统：单发 → 双发 → 三向 → 散射 → 全弹幕
- 👾 4 种敌机类型（冲锋兵 / 蛇形侦察 / 炮手 / 重甲）+ 每 5 关一次 **BOSS 战**（含弹幕环绕攻击）
- 💎 道具掉落：武器升级、护盾、额外生命
- 💥 粒子爆炸、屏幕震动、视差星空背景等视觉反馈
- 🔊 完全由 Web Audio API 程序化合成的音效（无音频素材）
- 🏆 关卡递进、计分与本地最高分记录（`localStorage`）
- 📱 自适应布局，触屏设备自动显示虚拟摇杆与开火键
- ⏸️ 暂停 / 继续 / 重新开始

## 🎮 操作方式

| 操作 | 键盘 | 触屏 |
| --- | --- | --- |
| 移动 | 方向键 ←↑↓→ 或 `W` `A` `S` `D` | 左侧虚拟摇杆 |
| 射击 | `空格`（可长按持续射击） | 右侧「发射」按钮 |
| 暂停 | `P` 或 `Esc` | 通过暂停按钮 |

拾取道具升级武器、补充护盾与生命。被击中会损失一级武器；护盾可抵挡一次伤害。

## ▶️ 运行方式

游戏使用 ES Modules，需要通过 HTTP 服务器访问（直接双击 `index.html`
会因浏览器的模块同源策略而无法加载）。在项目根目录任选其一启动本地服务器：

```bash
# 方式一：Python 3
python3 -m http.server 8000

# 方式二：Node.js（已全局安装 npx）
npx --yes serve -l 8000
```

然后在浏览器打开：

```
http://localhost:8000/
```

## 📁 项目结构

```
.
├── index.html              # 页面骨架与 UI 覆盖层（开始/暂停/结束界面、HUD）
├── styles.css              # 全部样式（霓虹科幻风、响应式、触屏控件）
└── src/
    ├── main.js             # 入口：连接 DOM/UI 与游戏核心
    ├── game.js             # 游戏状态机、主循环、碰撞与关卡逻辑
    ├── input.js            # 键盘 + 触屏摇杆输入统一处理
    ├── audio.js            # Web Audio 程序化音效
    ├── utils.js            # 数学/碰撞等通用工具
    └── entities/
        ├── player.js       # 玩家飞船与武器系统
        ├── enemy.js        # 敌机类型与 BOSS
        ├── bullet.js       # 子弹（敌我通用）
        ├── powerup.js      # 道具掉落
        ├── particle.js     # 粒子与爆炸效果
        └── starfield.js    # 视差星空背景
```

## 🧱 技术要点

- **实体-组件式组织**：每类游戏对象都有独立的 `update(dt)` / `draw(ctx)` 接口，主循环统一驱动。
- **与帧率无关的物理**：所有运动按秒速度乘以 `dt` 计算，并对 `dt` 做上限保护（防止切后台后跳帧）。
- **高 DPI 适配**：按 `devicePixelRatio` 缩放画布，保证在高清屏上锐利显示。
- **圆形碰撞检测**：使用平方距离比较避免开方运算。

祝你好运，飞行员！🛸

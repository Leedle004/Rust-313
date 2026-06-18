# 星际射击 · Star Shooter

一款使用 **HTML5 Canvas + 原生 JavaScript** 开发的太空射击游戏，无需任何依赖或构建工具，直接在浏览器中即可运行。

![tech](https://img.shields.io/badge/HTML5-Canvas-44e0ff) ![tech](https://img.shields.io/badge/JavaScript-Vanilla-ffb347) ![deps](https://img.shields.io/badge/dependencies-0-5dff8f)

## 🎮 玩法

- **移动**：鼠标移动 / 方向键 / `WASD`
- **射击**：自动开火，按住 `空格` 可强化连射
- **暂停**：`P` 键 或 `ESC`
- 击落敌机获得分数，拾取道具，挑战最高波次与最高分！

## ✨ 特色

- 4 种敌机：普通机、之字机、射手机、坦克机，以及每 5 波出现的 **Boss**
- 4 种道具：
  - 🟢 **回血**：恢复生命值
  - 🔵 **散射**：升级为三向散射武器
  - 🟠 **急速**：限时极速连射
  - 🟣 **护盾**：限时无敌护盾
- 波次系统：难度随波次递增，敌机数量与类型逐渐丰富
- 生命 / 血量系统、撞机伤害、敌机逃逸惩罚
- 粒子爆炸特效、滚动星空背景、霓虹发光风格
- Web Audio API 实时合成音效（无需音频文件），可一键静音
- 本地存储最高分记录（`localStorage`）
- 支持桌面与移动端触屏

## 🚀 运行方式

直接用浏览器打开 `index.html` 即可游玩。

或启动一个本地静态服务器（推荐，避免个别浏览器的本地文件限制）：

```bash
# Python 3
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

## 📁 项目结构

```
.
├── index.html      # 页面结构与各类界面（开始 / 暂停 / 结束）
├── css/
│   └── style.css   # 现代霓虹风格样式
└── js/
    └── game.js     # 游戏引擎：实体、碰撞、波次、音效、渲染循环
```

## 🛠️ 技术要点

- 单一 `requestAnimationFrame` 主循环，基于 `dt` 的帧率无关更新
- 实体池数组（玩家子弹 / 敌机子弹 / 敌机 / 道具 / 粒子）+ 圆形碰撞检测
- 状态机：`menu` → `playing` → `paused` → `over`
- 无第三方依赖，纯静态资源，开箱即玩

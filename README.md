# 星际射手 · Starblaze

一款使用纯 HTML5 Canvas + 原生 JavaScript 开发的太空射击游戏，**零依赖、零构建**，双击即玩。

![tech](https://img.shields.io/badge/HTML5-Canvas-blue) ![tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

## 玩法特性

- 流畅的纵版太空射击体验，60 FPS 游戏循环（基于 `requestAnimationFrame` + 增量时间）
- 4 种敌机类型（普通机 / 俯冲机 / 编织者 / 重装机）各有独特运动与攻击方式
- **每 5 波出现 Boss**，拥有分阶段弹幕（瞄准三连 + 环形弹幕）
- 5 级武器升级系统：单发 → 双发 → 三连 → 散射 → 全弹幕
- 三种掉落道具：
  - <kbd>P</kbd> 武器升级
  - <kbd>S</kbd> 恢复护盾
  - <kbd>B</kbd> 清屏炸弹
- 粒子爆炸、引擎尾焰、视差星空、屏幕震动与闪光等视觉效果
- 使用 Web Audio API **实时合成音效**（射击 / 爆炸 / 升级 / Boss 等），无需任何音频文件
- 分数、波次、护盾、战机数量 HUD，以及 `localStorage` 持久化的历史最高分
- 支持键盘、鼠标与移动端触屏操作

## 操作方式

| 操作 | 按键 |
| --- | --- |
| 移动 | `WASD` / 方向键 / 鼠标移动 |
| 射击 | `空格` / 鼠标左键（按住连发） |
| 暂停 | `P` / `Esc` |

## 运行方式

直接在浏览器中打开 `index.html` 即可。

也可以启动一个本地静态服务器（推荐，避免个别浏览器的本地文件限制）：

```bash
# 任选其一
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

```bash
npx serve .
```

## 项目结构

```
.
├── index.html          # 页面结构与 UI（菜单 / HUD / 暂停 / 结算）
├── css/
│   └── style.css       # 界面与 HUD 样式
└── js/
    ├── utils.js        # 数学与碰撞工具函数
    ├── audio.js        # Web Audio 实时音效合成
    ├── input.js        # 键盘 / 鼠标 / 触屏输入
    ├── starfield.js    # 视差星空背景
    ├── particle.js     # 粒子系统（爆炸 / 尾焰）
    ├── bullet.js       # 子弹（玩家 / 敌方）
    ├── powerup.js      # 掉落道具
    ├── player.js       # 玩家战机
    ├── enemy.js        # 敌机与 Boss
    ├── game.js         # 游戏状态机（生成 / 碰撞 / 计分 / 波次）
    └── main.js         # 入口：UI 绑定与主循环
```

## 技术说明

- 全部逻辑基于增量时间（delta time）更新，保证不同刷新率下速度一致。
- 碰撞检测使用圆形包围盒（平方距离比较，避免开方开销）。
- 切换标签页时对 `dt` 做了上限处理，避免回到页面瞬间产生"时间跳跃"。

祝游玩愉快，挑战你的最高分！🚀

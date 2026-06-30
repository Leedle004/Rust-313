# Starfall 20MB

一款无需第三方依赖的浏览器 Canvas 生存射击游戏。玩家驾驶护航舰穿过碎星雨，
收集能量晶体、击退无人机，并尽可能刷新最高分。

项目包含一个确定性生成的 `20,000,000` 字节资源包：

- 游戏运行时会加载 `public/assets/starfall-20mb.pack`
- 资源包用于派生星场、颜色主题、敌人节奏和可复现随机种子
- `npm run assets` 可重新生成同尺寸资源包

## 运行

```bash
npm run assets
npm start
```

然后打开 <http://localhost:4173>。

## 操作

- `WASD` / 方向键：移动
- 鼠标 / 触控：瞄准
- `Space`：冲刺
- `P`：暂停 / 继续

## 构建与验证

```bash
npm run build
npm test
```

`npm run build` 会复制静态文件到 `dist/`，同时校验资源包精确为
`20,000,000` 字节，并保证分发目录保持在 20MB 级别。
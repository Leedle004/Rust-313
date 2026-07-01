# Rust Space Shooter

一款用 Rust 编写的 2D 街机风格射击游戏（俯视纵向卷轴射击 / vertical shmup），基于 [macroquad](https://github.com/not-fl3/macroquad) 引擎，可编译为原生程序或 WebAssembly 在浏览器中运行。

## 玩法

- 使用 `←`/`→` 或 `A`/`D` 左右移动飞船。
- 使用 `SPACE`（或 `↑`/`W`）发射子弹，按住可持续开火。
- 击落红色敌机可获得分数；敌机的子弹或与敌机相撞都会使生命值减少。
- 生命值耗尽后进入 `GAME OVER` 画面，按 `ENTER` 或 `SPACE` 重新开始。
- 随着时间推移，敌机下落速度和刷新频率会逐渐提升，难度递增。

## 本地运行（桌面原生版本）

```bash
cargo run --release
```

## 编译为网页版（WebAssembly）

首次需要安装 `wasm32-unknown-unknown` target：

```bash
rustup target add wasm32-unknown-unknown
```

然后运行构建脚本，它会编译并将 `.wasm` 产物复制到 `web/pkg/`：

```bash
./build_web.sh
```

构建完成后，启动一个静态文件服务器来运行网页版：

```bash
cd web
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080/index.html` 即可游玩。

> 注意：`.cargo/config.toml` 中为 `wasm32-unknown-unknown` target 添加了
> `-C link-arg=--allow-undefined`。这是因为 Rust 1.96 移除了 wasm target 上
> 默认的 `--allow-undefined` 链接行为，而 macroquad/miniquad 依赖这一行为
> 将 WebGL 函数当作运行时由 JS 提供的导入符号，而不是链接期符号，因此需要手动恢复该 flag。

`web/index.html` 中的 canvas 必须显式设置与游戏逻辑分辨率一致的 CSS 尺寸
（480×720），因为 macroquad 的 JS 加载器是根据 canvas 的 `clientWidth` /
`clientHeight` 来设置底层帧缓冲大小的。

## 测试

游戏核心逻辑（移动边界、碰撞检测、开火冷却、得分、生命值、无敌时间、重开等）已解耦为不依赖全局输入状态的纯函数，方便单元测试：

```bash
cargo test
```

## 项目结构

- `src/main.rs` — 游戏逻辑与渲染（macroquad）。
- `build_web.sh` — 一键构建 WebAssembly 版本并复制到 `web/pkg/`。
- `web/` — 网页版宿主页面（`index.html`）及 miniquad 官方 JS 加载器 (`mq_js_bundle.js`)。

# 🪙 AI 币圈 OS（Pure-AI Crypto Operating System）

一个运行在浏览器里的「币圈操作系统」——以多窗口桌面环境（Desktop UI）聚合
**AI 助手、实时行情、AI 信号、资产管理、资讯** 等核心 App。

后端是用 **Rust + Axum** 编写的单一可执行文件，前端为零依赖的原生 Web（HTML/CSS/JS），
**完全离线运行，无需任何外部 API Key**。

> ⚠️ 本项目中的所有行情、信号、资产均为本地模拟数据，仅用于演示，**绝不构成任何投资建议**。

---

## ✨ 功能特性

- **桌面式操作系统体验**：开机动画、顶部状态栏、行情滚动条、市场情绪指标、底部 Dock、可拖拽 / 最小化 / 最大化 / 关闭的多窗口。
- **🤖 AI 助手**：内置离线规则引擎，能感知实时行情，回答价格查询、名词解释（DCA / 清算 / Gas / DeFi / NFT …）、风险与操作思路，并始终附带风险提示。
- **📈 行情**：内置 10 个主流币种，后端以随机游走模拟「实时」价格，前端含迷你走势图（sparkline）。
- **🎯 AI 信号**：基于涨跌幅与短线动量的启发式信号（强烈看多 / 看多 / 中性 / 看空 / 强烈看空）+ 置信度。
- **💼 资产**：演示持仓的市值、成本、盈亏（随行情实时变化）。
- **📰 资讯**：滚动展示的币圈资讯流。

---

## 🚀 运行

需要安装 [Rust 工具链](https://rustup.rs/)（Rust 1.83+）。

```bash
# 开发模式
cargo run

# 或编译 release 版本
cargo build --release
./target/release/ai-crypto-os
```

默认监听 `0.0.0.0:8080`，浏览器打开 <http://localhost:8080> 即可。

可通过环境变量自定义绑定地址：

```bash
BIND_ADDR=127.0.0.1:9000 cargo run
```

---

## 🔌 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/market` | 获取全部币种实时（模拟）行情 |
| `POST` | `/api/chat` | AI 助手对话，请求体 `{"message":"..."}` |
| `GET` | `/api/signals` | AI 交易信号 |
| `GET` | `/api/portfolio` | 资产 / 持仓盈亏 |
| `GET` | `/api/news` | 资讯流 |

示例：

```bash
curl -X POST http://localhost:8080/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"BTC 现在多少钱"}'
```

---

## 🗂️ 项目结构

```
.
├── Cargo.toml
├── src
│   ├── main.rs        # Axum 入口、路由、AppState、后台行情推进任务
│   ├── market.rs      # 行情模型与随机游走模拟
│   ├── ai.rs          # 离线 AI 助手（规则引擎）
│   ├── signals.rs     # 启发式交易信号
│   ├── news.rs        # 资讯流
│   └── rng.rs         # 无依赖伪随机数（仅用于模拟）
└── static
    ├── index.html     # 桌面外壳
    ├── styles.css     # 主题与窗口样式
    └── app.js         # 窗口管理器 + 各 App 渲染
```

---

## 🛣️ 可扩展方向

- 接入真实大模型：在 `src/ai.rs` 的 `reply` 中改为转发到外部 LLM 服务（读取 API Key 环境变量）。
- 接入真实行情：在 `src/market.rs` 中改为从公开行情 API 拉取数据。
- 持久化资产、增加下单 / 自选 / 提醒等更多 App。

## 📄 License

MIT

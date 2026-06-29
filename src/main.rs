//! AI 币圈 OS —— 后端入口。
//!
//! 一个用 Rust + Axum 编写的单一可执行文件：
//! • 提供一个浏览器内的 "操作系统" 桌面前端（多窗口 App）。
//! • 提供行情、AI 助手、AI 信号、资讯、资产等 API。
//! • 后台任务持续推进模拟行情，使前端呈现 "实时" 效果。
//! • 完全离线运行，无需任何外部 API Key。

mod ai;
mod market;
mod news;
mod rng;
mod signals;

use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::{
    extract::State,
    http::header,
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use market::Coin;

#[derive(Clone)]
struct AppState {
    market: Arc<Mutex<Vec<Coin>>>,
    holdings: Arc<Vec<Holding>>,
}

/// 演示用的持仓（数量固定，市值随行情变化）。
struct Holding {
    symbol: &'static str,
    amount: f64,
    avg_cost: f64,
}

#[tokio::main]
async fn main() {
    let state = AppState {
        market: Arc::new(Mutex::new(market::seed_market())),
        holdings: Arc::new(vec![
            Holding { symbol: "BTC", amount: 0.35, avg_cost: 58000.0 },
            Holding { symbol: "ETH", amount: 4.2, avg_cost: 2900.0 },
            Holding { symbol: "SOL", amount: 120.0, avg_cost: 110.0 },
            Holding { symbol: "DOGE", amount: 50000.0, avg_cost: 0.12 },
        ]),
    };

    // 后台行情推进任务
    {
        let market = state.market.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(2));
            loop {
                interval.tick().await;
                if let Ok(mut coins) = market.lock() {
                    market::tick(&mut coins);
                }
            }
        });
    }

    let app = Router::new()
        .route("/", get(index))
        .route("/styles.css", get(styles))
        .route("/app.js", get(app_js))
        .route("/api/market", get(api_market))
        .route("/api/chat", post(api_chat))
        .route("/api/signals", get(api_signals))
        .route("/api/news", get(api_news))
        .route("/api/portfolio", get(api_portfolio))
        .with_state(state);

    let addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("无法绑定端口");

    println!("🚀 AI 币圈 OS 已启动： http://{addr}");
    axum::serve(listener, app).await.expect("服务器异常退出");
}

// ---------- 静态资源 ----------

async fn index() -> Html<&'static str> {
    Html(include_str!("../static/index.html"))
}

async fn styles() -> Response {
    (
        [(header::CONTENT_TYPE, "text/css; charset=utf-8")],
        include_str!("../static/styles.css"),
    )
        .into_response()
}

async fn app_js() -> Response {
    (
        [(header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
        include_str!("../static/app.js"),
    )
        .into_response()
}

// ---------- API ----------

async fn api_market(State(state): State<AppState>) -> Json<Vec<Coin>> {
    let coins = state.market.lock().unwrap().clone();
    Json(coins)
}

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
}

#[derive(Serialize)]
struct ChatResponse {
    reply: String,
}

async fn api_chat(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Json<ChatResponse> {
    let coins = state.market.lock().unwrap().clone();
    let reply = ai::reply(&req.message, &coins);
    Json(ChatResponse { reply })
}

async fn api_signals(State(state): State<AppState>) -> Json<Vec<signals::Signal>> {
    let coins = state.market.lock().unwrap().clone();
    Json(signals::generate(&coins))
}

async fn api_news() -> Json<Vec<news::NewsItem>> {
    Json(news::latest())
}

async fn api_portfolio(State(state): State<AppState>) -> impl IntoResponse {
    let coins = state.market.lock().unwrap().clone();

    let mut positions = Vec::new();
    let mut total_value = 0.0;
    let mut total_cost = 0.0;

    for h in state.holdings.iter() {
        let price = coins
            .iter()
            .find(|c| c.symbol == h.symbol)
            .map(|c| c.price)
            .unwrap_or(0.0);
        let value = price * h.amount;
        let cost = h.avg_cost * h.amount;
        let pnl = value - cost;
        let pnl_pct = if cost > 0.0 { pnl / cost * 100.0 } else { 0.0 };

        total_value += value;
        total_cost += cost;

        positions.push(json!({
            "symbol": h.symbol,
            "amount": h.amount,
            "avg_cost": h.avg_cost,
            "price": price,
            "value": (value * 100.0).round() / 100.0,
            "pnl": (pnl * 100.0).round() / 100.0,
            "pnl_pct": (pnl_pct * 100.0).round() / 100.0,
        }));
    }

    let total_pnl = total_value - total_cost;
    let total_pnl_pct = if total_cost > 0.0 {
        total_pnl / total_cost * 100.0
    } else {
        0.0
    };

    Json(json!({
        "total_value": (total_value * 100.0).round() / 100.0,
        "total_cost": (total_cost * 100.0).round() / 100.0,
        "total_pnl": (total_pnl * 100.0).round() / 100.0,
        "total_pnl_pct": (total_pnl_pct * 100.0).round() / 100.0,
        "positions": positions,
    }))
}

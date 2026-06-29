//! 行情模块：内置一组主流币种，并以随机游走的方式模拟实时价格。
//! 完全离线运行，无需任何外部 API Key。

use serde::Serialize;

use crate::rng;

#[derive(Clone, Serialize)]
pub struct Coin {
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change_24h: f64,
    pub market_cap: f64,
    pub volume_24h: f64,
    /// 最近若干个采样点，用于前端绘制迷你 K 线 / 走势图。
    pub spark: Vec<f64>,
}

impl Coin {
    fn new(symbol: &str, name: &str, price: f64, supply: f64) -> Self {
        let mut spark = Vec::with_capacity(48);
        let mut p = price;
        for _ in 0..48 {
            p *= 1.0 + rng::signed() * 0.01;
            spark.push(round2(p));
        }
        spark.push(round2(price));
        Coin {
            symbol: symbol.to_string(),
            name: name.to_string(),
            price: round2(price),
            change_24h: round2(rng::signed() * 6.0),
            market_cap: round2(price * supply),
            volume_24h: round2(price * supply * (0.02 + rng::unit() * 0.08)),
            spark,
        }
    }
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

/// 初始化默认行情列表。
pub fn seed_market() -> Vec<Coin> {
    vec![
        Coin::new("BTC", "Bitcoin", 64250.0, 19_700_000.0),
        Coin::new("ETH", "Ethereum", 3380.0, 120_000_000.0),
        Coin::new("SOL", "Solana", 158.0, 460_000_000.0),
        Coin::new("BNB", "BNB", 592.0, 148_000_000.0),
        Coin::new("XRP", "XRP", 0.61, 55_000_000_000.0),
        Coin::new("DOGE", "Dogecoin", 0.16, 144_000_000_000.0),
        Coin::new("TON", "Toncoin", 7.45, 3_500_000_000.0),
        Coin::new("ADA", "Cardano", 0.45, 35_000_000_000.0),
        Coin::new("AVAX", "Avalanche", 36.2, 400_000_000.0),
        Coin::new("LINK", "Chainlink", 17.8, 620_000_000.0),
    ]
}

/// 推进一个时间步：对每个币种做一次随机游走，并维护走势数组。
pub fn tick(coins: &mut [Coin]) {
    for c in coins.iter_mut() {
        let drift = rng::signed() * 0.012;
        let new_price = (c.price * (1.0 + drift)).max(0.0001);

        // 用走势数组首元素近似 24 小时前价格，计算涨跌幅。
        let ref_price = c.spark.first().copied().unwrap_or(new_price);
        c.change_24h = round2((new_price - ref_price) / ref_price * 100.0);

        c.price = round2(new_price);
        c.volume_24h = round2(c.volume_24h * (1.0 + rng::signed() * 0.03));
        c.market_cap = round2(c.market_cap * (1.0 + drift));

        c.spark.push(c.price);
        if c.spark.len() > 48 {
            let overflow = c.spark.len() - 48;
            c.spark.drain(0..overflow);
        }
    }
}

//! AI 信号：基于行情快照，用简单的启发式规则生成交易信号。
//! 仅用于演示，绝非投资建议。

use serde::Serialize;

use crate::market::Coin;

#[derive(Serialize)]
pub struct Signal {
    pub symbol: String,
    pub name: String,
    pub action: String,     // 强烈看多 / 看多 / 中性 / 看空 / 强烈看空
    pub confidence: u8,     // 0-100
    pub rationale: String,
    pub price: f64,
}

pub fn generate(market: &[Coin]) -> Vec<Signal> {
    market
        .iter()
        .map(|c| {
            // 用走势数组算一个极简的动量指标
            let momentum = momentum(&c.spark);
            let score = c.change_24h * 0.6 + momentum * 0.4;

            let (action, rationale) = if score > 4.0 {
                ("强烈看多", "24h 涨幅与短线动量同步走强，趋势向上")
            } else if score > 1.0 {
                ("看多", "动量偏正，但涨幅有限，注意分批")
            } else if score < -4.0 {
                ("强烈看空", "跌幅与动量共振走弱，避免接飞刀")
            } else if score < -1.0 {
                ("看空", "短线偏弱，观望为宜")
            } else {
                ("中性", "多空力量均衡，处于震荡区间")
            };

            let confidence = (40.0 + score.abs() * 6.0).clamp(40.0, 95.0) as u8;

            Signal {
                symbol: c.symbol.clone(),
                name: c.name.clone(),
                action: action.to_string(),
                confidence,
                rationale: rationale.to_string(),
                price: c.price,
            }
        })
        .collect()
}

/// 用走势数组首尾差值估算短线动量（百分比）。
fn momentum(spark: &[f64]) -> f64 {
    if spark.len() < 2 {
        return 0.0;
    }
    let mid = spark.len() / 2;
    let recent_avg = avg(&spark[mid..]);
    let early_avg = avg(&spark[..mid]);
    if early_avg == 0.0 {
        return 0.0;
    }
    (recent_avg - early_avg) / early_avg * 100.0
}

fn avg(s: &[f64]) -> f64 {
    if s.is_empty() {
        return 0.0;
    }
    s.iter().sum::<f64>() / s.len() as f64
}

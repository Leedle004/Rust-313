//! AI 助手：一个完全离线的、基于规则的币圈智能体。
//!
//! 设计目标是让 "AI 助手" App 在没有任何外部大模型 API 的情况下也能给出
//! 有用、克制、带风险提示的中文回答。它会感知实时（模拟）行情快照，
//! 因此能回答 "BTC 现在多少钱" 之类的问题。
//!
//! 如果将来希望接入真实大模型，可在 `reply` 内部改为转发到外部服务。

use crate::market::Coin;

const DISCLAIMER: &str =
    "⚠️ 以上仅为信息整理，不构成任何投资建议。币圈波动剧烈，请务必控制仓位、注意风险。";

/// 根据用户消息和当前行情快照生成回复。
pub fn reply(message: &str, market: &[Coin]) -> String {
    let msg = message.trim();
    if msg.is_empty() {
        return "你好，我是 AI 币圈助手 🤖。可以问我行情、名词解释、风险提示或操作思路，例如：「BTC 现在多少钱」「什么是 DCA」「现在适合抄底吗」。".to_string();
    }

    let lower = msg.to_lowercase();

    // 1) 行情类问题：检测是否提到某个币种
    if let Some(coin) = detect_coin(&lower, market) {
        if mentions_any(&lower, &["价格", "多少", "现价", "报价", "price", "怎么样", "行情"]) {
            return format_quote(coin);
        }
        // 提到币种但没明确问价格 —— 给一个综合点评
        return format_take(coin);
    }

    // 2) 大盘 / 情绪
    if mentions_any(&lower, &["大盘", "整体", "市场", "情绪", "牛市", "熊市", "行情如何", "fear", "greed"]) {
        return market_overview(market);
    }

    // 3) 名词解释
    if let Some(def) = glossary(&lower) {
        return format!("{def}\n\n{DISCLAIMER}");
    }

    // 4) 策略 / 建议类
    if mentions_any(&lower, &["抄底", "梭哈", "买入", "卖出", "止损", "止盈", "建议", "策略", "该不该", "适合", "操作"]) {
        return strategy_advice(market);
    }

    // 5) 问候
    if mentions_any(&lower, &["你好", "您好", "hi", "hello", "嗨", "在吗"]) {
        return "你好 👋 我是内置的 AI 币圈助手。问我行情、名词或风险都可以，比如「ETH 现价」「什么是清算」。".to_string();
    }

    // 6) 兜底
    format!(
        "我理解你在问：「{msg}」。\n\n我可以帮你：\n• 查询币种实时行情（如「SOL 多少钱」）\n• 解释名词（如「什么是 DCA / 清算 / Gas」）\n• 给出风险与仓位思路\n\n换个更具体的说法试试？\n\n{DISCLAIMER}"
    )
}

fn detect_coin<'a>(lower: &str, market: &'a [Coin]) -> Option<&'a Coin> {
    market.iter().find(|c| {
        lower.contains(&c.symbol.to_lowercase()) || lower.contains(&c.name.to_lowercase())
    })
}

fn mentions_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| haystack.contains(n))
}

fn arrow(change: f64) -> &'static str {
    if change > 0.0 {
        "📈 上涨"
    } else if change < 0.0 {
        "📉 下跌"
    } else {
        "➡️ 持平"
    }
}

fn format_quote(c: &Coin) -> String {
    format!(
        "{} ({}) 当前价格约 ${}，24h {} {:.2}%。\n24h 成交额约 ${}。\n\n{DISCLAIMER}",
        c.name,
        c.symbol,
        fmt_num(c.price),
        arrow(c.change_24h),
        c.change_24h.abs(),
        fmt_num(c.volume_24h),
    )
}

fn format_take(c: &Coin) -> String {
    let mood = if c.change_24h > 3.0 {
        "短线偏强，注意追高风险"
    } else if c.change_24h < -3.0 {
        "短线走弱，不要急于接飞刀"
    } else {
        "处于震荡区间，等待方向明朗"
    };
    format!(
        "关于 {} ({})：现价约 ${}，24h {} {:.2}%，{}。\n\n{DISCLAIMER}",
        c.name,
        c.symbol,
        fmt_num(c.price),
        arrow(c.change_24h),
        c.change_24h.abs(),
        mood,
    )
}

fn market_overview(market: &[Coin]) -> String {
    let up = market.iter().filter(|c| c.change_24h > 0.0).count();
    let down = market.iter().filter(|c| c.change_24h < 0.0).count();
    let avg: f64 = market.iter().map(|c| c.change_24h).sum::<f64>() / market.len().max(1) as f64;

    let sentiment = if avg > 2.0 {
        "🟢 偏贪婪（Greed）"
    } else if avg < -2.0 {
        "🔴 偏恐慌（Fear）"
    } else {
        "🟡 中性（Neutral）"
    };

    let leader = market
        .iter()
        .max_by(|a, b| a.change_24h.partial_cmp(&b.change_24h).unwrap())
        .map(|c| format!("{} ({:+.2}%)", c.symbol, c.change_24h))
        .unwrap_or_default();
    let laggard = market
        .iter()
        .min_by(|a, b| a.change_24h.partial_cmp(&b.change_24h).unwrap())
        .map(|c| format!("{} ({:+.2}%)", c.symbol, c.change_24h))
        .unwrap_or_default();

    format!(
        "📊 大盘速览：\n• 上涨 {up} / 下跌 {down}，平均涨跌 {avg:+.2}%\n• 市场情绪：{sentiment}\n• 领涨：{leader}　领跌：{laggard}\n\n{DISCLAIMER}"
    )
}

fn strategy_advice(market: &[Coin]) -> String {
    let avg: f64 = market.iter().map(|c| c.change_24h).sum::<f64>() / market.len().max(1) as f64;
    let bias = if avg < -3.0 {
        "当前市场偏弱，与其一次性抄底，不如用「分批定投（DCA）」摊薄成本。"
    } else if avg > 3.0 {
        "当前市场偏强，追高需谨慎，建议设置好止盈并预留现金。"
    } else {
        "当前市场震荡，适合区间高抛低吸，避免频繁操作产生过多手续费。"
    };
    format!(
        "🧭 操作思路（通用框架，非个股建议）：\n1. 仓位：单币种不超过总资金的 20-30%，永远留足现金。\n2. 计划：进场前先想好止损位与止盈位。\n3. 节奏：{bias}\n4. 心态：不加杠杆梭哈，不追涨杀跌。\n\n{DISCLAIMER}"
    )
}

fn glossary(lower: &str) -> Option<String> {
    let entries: &[(&[&str], &str)] = &[
        (&["dca", "定投"], "DCA（Dollar-Cost Averaging，定投）：把资金分成多笔，在固定时间分批买入，用以摊薄成本、平滑波动，适合长期看好但难以择时的投资者。"),
        (&["清算", "爆仓", "liquidat"], "清算 / 爆仓：在合约（杠杆）交易中，当保证金不足以维持仓位时，交易所会强制平仓。杠杆越高，被清算的价格离现价越近，风险越大。"),
        (&["gas", "手续费", "矿工费"], "Gas（燃料费）：在以太坊等链上执行交易或合约所需支付的费用，价格随网络拥堵程度波动，单位通常为 Gwei。"),
        (&["defi", "去中心化金融"], "DeFi（去中心化金融）：基于区块链智能合约提供借贷、交易、做市等金融服务，无需传统中介，但存在合约漏洞与无常损失等风险。"),
        (&["nft"], "NFT（非同质化代币）：链上独一无二、不可互换的资产凭证，常用于数字艺术、游戏道具、会员权益等。"),
        (&["稳定币", "stablecoin", "usdt", "usdc"], "稳定币：锚定法币（如美元）价格的加密货币，常见有 USDT、USDC，用于避险与计价，但需关注其储备透明度与脱锚风险。"),
        (&["合约", "杠杆", "永续"], "合约 / 杠杆：用保证金放大头寸的衍生品交易。永续合约没有交割日，通过资金费率维持价格锚定。杠杆是双刃剑，放大收益也放大亏损。"),
        (&["空投", "airdrop"], "空投（Airdrop）：项目方向特定用户免费发放代币，常用于冷启动和社区激励。参与时要警惕假空投与授权钓鱼。"),
        (&["减半", "halving"], "减半（Halving）：比特币每约四年区块奖励减半一次，历史上常被视为重要的供给侧周期事件。"),
        (&["市值", "market cap"], "市值（Market Cap）= 现价 × 流通量，用来衡量一个币种的整体规模，但不等于实际可变现的资金量。"),
    ];

    for (keys, def) in entries {
        if keys.iter().any(|k| lower.contains(k)) {
            return Some(def.to_string());
        }
    }
    None
}

fn fmt_num(v: f64) -> String {
    // 简单的千分位格式化
    let neg = v < 0.0;
    let abs = v.abs();
    let int_part = abs.trunc() as u64;
    let frac = abs.fract();

    let mut s = int_part.to_string();
    let bytes: Vec<char> = s.chars().collect();
    let mut out = String::new();
    for (i, ch) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(*ch);
    }
    s = out;

    if frac > 0.0 {
        let frac_str = format!("{:.2}", frac);
        s.push_str(&frac_str[1..]); // 去掉前导 0
    }
    if neg {
        format!("-{s}")
    } else {
        s
    }
}

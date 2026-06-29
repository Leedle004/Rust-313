//! 资讯模块：一组内置的、滚动展示的币圈资讯条目。
//! 由于离线运行，这里使用预置内容并随机化展示顺序与时间戳。

use serde::Serialize;

use crate::rng;

#[derive(Serialize, Clone)]
pub struct NewsItem {
    pub title: String,
    pub source: String,
    pub tag: String,
    pub minutes_ago: u32,
}

const RAW: &[(&str, &str, &str)] = &[
    ("比特币现货 ETF 单日净流入再创阶段新高", "ChainWire", "宏观"),
    ("以太坊主网完成新一轮网络升级，Gas 费显著下降", "EthDaily", "技术"),
    ("某头部交易所宣布上线新一批 Layer2 代币", "BlockBeats", "上币"),
    ("稳定币总市值突破历史高位，链上结算需求旺盛", "TheBlock", "稳定币"),
    ("Solana 生态 DEX 24h 交易量超越同行", "SolPulse", "生态"),
    ("监管机构就加密资产分类发布最新指引", "Regulator", "监管"),
    ("巨鲸地址持续增持，链上筹码趋于集中", "OnChainEye", "链上"),
    ("市场恐慌贪婪指数回到中性区间", "Alternative", "情绪"),
    ("Meme 板块轮动活跃，注意高波动风险", "MemeRadar", "板块"),
    ("机构研报：本轮周期资金更偏好主流蓝筹币", "ResearchLab", "研报"),
];

pub fn latest() -> Vec<NewsItem> {
    let mut items: Vec<NewsItem> = RAW
        .iter()
        .map(|(title, source, tag)| NewsItem {
            title: title.to_string(),
            source: source.to_string(),
            tag: tag.to_string(),
            minutes_ago: rng::range_usize(1, 240) as u32,
        })
        .collect();

    items.sort_by_key(|i| i.minutes_ago);
    items
}

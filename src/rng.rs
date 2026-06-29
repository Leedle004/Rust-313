//! 极简的、无外部依赖的伪随机数生成器（xorshift64*）。
//! 仅用于模拟行情走势，不用于任何加密用途。

use std::cell::Cell;
use std::time::{SystemTime, UNIX_EPOCH};

thread_local! {
    static STATE: Cell<u64> = Cell::new(seed());
}

fn seed() -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0x9E3779B97F4A7C15);
    // 避免 0 种子
    nanos ^ 0x2545F4914F6CDD1D | 1
}

fn next_u64() -> u64 {
    STATE.with(|s| {
        let mut x = s.get();
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        s.set(x);
        x.wrapping_mul(0x2545F4914F6CDD1D)
    })
}

/// 返回 [0, 1) 区间的随机浮点数。
pub fn unit() -> f64 {
    // 取高 53 位作为 f64 尾数
    (next_u64() >> 11) as f64 / (1u64 << 53) as f64
}

/// 返回 [-1, 1) 区间的随机浮点数。
pub fn signed() -> f64 {
    unit() * 2.0 - 1.0
}

/// 返回 [min, max] 区间的随机整数。
pub fn range_usize(min: usize, max: usize) -> usize {
    if max <= min {
        return min;
    }
    min + (next_u64() as usize) % (max - min + 1)
}

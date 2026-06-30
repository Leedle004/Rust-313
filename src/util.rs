//! Small math / RNG helpers shared by the game logic.
//!
//! Everything here is rendering-agnostic so it can be exercised by unit tests
//! without opening a window or touching the GPU.

use glam::Vec2;

/// Wrap a position so it stays inside the `[0, w) x [0, h)` playfield. Entities
/// that leave one edge re-appear on the opposite edge (classic Asteroids feel).
pub fn wrap_position(mut pos: Vec2, w: f32, h: f32) -> Vec2 {
    if pos.x < 0.0 {
        pos.x += w;
    } else if pos.x >= w {
        pos.x -= w;
    }
    if pos.y < 0.0 {
        pos.y += h;
    } else if pos.y >= h {
        pos.y -= h;
    }
    pos
}

/// Shortest vector from `a` to `b` on a toroidal (wrapping) playfield.
///
/// Using the wrapped distance means an asteroid near the right edge can still
/// collide with a bullet near the left edge, matching what the player sees.
pub fn toroidal_delta(a: Vec2, b: Vec2, w: f32, h: f32) -> Vec2 {
    let mut dx = b.x - a.x;
    let mut dy = b.y - a.y;
    if dx > w * 0.5 {
        dx -= w;
    } else if dx < -w * 0.5 {
        dx += w;
    }
    if dy > h * 0.5 {
        dy -= h;
    } else if dy < -h * 0.5 {
        dy += h;
    }
    Vec2::new(dx, dy)
}

/// True when two circles overlap, taking screen wrapping into account.
pub fn circles_overlap(a: Vec2, ra: f32, b: Vec2, rb: f32, w: f32, h: f32) -> bool {
    let d = toroidal_delta(a, b, w, h);
    let r = ra + rb;
    d.length_squared() <= r * r
}

/// Uniform random `f32` in `[lo, hi)`.
pub fn rand_range(lo: f32, hi: f32) -> f32 {
    lo + quad_rand::gen_range(0.0_f32, 1.0_f32) * (hi - lo)
}

/// Unit vector pointing in a random direction.
pub fn rand_unit() -> Vec2 {
    let a = rand_range(0.0, std::f32::consts::TAU);
    Vec2::new(a.cos(), a.sin())
}

/// Unit vector for an angle measured in radians (0 == facing right / +x).
pub fn dir_from_angle(angle: f32) -> Vec2 {
    Vec2::new(angle.cos(), angle.sin())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wraps_across_edges() {
        let p = wrap_position(Vec2::new(-1.0, -1.0), 100.0, 50.0);
        assert!((p.x - 99.0).abs() < 1e-4);
        assert!((p.y - 49.0).abs() < 1e-4);

        let p = wrap_position(Vec2::new(100.0, 50.0), 100.0, 50.0);
        assert!((p.x - 0.0).abs() < 1e-4);
        assert!((p.y - 0.0).abs() < 1e-4);
    }

    #[test]
    fn toroidal_distance_uses_short_way() {
        // Points near opposite edges should be "close" through the wrap.
        let a = Vec2::new(2.0, 25.0);
        let b = Vec2::new(98.0, 25.0);
        let d = toroidal_delta(a, b, 100.0, 50.0);
        assert!((d.x - (-4.0)).abs() < 1e-4, "got {d:?}");
    }

    #[test]
    fn overlap_detects_wrapped_collision() {
        assert!(circles_overlap(
            Vec2::new(1.0, 10.0),
            3.0,
            Vec2::new(99.0, 10.0),
            3.0,
            100.0,
            100.0,
        ));
        assert!(!circles_overlap(
            Vec2::new(10.0, 10.0),
            2.0,
            Vec2::new(50.0, 50.0),
            2.0,
            100.0,
            100.0,
        ));
    }

    #[test]
    fn dir_from_angle_is_unit() {
        let v = dir_from_angle(1.234);
        assert!((v.length() - 1.0).abs() < 1e-5);
    }
}

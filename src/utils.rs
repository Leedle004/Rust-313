use macroquad::prelude::*;

/// Logical play-field dimensions. The window is created at this size.
pub const WIDTH: f32 = 960.0;
pub const HEIGHT: f32 = 720.0;

/// Returns a random float in the inclusive-ish range [min, max).
pub fn rand_range(min: f32, max: f32) -> f32 {
    rand::gen_range(min, max)
}

/// Random unit vector pointing in a uniformly random direction.
pub fn rand_dir() -> Vec2 {
    let a = rand_range(0.0, std::f32::consts::TAU);
    vec2(a.cos(), a.sin())
}

/// Linear interpolation between two colors.
pub fn lerp_color(a: Color, b: Color, t: f32) -> Color {
    let t = t.clamp(0.0, 1.0);
    Color::new(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t,
        a.a + (b.a - a.a) * t,
    )
}

/// Same color with a different alpha.
pub fn with_alpha(c: Color, a: f32) -> Color {
    Color::new(c.r, c.g, c.b, a)
}

/// Draws a filled circle with a soft additive-looking glow halo around it.
pub fn draw_glow_circle(pos: Vec2, radius: f32, core: Color, glow: Color) {
    draw_circle(pos.x, pos.y, radius * 2.2, with_alpha(glow, 0.08));
    draw_circle(pos.x, pos.y, radius * 1.5, with_alpha(glow, 0.15));
    draw_circle(pos.x, pos.y, radius, core);
}

/// Draws a rotated isosceles triangle "ship" pointing along `angle` (radians).
pub fn draw_ship(pos: Vec2, angle: f32, size: f32, color: Color) {
    let dir = vec2(angle.cos(), angle.sin());
    let perp = vec2(-dir.y, dir.x);
    let tip = pos + dir * size;
    let left = pos - dir * size * 0.7 + perp * size * 0.7;
    let right = pos - dir * size * 0.7 - perp * size * 0.7;
    draw_triangle(tip, left, right, color);
}

/// Circle-circle overlap test.
pub fn circles_hit(a: Vec2, ar: f32, b: Vec2, br: f32) -> bool {
    a.distance_squared(b) <= (ar + br) * (ar + br)
}

/// Draws centered text and returns the measured width.
pub fn draw_text_centered(text: &str, cx: f32, y: f32, size: f32, color: Color) -> f32 {
    let dims = measure_text(text, None, size as u16, 1.0);
    draw_text(text, cx - dims.width / 2.0, y, size, color);
    dims.width
}

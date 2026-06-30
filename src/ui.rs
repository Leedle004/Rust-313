use crate::utils::*;
use macroquad::prelude::*;

/// Semi-transparent rounded-ish panel (plain rect with border).
pub fn panel(x: f32, y: f32, w: f32, h: f32) {
    draw_rectangle(x, y, w, h, Color::new(0.04, 0.05, 0.12, 0.85));
    draw_rectangle_lines(x, y, w, h, 2.0, Color::new(0.3, 0.5, 0.9, 0.8));
}

/// Horizontal stat bar (e.g. health) with label.
pub fn stat_bar(x: f32, y: f32, w: f32, h: f32, frac: f32, fill: Color) {
    let frac = frac.clamp(0.0, 1.0);
    draw_rectangle(x, y, w, h, Color::new(0.1, 0.1, 0.12, 0.9));
    draw_rectangle(x, y, w * frac, h, fill);
    draw_rectangle_lines(x, y, w, h, 2.0, with_alpha(WHITE, 0.6));
}

/// Pulsing "press X" style prompt centered horizontally.
pub fn blink_prompt(text: &str, cx: f32, y: f32, size: f32, t: f32) {
    let a = 0.5 + 0.5 * (t * 4.0).sin();
    draw_text_centered(text, cx, y, size, with_alpha(WHITE, a));
}

/// Title with a soft colored shadow for a neon feel.
pub fn neon_title(text: &str, cx: f32, y: f32, size: f32, color: Color) {
    draw_text_centered(text, cx + 3.0, y + 3.0, size, with_alpha(color, 0.4));
    draw_text_centered(text, cx, y, size, color);
}

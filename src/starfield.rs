use crate::utils::*;
use macroquad::prelude::*;

struct Star {
    pos: Vec2,
    speed: f32,
    size: f32,
    bright: f32,
}

/// Parallax scrolling star background drawn behind everything.
pub struct Starfield {
    stars: Vec<Star>,
    nebula_t: f32,
}

impl Starfield {
    pub fn new() -> Self {
        let mut stars = Vec::with_capacity(160);
        for _ in 0..160 {
            let depth = rand_range(0.2, 1.0);
            stars.push(Star {
                pos: vec2(rand_range(0.0, WIDTH), rand_range(0.0, HEIGHT)),
                speed: 20.0 + depth * 120.0,
                size: 0.5 + depth * 2.0,
                bright: 0.3 + depth * 0.7,
            });
        }
        Self {
            stars,
            nebula_t: 0.0,
        }
    }

    pub fn update(&mut self, dt: f32, scroll_boost: f32) {
        self.nebula_t += dt * 0.1;
        for s in &mut self.stars {
            s.pos.y += s.speed * (1.0 + scroll_boost) * dt;
            if s.pos.y > HEIGHT {
                s.pos.y = 0.0;
                s.pos.x = rand_range(0.0, WIDTH);
            }
        }
    }

    pub fn draw(&self) {
        // deep space gradient backdrop
        draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, Color::new(0.02, 0.02, 0.06, 1.0));

        // soft drifting nebula blobs
        for i in 0..3 {
            let phase = self.nebula_t + i as f32 * 2.1;
            let x = WIDTH * (0.5 + 0.4 * (phase * 0.7).sin()) ;
            let y = HEIGHT * (0.5 + 0.4 * (phase * 0.5).cos());
            let col = match i {
                0 => Color::new(0.25, 0.05, 0.4, 0.05),
                1 => Color::new(0.05, 0.15, 0.4, 0.05),
                _ => Color::new(0.4, 0.1, 0.2, 0.04),
            };
            draw_circle(x, y, 260.0, col);
        }

        for s in &self.stars {
            draw_circle(s.pos.x, s.pos.y, s.size, with_alpha(WHITE, s.bright));
        }
    }
}

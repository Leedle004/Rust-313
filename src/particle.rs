use crate::utils::*;
use macroquad::prelude::*;

/// A short-lived visual particle (explosion shard, thruster ember, spark).
pub struct Particle {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f32,
    pub max_life: f32,
    pub size: f32,
    pub color: Color,
    pub drag: f32,
    pub fade_color: Color,
}

impl Particle {
    pub fn update(&mut self, dt: f32) {
        self.pos += self.vel * dt;
        self.vel *= 1.0 - self.drag * dt;
        self.life -= dt;
    }

    pub fn alive(&self) -> bool {
        self.life > 0.0
    }

    pub fn draw(&self) {
        let t = (self.life / self.max_life).clamp(0.0, 1.0);
        let col = lerp_color(self.fade_color, self.color, t);
        let r = self.size * (0.3 + 0.7 * t);
        draw_circle(self.pos.x, self.pos.y, r, with_alpha(col, t));
    }
}

/// Container + spawner helpers for all particles.
#[derive(Default)]
pub struct Particles {
    pub items: Vec<Particle>,
}

impl Particles {
    pub fn update(&mut self, dt: f32) {
        for p in &mut self.items {
            p.update(dt);
        }
        self.items.retain(|p| p.alive());
    }

    pub fn draw(&self) {
        for p in &self.items {
            p.draw();
        }
    }

    pub fn clear(&mut self) {
        self.items.clear();
    }

    /// Burst of debris for an explosion.
    pub fn explosion(&mut self, pos: Vec2, count: usize, base: Color, power: f32) {
        for _ in 0..count {
            let speed = rand_range(40.0, 60.0 + power);
            self.items.push(Particle {
                pos,
                vel: rand_dir() * speed,
                life: rand_range(0.3, 0.9),
                max_life: 0.9,
                size: rand_range(2.0, 5.0),
                color: base,
                fade_color: Color::new(1.0, 0.5, 0.1, 1.0),
                drag: 1.5,
            });
        }
        // a couple of bright white sparks
        for _ in 0..count / 3 {
            self.items.push(Particle {
                pos,
                vel: rand_dir() * rand_range(80.0, 160.0),
                life: rand_range(0.15, 0.35),
                max_life: 0.35,
                size: rand_range(1.5, 3.0),
                color: WHITE,
                fade_color: base,
                drag: 2.0,
            });
        }
    }

    /// Small thruster ember trailing behind a moving entity.
    pub fn thruster(&mut self, pos: Vec2, dir: Vec2, color: Color) {
        self.items.push(Particle {
            pos,
            vel: dir * rand_range(80.0, 160.0) + rand_dir() * 20.0,
            life: rand_range(0.15, 0.35),
            max_life: 0.35,
            size: rand_range(2.0, 4.0),
            color,
            fade_color: Color::new(1.0, 0.3, 0.0, 1.0),
            drag: 2.5,
        });
    }

    /// Tiny spark when a bullet hits something but doesn't destroy it.
    pub fn spark(&mut self, pos: Vec2, color: Color) {
        for _ in 0..4 {
            self.items.push(Particle {
                pos,
                vel: rand_dir() * rand_range(40.0, 120.0),
                life: rand_range(0.1, 0.25),
                max_life: 0.25,
                size: rand_range(1.0, 2.5),
                color,
                fade_color: WHITE,
                drag: 3.0,
            });
        }
    }
}

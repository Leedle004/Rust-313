use crate::utils::*;
use macroquad::prelude::*;

/// A projectile fired by the player or an enemy.
pub struct Bullet {
    pub pos: Vec2,
    pub vel: Vec2,
    pub radius: f32,
    pub damage: f32,
    pub from_player: bool,
    pub color: Color,
    pub alive: bool,
    pub trail: f32,
}

impl Bullet {
    pub fn new(pos: Vec2, vel: Vec2, damage: f32, from_player: bool, color: Color) -> Self {
        Self {
            pos,
            vel,
            radius: if from_player { 4.0 } else { 5.0 },
            damage,
            from_player,
            color,
            alive: true,
            trail: 0.0,
        }
    }

    pub fn update(&mut self, dt: f32) {
        self.pos += self.vel * dt;
        self.trail = (self.trail + dt * 8.0).min(1.0);
        if self.pos.x < -20.0
            || self.pos.x > WIDTH + 20.0
            || self.pos.y < -20.0
            || self.pos.y > HEIGHT + 20.0
        {
            self.alive = false;
        }
    }

    pub fn draw(&self) {
        let back = self.pos - self.vel.normalize_or_zero() * self.radius * 3.0;
        draw_line(
            back.x,
            back.y,
            self.pos.x,
            self.pos.y,
            self.radius * 1.2,
            with_alpha(self.color, 0.4),
        );
        draw_glow_circle(self.pos, self.radius, WHITE, self.color);
    }
}

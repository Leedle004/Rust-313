use crate::utils::*;
use macroquad::prelude::*;

#[derive(Clone, Copy, PartialEq)]
pub enum PowerKind {
    RapidFire,
    Spread,
    Shield,
    Health,
    Bomb,
    WeaponUp,
}

impl PowerKind {
    pub fn color(self) -> Color {
        match self {
            PowerKind::RapidFire => Color::new(1.0, 0.85, 0.1, 1.0),
            PowerKind::Spread => Color::new(0.2, 0.9, 1.0, 1.0),
            PowerKind::Shield => Color::new(0.3, 0.6, 1.0, 1.0),
            PowerKind::Health => Color::new(0.3, 1.0, 0.4, 1.0),
            PowerKind::Bomb => Color::new(1.0, 0.4, 0.2, 1.0),
            PowerKind::WeaponUp => Color::new(0.9, 0.3, 1.0, 1.0),
        }
    }

    pub fn glyph(self) -> &'static str {
        match self {
            PowerKind::RapidFire => "R",
            PowerKind::Spread => "S",
            PowerKind::Shield => "O",
            PowerKind::Health => "+",
            PowerKind::Bomb => "B",
            PowerKind::WeaponUp => "W",
        }
    }

    /// Weighted random drop. Returns None most of the time (handled by caller).
    pub fn random() -> PowerKind {
        let r = rand_range(0.0, 1.0);
        if r < 0.24 {
            PowerKind::RapidFire
        } else if r < 0.46 {
            PowerKind::Spread
        } else if r < 0.64 {
            PowerKind::Shield
        } else if r < 0.82 {
            PowerKind::Health
        } else if r < 0.92 {
            PowerKind::WeaponUp
        } else {
            PowerKind::Bomb
        }
    }
}

pub struct PowerUp {
    pub pos: Vec2,
    pub vel: Vec2,
    pub kind: PowerKind,
    pub alive: bool,
    pub spin: f32,
    pub radius: f32,
}

impl PowerUp {
    pub fn new(pos: Vec2, kind: PowerKind) -> Self {
        Self {
            pos,
            vel: vec2(rand_range(-20.0, 20.0), 70.0),
            kind,
            alive: true,
            spin: 0.0,
            radius: 14.0,
        }
    }

    pub fn update(&mut self, dt: f32) {
        self.pos += self.vel * dt;
        self.spin += dt * 2.0;
        if self.pos.y > HEIGHT + 30.0 {
            self.alive = false;
        }
    }

    pub fn draw(&self) {
        let c = self.kind.color();
        let pulse = 1.0 + 0.15 * (self.spin * 3.0).sin();
        let r = self.radius * pulse;
        draw_glow_circle(self.pos, r, with_alpha(c, 0.9), c);
        // rotating diamond outline
        for i in 0..4 {
            let a = self.spin + i as f32 * std::f32::consts::FRAC_PI_2;
            let a2 = a + std::f32::consts::FRAC_PI_2;
            let p1 = self.pos + vec2(a.cos(), a.sin()) * r;
            let p2 = self.pos + vec2(a2.cos(), a2.sin()) * r;
            draw_line(p1.x, p1.y, p2.x, p2.y, 2.0, WHITE);
        }
        draw_text_centered(self.kind.glyph(), self.pos.x, self.pos.y + 6.0, 22.0, BLACK);
    }
}

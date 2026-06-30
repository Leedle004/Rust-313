use crate::bullet::Bullet;
use crate::utils::*;
use macroquad::prelude::*;

#[derive(Clone, Copy, PartialEq)]
pub enum EnemyKind {
    Grunt,
    Shooter,
    Kamikaze,
    Asteroid,
    Boss,
}

pub struct Enemy {
    pub pos: Vec2,
    pub vel: Vec2,
    pub kind: EnemyKind,
    pub hp: f32,
    pub max_hp: f32,
    pub radius: f32,
    pub fire_cd: f32,
    pub age: f32,
    pub alive: bool,
    pub value: i32,
    pub color: Color,
    pub contact_dmg: f32,
    pub phase: f32,
    pub hit_flash: f32,
}

impl Enemy {
    pub fn new(kind: EnemyKind, pos: Vec2, difficulty: f32) -> Self {
        let (hp, radius, value, color, contact) = match kind {
            EnemyKind::Grunt => (
                20.0 + difficulty * 6.0,
                16.0,
                100,
                Color::new(1.0, 0.4, 0.4, 1.0),
                18.0,
            ),
            EnemyKind::Shooter => (
                30.0 + difficulty * 8.0,
                18.0,
                150,
                Color::new(1.0, 0.7, 0.2, 1.0),
                18.0,
            ),
            EnemyKind::Kamikaze => (
                14.0 + difficulty * 4.0,
                14.0,
                120,
                Color::new(1.0, 0.2, 0.6, 1.0),
                28.0,
            ),
            EnemyKind::Asteroid => (
                40.0 + difficulty * 10.0,
                26.0,
                80,
                Color::new(0.6, 0.55, 0.5, 1.0),
                22.0,
            ),
            EnemyKind::Boss => (
                900.0 + difficulty * 220.0,
                64.0,
                3000,
                Color::new(0.8, 0.2, 0.9, 1.0),
                40.0,
            ),
        };
        Self {
            pos,
            vel: Vec2::ZERO,
            kind,
            hp,
            max_hp: hp,
            radius,
            fire_cd: rand_range(0.5, 2.0),
            age: 0.0,
            alive: true,
            value,
            color,
            contact_dmg: contact,
            phase: rand_range(0.0, std::f32::consts::TAU),
            hit_flash: 0.0,
        }
    }

    pub fn hurt(&mut self, dmg: f32) {
        self.hp -= dmg;
        self.hit_flash = 0.12;
        if self.hp <= 0.0 {
            self.alive = false;
        }
    }

    /// Updates movement/behavior; may push enemy bullets aimed at `target`.
    pub fn update(&mut self, dt: f32, target: Vec2, bullets: &mut Vec<Bullet>, difficulty: f32) {
        self.age += dt;
        self.hit_flash = (self.hit_flash - dt).max(0.0);
        self.fire_cd -= dt;

        match self.kind {
            EnemyKind::Grunt => {
                self.vel = vec2((self.age * 2.0 + self.phase).sin() * 120.0, 90.0 + difficulty * 4.0);
            }
            EnemyKind::Shooter => {
                self.vel = vec2((self.age * 1.3 + self.phase).cos() * 70.0, 55.0);
                if self.pos.y < HEIGHT * 0.45 && self.fire_cd <= 0.0 {
                    self.fire_cd = (1.6 - difficulty * 0.04).max(0.6);
                    let dir = (target - self.pos).normalize_or_zero();
                    bullets.push(Bullet::new(
                        self.pos,
                        dir * (260.0 + difficulty * 8.0),
                        12.0,
                        false,
                        Color::new(1.0, 0.6, 0.2, 1.0),
                    ));
                }
            }
            EnemyKind::Kamikaze => {
                // accelerate toward player
                let dir = (target - self.pos).normalize_or_zero();
                self.vel = self.vel.lerp(dir * (300.0 + difficulty * 10.0), 2.0 * dt);
            }
            EnemyKind::Asteroid => {
                self.vel = vec2((self.phase).sin() * 40.0, 70.0);
                self.phase += dt * 0.5;
            }
            EnemyKind::Boss => {
                // hover near top, strafe side to side
                let target_y = 130.0;
                self.vel.y = (target_y - self.pos.y) * 1.5;
                self.vel.x = (self.age * 0.8).sin() * 130.0;
                if self.fire_cd <= 0.0 {
                    self.fire_cd = (0.9 - difficulty * 0.02).max(0.35);
                    // radial burst + aimed shots, escalating as hp drops
                    let frac = self.hp / self.max_hp;
                    let n = if frac < 0.4 { 14 } else if frac < 0.7 { 10 } else { 7 };
                    let base = self.age;
                    for i in 0..n {
                        let a = base + i as f32 / n as f32 * std::f32::consts::TAU;
                        let v = vec2(a.cos(), a.sin()) * (190.0 + difficulty * 6.0);
                        bullets.push(Bullet::new(
                            self.pos,
                            v,
                            10.0,
                            false,
                            Color::new(0.9, 0.4, 1.0, 1.0),
                        ));
                    }
                    // aimed pair
                    let dir = (target - self.pos).normalize_or_zero();
                    for off in [-0.15_f32, 0.15] {
                        let rot = Vec2::from_angle(off).rotate(dir);
                        bullets.push(Bullet::new(
                            self.pos,
                            rot * 320.0,
                            14.0,
                            false,
                            Color::new(1.0, 0.5, 0.3, 1.0),
                        ));
                    }
                }
            }
        }

        self.pos += self.vel * dt;

        // bounce non-boss off side walls a little; boss clamps
        if self.kind == EnemyKind::Boss {
            self.pos.x = self.pos.x.clamp(self.radius, WIDTH - self.radius);
        }

        // despawn when off the bottom (boss never leaves)
        if self.kind != EnemyKind::Boss && self.pos.y > HEIGHT + 60.0 {
            self.alive = false;
        }
    }

    pub fn draw(&self) {
        let c = if self.hit_flash > 0.0 {
            WHITE
        } else {
            self.color
        };
        match self.kind {
            EnemyKind::Grunt => {
                draw_ship(self.pos, std::f32::consts::FRAC_PI_2, self.radius, c);
                draw_circle(self.pos.x, self.pos.y, self.radius * 0.3, BLACK);
            }
            EnemyKind::Shooter => {
                let r = self.radius;
                draw_poly(self.pos.x, self.pos.y, 6, r, self.age * 40.0, c);
                draw_circle(self.pos.x, self.pos.y, r * 0.4, Color::new(1.0, 1.0, 0.6, 1.0));
            }
            EnemyKind::Kamikaze => {
                draw_ship(self.pos, std::f32::consts::FRAC_PI_2, self.radius, c);
                draw_circle_lines(self.pos.x, self.pos.y, self.radius * 1.3, 1.5, with_alpha(c, 0.5));
            }
            EnemyKind::Asteroid => {
                // lumpy rock from a polygon
                let sides = 9;
                let mut prev = Vec2::ZERO;
                let mut first = Vec2::ZERO;
                for i in 0..=sides {
                    let a = i as f32 / sides as f32 * std::f32::consts::TAU + self.phase;
                    let rr = self.radius * (0.8 + 0.25 * (a * 3.0 + self.phase).sin());
                    let p = self.pos + vec2(a.cos(), a.sin()) * rr;
                    if i == 0 {
                        first = p;
                    } else {
                        draw_line(prev.x, prev.y, p.x, p.y, 3.0, c);
                    }
                    prev = p;
                }
                draw_line(prev.x, prev.y, first.x, first.y, 3.0, c);
            }
            EnemyKind::Boss => {
                let r = self.radius;
                draw_glow_circle(self.pos, r, c, c);
                draw_poly(self.pos.x, self.pos.y, 8, r, self.age * 20.0, with_alpha(c, 0.9));
                draw_poly_lines(self.pos.x, self.pos.y, 8, r * 1.2, -self.age * 30.0, 3.0, WHITE);
                draw_circle(self.pos.x, self.pos.y, r * 0.4, Color::new(1.0, 0.9, 0.3, 1.0));
                // boss health bar
                let bw = 200.0;
                let frac = (self.hp / self.max_hp).clamp(0.0, 1.0);
                draw_rectangle(WIDTH / 2.0 - bw / 2.0, 24.0, bw, 12.0, Color::new(0.2, 0.0, 0.1, 0.8));
                draw_rectangle(
                    WIDTH / 2.0 - bw / 2.0,
                    24.0,
                    bw * frac,
                    12.0,
                    Color::new(1.0, 0.3, 0.6, 1.0),
                );
                draw_rectangle_lines(WIDTH / 2.0 - bw / 2.0, 24.0, bw, 12.0, 2.0, WHITE);
                draw_text_centered("BOSS", WIDTH / 2.0, 20.0, 20.0, WHITE);
            }
        }

        // small health pip for tougher non-boss enemies
        if self.kind != EnemyKind::Boss && self.hp < self.max_hp {
            let bw = self.radius * 2.0;
            let frac = (self.hp / self.max_hp).clamp(0.0, 1.0);
            let y = self.pos.y - self.radius - 8.0;
            draw_rectangle(self.pos.x - bw / 2.0, y, bw, 3.0, Color::new(0.3, 0.0, 0.0, 0.7));
            draw_rectangle(self.pos.x - bw / 2.0, y, bw * frac, 3.0, GREEN);
        }
    }
}

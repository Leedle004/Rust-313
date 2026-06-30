use crate::bullet::Bullet;
use crate::particle::Particles;
use crate::powerup::PowerKind;
use crate::utils::*;
use macroquad::prelude::*;

pub struct Player {
    pub pos: Vec2,
    pub vel: Vec2,
    pub radius: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub lives: i32,
    pub fire_cd: f32,
    pub weapon_level: i32,
    pub rapid_timer: f32,
    pub spread_timer: f32,
    pub shield_timer: f32,
    pub invuln: f32,
    pub bombs: i32,
    pub anim: f32,
    pub alive: bool,
}

impl Player {
    pub fn new() -> Self {
        Self {
            pos: vec2(WIDTH / 2.0, HEIGHT - 90.0),
            vel: Vec2::ZERO,
            radius: 16.0,
            hp: 100.0,
            max_hp: 100.0,
            lives: 3,
            fire_cd: 0.0,
            weapon_level: 1,
            rapid_timer: 0.0,
            spread_timer: 0.0,
            shield_timer: 0.0,
            invuln: 1.5,
            bombs: 1,
            anim: 0.0,
            alive: true,
        }
    }

    pub fn shielded(&self) -> bool {
        self.shield_timer > 0.0
    }

    pub fn apply_powerup(&mut self, kind: PowerKind) {
        match kind {
            PowerKind::RapidFire => self.rapid_timer = (self.rapid_timer + 8.0).min(16.0),
            PowerKind::Spread => self.spread_timer = (self.spread_timer + 10.0).min(20.0),
            PowerKind::Shield => self.shield_timer = (self.shield_timer + 8.0).min(16.0),
            PowerKind::Health => self.hp = (self.hp + 35.0).min(self.max_hp),
            PowerKind::Bomb => self.bombs = (self.bombs + 1).min(5),
            PowerKind::WeaponUp => self.weapon_level = (self.weapon_level + 1).min(5),
        }
    }

    /// Returns true if the hit actually dealt damage (used for screen shake).
    pub fn take_damage(&mut self, dmg: f32) -> bool {
        if self.invuln > 0.0 {
            return false;
        }
        if self.shielded() {
            self.shield_timer = 0.0;
            self.invuln = 1.0;
            return true;
        }
        self.hp -= dmg;
        self.invuln = 1.0;
        if self.hp <= 0.0 {
            self.hp = 0.0;
            self.lives -= 1;
            if self.lives > 0 {
                self.hp = self.max_hp;
                self.invuln = 2.5;
                self.pos = vec2(WIDTH / 2.0, HEIGHT - 90.0);
            } else {
                self.alive = false;
            }
        }
        true
    }

    pub fn update(&mut self, dt: f32, particles: &mut Particles) {
        self.anim += dt;
        self.invuln = (self.invuln - dt).max(0.0);
        self.rapid_timer = (self.rapid_timer - dt).max(0.0);
        self.spread_timer = (self.spread_timer - dt).max(0.0);
        self.shield_timer = (self.shield_timer - dt).max(0.0);
        self.fire_cd = (self.fire_cd - dt).max(0.0);

        // --- input: movement ---
        let mut dir = Vec2::ZERO;
        if is_key_down(KeyCode::Left) || is_key_down(KeyCode::A) {
            dir.x -= 1.0;
        }
        if is_key_down(KeyCode::Right) || is_key_down(KeyCode::D) {
            dir.x += 1.0;
        }
        if is_key_down(KeyCode::Up) || is_key_down(KeyCode::W) {
            dir.y -= 1.0;
        }
        if is_key_down(KeyCode::Down) || is_key_down(KeyCode::S) {
            dir.y += 1.0;
        }
        let accel = 2600.0;
        let max_speed = 460.0;
        if dir != Vec2::ZERO {
            self.vel += dir.normalize() * accel * dt;
            // engine embers
            particles.thruster(
                self.pos + vec2(rand_range(-6.0, 6.0), self.radius),
                vec2(0.0, 1.0),
                Color::new(0.4, 0.7, 1.0, 1.0),
            );
        }
        // friction
        self.vel *= 1.0 - 8.0 * dt;
        if self.vel.length() > max_speed {
            self.vel = self.vel.normalize() * max_speed;
        }
        self.pos += self.vel * dt;

        // clamp to playfield
        self.pos.x = self.pos.x.clamp(self.radius, WIDTH - self.radius);
        self.pos.y = self.pos.y.clamp(self.radius, HEIGHT - self.radius);
    }

    /// Tries to fire; pushes new bullets and returns true if it fired.
    pub fn try_fire(&mut self, bullets: &mut Vec<Bullet>) -> bool {
        let firing = is_key_down(KeyCode::Space)
            || is_mouse_button_down(MouseButton::Left)
            || is_key_down(KeyCode::J);
        if !firing || self.fire_cd > 0.0 {
            return false;
        }
        let base_cd = 0.22;
        let cd = if self.rapid_timer > 0.0 {
            base_cd * 0.45
        } else {
            base_cd
        };
        self.fire_cd = cd;

        let speed = 720.0;
        let dmg = 10.0 + (self.weapon_level - 1) as f32 * 4.0;
        let col = Color::new(0.4, 1.0, 0.7, 1.0);
        let nose = self.pos + vec2(0.0, -self.radius - 4.0);

        // Number of forward streams scales with weapon level.
        let streams = self.weapon_level.min(3);
        for i in 0..streams {
            let offset = (i as f32 - (streams as f32 - 1.0) / 2.0) * 10.0;
            bullets.push(Bullet::new(
                nose + vec2(offset, 0.0),
                vec2(0.0, -speed),
                dmg,
                true,
                col,
            ));
        }

        // Spread power-up adds diagonal shots.
        if self.spread_timer > 0.0 {
            for ang in [-0.35_f32, 0.35] {
                let v = vec2(ang.sin(), -ang.cos()) * speed;
                bullets.push(Bullet::new(nose, v, dmg * 0.8, true, col));
            }
            if self.weapon_level >= 3 {
                for ang in [-0.7_f32, 0.7] {
                    let v = vec2(ang.sin(), -ang.cos()) * speed;
                    bullets.push(Bullet::new(nose, v, dmg * 0.7, true, col));
                }
            }
        }
        true
    }

    pub fn draw(&self) {
        // blink while invulnerable
        if self.invuln > 0.0 && (self.anim * 18.0).sin() < 0.0 {
            return;
        }
        let body = Color::new(0.6, 0.9, 1.0, 1.0);
        let wing = Color::new(0.2, 0.5, 0.9, 1.0);

        // wings
        let p = self.pos;
        let r = self.radius;
        draw_triangle(
            p + vec2(-r, r * 0.6),
            p + vec2(-r * 1.4, r * 1.1),
            p + vec2(-r * 0.2, r * 0.2),
            wing,
        );
        draw_triangle(
            p + vec2(r, r * 0.6),
            p + vec2(r * 1.4, r * 1.1),
            p + vec2(r * 0.2, r * 0.2),
            wing,
        );
        // hull (pointing up = -PI/2)
        draw_ship(p, -std::f32::consts::FRAC_PI_2, r * 1.3, body);
        // cockpit
        draw_circle(p.x, p.y - r * 0.2, r * 0.35, Color::new(0.9, 1.0, 1.0, 1.0));

        // engine flame
        let flame = 0.6 + 0.4 * (self.anim * 30.0).sin().abs();
        draw_triangle(
            p + vec2(-r * 0.4, r * 0.6),
            p + vec2(r * 0.4, r * 0.6),
            p + vec2(0.0, r * (1.0 + flame)),
            Color::new(1.0, 0.6 + 0.3 * flame, 0.1, 0.9),
        );

        if self.shielded() {
            let a = 0.25 + 0.15 * (self.anim * 6.0).sin();
            draw_circle_lines(p.x, p.y, r * 2.0, 2.5, Color::new(0.4, 0.7, 1.0, 0.8));
            draw_circle(p.x, p.y, r * 2.0, Color::new(0.3, 0.6, 1.0, a));
        }
    }
}

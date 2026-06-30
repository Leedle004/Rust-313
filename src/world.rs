//! The simulation: game state machine, spawning, collisions and scoring.
//!
//! `World::update` is a pure-ish step function — given a frame `dt` and the
//! player's `Input`, it advances the whole game. Rendering reads the resulting
//! state. This separation lets the gameplay be unit-tested without a window.

use crate::entities::*;
use crate::util::*;
use glam::Vec2;

/// High-level phase the game is in.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phase {
    /// Title screen, waiting for the player to start.
    Title,
    /// Active gameplay.
    Playing,
    /// All lives lost; waiting for a restart.
    GameOver,
}

/// Player intent for a single frame, produced by the input layer.
#[derive(Clone, Copy, Debug, Default)]
pub struct Input {
    /// -1 = turn left, +1 = turn right, 0 = no turn.
    pub turn: f32,
    pub thrust: bool,
    /// True on the frame the fire key was pressed.
    pub fire: bool,
    /// True on the frame the start/confirm key was pressed.
    pub start: bool,
}

pub struct World {
    pub width: f32,
    pub height: f32,
    pub phase: Phase,

    pub ship: Option<Ship>,
    pub bullets: Vec<Bullet>,
    pub asteroids: Vec<Asteroid>,
    pub ufos: Vec<Ufo>,
    pub particles: Vec<Particle>,

    pub score: u32,
    pub high_score: u32,
    pub lives: u32,
    pub level: u32,

    /// Counts down before the ship respawns after dying.
    pub respawn_timer: f32,
    /// Counts down before the next wave spawns after a level is cleared.
    pub wave_timer: f32,
    /// Counts down to the next UFO appearance.
    pub ufo_timer: f32,
    /// Decaying screen-shake intensity (0..1-ish), read by the renderer.
    pub shake: f32,
    /// Total elapsed gameplay time, handy for animated rendering.
    pub time: f32,
}

const STARTING_LIVES: u32 = 3;
const RESPAWN_DELAY: f32 = 1.6;
const WAVE_DELAY: f32 = 1.6;
const EXTRA_LIFE_EVERY: u32 = 10_000;

impl World {
    pub fn new(width: f32, height: f32) -> Self {
        let mut w = World {
            width,
            height,
            phase: Phase::Title,
            ship: None,
            bullets: Vec::new(),
            asteroids: Vec::new(),
            ufos: Vec::new(),
            particles: Vec::new(),
            score: 0,
            high_score: 0,
            lives: 0,
            level: 0,
            respawn_timer: 0.0,
            wave_timer: 0.0,
            ufo_timer: 0.0,
            shake: 0.0,
            time: 0.0,
        };
        // Populate a drifting asteroid field behind the title screen.
        w.spawn_wave(4);
        w
    }

    fn center(&self) -> Vec2 {
        Vec2::new(self.width * 0.5, self.height * 0.5)
    }

    /// Begin a brand-new game from the title or game-over screen.
    pub fn start_game(&mut self) {
        self.phase = Phase::Playing;
        self.score = 0;
        self.lives = STARTING_LIVES;
        self.level = 0;
        self.bullets.clear();
        self.ufos.clear();
        self.particles.clear();
        self.respawn_timer = 0.0;
        self.ufo_timer = rand_range(8.0, 16.0);
        self.next_level();
        self.ship = Some(Ship::new(self.center()));
    }

    /// Advance to the next level and spawn its asteroid wave.
    fn next_level(&mut self) {
        self.level += 1;
        let count = (3 + self.level).min(11);
        self.spawn_wave(count);
        self.wave_timer = 0.0;
    }

    /// Spawn `count` large asteroids around the edges, away from the centre so
    /// they never materialise on top of the player.
    fn spawn_wave(&mut self, count: u32) {
        let c = self.center();
        for _ in 0..count {
            let mut pos;
            loop {
                pos = Vec2::new(rand_range(0.0, self.width), rand_range(0.0, self.height));
                if (pos - c).length() > 160.0 {
                    break;
                }
            }
            self.asteroids.push(Asteroid::new(pos, AstSize::Large));
        }
    }

    /// The main per-frame update.
    pub fn update(&mut self, dt: f32, input: Input) {
        // Clamp dt so a long pause (e.g. tab switch) can't fling entities
        // across the field in a single huge step.
        let dt = dt.clamp(0.0, 0.05);
        self.time += dt;
        if self.shake > 0.0 {
            self.shake = (self.shake - dt * 1.5).max(0.0);
        }

        match self.phase {
            Phase::Title => {
                self.drift_background(dt);
                if input.start {
                    self.start_game();
                }
            }
            Phase::GameOver => {
                self.drift_background(dt);
                self.step_particles(dt);
                if input.start {
                    self.start_game();
                }
            }
            Phase::Playing => self.step_playing(dt, input),
        }
    }

    /// Keep asteroids gently moving on the menu / game-over backdrop.
    fn drift_background(&mut self, dt: f32) {
        for a in &mut self.asteroids {
            a.integrate(dt, self.width, self.height);
        }
    }

    fn step_particles(&mut self, dt: f32) {
        for p in &mut self.particles {
            p.integrate(dt, self.width, self.height);
        }
        self.particles.retain(Particle::alive);
    }

    fn step_playing(&mut self, dt: f32, input: Input) {
        // --- Ship + firing ---------------------------------------------------
        if let Some(ship) = self.ship.as_mut() {
            ship.integrate(dt, input.turn, input.thrust, self.width, self.height);
            if input.thrust {
                // Emit a thruster spark out of the tail.
                let back = ship.angle + std::f32::consts::PI;
                let dir = dir_from_angle(back);
                let p = ship.pos + dir * (ship.radius + 2.0);
                self.particles.push(Particle {
                    pos: p,
                    vel: dir * rand_range(60.0, 150.0) + ship.vel,
                    life: rand_range(0.2, 0.45),
                    max_life: 0.45,
                    warm: rand_range(0.5, 1.0),
                    size: rand_range(1.5, 3.0),
                });
            }
            if input.fire && ship.fire_cd <= 0.0 {
                ship.fire_cd = Ship::FIRE_COOLDOWN;
                let dir = dir_from_angle(ship.angle);
                let muzzle = ship.nose();
                let vel = dir * Bullet::SPEED + ship.vel;
                self.bullets.push(Bullet {
                    pos: muzzle,
                    vel,
                    life: Bullet::LIFE,
                    radius: 2.0,
                    from_player: true,
                });
            }
        } else {
            // Ship is dead; tick the respawn timer.
            self.respawn_timer -= dt;
            if self.respawn_timer <= 0.0 && self.lives > 0 {
                self.ship = Some(Ship::new(self.center()));
            }
        }

        // --- Movement --------------------------------------------------------
        for b in &mut self.bullets {
            b.integrate(dt, self.width, self.height);
        }
        self.bullets.retain(Bullet::alive);

        for a in &mut self.asteroids {
            a.integrate(dt, self.width, self.height);
        }

        self.update_ufos(dt);
        self.step_particles(dt);

        // --- Collisions ------------------------------------------------------
        self.resolve_bullet_hits();
        self.resolve_ship_hits();

        // --- Wave / level progression ---------------------------------------
        if self.asteroids.is_empty() && self.ufos.is_empty() {
            if self.wave_timer <= 0.0 {
                self.wave_timer = WAVE_DELAY;
            }
            self.wave_timer -= dt;
            if self.wave_timer <= 0.0 {
                self.next_level();
            }
        }
    }

    fn update_ufos(&mut self, dt: f32) {
        // Spawn timer.
        self.ufo_timer -= dt;
        if self.ufo_timer <= 0.0 {
            self.spawn_ufo();
            // Smaller, deadlier UFOs become more frequent at higher levels.
            self.ufo_timer = rand_range(12.0, 22.0) - (self.level as f32).min(10.0) * 0.6;
        }

        let mut new_bullets: Vec<Bullet> = Vec::new();
        let ship_pos = self.ship.as_ref().map(|s| s.pos);
        for u in &mut self.ufos {
            u.integrate(dt, self.width, self.height);
            if u.turn_cd <= 0.0 {
                u.vel.y = rand_range(-70.0, 70.0);
                u.turn_cd = rand_range(0.6, 1.6);
            }
            if u.shoot_cd <= 0.0 {
                u.shoot_cd = match u.size {
                    UfoSize::Big => rand_range(1.0, 1.8),
                    UfoSize::Small => rand_range(0.7, 1.2),
                };
                let dir = match (u.size, ship_pos) {
                    // Small UFOs aim at the player; big ones fire randomly.
                    (UfoSize::Small, Some(sp)) => {
                        let d = toroidal_delta(u.pos, sp, self.width, self.height);
                        if d.length_squared() > 1.0 {
                            d.normalize()
                        } else {
                            rand_unit()
                        }
                    }
                    _ => rand_unit(),
                };
                new_bullets.push(Bullet {
                    pos: u.pos + dir * (u.radius + 3.0),
                    vel: dir * 320.0,
                    life: 1.4,
                    radius: 2.0,
                    from_player: false,
                });
            }
        }
        self.bullets.append(&mut new_bullets);

        // Remove UFOs that have crossed the whole field.
        let w = self.width;
        self.ufos.retain(|u| u.pos.x > -40.0 && u.pos.x < w + 40.0);
    }

    fn spawn_ufo(&mut self) {
        // Bigger UFOs early, smaller (aimed-fire) UFOs as the player advances.
        let size = if self.level >= 3 && quad_rand::gen_range(0.0_f32, 1.0_f32) < 0.45 {
            UfoSize::Small
        } else {
            UfoSize::Big
        };
        let from_left = quad_rand::gen_range(0u32, 2u32) == 0;
        let x = if from_left { -30.0 } else { self.width + 30.0 };
        let speed = match size {
            UfoSize::Big => 110.0,
            UfoSize::Small => 150.0,
        };
        let vx = if from_left { speed } else { -speed };
        self.ufos.push(Ufo {
            pos: Vec2::new(x, rand_range(self.height * 0.15, self.height * 0.85)),
            vel: Vec2::new(vx, rand_range(-40.0, 40.0)),
            size,
            radius: Ufo::radius_for(size),
            shoot_cd: rand_range(0.6, 1.4),
            turn_cd: rand_range(0.5, 1.2),
        });
    }

    /// Player bullets vs asteroids and UFOs.
    fn resolve_bullet_hits(&mut self) {
        let w = self.width;
        let h = self.height;
        let mut killed_bullets: Vec<usize> = Vec::new();
        let mut new_asteroids: Vec<Asteroid> = Vec::new();
        let mut dead_asteroids: Vec<usize> = Vec::new();
        let mut gained = 0u32;

        for (bi, b) in self.bullets.iter().enumerate() {
            if !b.from_player {
                continue;
            }
            // Asteroid hits.
            let mut hit = false;
            for (ai, a) in self.asteroids.iter().enumerate() {
                if dead_asteroids.contains(&ai) {
                    continue;
                }
                if circles_overlap(b.pos, b.radius, a.pos, a.radius, w, h) {
                    dead_asteroids.push(ai);
                    gained += a.size.score();
                    Self::spawn_debris(&mut self.particles, a.pos, a.radius, 0.35);
                    if let Some(smaller) = a.size.smaller() {
                        for _ in 0..2 {
                            let mut child = Asteroid::new(a.pos, smaller);
                            // Inherit some of the parent's momentum + scatter.
                            child.vel += a.vel * 0.4;
                            new_asteroids.push(child);
                        }
                    }
                    hit = true;
                    break;
                }
            }
            if hit {
                killed_bullets.push(bi);
                continue;
            }
            // UFO hits.
            for u in self.ufos.iter_mut() {
                if circles_overlap(b.pos, b.radius, u.pos, u.radius, w, h) {
                    gained += u.score();
                    Self::spawn_debris(&mut self.particles, u.pos, u.radius, 0.5);
                    u.shoot_cd = f32::INFINITY; // mark for removal below
                    killed_bullets.push(bi);
                    break;
                }
            }
        }

        // Remove dead UFOs (flagged via infinite cooldown sentinel).
        self.ufos.retain(|u| u.shoot_cd.is_finite());

        // Apply asteroid removals (descending so indices stay valid).
        dead_asteroids.sort_unstable();
        dead_asteroids.dedup();
        for &ai in dead_asteroids.iter().rev() {
            self.asteroids.swap_remove(ai);
        }
        self.asteroids.append(&mut new_asteroids);

        // Remove spent bullets.
        killed_bullets.sort_unstable();
        killed_bullets.dedup();
        for &bi in killed_bullets.iter().rev() {
            if bi < self.bullets.len() {
                self.bullets.swap_remove(bi);
            }
        }

        if gained > 0 {
            self.add_score(gained);
            self.shake = (self.shake + 0.25).min(1.0);
        }
    }

    /// Anything lethal vs the player ship.
    fn resolve_ship_hits(&mut self) {
        let w = self.width;
        let h = self.height;
        let Some(ship) = self.ship.as_ref() else {
            return;
        };
        if ship.is_invulnerable() {
            return;
        }
        let sp = ship.pos;
        let sr = ship.radius;

        let mut died = false;

        // Enemy bullets.
        let mut hit_bullet: Option<usize> = None;
        for (bi, b) in self.bullets.iter().enumerate() {
            if b.from_player {
                continue;
            }
            if circles_overlap(sp, sr, b.pos, b.radius, w, h) {
                hit_bullet = Some(bi);
                died = true;
                break;
            }
        }
        if let Some(bi) = hit_bullet {
            self.bullets.swap_remove(bi);
        }

        // Asteroids.
        if !died {
            let mut hit_ast: Option<usize> = None;
            for (ai, a) in self.asteroids.iter().enumerate() {
                if circles_overlap(sp, sr, a.pos, a.radius, w, h) {
                    hit_ast = Some(ai);
                    died = true;
                    break;
                }
            }
            if let Some(ai) = hit_ast {
                // Break the asteroid we collided with too.
                // Ramming an asteroid breaks it but awards no points.
                let a = self.asteroids[ai].clone();
                Self::spawn_debris(&mut self.particles, a.pos, a.radius, 0.35);
                if let Some(smaller) = a.size.smaller() {
                    for _ in 0..2 {
                        self.asteroids.push(Asteroid::new(a.pos, smaller));
                    }
                }
                self.asteroids.swap_remove(ai);
            }
        }

        // UFOs (ramming).
        if !died {
            let mut hit_ufo: Option<usize> = None;
            for (ui, u) in self.ufos.iter().enumerate() {
                if circles_overlap(sp, sr, u.pos, u.radius, w, h) {
                    hit_ufo = Some(ui);
                    died = true;
                    break;
                }
            }
            if let Some(ui) = hit_ufo {
                let u = self.ufos[ui].clone();
                Self::spawn_debris(&mut self.particles, u.pos, u.radius, 0.5);
                self.ufos.swap_remove(ui);
            }
        }

        if died {
            self.kill_ship();
        }
    }

    fn kill_ship(&mut self) {
        if let Some(ship) = self.ship.take() {
            Self::spawn_debris(&mut self.particles, ship.pos, 24.0, 0.7);
        }
        self.shake = 1.0;
        self.lives = self.lives.saturating_sub(1);
        if self.lives == 0 {
            self.phase = Phase::GameOver;
            if self.score > self.high_score {
                self.high_score = self.score;
            }
        } else {
            self.respawn_timer = RESPAWN_DELAY;
        }
    }

    fn add_score(&mut self, amount: u32) {
        let before = self.score;
        self.score += amount;
        // Award a bonus life each time a multiple of EXTRA_LIFE_EVERY is crossed.
        if self.score / EXTRA_LIFE_EVERY > before / EXTRA_LIFE_EVERY {
            self.lives += 1;
        }
        if self.score > self.high_score {
            self.high_score = self.score;
        }
    }

    /// Spawn a burst of debris particles at `pos`.
    fn spawn_debris(particles: &mut Vec<Particle>, pos: Vec2, radius: f32, warmth: f32) {
        let n = (radius * 0.6) as u32 + 8;
        for _ in 0..n {
            let dir = rand_unit();
            let speed = rand_range(40.0, 60.0 + radius * 3.0);
            particles.push(Particle {
                pos,
                vel: dir * speed,
                life: rand_range(0.3, 0.8),
                max_life: 0.8,
                warm: warmth * rand_range(0.6, 1.0),
                size: rand_range(1.5, 3.5),
            });
        }
    }

    /// Number of asteroids currently alive (used by tests / HUD).
    pub fn asteroid_count(&self) -> usize {
        self.asteroids.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn quiet_world() -> World {
        // Seed RNG so spawn positions are deterministic across test runs.
        quad_rand::srand(42);
        World::new(800.0, 600.0)
    }

    #[test]
    fn title_then_start_creates_ship_and_lives() {
        let mut w = quiet_world();
        assert_eq!(w.phase, Phase::Title);
        assert!(w.ship.is_none());
        w.update(
            0.016,
            Input {
                start: true,
                ..Default::default()
            },
        );
        assert_eq!(w.phase, Phase::Playing);
        assert!(w.ship.is_some());
        assert_eq!(w.lives, STARTING_LIVES);
        assert!(w.asteroid_count() >= 4);
    }

    #[test]
    fn firing_creates_a_bullet_then_respects_cooldown() {
        let mut w = quiet_world();
        w.start_game();
        let fire = Input {
            fire: true,
            ..Default::default()
        };
        w.update(0.016, fire);
        assert_eq!(w.bullets.iter().filter(|b| b.from_player).count(), 1);
        // Immediate second press is blocked by the cooldown.
        w.update(0.016, fire);
        assert_eq!(w.bullets.iter().filter(|b| b.from_player).count(), 1);
    }

    #[test]
    fn bullet_destroys_and_splits_large_asteroid() {
        let mut w = quiet_world();
        w.start_game();
        w.bullets.clear();
        w.ufos.clear();
        w.asteroids.clear();
        w.asteroids
            .push(Asteroid::new(Vec2::new(400.0, 300.0), AstSize::Large));
        w.bullets.push(Bullet {
            pos: Vec2::new(400.0, 300.0),
            vel: Vec2::ZERO,
            life: 1.0,
            radius: 2.0,
            from_player: true,
        });
        let score_before = w.score;
        w.update(0.016, Input::default());
        // One large removed, two mediums added.
        assert_eq!(w.asteroids.len(), 2);
        assert!(w.asteroids.iter().all(|a| a.size == AstSize::Medium));
        assert_eq!(w.score, score_before + AstSize::Large.score());
    }

    #[test]
    fn small_asteroid_is_removed_without_children() {
        let mut w = quiet_world();
        w.start_game();
        w.bullets.clear();
        w.asteroids.clear();
        w.asteroids
            .push(Asteroid::new(Vec2::new(400.0, 300.0), AstSize::Small));
        w.bullets.push(Bullet {
            pos: Vec2::new(400.0, 300.0),
            vel: Vec2::ZERO,
            life: 1.0,
            radius: 2.0,
            from_player: true,
        });
        w.update(0.016, Input::default());
        assert_eq!(w.asteroids.len(), 0);
    }

    #[test]
    fn ship_dies_when_hit_after_invulnerability() {
        let mut w = quiet_world();
        w.start_game();
        w.asteroids.clear();
        w.ufos.clear();
        // Drop invulnerability.
        if let Some(s) = w.ship.as_mut() {
            s.invuln = 0.0;
            s.pos = Vec2::new(400.0, 300.0);
        }
        w.asteroids
            .push(Asteroid::new(Vec2::new(400.0, 300.0), AstSize::Small));
        let lives_before = w.lives;
        w.update(0.016, Input::default());
        assert!(w.ship.is_none());
        assert_eq!(w.lives, lives_before - 1);
    }

    #[test]
    fn invulnerable_ship_survives_contact() {
        let mut w = quiet_world();
        w.start_game();
        w.asteroids.clear();
        w.ufos.clear();
        if let Some(s) = w.ship.as_mut() {
            s.pos = Vec2::new(400.0, 300.0);
            assert!(s.is_invulnerable());
        }
        w.asteroids
            .push(Asteroid::new(Vec2::new(400.0, 300.0), AstSize::Small));
        let lives_before = w.lives;
        w.update(0.016, Input::default());
        assert!(w.ship.is_some());
        assert_eq!(w.lives, lives_before);
    }

    #[test]
    fn losing_last_life_ends_the_game() {
        let mut w = quiet_world();
        w.start_game();
        w.lives = 1;
        w.asteroids.clear();
        w.ufos.clear();
        if let Some(s) = w.ship.as_mut() {
            s.invuln = 0.0;
            s.pos = Vec2::new(400.0, 300.0);
        }
        w.asteroids
            .push(Asteroid::new(Vec2::new(400.0, 300.0), AstSize::Small));
        w.update(0.016, Input::default());
        assert_eq!(w.phase, Phase::GameOver);
        assert_eq!(w.lives, 0);
    }

    #[test]
    fn clearing_all_asteroids_advances_level() {
        let mut w = quiet_world();
        w.start_game();
        let level_before = w.level;
        w.asteroids.clear();
        w.ufos.clear();
        // Tick past the wave delay.
        for _ in 0..200 {
            w.update(0.016, Input::default());
            if w.level > level_before {
                break;
            }
        }
        assert!(w.level > level_before);
        assert!(w.asteroid_count() > 0);
    }

    #[test]
    fn extra_life_awarded_on_score_threshold() {
        let mut w = quiet_world();
        w.start_game();
        w.lives = 3;
        w.score = EXTRA_LIFE_EVERY - 10;
        w.add_score(20);
        assert_eq!(w.lives, 4);
    }
}

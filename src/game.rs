use crate::bullet::Bullet;
use crate::enemy::{Enemy, EnemyKind};
use crate::particle::Particles;
use crate::player::Player;
use crate::powerup::{PowerKind, PowerUp};
use crate::starfield::Starfield;
use crate::ui;
use crate::utils::*;
use macroquad::prelude::*;

#[derive(PartialEq, Clone, Copy)]
pub enum State {
    Menu,
    Playing,
    Paused,
    GameOver,
}

pub struct Game {
    pub state: State,
    pub player: Player,
    pub enemies: Vec<Enemy>,
    pub bullets: Vec<Bullet>,
    pub powerups: Vec<PowerUp>,
    pub particles: Particles,
    pub stars: Starfield,

    pub score: i64,
    pub high_score: i64,
    pub wave: i32,
    pub combo: i32,
    pub combo_timer: f32,

    spawn_queue: Vec<EnemyKind>,
    spawn_timer: f32,
    spawn_interval: f32,
    wave_banner: f32,
    boss_active: bool,

    shake: f32,
    flash: f32,
    menu_t: f32,
    bomb_flash: f32,
}

impl Game {
    pub fn new() -> Self {
        Self {
            state: State::Menu,
            player: Player::new(),
            enemies: Vec::new(),
            bullets: Vec::new(),
            powerups: Vec::new(),
            particles: Particles::default(),
            stars: Starfield::new(),
            score: 0,
            high_score: load_high_score(),
            wave: 0,
            combo: 0,
            combo_timer: 0.0,
            spawn_queue: Vec::new(),
            spawn_timer: 0.0,
            spawn_interval: 0.8,
            wave_banner: 0.0,
            boss_active: false,
            shake: 0.0,
            flash: 0.0,
            menu_t: 0.0,
            bomb_flash: 0.0,
        }
    }

    fn reset_run(&mut self) {
        self.player = Player::new();
        self.enemies.clear();
        self.bullets.clear();
        self.powerups.clear();
        self.particles.clear();
        self.score = 0;
        self.wave = 0;
        self.combo = 0;
        self.combo_timer = 0.0;
        self.boss_active = false;
        self.shake = 0.0;
        self.start_next_wave();
    }

    fn start_next_wave(&mut self) {
        self.wave += 1;
        self.wave_banner = 2.2;
        self.spawn_queue.clear();
        let w = self.wave;

        if w % 5 == 0 {
            // Boss wave: a few escorts then the boss.
            for _ in 0..(2 + w / 5) {
                self.spawn_queue.push(EnemyKind::Shooter);
            }
            self.spawn_queue.push(EnemyKind::Boss);
            self.spawn_interval = 0.7;
        } else {
            let count = 6 + w * 2;
            for i in 0..count {
                let r = rand_range(0.0, 1.0);
                let kind = if r < 0.45 {
                    EnemyKind::Grunt
                } else if r < 0.7 {
                    EnemyKind::Kamikaze
                } else if r < 0.9 {
                    EnemyKind::Shooter
                } else {
                    EnemyKind::Asteroid
                };
                let _ = i;
                self.spawn_queue.push(kind);
            }
            self.spawn_interval = (0.85 - w as f32 * 0.02).max(0.3);
        }
        self.spawn_timer = 1.2;
    }

    fn spawn_enemy(&mut self, kind: EnemyKind) {
        let x = rand_range(60.0, WIDTH - 60.0);
        let pos = if kind == EnemyKind::Boss {
            vec2(WIDTH / 2.0, -80.0)
        } else {
            vec2(x, -40.0)
        };
        if kind == EnemyKind::Boss {
            self.boss_active = true;
            self.wave_banner = 1.6;
        }
        self.enemies
            .push(Enemy::new(kind, pos, self.wave as f32));
    }

    pub fn update(&mut self, dt: f32) {
        self.menu_t += dt;
        self.stars.update(dt, if self.state == State::Playing { 0.3 } else { 0.0 });

        match self.state {
            State::Menu => {
                if is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space) {
                    self.reset_run();
                    self.state = State::Playing;
                }
            }
            State::Playing => {
                if is_key_pressed(KeyCode::Escape) || is_key_pressed(KeyCode::P) {
                    self.state = State::Paused;
                    return;
                }
                self.update_playing(dt);
            }
            State::Paused => {
                if is_key_pressed(KeyCode::Escape) || is_key_pressed(KeyCode::P) {
                    self.state = State::Playing;
                }
                if is_key_pressed(KeyCode::Q) {
                    self.state = State::Menu;
                }
            }
            State::GameOver => {
                if is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space) {
                    self.state = State::Menu;
                }
            }
        }
    }

    fn update_playing(&mut self, dt: f32) {
        self.shake = (self.shake - dt * 30.0).max(0.0);
        self.flash = (self.flash - dt * 3.0).max(0.0);
        self.bomb_flash = (self.bomb_flash - dt * 2.0).max(0.0);
        self.wave_banner = (self.wave_banner - dt).max(0.0);
        self.combo_timer = (self.combo_timer - dt).max(0.0);
        if self.combo_timer <= 0.0 {
            self.combo = 0;
        }

        // bomb
        if is_key_pressed(KeyCode::B) && self.player.bombs > 0 {
            self.player.bombs -= 1;
            self.bomb_flash = 1.0;
            self.shake = 12.0;
            self.bullets.retain(|b| b.from_player);
            for e in &mut self.enemies {
                e.hurt(150.0);
                self.particles.explosion(e.pos, 10, e.color, 80.0);
            }
            self.handle_enemy_deaths();
        }

        // player
        self.player.update(dt, &mut self.particles);
        self.player.try_fire(&mut self.bullets);

        // spawn logic
        if !self.spawn_queue.is_empty() {
            self.spawn_timer -= dt;
            if self.spawn_timer <= 0.0 {
                self.spawn_timer = self.spawn_interval;
                let kind = self.spawn_queue.remove(0);
                self.spawn_enemy(kind);
            }
        }

        // bullets
        for b in &mut self.bullets {
            b.update(dt);
        }

        // enemies
        let target = self.player.pos;
        let diff = self.wave as f32;
        let mut new_bullets: Vec<Bullet> = Vec::new();
        for e in &mut self.enemies {
            e.update(dt, target, &mut new_bullets, diff);
        }
        self.bullets.append(&mut new_bullets);

        // powerups
        for p in &mut self.powerups {
            p.update(dt);
        }

        self.handle_collisions();
        self.handle_enemy_deaths();

        // cleanup
        self.bullets.retain(|b| b.alive);
        self.powerups.retain(|p| p.alive);
        self.particles.update(dt);

        // wave progression
        if self.spawn_queue.is_empty()
            && self.enemies.is_empty()
            && self.wave_banner <= 0.0
        {
            self.boss_active = false;
            // wave clear bonus
            self.score += 250 + self.wave as i64 * 50;
            self.start_next_wave();
        }

        if !self.player.alive {
            self.high_score = self.high_score.max(self.score);
            save_high_score(self.high_score);
            self.state = State::GameOver;
        }
    }

    fn add_score(&mut self, base: i32) {
        self.combo += 1;
        self.combo_timer = 2.5;
        let mult = 1.0 + (self.combo as f32 - 1.0) * 0.1;
        self.score += (base as f32 * mult) as i64;
    }

    fn handle_collisions(&mut self) {
        // player bullets vs enemies
        for b in &mut self.bullets {
            if !b.from_player || !b.alive {
                continue;
            }
            for e in &mut self.enemies {
                if e.alive && circles_hit(b.pos, b.radius, e.pos, e.radius) {
                    e.hurt(b.damage);
                    b.alive = false;
                    self.particles.spark(b.pos, e.color);
                    break;
                }
            }
        }

        // enemy bullets vs player
        for b in &mut self.bullets {
            if b.from_player || !b.alive {
                continue;
            }
            if circles_hit(b.pos, b.radius, self.player.pos, self.player.radius) {
                b.alive = false;
                if self.player.take_damage(b.damage) {
                    self.shake = 8.0;
                    self.flash = 0.5;
                    self.particles.explosion(self.player.pos, 6, Color::new(0.4, 0.7, 1.0, 1.0), 40.0);
                }
            }
        }

        // enemies vs player (contact)
        for e in &mut self.enemies {
            if e.alive && circles_hit(e.pos, e.radius, self.player.pos, self.player.radius) {
                if self.player.take_damage(e.contact_dmg) {
                    self.shake = 8.0;
                    self.flash = 0.5;
                }
                if e.kind != EnemyKind::Boss {
                    e.alive = false;
                    self.particles.explosion(e.pos, 14, e.color, 60.0);
                }
            }
        }

        // powerups vs player
        for p in &mut self.powerups {
            if p.alive && circles_hit(p.pos, p.radius, self.player.pos, self.player.radius * 1.4) {
                p.alive = false;
                self.player.apply_powerup(p.kind);
                self.particles.explosion(p.pos, 10, p.kind.color(), 40.0);
            }
        }
    }

    fn handle_enemy_deaths(&mut self) {
        let mut deaths: Vec<(Vec2, Color, i32, bool)> = Vec::new();
        for e in &self.enemies {
            if !e.alive {
                deaths.push((e.pos, e.color, e.value, e.kind == EnemyKind::Boss));
            }
        }
        for (pos, color, value, is_boss) in deaths {
            self.add_score(value);
            let count = if is_boss { 60 } else { 16 };
            self.particles.explosion(pos, count, color, if is_boss { 160.0 } else { 70.0 });
            if is_boss {
                self.shake = 18.0;
                self.flash = 1.0;
                // boss always drops goodies
                self.powerups.push(PowerUp::new(pos, PowerKind::Health));
                self.powerups.push(PowerUp::new(pos + vec2(40.0, 0.0), PowerKind::WeaponUp));
                self.powerups.push(PowerUp::new(pos - vec2(40.0, 0.0), PowerKind::Bomb));
            } else if rand_range(0.0, 1.0) < 0.16 {
                self.powerups.push(PowerUp::new(pos, PowerKind::random()));
            }
        }
        self.enemies.retain(|e| e.alive);
    }

    pub fn draw(&self) {
        // screen shake offset
        let (ox, oy) = if self.shake > 0.0 {
            (
                rand_range(-self.shake, self.shake),
                rand_range(-self.shake, self.shake),
            )
        } else {
            (0.0, 0.0)
        };
        let cam = Camera2D {
            target: vec2(WIDTH / 2.0 - ox, HEIGHT / 2.0 - oy),
            zoom: vec2(2.0 / WIDTH, 2.0 / HEIGHT),
            ..Default::default()
        };
        set_camera(&cam);

        self.stars.draw();

        match self.state {
            State::Menu => self.draw_menu(),
            State::Playing | State::Paused | State::GameOver => {
                self.draw_world();
            }
        }

        // hit flash overlay
        if self.flash > 0.0 {
            draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, Color::new(1.0, 0.2, 0.2, self.flash * 0.3));
        }
        if self.bomb_flash > 0.0 {
            draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, with_alpha(WHITE, self.bomb_flash * 0.6));
        }

        set_default_camera();

        match self.state {
            State::Playing => self.draw_hud(),
            State::Paused => {
                self.draw_hud();
                self.draw_pause();
            }
            State::GameOver => {
                self.draw_hud();
                self.draw_gameover();
            }
            State::Menu => {}
        }
    }

    fn draw_world(&self) {
        for p in &self.powerups {
            p.draw();
        }
        for e in &self.enemies {
            e.draw();
        }
        for b in &self.bullets {
            b.draw();
        }
        self.particles.draw();
        if self.player.alive {
            self.player.draw();
        }

        // wave banner
        if self.wave_banner > 0.0 && self.state == State::Playing {
            let a = (self.wave_banner.min(1.0)).min(1.0);
            let txt = if self.wave % 5 == 0 {
                format!("WAVE {} - WARNING: BOSS", self.wave)
            } else {
                format!("WAVE {}", self.wave)
            };
            ui::neon_title(
                &txt,
                WIDTH / 2.0,
                HEIGHT / 2.0,
                54.0,
                with_alpha(Color::new(0.5, 0.9, 1.0, 1.0), a),
            );
        }
    }

    fn draw_hud(&self) {
        // health bar
        ui::stat_bar(
            16.0,
            16.0,
            220.0,
            18.0,
            self.player.hp / self.player.max_hp,
            Color::new(0.3, 0.9, 0.4, 1.0),
        );
        draw_text("HULL", 20.0, 30.0, 16.0, BLACK);

        // lives as little ships
        for i in 0..self.player.lives.max(0) {
            let x = 250.0 + i as f32 * 26.0;
            draw_ship(vec2(x, 25.0), -std::f32::consts::FRAC_PI_2, 9.0, Color::new(0.6, 0.9, 1.0, 1.0));
        }

        // score + high score
        draw_text(&format!("SCORE {}", self.score), 16.0, 60.0, 26.0, WHITE);
        draw_text(
            &format!("HIGH  {}", self.high_score.max(self.score)),
            16.0,
            86.0,
            20.0,
            Color::new(1.0, 0.9, 0.4, 1.0),
        );

        // right side: wave, weapon, bombs
        draw_text(&format!("WAVE {}", self.wave), WIDTH - 140.0, 30.0, 24.0, WHITE);
        draw_text(
            &format!("WPN  Lv{}", self.player.weapon_level),
            WIDTH - 140.0,
            56.0,
            20.0,
            Color::new(0.9, 0.3, 1.0, 1.0),
        );
        draw_text(
            &format!("BOMB x{}", self.player.bombs),
            WIDTH - 140.0,
            80.0,
            20.0,
            Color::new(1.0, 0.5, 0.2, 1.0),
        );

        // active power-up timers
        let mut ty = HEIGHT - 24.0;
        let tag = |label: &str, t: f32, col: Color, y: &mut f32| {
            if t > 0.0 {
                draw_text(&format!("{} {:.0}s", label, t), 16.0, *y, 18.0, col);
                *y -= 22.0;
            }
        };
        tag("RAPID", self.player.rapid_timer, Color::new(1.0, 0.85, 0.1, 1.0), &mut ty);
        tag("SPREAD", self.player.spread_timer, Color::new(0.2, 0.9, 1.0, 1.0), &mut ty);
        tag("SHIELD", self.player.shield_timer, Color::new(0.3, 0.6, 1.0, 1.0), &mut ty);

        // combo
        if self.combo > 2 {
            draw_text_centered(
                &format!("COMBO x{}", self.combo),
                WIDTH / 2.0,
                HEIGHT - 30.0,
                28.0,
                Color::new(1.0, 0.7, 0.2, 0.9),
            );
        }
    }

    fn draw_menu(&self) {
        ui::neon_title(
            "NEBULA STRIKE 313",
            WIDTH / 2.0,
            HEIGHT * 0.32,
            64.0,
            Color::new(0.5, 0.9, 1.0, 1.0),
        );
        draw_text_centered(
            "A Rust + macroquad space shooter",
            WIDTH / 2.0,
            HEIGHT * 0.32 + 44.0,
            22.0,
            Color::new(0.7, 0.8, 1.0, 0.9),
        );

        ui::panel(WIDTH / 2.0 - 230.0, HEIGHT * 0.45, 460.0, 200.0);
        let cx = WIDTH / 2.0;
        let mut y = HEIGHT * 0.45 + 38.0;
        let line = |t: &str, y: f32| draw_text_centered(t, cx, y, 22.0, WHITE);
        line("MOVE: WASD / Arrow Keys", y);
        y += 30.0;
        line("FIRE: Space / J / Left Mouse", y);
        y += 30.0;
        line("BOMB: B    PAUSE: P / Esc", y);
        y += 36.0;
        draw_text_centered(
            "Collect power-ups - survive the waves - beat the bosses",
            cx,
            y,
            18.0,
            Color::new(0.7, 0.9, 0.8, 0.9),
        );

        ui::blink_prompt("PRESS ENTER TO LAUNCH", WIDTH / 2.0, HEIGHT * 0.82, 30.0, self.menu_t);
        draw_text_centered(
            &format!("HIGH SCORE: {}", self.high_score),
            WIDTH / 2.0,
            HEIGHT * 0.9,
            22.0,
            Color::new(1.0, 0.9, 0.4, 1.0),
        );

        // decorative drifting ship
        let p = vec2(WIDTH / 2.0 + (self.menu_t * 0.7).sin() * 120.0, HEIGHT * 0.2);
        draw_ship(p, -std::f32::consts::FRAC_PI_2, 18.0, Color::new(0.6, 0.9, 1.0, 1.0));
    }

    fn draw_pause(&self) {
        draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, Color::new(0.0, 0.0, 0.05, 0.6));
        ui::neon_title("PAUSED", WIDTH / 2.0, HEIGHT / 2.0 - 20.0, 60.0, Color::new(0.6, 0.9, 1.0, 1.0));
        draw_text_centered("P / Esc to resume    Q to quit to menu", WIDTH / 2.0, HEIGHT / 2.0 + 30.0, 24.0, WHITE);
    }

    fn draw_gameover(&self) {
        draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, Color::new(0.05, 0.0, 0.0, 0.65));
        ui::neon_title("GAME OVER", WIDTH / 2.0, HEIGHT * 0.36, 70.0, Color::new(1.0, 0.3, 0.3, 1.0));
        draw_text_centered(&format!("Final Score: {}", self.score), WIDTH / 2.0, HEIGHT * 0.36 + 56.0, 32.0, WHITE);
        let best = self.high_score.max(self.score);
        let msg = if self.score >= best && self.score > 0 {
            "NEW HIGH SCORE!"
        } else {
            "High Score:"
        };
        draw_text_centered(
            &format!("{} {}", msg, best),
            WIDTH / 2.0,
            HEIGHT * 0.36 + 92.0,
            26.0,
            Color::new(1.0, 0.9, 0.4, 1.0),
        );
        draw_text_centered(&format!("You reached Wave {}", self.wave), WIDTH / 2.0, HEIGHT * 0.36 + 126.0, 24.0, Color::new(0.8, 0.9, 1.0, 1.0));
        ui::blink_prompt("PRESS ENTER TO CONTINUE", WIDTH / 2.0, HEIGHT * 0.7, 28.0, self.menu_t);
    }
}

// --- high score persistence (no-op on wasm) ---

#[cfg(not(target_arch = "wasm32"))]
fn high_score_path() -> std::path::PathBuf {
    std::path::PathBuf::from("nebula_highscore.txt")
}

#[cfg(not(target_arch = "wasm32"))]
fn load_high_score() -> i64 {
    std::fs::read_to_string(high_score_path())
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0)
}

#[cfg(not(target_arch = "wasm32"))]
fn save_high_score(score: i64) {
    let _ = std::fs::write(high_score_path(), score.to_string());
}

#[cfg(target_arch = "wasm32")]
fn load_high_score() -> i64 {
    0
}

#[cfg(target_arch = "wasm32")]
fn save_high_score(_score: i64) {}

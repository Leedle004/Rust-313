use macroquad::prelude::*;

const SCREEN_W: f32 = 480.0;
const SCREEN_H: f32 = 720.0;
const HUD_HEIGHT: f32 = 44.0;

const PLAYER_RADIUS: f32 = 14.0;
// Forgiving "graze" hitbox: visually the ship is PLAYER_RADIUS, but only a
// smaller core counts for collisions so near-misses feel fair.
const PLAYER_HIT_RADIUS: f32 = 6.0;
const PLAYER_SPEED: f32 = 320.0;
const PLAYER_MAX_LIVES: u32 = 4;
const PLAYER_INVULN_TIME: f32 = 1.4;

const PLAYER_BULLET_RADIUS: f32 = 4.0;
const PLAYER_BULLET_SPEED: f32 = 520.0;
const PLAYER_FIRE_COOLDOWN: f32 = 0.18;

const ENEMY_RADIUS: f32 = 16.0;
const ENEMY_BASE_SPEED: f32 = 100.0;
const ENEMY_BULLET_RADIUS: f32 = 5.0;
const ENEMY_BULLET_SPEED: f32 = 200.0;
const ENEMY_FIRE_CHANCE_PER_SEC: f32 = 0.22;

const BASE_SPAWN_INTERVAL: f32 = 1.4;
const MIN_SPAWN_INTERVAL: f32 = 0.5;
const SPAWN_RAMP_PER_SEC: f32 = 0.008;

const COLOR_BG: Color = Color::new(0.04, 0.05, 0.09, 1.0);
const COLOR_STAR: Color = Color::new(0.6, 0.65, 0.75, 0.5);
const COLOR_PLAYER: Color = Color::new(0.35, 0.85, 0.95, 1.0);
const COLOR_PLAYER_BULLET: Color = Color::new(0.95, 0.9, 0.35, 1.0);
const COLOR_ENEMY: Color = Color::new(0.92, 0.35, 0.40, 1.0);
const COLOR_ENEMY_BULLET: Color = Color::new(0.95, 0.55, 0.25, 1.0);
const COLOR_TEXT: Color = Color::new(0.92, 0.92, 0.95, 1.0);
const COLOR_ACCENT: Color = Color::new(0.95, 0.75, 0.25, 1.0);

fn circles_collide(a_pos: Vec2, a_r: f32, b_pos: Vec2, b_r: f32) -> bool {
    let dist_sq = (a_pos - b_pos).length_squared();
    let radius_sum = a_r + b_r;
    dist_sq <= radius_sum * radius_sum
}

fn clamp_player_x(x: f32, radius: f32, screen_width: f32) -> f32 {
    x.clamp(radius, screen_width - radius)
}

struct Bullet {
    pos: Vec2,
    vel: Vec2,
    radius: f32,
}

struct Enemy {
    pos: Vec2,
    vel: Vec2,
    radius: f32,
    shoot_cooldown: f32,
}

#[derive(PartialEq, Debug)]
enum GameState {
    Start,
    Playing,
    GameOver,
}

struct Star {
    pos: Vec2,
    speed: f32,
    size: f32,
}

struct Game {
    player_pos: Vec2,
    lives: u32,
    invuln_timer: f32,
    fire_cooldown: f32,
    score: u32,
    best_score: u32,
    state: GameState,
    player_bullets: Vec<Bullet>,
    enemy_bullets: Vec<Bullet>,
    enemies: Vec<Enemy>,
    spawn_timer: f32,
    elapsed: f32,
    stars: Vec<Star>,
}

impl Game {
    fn new(best_score: u32) -> Self {
        let stars = (0..60)
            .map(|_| Star {
                pos: vec2(
                    rand::gen_range(0.0, SCREEN_W),
                    rand::gen_range(HUD_HEIGHT, SCREEN_H),
                ),
                speed: rand::gen_range(30.0, 120.0),
                size: rand::gen_range(1.0, 3.0),
            })
            .collect();

        Game {
            player_pos: vec2(SCREEN_W / 2.0, SCREEN_H - 60.0),
            lives: PLAYER_MAX_LIVES,
            invuln_timer: 0.0,
            fire_cooldown: 0.0,
            score: 0,
            best_score,
            state: GameState::Start,
            player_bullets: Vec::new(),
            enemy_bullets: Vec::new(),
            enemies: Vec::new(),
            spawn_timer: BASE_SPAWN_INTERVAL,
            elapsed: 0.0,
            stars,
        }
    }

    fn reset(&mut self) {
        let best = self.best_score.max(self.score);
        *self = Game::new(best);
        self.state = GameState::Playing;
    }

    fn spawn_interval(&self) -> f32 {
        (BASE_SPAWN_INTERVAL - self.elapsed * SPAWN_RAMP_PER_SEC).max(MIN_SPAWN_INTERVAL)
    }

    fn enemy_speed(&self) -> f32 {
        ENEMY_BASE_SPEED + self.elapsed * 2.0
    }

    fn spawn_enemy(&mut self) {
        let x = rand::gen_range(ENEMY_RADIUS, SCREEN_W - ENEMY_RADIUS);
        self.enemies.push(Enemy {
            pos: vec2(x, HUD_HEIGHT - ENEMY_RADIUS),
            vel: vec2(0.0, self.enemy_speed()),
            radius: ENEMY_RADIUS,
            shoot_cooldown: rand::gen_range(0.5, 1.5),
        });
    }

    /// Core gameplay step, decoupled from macroquad's global input state so it
    /// can be exercised directly by unit tests.
    fn update_gameplay(&mut self, dt: f32, move_left: bool, move_right: bool, fire: bool) {
        self.elapsed += dt;

        for star in self.stars.iter_mut() {
            star.pos.y += star.speed * dt;
            if star.pos.y > SCREEN_H {
                star.pos.y = HUD_HEIGHT;
                star.pos.x = rand::gen_range(0.0, SCREEN_W);
            }
        }

        let mut dx = 0.0;
        if move_left {
            dx -= 1.0;
        }
        if move_right {
            dx += 1.0;
        }
        self.player_pos.x = clamp_player_x(
            self.player_pos.x + dx * PLAYER_SPEED * dt,
            PLAYER_RADIUS,
            SCREEN_W,
        );

        self.fire_cooldown = (self.fire_cooldown - dt).max(0.0);
        if fire && self.fire_cooldown <= 0.0 {
            self.fire_cooldown = PLAYER_FIRE_COOLDOWN;
            self.player_bullets.push(Bullet {
                pos: vec2(self.player_pos.x, self.player_pos.y - PLAYER_RADIUS),
                vel: vec2(0.0, -PLAYER_BULLET_SPEED),
                radius: PLAYER_BULLET_RADIUS,
            });
        }

        if self.invuln_timer > 0.0 {
            self.invuln_timer -= dt;
        }

        self.spawn_timer -= dt;
        if self.spawn_timer <= 0.0 {
            self.spawn_timer = self.spawn_interval();
            self.spawn_enemy();
        }

        for bullet in self.player_bullets.iter_mut() {
            bullet.pos += bullet.vel * dt;
        }
        self.player_bullets
            .retain(|b| b.pos.y + b.radius > HUD_HEIGHT);

        for bullet in self.enemy_bullets.iter_mut() {
            bullet.pos += bullet.vel * dt;
        }
        self.enemy_bullets.retain(|b| b.pos.y - b.radius < SCREEN_H);

        for enemy in self.enemies.iter_mut() {
            enemy.pos += enemy.vel * dt;
            enemy.shoot_cooldown -= dt;
            if enemy.shoot_cooldown <= 0.0 {
                enemy.shoot_cooldown = rand::gen_range(0.8, 2.0);
                if rand::gen_range(0.0, 1.0) < ENEMY_FIRE_CHANCE_PER_SEC {
                    self.enemy_bullets.push(Bullet {
                        pos: vec2(enemy.pos.x, enemy.pos.y + enemy.radius),
                        vel: vec2(0.0, ENEMY_BULLET_SPEED),
                        radius: ENEMY_BULLET_RADIUS,
                    });
                }
            }
        }
        self.enemies.retain(|e| e.pos.y - e.radius < SCREEN_H);

        self.resolve_collisions();

        if self.lives == 0 {
            self.state = GameState::GameOver;
            self.best_score = self.best_score.max(self.score);
        }
    }

    fn resolve_collisions(&mut self) {
        let mut hit_enemy_indices: Vec<usize> = Vec::new();
        let mut hit_bullet_indices: Vec<usize> = Vec::new();

        for (bi, bullet) in self.player_bullets.iter().enumerate() {
            for (ei, enemy) in self.enemies.iter().enumerate() {
                if hit_enemy_indices.contains(&ei) {
                    continue;
                }
                if circles_collide(bullet.pos, bullet.radius, enemy.pos, enemy.radius) {
                    hit_enemy_indices.push(ei);
                    hit_bullet_indices.push(bi);
                    self.score += 1;
                    break;
                }
            }
        }
        hit_bullet_indices.sort_unstable();
        for &bi in hit_bullet_indices.iter().rev() {
            self.player_bullets.remove(bi);
        }
        hit_enemy_indices.sort_unstable();
        for &ei in hit_enemy_indices.iter().rev() {
            self.enemies.remove(ei);
        }

        if self.invuln_timer <= 0.0 {
            let mut took_damage = false;

            self.enemy_bullets.retain(|bullet| {
                if circles_collide(
                    bullet.pos,
                    bullet.radius,
                    self.player_pos,
                    PLAYER_HIT_RADIUS,
                ) {
                    took_damage = true;
                    false
                } else {
                    true
                }
            });

            let player_pos = self.player_pos;
            let before = self.enemies.len();
            self.enemies.retain(|enemy| {
                !circles_collide(enemy.pos, enemy.radius, player_pos, PLAYER_HIT_RADIUS)
            });
            if self.enemies.len() < before {
                took_damage = true;
            }

            if took_damage {
                self.lives = self.lives.saturating_sub(1);
                self.invuln_timer = PLAYER_INVULN_TIME;
            }
        }
    }

    fn update(&mut self, dt: f32) {
        match self.state {
            GameState::Start => {
                if is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space) {
                    self.state = GameState::Playing;
                }
            }
            GameState::Playing => {
                let move_left = is_key_down(KeyCode::Left) || is_key_down(KeyCode::A);
                let move_right = is_key_down(KeyCode::Right) || is_key_down(KeyCode::D);
                let fire = is_key_down(KeyCode::Space) || is_key_down(KeyCode::Up) || is_key_down(KeyCode::W);
                self.update_gameplay(dt, move_left, move_right, fire);
            }
            GameState::GameOver => {
                if is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space) {
                    self.reset();
                }
            }
        }
    }

    fn draw(&self) {
        clear_background(COLOR_BG);

        for star in &self.stars {
            draw_circle(star.pos.x, star.pos.y, star.size, COLOR_STAR);
        }

        for enemy in &self.enemies {
            draw_poly(enemy.pos.x, enemy.pos.y, 3, enemy.radius, 180.0, COLOR_ENEMY);
        }
        for bullet in &self.enemy_bullets {
            draw_circle(bullet.pos.x, bullet.pos.y, bullet.radius, COLOR_ENEMY_BULLET);
        }
        for bullet in &self.player_bullets {
            draw_circle(bullet.pos.x, bullet.pos.y, bullet.radius, COLOR_PLAYER_BULLET);
        }

        let blink_visible = self.invuln_timer <= 0.0 || (self.elapsed * 10.0) as i32 % 2 == 0;
        if blink_visible {
            draw_poly(
                self.player_pos.x,
                self.player_pos.y,
                3,
                PLAYER_RADIUS,
                0.0,
                COLOR_PLAYER,
            );
        }

        draw_rectangle(0.0, 0.0, SCREEN_W, HUD_HEIGHT, Color::new(0.03, 0.03, 0.05, 1.0));
        draw_text(
            &format!("Score: {}", self.score),
            12.0,
            HUD_HEIGHT * 0.65,
            24.0,
            COLOR_TEXT,
        );
        let lives_label = format!("Lives: {}", self.lives);
        let lives_width = measure_text(&lives_label, None, 22, 1.0).width;
        draw_text(
            &lives_label,
            SCREEN_W / 2.0 - lives_width / 2.0,
            HUD_HEIGHT * 0.65,
            22.0,
            COLOR_ACCENT,
        );
        let best_label = format!("Best: {}", self.best_score.max(self.score));
        let best_width = measure_text(&best_label, None, 20, 1.0).width;
        draw_text(
            &best_label,
            SCREEN_W - best_width - 12.0,
            HUD_HEIGHT * 0.65,
            20.0,
            COLOR_TEXT,
        );

        match self.state {
            GameState::Start => self.draw_overlay(
                "SPACE SHOOTER",
                "Arrows/AD move  -  SPACE/Up to fire  -  ENTER to start",
            ),
            GameState::GameOver => {
                self.draw_overlay("GAME OVER", "Press ENTER or SPACE to restart")
            }
            GameState::Playing => {}
        }
    }

    fn draw_overlay(&self, title: &str, subtitle: &str) {
        draw_rectangle(0.0, 0.0, SCREEN_W, SCREEN_H, Color::new(0.0, 0.0, 0.0, 0.55));

        let title_size = 40.0;
        let title_dims = measure_text(title, None, title_size as u16, 1.0);
        draw_text(
            title,
            (SCREEN_W - title_dims.width) / 2.0,
            SCREEN_H / 2.0 - 10.0,
            title_size,
            COLOR_ACCENT,
        );

        let subtitle_size = 20.0;
        let subtitle_dims = measure_text(subtitle, None, subtitle_size as u16, 1.0);
        draw_text(
            subtitle,
            (SCREEN_W - subtitle_dims.width) / 2.0,
            SCREEN_H / 2.0 + 30.0,
            subtitle_size,
            COLOR_TEXT,
        );

        if self.state == GameState::GameOver {
            let score_label = format!("Score: {}   Best: {}", self.score, self.best_score);
            let score_dims = measure_text(&score_label, None, 22, 1.0);
            draw_text(
                &score_label,
                (SCREEN_W - score_dims.width) / 2.0,
                SCREEN_H / 2.0 + 64.0,
                22.0,
                COLOR_TEXT,
            );
        }
    }
}

fn window_conf() -> Conf {
    Conf {
        window_title: "Rust Space Shooter".to_owned(),
        window_width: SCREEN_W as i32,
        window_height: SCREEN_H as i32,
        window_resizable: false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    let mut game = Game::new(0);

    loop {
        let dt = get_frame_time();
        game.update(dt);
        game.draw();
        next_frame().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn playing_game() -> Game {
        let mut game = Game::new(0);
        game.state = GameState::Playing;
        game
    }

    #[test]
    fn circles_collide_detects_overlap() {
        assert!(circles_collide(vec2(0.0, 0.0), 5.0, vec2(6.0, 0.0), 5.0));
        assert!(!circles_collide(vec2(0.0, 0.0), 5.0, vec2(11.0, 0.0), 5.0));
    }

    #[test]
    fn clamp_player_x_respects_bounds() {
        assert_eq!(clamp_player_x(-50.0, 10.0, 480.0), 10.0);
        assert_eq!(clamp_player_x(1000.0, 10.0, 480.0), 470.0);
        assert_eq!(clamp_player_x(200.0, 10.0, 480.0), 200.0);
    }

    #[test]
    fn player_moves_left_and_right_within_bounds() {
        let mut game = playing_game();
        let start_x = game.player_pos.x;
        game.update_gameplay(0.1, true, false, false);
        assert!(game.player_pos.x < start_x);

        let mut game2 = playing_game();
        let start_x2 = game2.player_pos.x;
        game2.update_gameplay(0.1, false, true, false);
        assert!(game2.player_pos.x > start_x2);
    }

    #[test]
    fn firing_spawns_bullet_and_respects_cooldown() {
        let mut game = playing_game();
        assert_eq!(game.player_bullets.len(), 0);
        game.update_gameplay(0.016, false, false, true);
        assert_eq!(game.player_bullets.len(), 1);
        // Firing again immediately should be blocked by cooldown.
        game.update_gameplay(0.016, false, false, true);
        assert_eq!(game.player_bullets.len(), 1);
    }

    #[test]
    fn player_bullet_destroys_enemy_and_scores() {
        let mut game = playing_game();
        game.enemies.push(Enemy {
            pos: vec2(100.0, 200.0),
            vel: vec2(0.0, 0.0),
            radius: ENEMY_RADIUS,
            shoot_cooldown: 999.0,
        });
        game.player_bullets.push(Bullet {
            pos: vec2(100.0, 200.0),
            vel: vec2(0.0, 0.0),
            radius: PLAYER_BULLET_RADIUS,
        });
        game.update_gameplay(0.0, false, false, false);
        assert_eq!(game.enemies.len(), 0);
        assert_eq!(game.score, 1);
    }

    #[test]
    fn enemy_bullet_hits_player_and_reduces_lives() {
        let mut game = playing_game();
        let lives_before = game.lives;
        game.enemy_bullets.push(Bullet {
            pos: game.player_pos,
            vel: vec2(0.0, 0.0),
            radius: ENEMY_BULLET_RADIUS,
        });
        game.update_gameplay(0.0, false, false, false);
        assert_eq!(game.lives, lives_before - 1);
        assert!(game.invuln_timer > 0.0);
    }

    #[test]
    fn invulnerability_prevents_double_damage() {
        let mut game = playing_game();
        game.invuln_timer = PLAYER_INVULN_TIME;
        let lives_before = game.lives;
        game.enemy_bullets.push(Bullet {
            pos: game.player_pos,
            vel: vec2(0.0, 0.0),
            radius: ENEMY_BULLET_RADIUS,
        });
        game.update_gameplay(0.0, false, false, false);
        assert_eq!(game.lives, lives_before);
    }

    #[test]
    fn losing_all_lives_ends_game() {
        let mut game = playing_game();
        game.lives = 1;
        game.enemy_bullets.push(Bullet {
            pos: game.player_pos,
            vel: vec2(0.0, 0.0),
            radius: ENEMY_BULLET_RADIUS,
        });
        game.update_gameplay(0.0, false, false, false);
        assert_eq!(game.lives, 0);
        assert_eq!(game.state, GameState::GameOver);
    }

    #[test]
    fn reset_restores_start_state_and_keeps_best_score() {
        let mut game = playing_game();
        game.score = 7;
        game.lives = 0;
        game.state = GameState::GameOver;
        game.reset();
        assert_eq!(game.score, 0);
        assert_eq!(game.lives, PLAYER_MAX_LIVES);
        assert_eq!(game.best_score, 7);
        assert_eq!(game.state, GameState::Playing);
    }
}

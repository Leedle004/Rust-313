//! Astro Blaster — rendering + input front-end (macroquad).
//!
//! All gameplay lives in the `astro_blaster` library. This file only:
//!   * opens a window,
//!   * translates keyboard input into a `world::Input`,
//!   * draws the current `World` state each frame.
//!
//! The virtual playfield is a fixed `VIRTUAL_W x VIRTUAL_H` and is uniformly
//! scaled + letter-boxed to fit whatever window/canvas size we get, so the
//! game looks identical on desktop and in the browser.

use astro_blaster::entities::*;
use astro_blaster::world::{Input, Phase, World};
use astro_blaster::{VIRTUAL_H, VIRTUAL_W};
use macroquad::prelude::*;

/// A single background star (in virtual coordinates).
struct Star {
    pos: Vec2,
    size: f32,
    bright: f32,
    twinkle: f32,
}

fn window_conf() -> Conf {
    Conf {
        window_title: "Astro Blaster".to_owned(),
        window_width: 1024,
        window_height: 768,
        high_dpi: true,
        ..Default::default()
    }
}

/// Maps virtual playfield coordinates to actual screen pixels with uniform
/// scaling and centering (letter-box / pillar-box as needed).
#[derive(Clone, Copy)]
struct View {
    scale: f32,
    off: Vec2,
}

impl View {
    fn compute() -> Self {
        let sw = screen_width();
        let sh = screen_height();
        let scale = (sw / VIRTUAL_W).min(sh / VIRTUAL_H);
        let off = Vec2::new(
            (sw - VIRTUAL_W * scale) * 0.5,
            (sh - VIRTUAL_H * scale) * 0.5,
        );
        View { scale, off }
    }

    fn p(&self, v: Vec2) -> Vec2 {
        v * self.scale + self.off
    }

    fn s(&self, len: f32) -> f32 {
        len * self.scale
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    rand::srand(macroquad::miniquad::date::now() as u64);

    let mut world = World::new(VIRTUAL_W, VIRTUAL_H);
    let stars = make_stars(160);

    loop {
        let dt = get_frame_time();

        // ---- Input ----------------------------------------------------------
        let mut turn = 0.0;
        if is_key_down(KeyCode::Left) || is_key_down(KeyCode::A) {
            turn -= 1.0;
        }
        if is_key_down(KeyCode::Right) || is_key_down(KeyCode::D) {
            turn += 1.0;
        }
        let thrust = is_key_down(KeyCode::Up) || is_key_down(KeyCode::W);
        let fire = is_key_pressed(KeyCode::Space);
        let start = is_key_pressed(KeyCode::Enter) || is_key_pressed(KeyCode::Space);

        if is_key_pressed(KeyCode::Escape) && world.phase != Phase::Playing {
            break;
        }

        world.update(
            dt,
            Input {
                turn,
                thrust,
                fire,
                start,
            },
        );

        // ---- Render ---------------------------------------------------------
        render(&world, &stars);

        next_frame().await;
    }
}

fn make_stars(n: usize) -> Vec<Star> {
    (0..n)
        .map(|_| Star {
            pos: Vec2::new(
                rand::gen_range(0.0, VIRTUAL_W),
                rand::gen_range(0.0, VIRTUAL_H),
            ),
            size: rand::gen_range(0.6, 2.2),
            bright: rand::gen_range(0.2, 0.9),
            twinkle: rand::gen_range(0.0, std::f32::consts::TAU),
        })
        .collect()
}

fn render(world: &World, stars: &[Star]) {
    clear_background(Color::new(0.02, 0.02, 0.06, 1.0));
    let view = View::compute();

    // Screen shake: jitter the whole view a little when something explodes.
    let shake = world.shake;
    let shake_off = if shake > 0.0 {
        Vec2::new(
            rand::gen_range(-1.0, 1.0) * shake * 10.0,
            rand::gen_range(-1.0, 1.0) * shake * 10.0,
        )
    } else {
        Vec2::ZERO
    };
    let view = View {
        scale: view.scale,
        off: view.off + shake_off,
    };

    draw_starfield(&view, stars, world.time);
    draw_play_border(&view);

    for a in &world.asteroids {
        draw_wrapped(world, a.pos, a.radius, &view, |vp| {
            draw_asteroid(a, vp, &view)
        });
    }
    for u in &world.ufos {
        draw_wrapped(world, u.pos, u.radius, &view, |vp| draw_ufo(u, vp, &view));
    }
    for b in &world.bullets {
        draw_wrapped(world, b.pos, 4.0, &view, |vp| {
            let c = if b.from_player {
                Color::new(0.7, 1.0, 0.9, 1.0)
            } else {
                Color::new(1.0, 0.5, 0.4, 1.0)
            };
            let p = view.p(vp);
            draw_circle(p.x, p.y, view.s(b.radius + 0.5), c);
        });
    }
    for p in &world.particles {
        let pp = view.p(p.pos);
        let f = p.fade();
        let col = Color::new(
            1.0,
            0.6 + 0.4 * (1.0 - p.warm),
            0.3 + 0.5 * (1.0 - p.warm),
            f,
        );
        draw_circle(pp.x, pp.y, view.s(p.size * f.max(0.3)), col);
    }
    if let Some(ship) = &world.ship {
        draw_wrapped(world, ship.pos, ship.radius, &view, |vp| {
            draw_ship(ship, vp, &view, world.time)
        });
    }

    draw_hud(world, &view);
    draw_overlays(world, &view);
}

/// Invoke `draw` at the entity's position and at wrapped duplicate positions
/// when it is close enough to an edge to be visible on the opposite side.
fn draw_wrapped<F: Fn(Vec2)>(world: &World, pos: Vec2, radius: f32, _view: &View, draw: F) {
    let w = world.width;
    let h = world.height;
    let xs = [-w, 0.0, w];
    let ys = [-h, 0.0, h];
    for &dx in &xs {
        for &dy in &ys {
            let p = pos + Vec2::new(dx, dy);
            // Only draw the copy if it could be on-screen.
            if p.x + radius >= 0.0 && p.x - radius <= w && p.y + radius >= 0.0 && p.y - radius <= h
            {
                draw(p);
            }
        }
    }
}

fn draw_starfield(view: &View, stars: &[Star], time: f32) {
    for s in stars {
        let p = view.p(s.pos);
        let tw = 0.6 + 0.4 * (time * 1.5 + s.twinkle).sin();
        let b = (s.bright * tw).clamp(0.0, 1.0);
        draw_circle(p.x, p.y, view.s(s.size), Color::new(0.8, 0.85, 1.0, b));
    }
}

fn draw_play_border(view: &View) {
    let tl = view.p(Vec2::ZERO);
    let size = Vec2::new(view.s(VIRTUAL_W), view.s(VIRTUAL_H));
    draw_rectangle_lines(
        tl.x,
        tl.y,
        size.x,
        size.y,
        2.0,
        Color::new(0.2, 0.3, 0.5, 0.6),
    );
}

fn draw_ship(ship: &Ship, vp: Vec2, view: &View, time: f32) {
    // Blink while invulnerable.
    if ship.is_invulnerable() && ((time * 12.0) as i32) % 2 == 0 {
        return;
    }
    let a = ship.angle;
    let r = ship.radius;
    let nose = vp + Vec2::from_angle(a) * (r + 4.0);
    let left = vp + Vec2::from_angle(a + 2.4) * r;
    let right = vp + Vec2::from_angle(a - 2.4) * r;
    let tail = vp - Vec2::from_angle(a) * (r * 0.4);

    let body = Color::new(0.6, 0.9, 1.0, 1.0);
    // Thruster flame.
    if ship.thrusting && ((time * 30.0) as i32) % 2 == 0 {
        let flame = vp - Vec2::from_angle(a) * (r + rand::gen_range(6.0, 14.0));
        draw_triangle(
            view.p(left * 0.5 + tail * 0.5),
            view.p(right * 0.5 + tail * 0.5),
            view.p(flame),
            Color::new(1.0, 0.6, 0.2, 0.9),
        );
    }
    // Hull (two triangles for a filled arrowhead) + outline.
    draw_triangle(view.p(nose), view.p(left), view.p(tail), body);
    draw_triangle(view.p(nose), view.p(right), view.p(tail), body);
    let lw = view.s(2.0).max(1.0);
    draw_line_v(view.p(nose), view.p(left), lw, WHITE);
    draw_line_v(view.p(left), view.p(tail), lw, WHITE);
    draw_line_v(view.p(tail), view.p(right), lw, WHITE);
    draw_line_v(view.p(right), view.p(nose), lw, WHITE);
}

fn draw_asteroid(a: &Asteroid, vp: Vec2, view: &View) {
    let n = a.shape.len();
    let col = match a.size {
        AstSize::Large => Color::new(0.55, 0.55, 0.62, 1.0),
        AstSize::Medium => Color::new(0.62, 0.6, 0.55, 1.0),
        AstSize::Small => Color::new(0.7, 0.65, 0.55, 1.0),
    };
    let mut prev = polygon_point(a, vp, n - 1);
    let center = view.p(vp);
    for i in 0..n {
        let cur = polygon_point(a, vp, i);
        let pp = view.p(prev);
        let cp = view.p(cur);
        // Filled wedge for a solid rock look.
        draw_triangle(
            center,
            pp,
            cp,
            Color::new(col.r * 0.35, col.g * 0.35, col.b * 0.4, 1.0),
        );
        draw_line_v(pp, cp, view.s(2.0).max(1.0), col);
        prev = cur;
    }
}

fn polygon_point(a: &Asteroid, vp: Vec2, i: usize) -> Vec2 {
    let n = a.shape.len();
    let ang = a.spin + (i as f32) / (n as f32) * std::f32::consts::TAU;
    let rr = a.radius * a.shape[i];
    vp + Vec2::new(ang.cos(), ang.sin()) * rr
}

fn draw_ufo(u: &Ufo, vp: Vec2, view: &View) {
    let r = u.radius;
    let body = Color::new(0.7, 0.9, 0.7, 1.0);
    let c = view.p(vp);
    // Saucer: a wide ellipse-ish hull (approx with triangles) + dome.
    let hw = view.s(r);
    let hh = view.s(r * 0.45);
    draw_line_v(
        Vec2::new(c.x - hw, c.y),
        Vec2::new(c.x + hw, c.y),
        view.s(4.0).max(2.0),
        body,
    );
    draw_line_v(
        Vec2::new(c.x - hw * 0.55, c.y - hh),
        Vec2::new(c.x + hw * 0.55, c.y - hh),
        view.s(3.0).max(1.0),
        body,
    );
    // Dome.
    draw_circle(
        c.x,
        c.y - hh,
        view.s(r * 0.3),
        Color::new(0.8, 1.0, 0.9, 0.9),
    );
    // Lower hull lines.
    draw_line_v(
        Vec2::new(c.x - hw, c.y),
        Vec2::new(c.x - hw * 0.55, c.y - hh),
        view.s(2.0).max(1.0),
        body,
    );
    draw_line_v(
        Vec2::new(c.x + hw, c.y),
        Vec2::new(c.x + hw * 0.55, c.y - hh),
        view.s(2.0).max(1.0),
        body,
    );
    draw_line_v(
        Vec2::new(c.x - hw, c.y),
        Vec2::new(c.x, c.y + hh),
        view.s(2.0).max(1.0),
        body,
    );
    draw_line_v(
        Vec2::new(c.x + hw, c.y),
        Vec2::new(c.x, c.y + hh),
        view.s(2.0).max(1.0),
        body,
    );
}

fn draw_line_v(a: Vec2, b: Vec2, thick: f32, color: Color) {
    draw_line(a.x, a.y, b.x, b.y, thick, color);
}

fn draw_hud(world: &World, view: &View) {
    let pad = view.s(18.0);
    let fs = view.s(34.0).max(16.0);
    let top = view.p(Vec2::new(0.0, 0.0)).y + pad;
    let left = view.p(Vec2::new(0.0, 0.0)).x + pad;
    let right = view.p(Vec2::new(VIRTUAL_W, 0.0)).x - pad;

    draw_text(&format!("SCORE {}", world.score), left, top + fs, fs, WHITE);
    let hs = format!("HI {}", world.high_score);
    let dim = measure_text(&hs, None, fs as u16, 1.0);
    draw_text(
        &hs,
        (left + right) * 0.5 - dim.width * 0.5,
        top + fs,
        fs,
        Color::new(0.8, 0.8, 1.0, 1.0),
    );
    draw_text(
        &format!("LV {}", world.level.max(1)),
        right - view.s(120.0),
        top + fs,
        fs,
        Color::new(0.8, 1.0, 0.8, 1.0),
    );

    // Lives as little ship icons under the score.
    let icon_y = top + fs * 1.7;
    for i in 0..world.lives {
        let x = left + i as f32 * view.s(26.0) + view.s(10.0);
        draw_mini_ship(x, icon_y, view.s(9.0));
    }
}

fn draw_mini_ship(x: f32, y: f32, r: f32) {
    let a = -std::f32::consts::FRAC_PI_2;
    let nose = Vec2::new(x, y) + Vec2::from_angle(a) * (r + 2.0);
    let left = Vec2::new(x, y) + Vec2::from_angle(a + 2.4) * r;
    let right = Vec2::new(x, y) + Vec2::from_angle(a - 2.4) * r;
    draw_triangle(nose, left, right, Color::new(0.6, 0.9, 1.0, 1.0));
}

fn draw_overlays(world: &World, view: &View) {
    let cx = view.p(Vec2::new(VIRTUAL_W * 0.5, 0.0)).x;
    let cy = view.p(Vec2::new(0.0, VIRTUAL_H * 0.5)).y;

    let centered = |text: &str, y: f32, size: f32, color: Color| {
        let dim = measure_text(text, None, size as u16, 1.0);
        draw_text(text, cx - dim.width * 0.5, y, size, color);
    };

    match world.phase {
        Phase::Title => {
            let big = view.s(96.0).max(28.0);
            let mid = view.s(34.0).max(16.0);
            let sml = view.s(26.0).max(13.0);
            centered(
                "ASTRO BLASTER",
                cy - view.s(60.0),
                big,
                Color::new(0.7, 0.95, 1.0, 1.0),
            );
            centered(
                "Press ENTER or SPACE to launch",
                cy + view.s(30.0),
                mid,
                WHITE,
            );
            centered(
                "Turn: A/D or Arrows   Thrust: W/Up   Fire: Space",
                cy + view.s(80.0),
                sml,
                Color::new(0.8, 0.85, 1.0, 0.9),
            );
            centered(
                "Shoot the rocks, dodge the saucers, survive the waves.",
                cy + view.s(118.0),
                sml,
                Color::new(0.7, 0.75, 0.95, 0.8),
            );
        }
        Phase::GameOver => {
            let big = view.s(84.0).max(26.0);
            let mid = view.s(36.0).max(16.0);
            centered(
                "GAME OVER",
                cy - view.s(50.0),
                big,
                Color::new(1.0, 0.6, 0.5, 1.0),
            );
            centered(
                &format!("Final Score  {}", world.score),
                cy + view.s(20.0),
                mid,
                WHITE,
            );
            centered(
                &format!("High Score  {}", world.high_score),
                cy + view.s(64.0),
                mid,
                Color::new(0.8, 0.85, 1.0, 1.0),
            );
            centered(
                "Press ENTER or SPACE to play again",
                cy + view.s(120.0),
                view.s(28.0).max(14.0),
                Color::new(0.8, 0.85, 1.0, 0.9),
            );
        }
        Phase::Playing => {}
    }
}

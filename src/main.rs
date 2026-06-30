mod bullet;
mod enemy;
mod game;
mod particle;
mod player;
mod powerup;
mod starfield;
mod ui;
mod utils;

use game::Game;
use macroquad::prelude::*;
use utils::{HEIGHT, WIDTH};

fn window_conf() -> Conf {
    Conf {
        window_title: "Nebula Strike 313".to_owned(),
        window_width: WIDTH as i32,
        window_height: HEIGHT as i32,
        window_resizable: false,
        high_dpi: true,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    // Seed the RNG so each run differs.
    rand::srand(macroquad::miniquad::date::now() as u64);

    let mut game = Game::new();

    loop {
        // Clamp dt so a stutter / tab-switch doesn't teleport everything.
        let dt = get_frame_time().min(1.0 / 30.0);

        game.update(dt);
        game.draw();

        next_frame().await;
    }
}

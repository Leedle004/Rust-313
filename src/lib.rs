//! Astro Blaster — game logic crate.
//!
//! This library contains the entire simulation (entities, physics, collisions,
//! scoring and the game-state machine) with **no rendering dependencies**, so
//! it can be unit-tested headlessly. The binary (`src/main.rs`) layers
//! macroquad rendering and keyboard input on top of it.
//!
//! Logical playfield size used by the binary.
pub const VIRTUAL_W: f32 = 1024.0;
pub const VIRTUAL_H: f32 = 768.0;

pub mod entities;
pub mod util;
pub mod world;

pub use entities::*;
pub use world::{Input, Phase, World};

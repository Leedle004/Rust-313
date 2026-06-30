# Astro Blaster

A polished, retro **Asteroids-style arcade shooter** written in **Rust** with the
[`macroquad`](https://github.com/not-fl3/macroquad) game framework. It runs as a
native desktop app **and** in the browser via WebAssembly — from the same code.

Pilot a ship through endless waves of drifting rocks, blast them into smaller
pieces, dodge hostile flying saucers, and chase a high score across escalating
levels.

```
        ▲              .  *        .
       ╱ ╲      *           ◇  ◇         .
      ╱   ╲   .      ◇◇◇        ◇◇◇
     ╱_____╲      ◇◇◇◇◇    *      ◇◇◇◇◇    .
        ^              ◇◇◇             ◇◇
       fire     .                 *
```

## Gameplay

- **Thrust & rotate** an inertia-based ship with classic screen-wrapping physics.
- **Shoot asteroids**: large rocks split into mediums, mediums into smalls.
- **Flying saucers** drift in and shoot back — small ones actively aim at you.
- **Lives, score & levels**: clear every rock to advance; each new wave adds more.
- **Bonus life** every 10,000 points.
- Juicy feel: particle explosions, thruster trails, screen shake, a twinkling
  starfield, and post-respawn invulnerability blinking.

### Controls

| Action       | Keys                    |
| ------------ | ----------------------- |
| Turn left    | `A` / `←`               |
| Turn right   | `D` / `→`               |
| Thrust       | `W` / `↑`               |
| Fire         | `Space`                 |
| Start / Restart | `Enter` or `Space`   |
| Quit (native, when not playing) | `Esc`    |

## Project layout

The simulation is deliberately split from rendering so the gameplay can be
unit-tested headlessly (no window or GPU needed):

```
src/
├── lib.rs        # crate root + shared constants
├── util.rs       # math/RNG helpers (screen wrap, toroidal collision)
├── entities.rs   # Ship, Bullet, Asteroid, Ufo, Particle + integration
├── world.rs      # game-state machine, spawning, collisions, scoring
└── main.rs       # macroquad rendering + keyboard input (front-end only)
web/
├── index.html    # browser shell
├── mq_js_bundle.js  # macroquad/miniquad JS loader (vendored, offline-ready)
└── astro_blaster.wasm  # prebuilt WebAssembly so it plays with no toolchain
```

All game rules (collisions, splitting, scoring, life loss, level progression)
are covered by unit tests in the `util`, `entities`, and `world` modules.

## Build & run

### Desktop (native)

```bash
cargo run --release
```

On Linux you may need the usual SDL/GL/ALSA development packages
(`libx11`, `libxi`, `libgl1-mesa`, `libasound2`) for the windowed build.

### Browser (WebAssembly)

```bash
./build_web.sh                       # builds the wasm and copies it into web/
python3 -m http.server --directory web 8080
# open http://localhost:8080
```

A prebuilt `web/astro_blaster.wasm` is committed, so you can also just serve the
`web/` directory directly without installing Rust.

### Tests

```bash
cargo test
```

## Build sizes

| Artifact                       | Size    |
| ------------------------------ | ------- |
| Native debug binary            | ~20 MB  |
| Native release binary          | ~1.1 MB |
| Release WebAssembly module      | ~0.5 MB |

## License

MIT

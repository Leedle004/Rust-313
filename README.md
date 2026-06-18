# Starfall Shooter

A zero-dependency HTML5 Canvas arcade shooter. Pilot a small starfighter, dodge
incoming drones, and survive as the waves get faster.

## Play locally

Because the game uses browser modules, serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

## Controls

- `WASD` or arrow keys: move
- Mouse: aim
- Click or `Space`: fire
- `P`: pause or resume
- `R`: restart

## Features

- Full-screen Canvas rendering with responsive resizing
- Mouse aiming and keyboard movement
- Three enemy types with escalating waves
- Score, hull meter, pause, restart, and game-over flow
- Screen shake, starfield, projectile, and explosion particle effects
# Nebula Strike 🚀

A fast, lightweight arcade space‑shooter that runs entirely in the browser — **no install, no build step, no network required**. The whole game is plain HTML/CSS/JavaScript with vector graphics and **procedurally generated sound** (Web Audio API), so it ships far under the "20MB" lightweight‑game budget (the source is only a few tens of KB).

## Play

Just open `index.html` in any modern browser:

```bash
# option A: double‑click index.html, or
# option B: serve locally (recommended for audio autoplay policies)
python3 -m http.server 8000
# then visit http://localhost:8000
```

That's it — it works offline.

## Controls

| Action | Keyboard / Mouse | Touch |
|--------|------------------|-------|
| Move   | Arrow keys / WASD, or move the mouse | Drag anywhere |
| Fire   | Automatic; hold **Space** for a focused burst | Automatic |
| Bomb (screen clear) | **Shift** | Double‑tap or the 💥 button |
| Pause  | **P** or **Esc** | — |

## Features

- **Wave director** with escalating difficulty and a **boss every 5 waves**.
- Five enemy archetypes — grunt, weaver, shooter, tank, asteroid — each with distinct behaviour.
- **Power‑ups**: spread shot, rapid fire, shield, extra life, and bombs.
- **Combo multiplier** that rewards chaining kills without getting hit.
- Juicy game feel: particle explosions, screen shake, parallax starfield, engine flames, bullet trails.
- Procedural sound effects (zero audio files).
- Persistent **best score** via `localStorage`.
- Responsive canvas + full **touch support**, so it plays on phones too.

## Project structure

```
index.html      # markup + screens (menu / HUD / pause / game over)
styles.css      # neon arcade UI
js/utils.js     # math + storage helpers
js/audio.js     # Web Audio procedural SFX
js/input.js     # unified keyboard / mouse / touch
js/entities.js  # player, enemies, boss, bullets, power‑ups, particles, stars
js/game.js      # state machine, wave director, collisions, rendering
js/main.js      # bootstrap: DOM wiring, resize, HUD, main loop
```

No dependencies, no bundler — everything is loaded with plain `<script>` tags.

## License

MIT

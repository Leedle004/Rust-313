# Nebula Strike

An arcade space shooter built with plain **HTML5 Canvas + vanilla JavaScript** — no engine, no build step, and **zero external dependencies**. Just open it in a browser and play.

> The brief was "develop a 20MB game." Rather than padding the repo with junk
> binary files to hit an arbitrary byte count, Nebula Strike packs a full game's
> worth of content — graphics, sound, music, enemies, bosses, particles — into a
> tiny, fast-loading footprint. Everything (art, SFX, and the soundtrack) is
> generated procedurally at runtime, so the whole thing weighs in well under a
> megabyte while still feeling like a complete arcade title.

## Play

Two options:

1. **Open directly** — double-click `index.html` (works from the file system in
   most browsers).
2. **Serve locally** (recommended, avoids any browser file restrictions):

```bash
# Python 3
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static file server works (e.g. `npx serve`, `php -S`, nginx, etc.).

## How to play

| Action | Keys |
| --- | --- |
| Move | Arrow keys / `W` `A` `S` `D` (or drag on touch) |
| Fire | Auto-fires — hold `Space` for a focused burst |
| Dash | `Shift` (quick boost + brief invulnerability) |
| Pause | `P` or `Esc` |
| Mute | `M` (or the in-game button) |

- **Survive waves** of enemies. Every **5th wave** is a **boss fight**.
- Grab glowing **power-ups**:
  - **S** — Spread shot
  - **R** — Rapid fire
  - **+** — Shield (absorbs one hit)
  - **H** — Repair (restores hull)
- Chase the high score — your **best** is saved in `localStorage`.

## Features

- Three parallax star layers + drifting nebula background
- Four enemy archetypes (grunt, zig-zag, diver, turret) with distinct behavior
- Scaling difficulty and escalating boss fights with multiple attack patterns
- Pooled particle system, screen shake, and floating score popups
- Fully **procedural audio**: synthesized SFX + a looping chiptune soundtrack
  (Web Audio API) — no audio files shipped
- Keyboard, mouse, and touch controls
- Persistent best score, pause/resume, and auto-pause on tab blur

## Project structure

```
index.html          # markup + UI overlays
css/style.css        # styling for HUD, menus, overlays
js/utils.js          # math/helpers + localStorage best score
js/audio.js          # procedural Web Audio sound + music engine
js/input.js          # keyboard / mouse / touch input
js/particles.js      # pooled particle system + floating text
js/starfield.js      # parallax background
js/entities.js       # player, bullets, enemies, boss, power-ups
js/game.js           # game loop, state machine, waves, collisions
js/main.js           # bootstrap + DOM/UI wiring
```

No frameworks, no bundler, no `node_modules` — it runs as-is.

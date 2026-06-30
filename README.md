# 20MB Data Dash

20MB Data Dash is a lightweight browser arcade game built with plain HTML,
CSS, and JavaScript. It has no external dependencies and is designed to stay
well under a 20MB distribution budget.

## Play locally

Open `index.html` directly in a modern browser, or serve the folder with any
static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## How to play

- Move with arrow keys, WASD, mouse, trackpad, or touch.
- Collect blue packets to fill the cache.
- Every full 20MB cache is uploaded automatically for points.
- Pick up green shields for temporary protection.
- Avoid red malware, which steals cache and shortens the round.
- Upload as many megabytes as possible before the 60-second window closes.

## Size target

The game uses generated Canvas graphics instead of image or audio assets, so
the repository payload remains far below 20MB while still being fully playable.
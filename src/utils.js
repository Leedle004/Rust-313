// Small math / helper utilities shared across the game.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const lerp = (a, b, t) => a + (b - a) * t;

export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

// Axis-aligned circle overlap test using squared distance (cheap, no sqrt).
export const circleHit = (a, b) => {
  const r = a.radius + b.radius;
  return dist2(a.x, a.y, b.x, b.y) <= r * r;
};

export const TAU = Math.PI * 2;

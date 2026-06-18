// Small math / helper utilities shared across the game.

export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

// Axis-aligned circle collision using squared distance (no sqrt needed).
export const circlesHit = (a, b) =>
  dist2(a.x, a.y, b.x, b.y) <= (a.r + b.r) * (a.r + b.r);

export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const TAU = Math.PI * 2;

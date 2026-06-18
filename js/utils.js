// Small math/util helpers shared across the game.
const Utils = (() => {
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

  // Circle vs circle collision.
  const hit = (a, b) => {
    const r = a.radius + b.radius;
    return dist2(a.x, a.y, b.x, b.y) <= r * r;
  };

  const TAU = Math.PI * 2;

  return { clamp, rand, randInt, choice, lerp, dist2, hit, TAU };
})();

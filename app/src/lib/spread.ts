/** Deterministic pseudo-random spread of points inside a box (best-candidate sampling). */
function hash(n: number) {
  let x = (n * 2654435761) >>> 0;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

export function spreadPoints(ids: number[], box: { x: number; y: number; w: number; h: number }, seed = 7) {
  const placed: { id: number; x: number; y: number }[] = [];
  for (const id of ids) {
    const rnd = hash(id * 31 + seed);
    let best = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    let bestD = -1;
    for (let k = 0; k < 24; k++) {
      const c = { x: box.x + rnd() * box.w, y: box.y + rnd() * box.h };
      const d = placed.length ? Math.min(...placed.map((p) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)) : Number.MAX_VALUE;
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    placed.push({ id, ...best });
  }
  return placed;
}

/**
 * Orthogonal connector routing for box diagrams: every line runs in the free space between
 * boxes (never through a box or a label), bends at right angles, and parallel lines are spread
 * over separate lanes instead of being drawn on top of each other.
 *
 * Boxes that face each other with a clear corridor get a straight line; all other connections
 * are routed with A* on a fine grid that penalises bends, overlaps and sides that do not face
 * the other box.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface EdgeIn {
  id: number;
  from: string;
  to: string;
}
export type Pt = [number, number];
export interface EdgeOut {
  id: number;
  points: Pt[];
  routed: boolean;
}
export interface Badge {
  id: number;
  x: number;
  y: number;
}

const CELL = 8;
const CLEAR = 10; // free space kept around every box
const BEND = 6;
const OVERLAP = 14;
const CROSS = 1.5;
const OFF_SIDE = 12;
const FRAME = 3; // running along a group outline
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
// Sides: 0 right, 1 bottom, 2 left, 3 top. Leaving side s means moving in direction s;
// entering side s means moving in direction (s + 2) % 4.
const NORMAL: Pt[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

class Heap {
  f: number[] = [];
  s: number[] = [];
  get size() {
    return this.f.length;
  }
  push(f: number, s: number) {
    const a = this.f;
    const b = this.s;
    let i = a.length;
    a.push(f);
    b.push(s);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= f) break;
      a[i] = a[p];
      b[i] = b[p];
      i = p;
    }
    a[i] = f;
    b[i] = s;
  }
  pop(): [number, number] {
    const a = this.f;
    const b = this.s;
    const top: [number, number] = [a[0], b[0]];
    const lf = a.pop() as number;
    const ls = b.pop() as number;
    if (a.length) {
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && a[r] < a[l] ? r : l;
        if (a[c] >= lf) break;
        a[i] = a[c];
        b[i] = b[c];
        i = c;
      }
      a[i] = lf;
      b[i] = ls;
    }
    return top;
  }
}

interface Port {
  side: number;
  cell: number;
  attach: Pt;
  cost: number;
}

/** `frames` are group outlines (zones): lines may cross them but should not run along them. */
export function routeEdges(size: { w: number; h: number }, boxes: Map<string, Rect>, obstacles: Rect[], edges: EdgeIn[], frames: Rect[] = []): EdgeOut[] {
  const cols = Math.max(1, Math.ceil(size.w / CELL));
  const rows = Math.max(1, Math.ceil(size.h / CELL));
  const n = cols * rows;
  const blocked = new Uint8Array(n);
  const occH = new Uint8Array(n);
  const occV = new Uint8Array(n);
  const cx = (c: number) => (c % cols) * CELL + CELL / 2;
  const cy = (c: number) => Math.floor(c / cols) * CELL + CELL / 2;
  const cellAt = (col: number, row: number) => (col < 0 || row < 0 || col >= cols || row >= rows ? -1 : row * cols + col);

  const mark = (r: Rect, pad: number) => {
    const x0 = Math.max(0, Math.floor((r.x - pad) / CELL));
    const x1 = Math.min(cols - 1, Math.floor((r.x + r.w + pad) / CELL));
    const y0 = Math.max(0, Math.floor((r.y - pad) / CELL));
    const y1 = Math.min(rows - 1, Math.floor((r.y + r.h + pad) / CELL));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
  };
  boxes.forEach((r) => mark(r, CLEAR));
  obstacles.forEach((r) => mark(r, 4));
  const frameH = new Uint8Array(n);
  const frameV = new Uint8Array(n);
  for (const f of frames) {
    const c0 = Math.max(0, Math.floor(f.x / CELL));
    const c1 = Math.min(cols - 1, Math.floor((f.x + f.w) / CELL));
    const r0 = Math.max(0, Math.floor(f.y / CELL));
    const r1 = Math.min(rows - 1, Math.floor((f.y + f.h) / CELL));
    for (const yb of [f.y, f.y + f.h])
      for (let r = r0; r <= r1; r++) if (Math.abs(r * CELL + CELL / 2 - yb) <= 6) for (let c = c0; c <= c1; c++) frameH[r * cols + c] = 1;
    for (const xb of [f.x, f.x + f.w])
      for (let c = c0; c <= c1; c++) if (Math.abs(c * CELL + CELL / 2 - xb) <= 6) for (let r = r0; r <= r1; r++) frameV[r * cols + c] = 1;
  }

  const occupy = (pts: Pt[]) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const horiz = Math.abs(y1 - y0) < 0.5;
      const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      const steps = Math.max(1, Math.round(len / (CELL / 2)));
      for (let k = 0; k <= steps; k++) {
        const c = cellAt(Math.floor((x0 + ((x1 - x0) * k) / steps) / CELL), Math.floor((y0 + ((y1 - y0) * k) / steps) / CELL));
        if (c < 0) continue;
        if (horiz) occH[c] = Math.min(250, occH[c] + 1);
        else occV[c] = Math.min(250, occV[c] + 1);
      }
    }
  };

  /** Port cell just outside side `side` of box r, at fraction t along the side. */
  const port = (r: Rect, side: number, t: number, cost: number): Port | null => {
    const along = side === 0 || side === 2 ? r.y + t * r.h : r.x + t * r.w;
    const lo = (side === 0 || side === 2 ? r.y : r.x) + 8;
    const hi = (side === 0 || side === 2 ? r.y + r.h : r.x + r.w) - 8;
    let k = Math.floor(along / CELL);
    if (k * CELL + CELL / 2 < lo) k = Math.ceil((lo - CELL / 2) / CELL);
    if (k * CELL + CELL / 2 > hi) k = Math.floor((hi - CELL / 2) / CELL);
    if (k * CELL + CELL / 2 < lo || k * CELL + CELL / 2 > hi) k = Math.floor((lo + hi) / 2 / CELL);
    let cell = -1;
    if (side === 0) cell = cellAt(Math.floor((r.x + r.w + CLEAR) / CELL) + 1, k);
    if (side === 2) cell = cellAt(Math.floor((r.x - CLEAR) / CELL) - 1, k);
    if (side === 1) cell = cellAt(k, Math.floor((r.y + r.h + CLEAR) / CELL) + 1);
    if (side === 3) cell = cellAt(k, Math.floor((r.y - CLEAR) / CELL) - 1);
    if (cell < 0) return null;
    const attach: Pt = side === 0 ? [r.x + r.w, cy(cell)] : side === 2 ? [r.x, cy(cell)] : side === 1 ? [cx(cell), r.y + r.h] : [cx(cell), r.y];
    return { side, cell, attach, cost };
  };

  const sideCost = (a: Rect, b: Rect, side: number) => {
    const ux = b.x + b.w / 2 - (a.x + a.w / 2);
    const uy = b.y + b.h / 2 - (a.y + a.h / 2);
    const len = Math.hypot(ux, uy) || 1;
    return OFF_SIDE * (1 - (NORMAL[side][0] * ux + NORMAL[side][1] * uy) / len);
  };

  const g = new Float32Array(n * 4);
  const prev = new Int32Array(n * 4);

  const search = (starts: Port[], goals: Port[], useOcc: boolean): { cells: number[]; start: Port; goal: Port; cost: number } | null => {
    const goalAt = new Map<number, Port[]>();
    goals.forEach((p) => goalAt.set(p.cell, [...(goalAt.get(p.cell) ?? []), p]));
    const gx = goals.map((p) => p.cell % cols);
    const gy = goals.map((p) => Math.floor(p.cell / cols));
    const h = (c: number) => {
      const x = c % cols;
      const y = Math.floor(c / cols);
      let m = Infinity;
      for (let i = 0; i < gx.length; i++) m = Math.min(m, Math.abs(x - gx[i]) + Math.abs(y - gy[i]));
      return m;
    };
    g.fill(Infinity);
    prev.fill(-1);
    const heap = new Heap();
    const startOf = new Map<number, Port>();
    for (const p of starts) {
      const st = p.cell * 4 + p.side;
      if (p.cost < g[st]) {
        g[st] = p.cost;
        startOf.set(st, p);
        heap.push(p.cost + h(p.cell), st);
      }
    }
    let best: { cost: number; state: number; goal: Port } | null = null;
    let pops = 0;
    while (heap.size) {
      const [f, st] = heap.pop();
      if (best && f >= best.cost) break;
      const c = st >> 2;
      const d = st & 3;
      const gc = g[st];
      if (f - h(c) > gc + 1e-3) continue; // stale entry
      if (++pops > 400000) break;
      const here = goalAt.get(c);
      if (here)
        for (const q of here) {
          const total = gc + q.cost + (d === (q.side + 2) % 4 ? 0 : BEND);
          if (!best || total < best.cost) best = { cost: total, state: st, goal: q };
        }
      const x = c % cols;
      const y = Math.floor(c / cols);
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d + 2) % 4) continue;
        const nx = x + DX[nd];
        const ny = y + DY[nd];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nc = ny * cols + nx;
        if (blocked[nc] && !goalAt.has(nc)) continue;
        let cost = 1 + (nd === d ? 0 : BEND) + ((nd === 0 || nd === 2 ? frameH[nc] : frameV[nc]) ? FRAME : 0);
        if (useOcc) cost += nd === 0 || nd === 2 ? occH[nc] * OVERLAP + occV[nc] * CROSS : occV[nc] * OVERLAP + occH[nc] * CROSS;
        const ns = nc * 4 + nd;
        const ng = gc + cost;
        if (ng < g[ns]) {
          g[ns] = ng;
          prev[ns] = st;
          heap.push(ng + h(nc), ns);
        }
      }
    }
    if (!best) return null;
    const cells: number[] = [];
    let st = best.state;
    let guard = 0;
    while (st >= 0 && guard++ < n * 4) {
      cells.push(st >> 2);
      if (startOf.has(st) && prev[st] < 0) break;
      st = prev[st];
    }
    cells.reverse();
    const first = startOf.get(st);
    if (!first) return null;
    return { cells, start: first, goal: best.goal, cost: best.cost };
  };

  const toPoints = (r: { cells: number[]; start: Port; goal: Port }): Pt[] => {
    const raw: Pt[] = [r.start.attach, ...r.cells.map((c) => [cx(c), cy(c)] as Pt), r.goal.attach];
    const out: Pt[] = [];
    for (const p of raw) {
      const last = out[out.length - 1];
      if (last && Math.abs(last[0] - p[0]) < 0.5 && Math.abs(last[1] - p[1]) < 0.5) continue;
      if (out.length >= 2) {
        const a = out[out.length - 2];
        const b = out[out.length - 1];
        const colinear = (Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - p[0]) < 0.5) || (Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - p[1]) < 0.5);
        if (colinear) out.pop();
      }
      out.push(p);
    }
    return out;
  };

  /** A straight line between facing boxes when nothing stands in its corridor. */
  const straight = (a: Rect, b: Rect, offset: number): Pt[] | null => {
    const others = [...boxes.values()].filter((r) => r !== a && r !== b);
    const clear = (x0: number, y0: number, x1: number, y1: number) => {
      const lx = Math.min(x0, x1) - 3;
      const hx = Math.max(x0, x1) + 3;
      const ly = Math.min(y0, y1) - 3;
      const hy = Math.max(y0, y1) + 3;
      return [...others, ...obstacles].every((r) => r.x + r.w < lx || r.x > hx || r.y + r.h < ly || r.y > hy);
    };
    const ox0 = Math.max(a.x, b.x) + 12;
    const ox1 = Math.min(a.x + a.w, b.x + b.w) - 12;
    if (ox1 - ox0 >= 8) {
      const x = Math.max(ox0, Math.min(ox1, (ox0 + ox1) / 2 + offset));
      if (b.y >= a.y + a.h + 14 && clear(x, a.y + a.h, x, b.y)) return [[x, a.y + a.h], [x, b.y]];
      if (a.y >= b.y + b.h + 14 && clear(x, a.y, x, b.y + b.h)) return [[x, a.y], [x, b.y + b.h]];
    }
    const oy0 = Math.max(a.y, b.y) + 10;
    const oy1 = Math.min(a.y + a.h, b.y + b.h) - 10;
    if (oy1 - oy0 >= 6) {
      const y = Math.max(oy0, Math.min(oy1, (oy0 + oy1) / 2 + offset));
      if (b.x >= a.x + a.w + 20 && clear(a.x + a.w, y, b.x, y)) return [[a.x + a.w, y], [b.x, y]];
      if (a.x >= b.x + b.w + 20 && clear(a.x, y, b.x + b.w, y)) return [[a.x, y], [b.x + b.w, y]];
    }
    return null;
  };

  const out = new Map<number, EdgeOut>();
  const pending: EdgeIn[] = [];
  const pairSeen = new Map<string, number>();
  for (const e of edges) {
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    if (!a || !b || e.from === e.to) continue;
    const key = [e.from, e.to].sort().join("→");
    const k = pairSeen.get(key) ?? 0;
    pairSeen.set(key, k + 1);
    const line = straight(a, b, k === 0 ? 0 : k % 2 ? 10 : -10);
    if (line) {
      out.set(e.id, { id: e.id, points: line, routed: true });
      occupy(line);
    } else pending.push(e);
  }

  // Pass 1: let the cost choose the sides of each remaining connection (ports at side middles).
  const sides = new Map<number, [number, number]>();
  for (const e of pending) {
    const a = boxes.get(e.from) as Rect;
    const b = boxes.get(e.to) as Rect;
    const starts = [0, 1, 2, 3].map((s) => port(a, s, 0.5, sideCost(a, b, s))).filter(Boolean) as Port[];
    const goals = [0, 1, 2, 3].map((s) => port(b, s, 0.5, sideCost(b, a, s))).filter(Boolean) as Port[];
    const r = search(starts, goals, false);
    if (r) sides.set(e.id, [r.start.side, r.goal.side]);
  }

  // Pass 2: spread the ends sharing a side, then route shortest first, avoiding lines already drawn.
  const ends = new Map<string, { id: number; end: 0 | 1; key: number }[]>();
  for (const e of pending) {
    const sd = sides.get(e.id);
    if (!sd) continue;
    const a = boxes.get(e.from) as Rect;
    const b = boxes.get(e.to) as Rect;
    const add = (box: string, side: number, other: Rect, end: 0 | 1) => {
      const k = `${box}|${side}`;
      const keyOf = side === 0 || side === 2 ? other.y + other.h / 2 : other.x + other.w / 2;
      ends.set(k, [...(ends.get(k) ?? []), { id: e.id, end, key: keyOf }]);
    };
    add(e.from, sd[0], b, 0);
    add(e.to, sd[1], a, 1);
  }
  const frac = new Map<string, number>();
  ends.forEach((list) => {
    list.sort((p, q) => p.key - q.key);
    list.forEach((it, i) => frac.set(`${it.id}|${it.end}`, (i + 1) / (list.length + 1)));
  });
  const order = pending
    .filter((e) => sides.has(e.id))
    .map((e) => {
      const a = boxes.get(e.from) as Rect;
      const b = boxes.get(e.to) as Rect;
      return { e, d: Math.abs(a.x + a.w / 2 - b.x - b.w / 2) + Math.abs(a.y + a.h / 2 - b.y - b.h / 2) };
    })
    .sort((p, q) => p.d - q.d)
    .map((x) => x.e);
  for (const e of order) {
    const a = boxes.get(e.from) as Rect;
    const b = boxes.get(e.to) as Rect;
    const [sa, sb] = sides.get(e.id) as [number, number];
    const ps = port(a, sa, frac.get(`${e.id}|0`) ?? 0.5, 0);
    const pg = port(b, sb, frac.get(`${e.id}|1`) ?? 0.5, 0);
    const r = ps && pg ? search([ps], [pg], true) : null;
    if (r) {
      const pts = toPoints(r);
      out.set(e.id, { id: e.id, points: pts, routed: true });
      occupy(pts);
    }
  }

  // Anything left (no free path at all) is drawn as a plain line so it is never lost.
  for (const e of edges) {
    if (out.has(e.id)) continue;
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    if (!a || !b) continue;
    out.set(e.id, { id: e.id, points: [[a.x + a.w / 2, a.y + a.h / 2], [b.x + b.w / 2, b.y + b.h / 2]], routed: false });
  }
  return edges.map((e) => out.get(e.id)).filter(Boolean) as EdgeOut[];
}

/** SVG path through the points with softly rounded corners. */
export function roundedPath(pts: Pt[], radius = 9): string {
  if (!pts.length) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0) || 1;
    const l2 = Math.hypot(x2 - x1, y2 - y1) || 1;
    const r = Math.min(radius, l1 / 2, l2 / 2);
    d += ` L ${x1 - ((x1 - x0) / l1) * r} ${y1 - ((y1 - y0) / l1) * r} Q ${x1} ${y1} ${x1 + ((x2 - x1) / l2) * r} ${y1 + ((y2 - y1) / l2) * r}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
}

/** A spot for each connection's number: on its longest straight run, apart from other numbers. */
export function placeBadges(edges: EdgeOut[], boxes: Rect[], gap = 24): Badge[] {
  const placed: Badge[] = [];
  const freeOf = (x: number, y: number) => placed.every((b) => Math.hypot(b.x - x, b.y - y) >= gap) && boxes.every((r) => x < r.x - 11 || x > r.x + r.w + 11 || y < r.y - 11 || y > r.y + r.h + 11);
  for (const e of edges) {
    const segs = e.points
      .slice(1)
      .map((p, i) => ({ a: e.points[i], b: p, len: Math.hypot(p[0] - e.points[i][0], p[1] - e.points[i][1]) }))
      .sort((p, q) => q.len - p.len);
    let spot: Badge | null = null;
    for (const s of segs) {
      for (const t of [0.5, 0.35, 0.65, 0.22, 0.78]) {
        const x = s.a[0] + (s.b[0] - s.a[0]) * t;
        const y = s.a[1] + (s.b[1] - s.a[1]) * t;
        if (s.len * Math.min(t, 1 - t) < 12) continue;
        if (freeOf(x, y)) {
          spot = { id: e.id, x, y };
          break;
        }
      }
      if (spot) break;
    }
    if (!spot && segs[0]) spot = { id: e.id, x: (segs[0].a[0] + segs[0].b[0]) / 2, y: (segs[0].a[1] + segs[0].b[1]) / 2 };
    if (spot) placed.push(spot);
  }
  return placed;
}

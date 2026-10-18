/** Minimal Sankey layout (pure TS): columns of nodes, ribbons with cubic edges. One scale for the whole chart. */
export interface SNode {
  id: string;
  col: number;
  /** Order inside the column (top to bottom). */
  order: number;
  /** Invisible pass-through (keeps a long ribbon clear of the nodes between its columns). */
  hidden?: boolean;
}
export interface SLink {
  from: string;
  to: string;
  value: number;
}
export interface PlacedNode extends SNode {
  x: number;
  y: number;
  h: number;
  value: number;
}
export interface PlacedLink extends SLink {
  d: string;
  /** Ribbon thickness [px]. */
  t: number;
  y0: number;
  y1: number;
}

export interface SankeyOpts {
  width: number;
  height: number;
  nodeW: number;
  /** Left/right plot margins for labels. */
  padL: number;
  padR: number;
  /** Vertical gap between nodes per column index (default 14). */
  gap?: (col: number) => number;
  /** Minimum drawn height of a non-zero node [px]. */
  minH?: number;
}

export function layoutSankey(nodes: SNode[], links: SLink[], o: SankeyOpts): { nodes: PlacedNode[]; links: PlacedLink[]; scale: number } {
  const gapOf = o.gap ?? (() => 14);
  const minH = o.minH ?? 2;
  const valueOf = new Map<string, number>();
  for (const n of nodes) {
    const inV = links.filter((l) => l.to === n.id).reduce((s, l) => s + l.value, 0);
    const outV = links.filter((l) => l.from === n.id).reduce((s, l) => s + l.value, 0);
    valueOf.set(n.id, Math.max(inV, outV));
  }
  const cols = [...new Set(nodes.map((n) => n.col))].sort((a, b) => a - b);
  const byCol = new Map<number, SNode[]>();
  for (const c of cols) byCol.set(c, nodes.filter((n) => n.col === c).sort((a, b) => a.order - b.order));
  // scale: the fullest column fits the height
  let scale = Infinity;
  for (const c of cols) {
    const list = byCol.get(c) ?? [];
    const gaps = Math.max(0, list.length - 1) * gapOf(c);
    const sum = list.reduce((s, n) => s + (valueOf.get(n.id) ?? 0), 0);
    if (sum > 0) scale = Math.min(scale, (o.height - gaps) / sum);
  }
  if (!Number.isFinite(scale)) scale = 1;

  const colX = (c: number) => o.padL + (cols.length > 1 ? ((o.width - o.padL - o.padR - o.nodeW) * cols.indexOf(c)) / (cols.length - 1) : 0);
  const placed = new Map<string, PlacedNode>();
  for (const c of cols) {
    const list = byCol.get(c) ?? [];
    const hs = list.map((n) => {
      const v = valueOf.get(n.id) ?? 0;
      return v > 0 ? Math.max(minH, v * scale) : 0;
    });
    const total = hs.reduce((s, h) => s + h, 0) + Math.max(0, list.length - 1) * gapOf(c);
    let y = (o.height - total) / 2;
    list.forEach((n, i) => {
      const h = hs[i] ?? 0;
      placed.set(n.id, { ...n, x: colX(c), y, h, value: valueOf.get(n.id) ?? 0 });
      y += h + gapOf(c);
    });
  }

  const outSorted = (id: string) =>
    links.filter((l) => l.from === id).sort((a, b) => (placed.get(a.to)?.y ?? 0) - (placed.get(b.to)?.y ?? 0));
  const inSorted = (id: string) =>
    links.filter((l) => l.to === id).sort((a, b) => (placed.get(a.from)?.y ?? 0) - (placed.get(b.from)?.y ?? 0));
  const outOrder = new Map<SLink, number>();
  const inOrder = new Map<SLink, number>();
  for (const n of nodes) {
    let acc = 0;
    for (const l of outSorted(n.id)) {
      outOrder.set(l, acc);
      acc += l.value * scale;
    }
    acc = 0;
    for (const l of inSorted(n.id)) {
      inOrder.set(l, acc);
      acc += l.value * scale;
    }
  }

  const out: PlacedLink[] = [];
  for (const l of links) {
    if (!(l.value > 0)) continue;
    const a = placed.get(l.from);
    const b = placed.get(l.to);
    if (!a || !b) continue;
    const t = Math.max(0.8, l.value * scale);
    const x0 = a.x + o.nodeW;
    const x1 = b.x;
    const y0 = a.y + (outOrder.get(l) ?? 0);
    const y1 = b.y + (inOrder.get(l) ?? 0);
    const xm = (x0 + x1) / 2;
    const d = `M${x0} ${y0} C${xm} ${y0} ${xm} ${y1} ${x1} ${y1} L${x1} ${y1 + t} C${xm} ${y1 + t} ${xm} ${y0 + t} ${x0} ${y0 + t} Z`;
    out.push({ ...l, d, t, y0, y1 });
  }
  return { nodes: [...placed.values()], links: out, scale };
}

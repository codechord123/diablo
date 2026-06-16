// ============================================================
// pathfinding.js — 그리드 기반 A* (디아블로식 클릭 이동용)
// ============================================================
// grid: 2D array. 0=이동 가능, 1=벽
// start, end: { x, y } (타일 좌표)
// 반환: [{x,y}, ...] 경로 (start 포함) 또는 null
// ============================================================

const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = (p) => `${p.x},${p.y}`;

export function findPath(grid, start, end) {
  if (!isWalkable(grid, end)) {
    // 목적지가 벽이면 인접 walkable 셀로 보정
    const adj = nearestWalkable(grid, end);
    if (!adj) return null;
    end = adj;
  }
  const open = [{ pos: start, g: 0, h: heuristic(start, end), parent: null }];
  const seen = new Map();
  seen.set(key(start), 0);

  while (open.length) {
    // f = g + h 최소 노드 (작은 그리드라 sort로 충분)
    open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
    const cur = open.shift();
    if (cur.pos.x === end.x && cur.pos.y === end.y) {
      return reconstruct(cur);
    }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const np = { x: cur.pos.x + dx, y: cur.pos.y + dy };
      if (!isWalkable(grid, np)) continue;
      const ng = cur.g + 1;
      const k = key(np);
      if (seen.has(k) && seen.get(k) <= ng) continue;
      seen.set(k, ng);
      open.push({ pos: np, g: ng, h: heuristic(np, end), parent: cur });
    }
  }
  return null;
}

function reconstruct(node) {
  const path = [];
  let n = node;
  while (n) { path.unshift(n.pos); n = n.parent; }
  return path;
}

function isWalkable(grid, p) {
  return p.y >= 0 && p.y < grid.length &&
         p.x >= 0 && p.x < grid[0].length &&
         grid[p.y][p.x] === 0;
}

function nearestWalkable(grid, p) {
  for (let r = 1; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const np = { x: p.x + dx, y: p.y + dy };
        if (isWalkable(grid, np)) return np;
      }
    }
  }
  return null;
}

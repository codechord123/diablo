// ============================================================
// dungeon.js — 절차적 던전 생성기
// ============================================================
// 알고리즘: 무작위 방 N개 배치 (겹침 방지) → L자형 복도로 연결
// 결과: { grid, rooms, spawn } — grid는 0=바닥, 1=벽
// ============================================================

export const TILE_SIZE = 40;
export const MAP_W = 40;  // 타일 수
export const MAP_H = 28;

export function generateDungeon(seedFn = Math.random) {
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));
  const rooms = [];
  const maxAttempts = 80;
  const targetRooms = 7;

  for (let i = 0; i < maxAttempts && rooms.length < targetRooms; i++) {
    const w = 4 + Math.floor(seedFn() * 6);
    const h = 4 + Math.floor(seedFn() * 5);
    const x = 1 + Math.floor(seedFn() * (MAP_W - w - 2));
    const y = 1 + Math.floor(seedFn() * (MAP_H - h - 2));
    const room = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2) };
    if (rooms.some(r => overlaps(r, room, 1))) continue;
    rooms.push(room);
    carveRoom(grid, room);
  }

  // 방들을 순서대로 L자 복도로 연결
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, rooms[i-1], rooms[i], seedFn);
  }

  const spawn = rooms[0];
  return { grid, rooms, spawn: { x: spawn.cx, y: spawn.cy } };
}

function overlaps(a, b, pad) {
  return !(a.x + a.w + pad < b.x ||
           b.x + b.w + pad < a.x ||
           a.y + a.h + pad < b.y ||
           b.y + b.h + pad < a.y);
}

function carveRoom(grid, r) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      grid[y][x] = 0;
}

function carveCorridor(grid, a, b, seedFn) {
  // 두 방 중심을 L자로 연결 (수평 먼저 or 수직 먼저 무작위)
  const horizFirst = seedFn() < 0.5;
  if (horizFirst) {
    carveH(grid, a.cx, b.cx, a.cy);
    carveV(grid, a.cy, b.cy, b.cx);
  } else {
    carveV(grid, a.cy, b.cy, a.cx);
    carveH(grid, a.cx, b.cx, b.cy);
  }
}

function carveH(grid, x1, x2, y) {
  const [a, b] = [Math.min(x1, x2), Math.max(x1, x2)];
  for (let x = a; x <= b; x++) grid[y][x] = 0;
}
function carveV(grid, y1, y2, x) {
  const [a, b] = [Math.min(y1, y2), Math.max(y1, y2)];
  for (let y = a; y <= b; y++) grid[y][x] = 0;
}

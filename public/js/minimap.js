// ============================================================
// minimap.js — 던전 미니맵 (탐험한 방만 표시 / 플레이어 + 적 점)
// ============================================================
import { TILE_SIZE, MAP_W, MAP_H } from './rpg/dungeon.js';

const CELL = 4;          // 미니맵 1타일 = 4px
const PADDING = 6;

export class Minimap {
  constructor(scene, grid, opts = {}) {
    this.scene = scene;
    this.grid = grid;
    this.theme = opts.theme || null;
    // 탐험 흔적 (cell이 한 번이라도 보이면 영구 표시)
    this.explored = new Set();

    const w = MAP_W * CELL + PADDING * 2;
    const h = MAP_H * CELL + PADDING * 2;
    this.width = w; this.height = h;

    // 화면 우측 상단 고정 (HUD 아래)
    const x = scene.scale.width - w - 14;
    const y = 64;

    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(60);

    // 배경 패널
    const bg = scene.add.rectangle(0, 0, w, h, 0x000000, 0.55)
      .setStrokeStyle(2, 0xd4af37, 0.9)
      .setOrigin(0, 0);
    this.container.add(bg);

    // 그래픽 (재그리기 가능)
    this.gfx = scene.add.graphics();
    this.container.add(this.gfx);

    // 라벨
    this.label = scene.add.text(8, 2, 'MAP', {
      fontSize: '10px', color: '#d4af37',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    });
    this.container.add(this.label);
  }

  // 플레이어 주변 시야 갱신 — 매 이동마다 호출
  reveal(centerX, centerY, radius = 4) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx, y = centerY + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        if (dx*dx + dy*dy > radius*radius) continue;
        this.explored.add(`${x},${y}`);
      }
    }
  }

  // 매 프레임 또는 이동마다 다시 그림
  redraw(player, monsters, exit) {
    this.gfx.clear();
    const ox = PADDING, oy = PADDING + 12;

    // 탐험된 셀만 그림
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!this.explored.has(`${x},${y}`)) continue;
        const isWall = this.grid[y][x] === 1;
        const px = ox + x * CELL;
        const py = oy + y * CELL;
        if (isWall) {
          this.gfx.fillStyle(0x4a3a30, 0.9).fillRect(px, py, CELL, CELL);
        } else {
          this.gfx.fillStyle(0x9a7a5a, 0.75).fillRect(px, py, CELL, CELL);
        }
      }
    }

    // 출구 (계단) — 황금
    if (exit) {
      const px = ox + exit.x * CELL;
      const py = oy + exit.y * CELL;
      this.gfx.fillStyle(0xffd700, 1).fillRect(px - 1, py - 1, CELL + 2, CELL + 2);
    }

    // 몬스터 — 적색 (탐험된 셀에 있는 것만)
    if (monsters) {
      monsters.forEach(m => {
        if (!this.explored.has(`${m.tile.x},${m.tile.y}`)) return;
        const px = ox + m.tile.x * CELL;
        const py = oy + m.tile.y * CELL;
        const color = m.isBoss ? 0xff2222 : 0xff6644;
        const size = m.isBoss ? CELL + 2 : CELL;
        this.gfx.fillStyle(color, 1).fillRect(px - 1, py - 1, size + 1, size + 1);
      });
    }

    // 플레이어 — 청색 + 외곽 빛
    if (player) {
      const px = ox + player.x * CELL;
      const py = oy + player.y * CELL;
      this.gfx.fillStyle(0x4cc9f0, 0.4).fillRect(px - 2, py - 2, CELL + 4, CELL + 4);
      this.gfx.fillStyle(0x4cc9f0, 1).fillRect(px, py, CELL, CELL);
    }
  }

  setVisible(v) { this.container.setVisible(v); }
  destroy() { this.container.destroy(); }
}

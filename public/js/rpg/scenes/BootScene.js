// ============================================================
// BootScene — 절차적 스프라이트/타일 텍스처 생성 (외부 에셋 0)
// ============================================================
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeFloorTile();
    this.makeWallTile();
    this.makeTorchLight();
    this.makePlayer();
    this.makeMonsterCircle('m-skeleton', 0xcfd2cf);
    this.makeMonsterCircle('m-zombie',   0x8db580);
    this.makeMonsterCircle('m-imp',      0xd96459);
    this.makeMonsterCircle('m-wraith',   0xa3c4f3);
    this.makeMonsterCircle('m-golem',    0x9a8c98);
    this.makeMonsterCircle('m-dragon',   0xf4a261);
    this.makeMoveMarker();
    this.scene.start('Dungeon');
  }

  // 어둠 속 돌바닥 — 색 노이즈로 거친 텍스처 표현
  makeFloorTile() {
    const g = this.add.graphics();
    const S = 40;
    g.fillStyle(0x2a201a, 1).fillRect(0, 0, S, S);
    // 노이즈 점
    for (let i = 0; i < 25; i++) {
      const c = Phaser.Display.Color.GetColor(
        30 + Math.random() * 30,
        25 + Math.random() * 25,
        20 + Math.random() * 20,
      );
      g.fillStyle(c, 1).fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    // 타일 경계 어둠
    g.lineStyle(1, 0x000000, 0.4).strokeRect(0, 0, S, S);
    g.generateTexture('floor', S, S);
    g.destroy();
  }

  // 벽돌 벽 — 위쪽 밝은 면, 아래쪽 그림자
  makeWallTile() {
    const g = this.add.graphics();
    const S = 40;
    g.fillStyle(0x4a3a30, 1).fillRect(0, 0, S, S);
    g.fillStyle(0x3a2a20, 1).fillRect(0, S * 0.6, S, S * 0.4);
    g.fillStyle(0x1a1208, 1).fillRect(0, S - 4, S, 4);
    // 벽돌 줄눈
    g.lineStyle(1, 0x000000, 0.6);
    g.lineBetween(0, S/2, S, S/2);
    g.lineBetween(S/2, 0, S/2, S/2);
    g.lineBetween(0, 0, S, 0);
    g.generateTexture('wall', S, S);
    g.destroy();
  }

  // 횃불 빛 — 방사형 그라데이션을 캔버스에 그려 텍스처화
  makeTorchLight() {
    const size = 320;
    const canvas = this.textures.createCanvas('torch', size, size);
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size/2);
    grad.addColorStop(0,    'rgba(255, 200, 100, 0.55)');
    grad.addColorStop(0.4,  'rgba(255, 140,  60, 0.25)');
    grad.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  makePlayer() {
    const g = this.add.graphics();
    const S = 36;
    // 망토 배경
    g.fillStyle(0x1a3a5a, 1).fillCircle(S/2, S/2, S/2 - 1);
    g.lineStyle(2, 0xd4af37, 1).strokeCircle(S/2, S/2, S/2 - 1);
    // 빛나는 코어
    g.fillStyle(0x4cc9f0, 0.6).fillCircle(S/2, S/2, S/4);
    g.generateTexture('player', S, S);
    g.destroy();
  }

  makeMonsterCircle(name, color) {
    const g = this.add.graphics();
    const S = 36;
    g.fillStyle(color, 1).fillCircle(S/2, S/2, S/2 - 2);
    g.lineStyle(2, 0x000000, 0.6).strokeCircle(S/2, S/2, S/2 - 2);
    g.fillStyle(0xa31621, 0.3).fillCircle(S/2, S/2, S/2 - 2); // 핏빛 오버레이
    g.generateTexture(name, S, S);
    g.destroy();
  }

  makeMoveMarker() {
    const g = this.add.graphics();
    const S = 40;
    g.lineStyle(2, 0xd4af37, 0.9).strokeCircle(S/2, S/2, S/2 - 4);
    g.lineStyle(2, 0xd4af37, 0.5).strokeCircle(S/2, S/2, S/2 - 10);
    g.generateTexture('marker', S, S);
    g.destroy();
  }
}

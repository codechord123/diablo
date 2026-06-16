// ============================================================
// TownScene — 마을 (Phase 1: placeholder, Phase 2: 상점/대장간 본격 구현)
// ============================================================
// 현재는 던전 클리어 후 잠시 머무는 휴식 공간.
// "다음 던전 입장" 버튼 / Enter 키 / 클릭으로 다음 던전 진입.
// ============================================================
import { TILE_SIZE } from '../dungeon.js';
import { xpToNext } from '../../monsters.js';

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  init(data) {
    // 데이터 누락 대비 fallback
    this.player = (data && data.player) || { level: 1, xp: 0, hp: 5, maxHp: 5, kills: 0, mistakes: 0, gold: 0 };
    this.uid = (data && data.uid) || 'local-player';
  }

  create() {
    try {
      const W = this.scale.width;
      const H = this.scale.height;

      // 카메라 명시적 리셋 (이전 던전 zoom/scroll 잔재 제거)
      this.cameras.main.setScroll(0, 0).setZoom(1).setBackgroundColor('#1a0e08');

      // 마을 배경 — 단색 (gradient는 일부 환경 미지원)
      this.add.rectangle(W/2, H/2, W, H, 0x2a1a14).setDepth(-10);
      this.createUi(W, H);
    } catch (err) {
      console.error('[TownScene.create] failed:', err);
    }
  }

  createUi(W, H) {

    // 모닥불 빛
    const fire = this.add.image(W/2, H/2 + 50, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.0);
    this.tweens.add({
      targets: fire,
      alpha: { from: 0.7, to: 1.0 },
      scale: { from: 2.8, to: 3.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // 타이틀
    this.add.text(W/2, H/2 - 160, '🏰 평화로운 마을', {
      fontSize: '48px',
      fontFamily: 'Cinzel, serif',
      color: '#d4af37',
    }).setOrigin(0.5);

    this.add.text(W/2, H/2 - 100, '던전을 모두 정리했다!', {
      fontSize: '20px',
      color: '#ead7b7',
    }).setOrigin(0.5);

    // 진행도 표시
    const stats = [
      `Lv ${this.player.level}`,
      `HP ${this.player.hp}/${this.player.maxHp}`,
      `XP ${this.player.xp}/${xpToNext(this.player.level)}`,
      `💰 ${this.player.gold || 0} G`,
    ].join('   ·   ');
    this.add.text(W/2, H/2 - 50, stats, {
      fontSize: '18px',
      color: '#d4af37',
    }).setOrigin(0.5);

    // Phase 2 안내
    this.add.text(W/2, H/2 + 130, '🏪 상점 · 🔨 대장간 (Phase 2 예정)', {
      fontSize: '14px',
      color: '#888',
    }).setOrigin(0.5);

    // 다음 던전 진입 버튼
    const btn = this.add.text(W/2, H/2 + 200, '⚔️  다음 던전 입장 (Enter / 클릭)', {
      fontSize: '22px',
      color: '#ead7b7',
      backgroundColor: '#3a2418',
      padding: { left: 24, right: 24, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5a3a24' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#3a2418' }));
    btn.on('pointerdown', () => this.enterDungeon());

    this.input.keyboard.on('keydown-ENTER', () => this.enterDungeon());
    this.input.keyboard.on('keydown-SPACE', () => this.enterDungeon());

    // 마을 입장 시 HP 회복 (디아블로 마을 복귀 효과)
    this.player.hp = this.player.maxHp;
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-gold').textContent = this.player.gold || 0;
  }

  enterDungeon() {
    this.scene.start('Dungeon');
  }
}

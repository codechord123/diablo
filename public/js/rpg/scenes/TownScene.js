// ============================================================
// TownScene — 마을 (Phase 1: placeholder, Phase 2: 상점/대장간 본격 구현)
// ============================================================
// 현재는 던전 클리어 후 잠시 머무는 휴식 공간.
// "다음 던전 입장" 버튼 / Enter 키 / 클릭으로 다음 던전 진입.
// ============================================================
import { TILE_SIZE } from '../dungeon.js';
import { xpToNext } from '../../monsters.js';
import { getClass, playerSpriteKey } from '../../classes.js';

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
    const classDef = getClass(this.player.class);

    // 모닥불 빛
    const fire = this.add.image(W/2, H * 0.62, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.0)
      .setTint(0xff7733);
    this.tweens.add({
      targets: fire,
      alpha: { from: 0.7, to: 1.0 },
      scale: { from: 2.8, to: 3.2 },
      duration: 700, yoyo: true, repeat: -1,
    });

    // 캐릭터 (직업 + 레벨에 맞는 스프라이트)
    const charSprite = this.add.image(W/2, H * 0.45, playerSpriteKey(this.player.class, this.player.level))
      .setScale(2.4);
    // 직업 발광
    const aura = this.add.image(W/2, H * 0.5, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.0)
      .setAlpha(0.5)
      .setTint(classDef.glowColor);
    this.tweens.add({
      targets: charSprite,
      y: H * 0.45 - 6,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.4, to: 0.7 },
      duration: 1200, yoyo: true, repeat: -1,
    });

    // 타이틀
    this.add.text(W/2, H * 0.08, '🏰 평화로운 마을', {
      fontSize: '40px',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
      color: '#d4af37',
    }).setOrigin(0.5);

    this.add.text(W/2, H * 0.16, `${classDef.icon} ${classDef.name} · Lv ${this.player.level}`, {
      fontSize: '20px',
      color: '#ead7b7',
    }).setOrigin(0.5);

    // 진행도
    const stats = [
      `HP ${this.player.hp}/${this.player.maxHp}`,
      `XP ${this.player.xp}/${xpToNext(this.player.level)}`,
      `💰 ${this.player.gold || 0} G`,
      `처치 ${this.player.kills}`,
    ].join('   ·   ');
    this.add.text(W/2, H * 0.22, stats, {
      fontSize: '15px',
      color: '#d4af37',
    }).setOrigin(0.5);

    // 다음 던전 진입 버튼
    const btn = this.add.text(W/2, H * 0.82, '⚔️  다음 던전 입장 (Enter)', {
      fontSize: '22px',
      color: '#ead7b7',
      backgroundColor: '#3a2418',
      padding: { left: 24, right: 24, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5a3a24' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#3a2418' }));
    btn.on('pointerdown', () => this.enterDungeon());

    // 캐릭터 변경 (작은 부가 버튼)
    const changeBtn = this.add.text(W/2, H * 0.91, '🔄 캐릭터 변경', {
      fontSize: '13px',
      color: '#888',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    changeBtn.on('pointerover', () => changeBtn.setStyle({ color: '#d4af37' }));
    changeBtn.on('pointerout',  () => changeBtn.setStyle({ color: '#888' }));
    changeBtn.on('pointerdown', () => this.changeClass());

    // Phase 2B 안내
    this.add.text(W/2, H * 0.74, '🏪 상점 · 🔨 대장간 (다음 업데이트)', {
      fontSize: '12px', color: '#666',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.enterDungeon());
    this.input.keyboard.on('keydown-SPACE', () => this.enterDungeon());

    // 마을 입장 시 HP 회복
    this.player.hp = this.player.maxHp;
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-gold').textContent = this.player.gold || 0;
    const classEl = document.getElementById('hud-class');
    if (classEl) classEl.textContent = `${classDef.icon} ${classDef.name}`;
  }

  changeClass() {
    if (!confirm('캐릭터를 변경하면 레벨과 진행도가 초기화됩니다. 계속하시겠습니까?')) return;
    this.scene.start('ClassSelect', { uid: this.uid, player: this.player, reset: true });
  }

  enterDungeon() {
    this.scene.start('Dungeon');
  }
}

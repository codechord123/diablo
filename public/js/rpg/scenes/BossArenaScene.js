// ============================================================
// BossArenaScene — 보스 타임어택 전투
// 분수 모달은 BattleScene 로직 재사용 (isBoss + timeLimit)
// ============================================================
import { getBoss, markBossDefeated } from '../../bosses.js';
import { getClass, playerSpriteKey } from '../../classes.js';
import { saveProgress } from '../../firebase-config.js';

export class BossArenaScene extends Phaser.Scene {
  constructor() { super('BossArena'); }

  init(data) {
    this.bossId = data.bossId;
    this.uid = data.uid;
    this.player = data.player;
    this.boss = getBoss(this.bossId);
    this._battleEnded = false;
  }

  create() {
    try {
      this.cameras.main.setScroll(0, 0).setZoom(1).setBackgroundColor('#0a0204');
      this.cameras.main.fadeIn(400, 0, 0, 0);

      this.drawArena();
      this.drawBoss();
      this.drawPlayer();
      this.drawIntro();

      // 인트로 후 전투 시작
      this.time.delayedCall(2200, () => this.startBossBattle());
    } catch (err) {
      console.error('[BossArenaScene] failed:', err);
    }
  }

  drawArena() {
    const W = this.scale.width, H = this.scale.height;
    // 어두운 적색 그라데이션 (보스방 분위기)
    const key = `boss-arena-${W}x${H}`;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, W, H);
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(W/2, H * 0.55, 60, W/2, H * 0.55, W * 0.7);
      grad.addColorStop(0,   '#3a0a08');
      grad.addColorStop(0.5, '#1a0508');
      grad.addColorStop(1,   '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      c.refresh();
    }
    this.add.image(W/2, H/2, key).setDepth(-30);

    // 큰 돌바닥 (원형 투기장)
    const arena = this.add.graphics().setDepth(-10);
    arena.fillStyle(0x2a1208, 1).fillCircle(W/2, H * 0.6, Math.min(W, H) * 0.42);
    arena.fillStyle(0x4a2818, 0.5).fillCircle(W/2, H * 0.6, Math.min(W, H) * 0.40);
    // 돌 경계
    arena.lineStyle(4, 0x6a3a20, 1).strokeCircle(W/2, H * 0.6, Math.min(W, H) * 0.42);
    arena.lineStyle(2, 0xa31621, 0.6).strokeCircle(W/2, H * 0.6, Math.min(W, H) * 0.40);

    // 4모서리 횃불
    const r = Math.min(W, H) * 0.36;
    const cx = W/2, cy = H * 0.6;
    [-1, 1].forEach(sx => [-1, 1].forEach(sy => {
      const tx = cx + sx * r * 0.85, ty = cy + sy * r * 0.55;
      const flame = this.add.image(tx, ty, 'torch')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.6).setAlpha(0.85).setTint(0xff3322).setDepth(-5);
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.7, to: 1.0 },
        scale: { from: 1.5, to: 1.75 },
        duration: 400 + Math.random() * 300, yoyo: true, repeat: -1,
      });
    }));
  }

  drawBoss() {
    const W = this.scale.width, H = this.scale.height;
    const bx = W/2, by = H * 0.45;
    // 거대한 보스 글로우
    this.bossGlow = this.add.image(bx, by, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.5).setAlpha(0.6).setTint(0xff2222).setDepth(0);
    this.tweens.add({
      targets: this.bossGlow,
      alpha: { from: 0.5, to: 0.85 },
      scale: { from: 3.3, to: 3.8 },
      duration: 800, yoyo: true, repeat: -1,
    });
    // 보스 이모지 (이모지 + 부속 — 비대 크기)
    this.bossSprite = this.add.text(bx, by, this.boss.emoji, { fontSize: '140px' })
      .setOrigin(0.5).setDepth(2);
    this.add.text(bx + 50, by - 50, this.boss.subEmoji, { fontSize: '60px' })
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({
      targets: this.bossSprite,
      y: by - 8,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  drawPlayer() {
    const W = this.scale.width, H = this.scale.height;
    const px = W/2, py = H * 0.78;
    this.add.image(px, py, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4).setAlpha(0.55)
      .setTint(getClass(this.player.class).glowColor)
      .setDepth(0);
    this.add.image(px, py, playerSpriteKey(this.player.class, this.player.level))
      .setScale(2.2).setDepth(2);
  }

  drawIntro() {
    const W = this.scale.width, H = this.scale.height;
    const t1 = this.add.text(W/2, H * 0.15, `⚠️ 보스: ${this.boss.name}`, {
      fontSize: '36px', fontFamily: 'Cinzel, Noto Serif KR, serif',
      color: '#ff3322',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    const t2 = this.add.text(W/2, H * 0.22, this.boss.intro, {
      fontSize: '16px', color: '#ead7b7', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    const t3 = this.add.text(W/2, H * 0.28, `⏱  ${this.boss.timeSec}초 안에 처치하라!`, {
      fontSize: '20px', color: '#ffd700',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    // 보스 고유 능력 안내
    const abilityText = this.formatAbilities();
    const t4 = this.add.text(W/2, H * 0.34, abilityText, {
      fontSize: '14px', color: '#ff8855',
      align: 'center', wordWrap: { width: W * 0.7 },
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({ targets: t1, alpha: 1, duration: 500 });
    this.tweens.add({ targets: t2, alpha: 1, delay: 500, duration: 500 });
    this.tweens.add({ targets: t3, alpha: 1, delay: 1000, duration: 500 });
    this.tweens.add({ targets: t4, alpha: 1, delay: 1500, duration: 500 });
  }

  formatAbilities() {
    const a = this.boss.abilities || {};
    const parts = [];
    if (a.autoAttackEverySec > 0) parts.push(`⚡ ${a.autoAttackEverySec}초마다 자동 공격 -${a.autoAttackDamage} HP`);
    if (a.lockCategory) parts.push(`📚 ${this.boss.category} 카테고리 강제`);
    if (a.armor > 0) parts.push(`🛡️ 방어막 -${a.armor} 데미지`);
    if (a.pierceEvade) parts.push(`💢 회피 무효 (도적도 피할 수 없다)`);
    if (a.enrageBelowSec > 0) parts.push(`🔥 ${a.enrageBelowSec}초 미만 = 분노 모드`);
    return parts.length ? '특수: ' + parts.join(' · ') : '';
  }

  startBossBattle() {
    // BattleScene을 isBoss 모드로 실행
    this.scene.launch('Battle', {
      level: this.player.level,
      enemyName: this.boss.name,
      enemyEmoji: this.boss.emoji + this.boss.subEmoji,
      enemyHp: this.boss.hp,
      category: this.boss.category,
      playerClass: this.player.class,
      player: this.player,
      isBoss: true,
      timeLimitSec: this.boss.timeSec,
      bossId: this.boss.id,
    });
    this.events.on('boss-result', this.onBossResult, this);
  }

  async onBossResult(result) {
    if (this._battleEnded) return;
    this._battleEnded = true;
    if (result.victory) {
      markBossDefeated(this.player, this.boss.id);
      this.player.gold = (this.player.gold || 0) + this.boss.goldReward;
      this.player.xp += this.boss.xpReward;
      // 시각 효과 — 보스 폭발
      this.tweens.add({
        targets: [this.bossSprite, this.bossGlow],
        alpha: 0, scale: 0.3, duration: 500,
      });
    } else {
      // 패배 — HP 절반으로 처벌
      this.player.hp = Math.max(1, Math.floor(this.player.maxHp / 2));
    }
    await saveProgress(this.uid, this.player);

    // 결과 후 마을로 (로딩 경유)
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Loading', {
          target: 'Town', mode: 'return',
          data: { uid: this.uid, player: this.player },
        });
      });
    });
  }
}

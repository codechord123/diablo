// ============================================================
// TownScene — 따뜻한 일몰 마을 (디아블로 트리스트람 분위기 차용)
// ============================================================
import { TILE_SIZE } from '../dungeon.js';
import { xpToNext } from '../../monsters.js';
import { getClass, playerSpriteKey } from '../../classes.js';
import { ITEMS, SHOPS, canAfford, ownsWeapon, addPotion } from '../../items.js';
import { saveProgress } from '../../firebase-config.js';
import { availableBosses, isBossDefeated } from '../../bosses.js';
import audio from '../../audio.js';

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  init(data) {
    this.player = (data && data.player) || {
      level: 1, xp: 0, hp: 5, maxHp: 5, kills: 0, mistakes: 0, gold: 0,
      class: 'warrior',
      inventory: {}, weapons: ['sword_basic'], equippedWeapon: 'sword_basic',
    };
    this.uid = (data && data.uid) || 'local-player';
  }

  create() {
    try {
      this.cameras.main.setScroll(0, 0).setZoom(1).setBackgroundColor('#1a0e1a');
      this.cameras.main.fadeIn(400, 0, 0, 0);
      audio.playBGM('town');
      this.drawSky();
      this.drawHorizon();
      this.drawGround();
      this.drawBuildings();
      this.drawAltar();
      this.drawTorchPosts();
      this.drawDungeonPortal();     // 🚪 일반 던전 포털
      this.drawBossPortal();        // 💀 보스 포털 (해금 시)
      this.drawCharacter();
      this.drawNpcs();
      this.drawUiOverlay();
      this.refreshHud();
    } catch (err) {
      console.error('[TownScene.create] failed:', err);
    }
  }

  // ---------- 배경 레이어 ----------
  drawSky() {
    const W = this.scale.width, H = this.scale.height;
    // 일몰 그라데이션 (Canvas)
    const key = `town-sky-${W}x${H}`;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, W, H);
      const ctx = c.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,    '#1a0a3a');  // 보랏빛 밤
      grad.addColorStop(0.35, '#6a1a3a');  // 진홍 노을
      grad.addColorStop(0.55, '#c84a1a');  // 주황 노을
      grad.addColorStop(0.72, '#8a3a18');  // 흙빛 지평선
      grad.addColorStop(1,    '#2a1408');  // 어두운 땅
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // 별 (위쪽에만)
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,230,180,${0.4 + Math.random() * 0.5})`;
        const x = Math.random() * W;
        const y = Math.random() * H * 0.35;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      c.refresh();
    }
    this.add.image(W/2, H/2, key).setDepth(-30);

    // 떠다니는 태양 (일몰 디스크)
    const sun = this.add.circle(W * 0.78, H * 0.4, 36, 0xffd17a, 0.9).setDepth(-25);
    this.add.circle(W * 0.78, H * 0.4, 28, 0xffe9c0, 1).setDepth(-25);
    // 태양 글로우
    this.add.image(W * 0.78, H * 0.4, 'torch')
      .setScale(2.2).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb060).setDepth(-26);
  }

  drawHorizon() {
    const W = this.scale.width, H = this.scale.height;
    // 먼 산 실루엣 (어두운 보라/갈색)
    const horizonY = H * 0.5;
    const mountains = this.add.graphics().setDepth(-20);
    mountains.fillStyle(0x2a1830, 1);
    mountains.beginPath();
    mountains.moveTo(0, horizonY + 60);
    const peaks = 8;
    for (let i = 0; i <= peaks; i++) {
      const x = (W / peaks) * i;
      const y = horizonY + (Math.sin(i * 1.7) * 30) - 20;
      mountains.lineTo(x, y);
    }
    mountains.lineTo(W, horizonY + 60);
    mountains.closePath();
    mountains.fillPath();

    // 더 가까운 작은 언덕
    mountains.fillStyle(0x180810, 1);
    mountains.beginPath();
    mountains.moveTo(0, horizonY + 80);
    for (let i = 0; i <= peaks * 1.5; i++) {
      const x = (W / (peaks * 1.5)) * i;
      const y = horizonY + 50 + Math.sin(i * 2.3) * 15;
      mountains.lineTo(x, y);
    }
    mountains.lineTo(W, horizonY + 80);
    mountains.closePath();
    mountains.fillPath();
  }

  drawGround() {
    const W = this.scale.width, H = this.scale.height;
    // 돌바닥 그라데이션 (어두운 흙)
    const ground = this.add.graphics().setDepth(-15);
    ground.fillStyle(0x1a0a05, 1).fillRect(0, H * 0.7, W, H * 0.3);
    // 돌 텍스처 점 산포
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W;
      const y = H * 0.7 + Math.random() * H * 0.3;
      const c = 0x3a2010 + Math.floor(Math.random() * 0x111111);
      ground.fillStyle(c, 0.6).fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2);
    }
  }

  // ---------- 건물 ----------
  drawBuildings() {
    const W = this.scale.width, H = this.scale.height;
    const groundY = H * 0.74;

    // 왼쪽 큰 집 (상인 집)
    this.drawHouse(W * 0.12, groundY, 110, 90, 0x3a2018, 0xff9933);
    // 왼쪽 작은 집
    this.drawHouse(W * 0.30, groundY + 8, 70, 60, 0x2a1810, 0xffaa44);

    // 오른쪽 큰 집 (대장간 — 더 검고 굴뚝 있음)
    this.drawHouse(W * 0.88, groundY, 110, 90, 0x2a1410, 0xff4400, true);
    // 오른쪽 작은 집
    this.drawHouse(W * 0.70, groundY + 8, 70, 60, 0x2a1810, 0xffaa44);
  }

  drawHouse(cx, baseY, w, h, bodyColor, windowColor, isForge) {
    const top = baseY - h;
    const g = this.add.graphics().setDepth(-5);
    // 본체
    g.fillStyle(bodyColor, 1).fillRect(cx - w/2, top, w, h);
    // 본체 외곽
    g.lineStyle(1, 0x000000, 0.6).strokeRect(cx - w/2, top, w, h);
    // 지붕 삼각형
    g.fillStyle(0x1a0c08, 1);
    g.fillTriangle(cx - w/2 - 6, top, cx + w/2 + 6, top, cx, top - h * 0.55);
    // 지붕 그림자
    g.fillStyle(0x000000, 0.4);
    g.fillTriangle(cx, top, cx + w/2 + 6, top, cx, top - h * 0.55);

    // 문
    g.fillStyle(0x0a0606, 1);
    g.fillRect(cx - w * 0.12, top + h * 0.55, w * 0.24, h * 0.45);
    // 문 손잡이
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(cx + w * 0.06, top + h * 0.78, 1.5);

    // 창문 (빛나는 노란빛)
    const winW = w * 0.18, winH = h * 0.22;
    const winY = top + h * 0.18;
    [-1, 1].forEach(side => {
      const wx = cx + side * w * 0.25 - winW/2;
      g.fillStyle(0x000000, 1).fillRect(wx, winY, winW, winH);
      g.fillStyle(windowColor, 0.85).fillRect(wx + 1, winY + 1, winW - 2, winH - 2);
      // 십자 창살
      g.lineStyle(1, 0x000000, 0.7);
      g.lineBetween(wx + winW/2, winY, wx + winW/2, winY + winH);
      g.lineBetween(wx, winY + winH/2, wx + winW, winY + winH/2);
    });

    // 창문 빛 (글로우)
    this.add.image(cx - w * 0.25, winY + winH/2, 'torch')
      .setScale(0.5).setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(windowColor).setDepth(-4);
    this.add.image(cx + w * 0.25, winY + winH/2, 'torch')
      .setScale(0.5).setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(windowColor).setDepth(-4);

    if (isForge) {
      // 굴뚝
      g.fillStyle(0x1a0a05, 1).fillRect(cx + w * 0.25, top - h * 0.7, 12, 22);
      // 연기/불꽃 (애니메이션)
      const smoke = this.add.image(cx + w * 0.25 + 6, top - h * 0.75, 'torch')
        .setScale(0.8).setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xff4400).setDepth(-3);
      this.tweens.add({
        targets: smoke,
        alpha: { from: 0.4, to: 0.7 },
        scale: { from: 0.7, to: 0.95 },
        duration: 600, yoyo: true, repeat: -1,
      });
    }
  }

  // ---------- 제단 (중앙) ----------
  drawAltar() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W/2, cy = H * 0.7;
    const g = this.add.graphics().setDepth(0);
    // 받침
    g.fillStyle(0x3a2a20, 1).fillRect(cx - 30, cy + 12, 60, 8);
    g.fillStyle(0x1a0e08, 1).fillRect(cx - 30, cy + 20, 60, 5);
    // 기둥
    g.fillStyle(0x4a3a30, 1).fillRect(cx - 20, cy - 10, 40, 22);
    g.fillStyle(0x2a1a10, 1).fillRect(cx + 8, cy - 10, 12, 22);
    // 상부
    g.fillStyle(0x5a4a40, 1).fillRect(cx - 24, cy - 14, 48, 6);

    // 룬 글로우 (가운데)
    const rune = this.add.image(cx, cy - 22, 'torch')
      .setScale(1.0).setAlpha(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xd4af37).setDepth(1);
    this.tweens.add({
      targets: rune,
      alpha: { from: 0.5, to: 0.9 },
      scale: { from: 0.9, to: 1.1 },
      duration: 1200, yoyo: true, repeat: -1,
    });
    // 룬 마크 (작은 황금 점 4개)
    g.fillStyle(0xffd700, 1);
    g.fillCircle(cx - 6, cy - 22, 1.5);
    g.fillCircle(cx + 6, cy - 22, 1.5);
    g.fillCircle(cx, cy - 28, 1.5);
    g.fillCircle(cx, cy - 16, 1.5);
  }

  // ---------- 보스 포털 (해금된 보스 선택) ----------
  drawBossPortal() {
    const W = this.scale.width, H = this.scale.height;
    const bosses = availableBosses(this.player);
    if (bosses.length === 0) {
      // 잠긴 상태 (Lv 5 미만)
      this.add.text(W * 0.18, H * 0.42, '🔒\nLv 5 해금', {
        fontSize: '16px', color: '#666', align: 'center',
      }).setOrigin(0.5).setDepth(20);
      return;
    }

    // 다음 도전 가능한 보스 (이미 처치한 건 다음 보스로)
    const next = bosses.find(b => !isBossDefeated(this.player, b.id)) || bosses[bosses.length - 1];

    const cx = W * 0.18, cy = H * 0.45;

    // 어두운 후광 (해골)
    const glow = this.add.image(cx, cy + 6, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.7).setAlpha(0.7).setTint(0x660000).setDepth(-1);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 0.9 },
      scale: { from: 1.6, to: 1.9 },
      duration: 600, yoyo: true, repeat: -1,
    });

    // 보스방 아치 (검은 두개골 형태 — 어두운 룬 아치)
    const archDark = this.add.graphics().setDepth(-2);
    archDark.fillStyle(0x000000, 1);
    archDark.beginPath();
    archDark.moveTo(cx - 36, cy + 36);
    archDark.lineTo(cx - 36, cy - 12);
    archDark.arc(cx, cy - 12, 36, Math.PI, 0, false);
    archDark.lineTo(cx + 36, cy + 36);
    archDark.closePath();
    archDark.fillPath();

    const stone = this.add.graphics().setDepth(-1);
    stone.lineStyle(8, 0x2a0a08, 1);
    stone.beginPath();
    stone.moveTo(cx - 40, cy + 38);
    stone.lineTo(cx - 40, cy - 12);
    stone.arc(cx, cy - 12, 40, Math.PI, 0, false);
    stone.lineTo(cx + 40, cy + 38);
    stone.strokePath();
    // 핏자국 룬
    stone.lineStyle(2, 0xff2200, 0.8);
    stone.beginPath();
    stone.moveTo(cx - 40, cy + 38);
    stone.lineTo(cx - 40, cy - 12);
    stone.arc(cx, cy - 12, 40, Math.PI, 0, false);
    stone.lineTo(cx + 40, cy + 38);
    stone.strokePath();

    // 보스 미리보기 (작게)
    this.add.text(cx, cy + 4, next.emoji, { fontSize: '46px' })
      .setOrigin(0.5).setDepth(0);
    this.add.text(cx + 18, cy - 16, next.subEmoji, { fontSize: '22px' })
      .setOrigin(0.5).setDepth(0);

    // 라벨
    this.add.text(cx, cy + 56, `⚠️ ${next.name}`, {
      fontSize: '13px', color: '#ff5544',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, cy + 72, `보스전 · ${next.timeSec}초`, {
      fontSize: '11px', color: '#888',
    }).setOrigin(0.5).setDepth(20);

    // 클릭 영역
    const hit = this.add.zone(cx, cy + 12, 110, 130)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => glow.setScale(2.1));
    hit.on('pointerout', () => glow.setScale(1.7));
    hit.on('pointerdown', () => this.enterBossArena(next.id));
  }

  enterBossArena(bossId) {
    if (this._shopOpen || this._leaving) return;
    this._leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // 보스 던전(테마 적용) 모드로 일반 DungeonScene 진입
      this.scene.start('Loading', {
        target: 'Dungeon', mode: 'enter',
        data: { uid: this.uid, player: this.player, dungeonMode: 'boss', bossId },
      });
    });
  }

  // ---------- 던전 포털 (입구 아치) ----------
  drawDungeonPortal() {
    const W = this.scale.width, H = this.scale.height;
    // 화면 오른쪽 위, 산기슭에 배치
    const cx = W * 0.5;
    const cy = H * 0.42;

    // 아치 뒤 어둠 (입구 깊이)
    const archDark = this.add.graphics().setDepth(-2);
    archDark.fillStyle(0x000000, 1);
    archDark.beginPath();
    archDark.moveTo(cx - 32, cy + 30);
    archDark.lineTo(cx - 32, cy - 10);
    archDark.arc(cx, cy - 10, 32, Math.PI, 0, false);
    archDark.lineTo(cx + 32, cy + 30);
    archDark.closePath();
    archDark.fillPath();

    // 아치 돌 테두리
    const archStone = this.add.graphics().setDepth(-1);
    archStone.lineStyle(8, 0x4a3a30, 1);
    archStone.beginPath();
    archStone.moveTo(cx - 36, cy + 32);
    archStone.lineTo(cx - 36, cy - 10);
    archStone.arc(cx, cy - 10, 36, Math.PI, 0, false);
    archStone.lineTo(cx + 36, cy + 32);
    archStone.strokePath();

    // 아치 돌 세부 (벽돌 줄눈)
    archStone.lineStyle(1, 0x1a0a05, 0.7);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const x1 = cx + Math.cos(a) * 32;
      const y1 = cy - 10 + Math.sin(a) * 32;
      const x2 = cx + Math.cos(a) * 40;
      const y2 = cy - 10 + Math.sin(a) * 40;
      archStone.lineBetween(x1, y1, x2, y2);
    }

    // 적색 룬 글로우 (위험 신호)
    const portalGlow = this.add.image(cx, cy + 5, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6).setAlpha(0.7).setTint(0xa31621)
      .setDepth(-1);
    this.tweens.add({
      targets: portalGlow,
      alpha: { from: 0.6, to: 0.95 },
      scale: { from: 1.5, to: 1.75 },
      duration: 700, yoyo: true, repeat: -1,
    });

    // 입구 안 빨간 안개
    const mist = this.add.rectangle(cx, cy + 8, 56, 30, 0xa31621, 0.4).setDepth(-1);
    this.tweens.add({
      targets: mist,
      alpha: { from: 0.3, to: 0.55 },
      duration: 900, yoyo: true, repeat: -1,
    });

    // 룬 마크 (입구 위)
    const runeText = this.add.text(cx, cy - 38, '⚔', {
      fontSize: '20px', color: '#ff5544',
    }).setOrigin(0.5).setDepth(0);
    this.tweens.add({
      targets: runeText,
      alpha: { from: 0.6, to: 1.0 }, duration: 500, yoyo: true, repeat: -1,
    });

    // "던전 입장" 라벨 + 안내
    this.add.text(cx, cy + 50, '⚔️ 던전 입구', {
      fontSize: '15px', color: '#ff8855',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, cy + 68, '클릭 / Enter', {
      fontSize: '11px', color: '#888',
    }).setOrigin(0.5).setDepth(20);

    // 클릭 영역 (히트박스 — 아치 + 라벨 포함)
    const hit = this.add.zone(cx, cy + 10, 100, 110).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => portalGlow.setScale(1.85));
    hit.on('pointerout',  () => portalGlow.setScale(1.6));
    hit.on('pointerdown', () => this.enterDungeon());
  }
  drawTorchPosts() {
    const W = this.scale.width, H = this.scale.height;
    const groundY = H * 0.78;
    const positions = [W * 0.06, W * 0.94];
    positions.forEach(x => {
      const g = this.add.graphics().setDepth(-1);
      g.fillStyle(0x2a1810, 1).fillRect(x - 2, groundY - 60, 4, 60);
      g.fillStyle(0x4a2810, 1).fillRect(x - 5, groundY - 65, 10, 6);
      // 불꽃 광원
      const flame = this.add.image(x, groundY - 70, 'torch')
        .setScale(1.4).setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xff7733);
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.7, to: 1.0 },
        scale: { from: 1.3, to: 1.5 },
        duration: 500 + Math.random() * 300,
        yoyo: true, repeat: -1,
      });
    });
  }

  // ---------- 캐릭터 ----------
  drawCharacter() {
    const W = this.scale.width, H = this.scale.height;
    const classDef = getClass(this.player.class);
    // 발광
    this.add.image(W/2, H * 0.62, 'torch')
      .setScale(1.6).setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(classDef.glowColor).setDepth(2);
    // 캐릭터 스프라이트
    const ch = this.add.image(W/2, H * 0.6, playerSpriteKey(this.player.class, this.player.level))
      .setScale(2.6).setDepth(3);
    this.tweens.add({
      targets: ch,
      y: H * 0.6 - 4,
      duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ---------- NPC ----------
  drawNpcs() {
    const W = this.scale.width, H = this.scale.height;
    this.spawnNpc(W * 0.30, H * 0.62, 'merchant',   'npc-merchant',   '상인 헬가',     '#88ddff');
    this.spawnNpc(W * 0.70, H * 0.62, 'blacksmith', 'npc-blacksmith', '대장장이 군나르', '#ff8855');
  }

  spawnNpc(x, y, shopKey, spriteKey, name, colorHex) {
    const colorNum = parseInt(colorHex.slice(1), 16);
    const glow = this.add.image(x, y + 4, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4).setAlpha(0.55).setTint(colorNum).setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.4, to: 0.75 },
      scale: { from: 1.3, to: 1.5 },
      duration: 1100, yoyo: true, repeat: -1,
    });

    // 절차적 NPC 스프라이트
    const sprite = this.add.image(x, y, spriteKey).setScale(1.8).setDepth(5)
      .setInteractive({ useHandCursor: true });
    // 살랑살랑 idle
    this.tweens.add({
      targets: sprite,
      y: y - 3,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(x, y + 60, name, {
      fontSize: '14px', color: colorHex,
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(6);

    this.add.text(x, y + 78, shopKey === 'merchant' ? '🏪 포션 판매' : '🔨 무기 제작', {
      fontSize: '11px', color: '#d4af37',
    }).setOrigin(0.5).setDepth(6);

    sprite.on('pointerover', () => sprite.setScale(1.95));
    sprite.on('pointerout',  () => sprite.setScale(1.8));
    sprite.on('pointerdown', () => this.openShop(shopKey, name));
  }

  // ---------- UI 오버레이 ----------
  drawUiOverlay() {
    const W = this.scale.width, H = this.scale.height;
    const classDef = getClass(this.player.class);

    // 타이틀
    this.add.text(W/2, H * 0.07, '🏰 트리스트람 마을', {
      fontSize: '36px',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W/2, H * 0.13, `${classDef.icon} ${classDef.name} · Lv ${this.player.level}`, {
      fontSize: '17px',
      color: '#ead7b7',
    }).setOrigin(0.5).setDepth(20);

    const stats = [
      `HP ${this.player.hp}/${this.player.maxHp}`,
      `XP ${this.player.xp}/${xpToNext(this.player.level)}`,
      `💰 ${this.player.gold || 0} G`,
      `처치 ${this.player.kills}`,
    ].join('   ·   ');
    this.add.text(W/2, H * 0.19, stats, {
      fontSize: '14px',
      color: '#d4af37',
    }).setOrigin(0.5).setDepth(20);

    // 입장 버튼
    const btn = this.add.text(W/2, H * 0.88, '⚔️  던전 입장 (Enter)', {
      fontSize: '22px',
      color: '#ead7b7',
      backgroundColor: '#3a1818',
      padding: { left: 28, right: 28, top: 14, bottom: 14 },
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5a2828' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#3a1818' }));
    btn.on('pointerdown', () => this.enterDungeon());

    const changeBtn = this.add.text(W/2, H * 0.96, '🔄 캐릭터 변경', {
      fontSize: '12px',
      color: '#888',
      padding: { left: 12, right: 12, top: 4, bottom: 4 },
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
    changeBtn.on('pointerover', () => changeBtn.setStyle({ color: '#d4af37' }));
    changeBtn.on('pointerout',  () => changeBtn.setStyle({ color: '#888' }));
    changeBtn.on('pointerdown', () => this.changeClass());

    this.input.keyboard.on('keydown-ENTER', () => this.enterDungeon());
    this.input.keyboard.on('keydown-SPACE', () => this.enterDungeon());

    // 마을 입장 시 HP 회복
    this.player.hp = this.player.maxHp;
  }

  refreshHud() {
    const classDef = getClass(this.player.class);
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-gold').textContent = this.player.gold || 0;
    document.getElementById('hud-lv').textContent = this.player.level;
    document.getElementById('hud-xp').textContent = `${this.player.xp}/${xpToNext(this.player.level)}`;
    document.getElementById('hud-kills').textContent = this.player.kills;
    const classEl = document.getElementById('hud-class');
    if (classEl) classEl.textContent = `${classDef.icon} ${classDef.name}`;
    const weapon = ITEMS[this.player.equippedWeapon || 'sword_basic'] || ITEMS.sword_basic;
    const wEl = document.getElementById('hud-weapon');
    if (wEl) wEl.textContent = `${weapon.icon}`;
    const potionCount = Object.entries(this.player.inventory || {})
      .filter(([id]) => ITEMS[id]?.type === 'potion')
      .reduce((a, [, n]) => a + n, 0);
    const pEl = document.getElementById('hud-potion');
    if (pEl) pEl.textContent = `🧪${potionCount}`;
  }

  changeClass() {
    if (!confirm('캐릭터를 변경하면 레벨과 진행도가 초기화됩니다. 계속하시겠습니까?')) return;
    this.scene.start('ClassSelect', { uid: this.uid, player: this.player, reset: true });
  }

  enterDungeon() {
    if (this._shopOpen || this._leaving) return;
    this._leaving = true;
    audio.doorOpen();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Loading', {
        target: 'Dungeon', mode: 'enter',
        data: { uid: this.uid, player: this.player, dungeonMode: 'normal' },
      });
    });
  }

  // ============================================================
  // 상점 모달
  // ============================================================
  openShop(shopKey, npcName) {
    const modal = document.getElementById('shop-modal');
    document.getElementById('shop-title').textContent = `${npcName}의 상점`;
    const list = document.getElementById('shop-items');
    list.innerHTML = '';
    this.shopKey = shopKey;

    SHOPS[shopKey].forEach(itemId => this.renderShopItem(list, itemId));
    this.refreshShopGold();
    modal.classList.add('show');
    this._shopOpen = true;

    if (!this._escHandler) {
      this._escHandler = (e) => {
        if (e.key === 'Escape' && this._shopOpen) this.closeShop();
      };
      document.addEventListener('keydown', this._escHandler);
    }
    const closeBtn = document.getElementById('shop-close');
    if (!closeBtn._wired) {
      closeBtn.addEventListener('click', () => this.closeShop());
      closeBtn._wired = true;
    }
  }

  renderShopItem(list, itemId) {
    const item = ITEMS[itemId];
    const row = document.createElement('div');
    row.className = 'shop-row';
    const owned = item.type === 'weapon' && ownsWeapon(this.player, itemId);
    const affordable = canAfford(this.player, item);
    const disabled = owned || !affordable;
    row.innerHTML = `
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">💰 ${item.price}G</div>
      <button class="shop-buy" ${disabled ? 'disabled' : ''}>
        ${owned ? '보유 중' : (affordable ? '구매' : '골드 부족')}
      </button>
    `;
    const btn = row.querySelector('.shop-buy');
    if (!disabled) btn.addEventListener('click', () => this.buy(itemId, row));
    list.appendChild(row);
  }

  async buy(itemId, row) {
    const item = ITEMS[itemId];
    if (!canAfford(this.player, item)) return;
    audio.coin();
    this.player.gold -= item.price;
    if (item.type === 'potion') {
      addPotion(this.player, itemId);
    } else if (item.type === 'weapon') {
      this.player.weapons = this.player.weapons || ['sword_basic'];
      if (!this.player.weapons.includes(itemId)) this.player.weapons.push(itemId);
      this.player.equippedWeapon = itemId;
    }
    await saveProgress(this.uid, this.player);
    row.classList.add('shop-row-bought');
    setTimeout(() => this.refreshShopList(), 400);
    this.refreshShopGold();
    this.refreshHud();
  }

  refreshShopList() {
    const list = document.getElementById('shop-items');
    list.innerHTML = '';
    SHOPS[this.shopKey].forEach(itemId => this.renderShopItem(list, itemId));
  }

  refreshShopGold() {
    document.getElementById('shop-gold').textContent = this.player.gold || 0;
  }

  closeShop() {
    document.getElementById('shop-modal').classList.remove('show');
    this._shopOpen = false;
  }
}

// ============================================================
// TownScene — 따뜻한 일몰 마을 (디아블로 트리스트람 분위기 차용)
// ============================================================
import { TILE_SIZE } from '../dungeon.js';
import { xpToNext } from '../../monsters.js';
import { getClass, playerSpriteKey } from '../../classes.js';
import { ITEMS, SHOPS, canAfford, ownsWeapon, ownsHelmet, addPotion } from '../../items.js';
import { SKILLS, getAvailablePoints, getRank, upgrade as upgradeSkill } from '../../skills.js';
import { saveProgress } from '../../firebase-config.js';
import { availableBosses, isBossDefeated } from '../../bosses.js';
import { listWrong, clearWrongOne } from '../../storage.js';
import { currentUser } from '../../auth.js';
import { checkAnswer, Fraction } from '../../fractionEngine.js';
import { fractionSVG } from '../../fraction-vis.js';
import { ACHIEVEMENTS, listUnlocked, checkAchievements } from '../../achievements.js';
import { getTodaysMissions, claimMission } from '../../missions.js';
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
    // 씬 재진입 시 이전 상태 플래그 초기화 (재진입 막힘 방지)
    this._leaving = false;
    this._shopOpen = false;
    this._reviewOpen = false;
  }

  create() {
    try {
      this.cameras.main.setScroll(0, 0).setZoom(1).setBackgroundColor('#1a0e1a');
      this.cameras.main.resetFX();
      try { audio.playBGM('town'); } catch (e) { console.warn('BGM 실패:', e); }
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
    const key = `town-space-${W}x${H}`;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, W, H);
      const ctx = c.getContext();
      // 우주 그라데이션 (위는 진청, 아래는 우주선 갑판 어두움)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,    '#050810');
      grad.addColorStop(0.30, '#0a1830');
      grad.addColorStop(0.55, '#142540');
      grad.addColorStop(0.70, '#1a2540');
      grad.addColorStop(1,    '#0a1426');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // 별 (위쪽 60%에만)
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H * 0.55;
        const r = Math.random();
        ctx.fillStyle = r < 0.7
          ? `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`
          : (r < 0.9
            ? `rgba(76, 201, 240, ${0.3 + Math.random() * 0.5})`
            : `rgba(255, 215, 107, ${0.4 + Math.random() * 0.4})`);
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      // 멀리 떠 있는 행성 (오른쪽 위)
      const px = W * 0.78, py = H * 0.28;
      const planet = ctx.createRadialGradient(px - 8, py - 8, 4, px, py, 38);
      planet.addColorStop(0,   'rgba(140, 90, 60, 0.95)');
      planet.addColorStop(0.7, 'rgba(80, 50, 30, 0.85)');
      planet.addColorStop(1,   'rgba(20, 15, 10, 0.4)');
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(px, py, 38, 0, Math.PI * 2);
      ctx.fill();
      c.refresh();
    }
    this.add.image(W/2, H/2, key).setDepth(-30);

    // 떠다니는 시안 광원 (헤일메리호 작동 표시)
    const sun = this.add.image(W * 0.78, H * 0.28, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4).setAlpha(0.45).setTint(0x88aaff).setDepth(-26);
    this.tweens.add({
      targets: sun,
      alpha: { from: 0.35, to: 0.55 }, duration: 3500, yoyo: true, repeat: -1,
    });
  }

  drawHorizon() {
    const W = this.scale.width, H = this.scale.height;
    // 헤일메리호 선내 천장 (위 50~70% 지점에 갑판 라인)
    const ceilY = H * 0.5;
    const g = this.add.graphics().setDepth(-20);
    // 천장 어두운 띠
    g.fillStyle(0x0a1426, 0.95).fillRect(0, ceilY, W, 14);
    g.lineStyle(2, 0x4cc9f0, 0.5).lineBetween(0, ceilY + 14, W, ceilY + 14);
    // 우주선 창문들 (시안 글로우)
    const winY = ceilY + 22;
    for (let x = W * 0.05; x < W * 0.95; x += 90) {
      g.fillStyle(0x4cc9f0, 0.45).fillRect(x, winY, 30, 10);
      g.fillStyle(0xffffff, 0.7).fillRect(x + 1, winY + 1, 28, 1);
    }
    // 수직 갑판 지지대
    for (let x = W * 0.1; x < W; x += 200) {
      g.fillStyle(0x1a2540, 0.85).fillRect(x, ceilY, 6, H * 0.45);
      g.fillStyle(0x4cc9f0, 0.4).fillRect(x + 2, ceilY, 2, H * 0.45);
    }
  }

  drawGround() {
    const W = this.scale.width, H = this.scale.height;
    const groundY = H * 0.74;
    const g = this.add.graphics().setDepth(-15);
    // 갑판 베이스 (어두운 청흑)
    g.fillStyle(0x0a1426, 1).fillRect(0, groundY, W, H * 0.26);
    // 그리드 패턴 (시안 가로/세로 라인)
    g.lineStyle(1, 0x4cc9f0, 0.15);
    for (let x = 0; x < W; x += 32) {
      g.lineBetween(x, groundY, x, H);
    }
    for (let y = groundY; y < H; y += 24) {
      g.lineBetween(0, y, W, y);
    }
    // 갑판 위 가로 광원 (LED 스트립)
    g.fillStyle(0x4cc9f0, 0.65).fillRect(0, groundY - 1, W, 1.5);
  }

  // ---------- 우주선 내부 모듈 (좌/우 보급 + 정비 구역) ----------
  drawBuildings() {
    const W = this.scale.width, H = this.scale.height;
    const groundY = H * 0.74;
    // 왼쪽: 보급 모듈 (시안 광)
    this.drawModule(W * 0.12, groundY, 110, 110, 0x4cc9f0);
    this.drawModule(W * 0.30, groundY + 4, 75, 80, 0x4cc9f0);
    // 오른쪽: 정비 모듈 (오렌지 광)
    this.drawModule(W * 0.88, groundY, 110, 110, 0xff8c42);
    this.drawModule(W * 0.70, groundY + 4, 75, 80, 0xff8c42);
  }

  drawModule(cx, baseY, w, h, accentColor) {
    const top = baseY - h;
    const g = this.add.graphics().setDepth(-5);
    // 모듈 본체 (둥근 모서리 사각)
    g.fillStyle(0x142540, 1).fillRect(cx - w/2, top, w, h);
    g.fillStyle(0x1a2540, 1).fillRect(cx - w/2 + 2, top + 2, w - 4, h - 4);
    // 모듈 외곽
    g.lineStyle(1, accentColor, 0.8).strokeRect(cx - w/2, top, w, h);
    // 상단 라이트 스트립
    g.fillStyle(accentColor, 0.9).fillRect(cx - w/2 + 2, top + 2, w - 4, 1.5);
    // 표시창 (홀로그램 디스플레이)
    const winW = w * 0.55, winH = h * 0.22;
    const winY = top + h * 0.15;
    g.fillStyle(0x000000, 1).fillRect(cx - winW/2, winY, winW, winH);
    g.fillStyle(accentColor, 0.85).fillRect(cx - winW/2 + 1, winY + 1, winW - 2, winH - 2);
    // 표시창 위 텍스트 라인 (스캔라인)
    g.fillStyle(0x000000, 0.6);
    for (let y = winY + 2; y < winY + winH - 2; y += 2) {
      g.fillRect(cx - winW/2 + 2, y, winW - 4, 0.5);
    }
    // 액세스 패널 (가운데 어두운 라인)
    g.fillStyle(0x000000, 0.8).fillRect(cx - w * 0.18, top + h * 0.55, w * 0.36, h * 0.30);
    g.lineStyle(1, accentColor, 0.6).strokeRect(cx - w * 0.18, top + h * 0.55, w * 0.36, h * 0.30);
    // 패널 내 4분할 인디케이터
    g.fillStyle(accentColor, 0.7);
    g.fillRect(cx - w * 0.10, top + h * 0.62, 3, 3);
    g.fillRect(cx + w * 0.07, top + h * 0.62, 3, 3);
    g.fillRect(cx - w * 0.10, top + h * 0.74, 3, 3);
    g.fillRect(cx + w * 0.07, top + h * 0.74, 3, 3);
    // 모듈 외곽 코너 점 (4개)
    g.fillStyle(accentColor, 1);
    [[cx-w/2+3, top+3], [cx+w/2-3, top+3], [cx-w/2+3, top+h-3], [cx+w/2-3, top+h-3]].forEach(([x, y]) => {
      g.fillRect(x, y, 1.5, 1.5);
    });
    // 모듈 빛 (광원)
    this.add.image(cx, winY + winH/2, 'torch')
      .setScale(0.7).setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(accentColor).setDepth(-4);
  }

  // ---------- 중앙 — 명령 콘솔 (홀로그램) ----------
  drawAltar() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W/2, cy = H * 0.7;
    const g = this.add.graphics().setDepth(0);
    // 받침대 (어두운 패널)
    g.fillStyle(0x142540, 1).fillRect(cx - 30, cy + 12, 60, 8);
    g.fillStyle(0x0a1426, 1).fillRect(cx - 30, cy + 20, 60, 4);
    g.lineStyle(1, 0x4cc9f0, 0.6).strokeRect(cx - 30, cy + 12, 60, 8);
    // 콘솔 본체
    g.fillStyle(0x1a2540, 1).fillRect(cx - 22, cy - 12, 44, 24);
    g.lineStyle(1.5, 0x4cc9f0, 0.85).strokeRect(cx - 22, cy - 12, 44, 24);
    // 화면 (밝은 시안)
    g.fillStyle(0x000000, 1).fillRect(cx - 18, cy - 9, 36, 12);
    g.fillStyle(0x4cc9f0, 0.9).fillRect(cx - 17, cy - 8, 34, 10);
    // 데이터 라인 (검정 가로 줄)
    g.fillStyle(0x000000, 0.85);
    g.fillRect(cx - 16, cy - 6, 32, 0.8);
    g.fillRect(cx - 16, cy - 3, 24, 0.8);
    g.fillRect(cx - 16, cy,    28, 0.8);
    // 버튼 (4개)
    g.fillStyle(0xff8c42, 1).fillCircle(cx - 14, cy + 7, 1.5);
    g.fillStyle(0xffd76b, 1).fillCircle(cx - 6, cy + 7, 1.5);
    g.fillStyle(0x4cc9f0, 1).fillCircle(cx + 2, cy + 7, 1.5);
    g.fillStyle(0x88dd55, 1).fillCircle(cx + 10, cy + 7, 1.5);

    // 홀로그램 빔 (위로 뻗는 시안)
    const beam = this.add.image(cx, cy - 26, 'torch')
      .setScale(1.0).setAlpha(0.65)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x4cc9f0).setDepth(1);
    this.tweens.add({
      targets: beam,
      alpha: { from: 0.5, to: 0.85 },
      scale: { from: 0.9, to: 1.15 },
      duration: 1200, yoyo: true, repeat: -1,
    });
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
    // 페이드 체인 제거 — Loading 씬이 자체 페이드 처리
    this.scene.start('Loading', {
      target: 'Dungeon', mode: 'enter',
      data: { uid: this.uid, player: this.player, dungeonMode: 'boss', bossId },
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
    this.add.text(cx, cy + 50, '🚀 EVA 출격', {
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
      // 메탈 기둥
      g.fillStyle(0x1a2540, 1).fillRect(x - 2, groundY - 65, 4, 65);
      g.lineStyle(1, 0x4cc9f0, 0.5).strokeRect(x - 2, groundY - 65, 4, 65);
      // 상단 LED 헤드
      g.fillStyle(0x142540, 1).fillRect(x - 6, groundY - 72, 12, 7);
      g.fillStyle(0x4cc9f0, 0.95).fillRect(x - 5, groundY - 71, 10, 5);
      g.fillStyle(0xffffff, 0.85).fillRect(x - 4, groundY - 70, 8, 1);
      // 광원
      const lamp = this.add.image(x, groundY - 70, 'torch')
        .setScale(1.5).setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0x4cc9f0);
      this.tweens.add({
        targets: lamp,
        alpha: { from: 0.7, to: 1.0 },
        scale: { from: 1.4, to: 1.6 },
        duration: 1200 + Math.random() * 600,
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
    this.spawnNpc(W * 0.22, H * 0.62, 'merchant',   'npc-merchant',   '보급관 헬가-7',   '#88ddff');
    this.spawnNpc(W * 0.78, H * 0.62, 'blacksmith', 'npc-blacksmith', '정비 군나르-X',   '#ff8855');
    // 오답 복습 NPC — 가운데 살짝 위
    this.spawnReviewNpc(W * 0.50, H * 0.55);
    // 미션 보드 + 트로피 + 스킬 마스터
    this.spawnMissionBoard(W * 0.35, H * 0.62);
    this.spawnTrophyBoard(W * 0.50, H * 0.45);
    this.spawnSkillMaster(W * 0.65, H * 0.62);
  }

  spawnSkillMaster(x, y) {
    const glow = this.add.image(x, y, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1).setAlpha(0.55).setTint(0xa3dfff).setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.4, to: 0.7 }, duration: 1200, yoyo: true, repeat: -1,
    });
    const sprite = this.add.text(x, y, '🧝', { fontSize: '44px' })
      .setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: sprite, y: y - 4,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.add.text(x, y + 36, '시뮬레이터 넥서스', {
      fontSize: '13px', color: '#a3dfff',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(6);
    const sp = getAvailablePoints(this.player);
    this.add.text(x, y + 52, `🌟 SP ${sp}`, {
      fontSize: '11px', color: sp > 0 ? '#ffd700' : '#888',
    }).setOrigin(0.5).setDepth(6);
    sprite.on('pointerover', () => sprite.setScale(1.1));
    sprite.on('pointerout',  () => sprite.setScale(1.0));
    sprite.on('pointerdown', () => this.openSkillModal());
  }

  openSkillModal() {
    audio.click();
    const cls = this.player.class || 'warrior';
    const list = SKILLS[cls] || [];
    const modal = document.getElementById('skill-modal');
    const grid = document.getElementById('skill-grid');
    grid.innerHTML = '';
    list.forEach(sk => {
      const rank = getRank(this.player, sk.id);
      const max = sk.maxRank;
      const sp = getAvailablePoints(this.player);
      const canUp = rank < max && sp >= 1;
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = `
        <div class="skill-icon">${sk.icon}</div>
        <div class="skill-name">${sk.name}</div>
        <div class="skill-desc">${sk.desc}</div>
        <div class="skill-rank">${'★'.repeat(rank)}${'☆'.repeat(max - rank)}</div>
        <button class="skill-up" ${canUp ? '' : 'disabled'}>
          ${rank >= max ? '최대' : '⬆ 강화 (1 SP)'}
        </button>
      `;
      const btn = card.querySelector('.skill-up');
      if (canUp) {
        btn.addEventListener('click', () => {
          const r = upgradeSkill(this.player, cls, sk.id);
          if (r.ok) {
            audio.levelUp();
            saveProgress(this.uid, this.player);
            this.openSkillModal();
          }
        });
      }
      grid.appendChild(card);
    });
    document.getElementById('skill-sp').textContent = getAvailablePoints(this.player);
    modal.classList.add('show');
    if (!modal._wired) {
      modal._wired = true;
      document.getElementById('skill-close').addEventListener('click', () => modal.classList.remove('show'));
    }
  }

  spawnMissionBoard(x, y) {
    const glow = this.add.image(x, y, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.9).setAlpha(0.5).setTint(0xffd700).setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.35, to: 0.65 }, duration: 1100, yoyo: true, repeat: -1,
    });
    const sprite = this.add.text(x, y, '📋', { fontSize: '42px' })
      .setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: sprite, y: y - 3,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.add.text(x, y + 32, '일일 미션', {
      fontSize: '12px', color: '#ffd700',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(6);
    sprite.on('pointerover', () => sprite.setScale(1.1));
    sprite.on('pointerout',  () => sprite.setScale(1.0));
    sprite.on('pointerdown', () => this.openMissionModal());
  }

  spawnTrophyBoard(x, y) {
    const nick = currentUser()?.nickname || 'guest';
    const count = listUnlocked(nick).length;
    const glow = this.add.image(x, y, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.9).setAlpha(0.5).setTint(0xffaa33).setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.35, to: 0.65 }, duration: 1300, yoyo: true, repeat: -1,
    });
    const sprite = this.add.text(x, y, '🏆', { fontSize: '42px' })
      .setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    this.add.text(x, y + 32, `트로피 ${count}/${ACHIEVEMENTS.length}`, {
      fontSize: '12px', color: '#ffaa33',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(6);
    sprite.on('pointerover', () => sprite.setScale(1.1));
    sprite.on('pointerout',  () => sprite.setScale(1.0));
    sprite.on('pointerdown', () => this.openTrophyModal());
  }

  openMissionModal() {
    audio.click();
    const nick = currentUser()?.nickname || 'guest';
    const data = getTodaysMissions(nick);
    const modal = document.getElementById('mission-modal');
    const list = document.getElementById('mission-list');
    list.innerHTML = '';
    data.missions.forEach(m => {
      const row = document.createElement('div');
      row.className = 'mission-row ' + (m.claimed ? 'claimed' : '');
      const pct = Math.min(100, (m.progress / m.target) * 100);
      const done = m.progress >= m.target;
      row.innerHTML = `
        <div class="mission-info">
          <div class="mission-name">${m.name}</div>
          <div class="mission-bar"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
          <div class="mission-progress">${m.progress} / ${m.target}</div>
        </div>
        <div class="mission-reward">💰 ${m.reward}G</div>
        <button class="mission-claim" ${(!done || m.claimed) ? 'disabled' : ''}>
          ${m.claimed ? '✓ 완료' : (done ? '받기' : '진행중')}
        </button>
      `;
      const btn = row.querySelector('.mission-claim');
      if (done && !m.claimed) {
        btn.addEventListener('click', () => {
          const claimed = claimMission(nick, m.id);
          if (claimed) {
            this.player.gold = (this.player.gold || 0) + claimed.reward;
            audio.coin();
            saveProgress(this.uid, this.player);
            this.refreshHud();
            checkAchievements(this.player, nick);
            this.openMissionModal();
          }
        });
      }
      list.appendChild(row);
    });
    modal.classList.add('show');
    if (!modal._wired) {
      modal._wired = true;
      document.getElementById('mission-close').addEventListener('click', () => modal.classList.remove('show'));
    }
  }

  openTrophyModal() {
    audio.click();
    const nick = currentUser()?.nickname || 'guest';
    const unlocked = listUnlocked(nick);
    const modal = document.getElementById('trophy-modal');
    const grid = document.getElementById('trophy-grid');
    grid.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const got = unlocked.includes(a.id);
      const cell = document.createElement('div');
      cell.className = 'trophy-cell ' + (got ? 'unlocked' : 'locked');
      cell.innerHTML = `
        <div class="trophy-icon">${got ? a.icon : '🔒'}</div>
        <div class="trophy-name">${got ? a.name : '???'}</div>
        <div class="trophy-desc">${a.desc}</div>
      `;
      grid.appendChild(cell);
    });
    document.getElementById('trophy-count').textContent = `${unlocked.length} / ${ACHIEVEMENTS.length}`;
    modal.classList.add('show');
    if (!modal._wired) {
      modal._wired = true;
      document.getElementById('trophy-close').addEventListener('click', () => modal.classList.remove('show'));
    }
  }

  // 오답 복습 NPC (현자 — 클릭 시 오답 모달)
  spawnReviewNpc(x, y) {
    const nickname = currentUser()?.nickname || 'guest';
    const wrongCount = listWrong(nickname).length;
    if (wrongCount === 0) return; // 오답 없으면 표시 안 함

    const glow = this.add.image(x, y, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.2).setAlpha(0.6).setTint(0xddaa88).setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.4, to: 0.7 }, duration: 1100, yoyo: true, repeat: -1,
    });
    const sprite = this.add.text(x, y, '🧙‍♂️', { fontSize: '46px' })
      .setOrigin(0.5).setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: sprite, y: y - 4,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.add.text(x, y + 38, '분석 AI 메를린', {
      fontSize: '13px', color: '#ddaa88',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5).setDepth(6);
    this.add.text(x, y + 55, `📊 오답 데이터 (${wrongCount})`, {
      fontSize: '11px', color: '#d4af37',
    }).setOrigin(0.5).setDepth(6);

    sprite.on('pointerover', () => sprite.setScale(1.1));
    sprite.on('pointerout',  () => sprite.setScale(1.0));
    sprite.on('pointerdown', () => this.openReviewModal());
  }

  openReviewModal() {
    audio.click();
    const modal = document.getElementById('review-modal');
    this.renderReviewList();
    modal.classList.add('show');
    this._reviewOpen = true;
    if (!modal._wired) {
      modal._wired = true;
      document.getElementById('review-close').addEventListener('click', () => {
        modal.classList.remove('show');
        this._reviewOpen = false;
      });
    }
  }

  renderReviewList() {
    const nickname = currentUser()?.nickname || 'guest';
    const list = document.getElementById('review-list');
    const wrong = listWrong(nickname);
    list.innerHTML = '';
    if (wrong.length === 0) {
      list.innerHTML = '<div class="review-empty">🎉 오답이 없습니다!</div>';
      return;
    }
    wrong.slice().reverse().forEach(entry => {
      const row = document.createElement('div');
      row.className = 'review-row';
      row.innerHTML = `
        <div class="review-problem">
          ${fractionSVG(entry.a.n, entry.a.d, { color: '#4cc9f0', size: 32 })}
          <span class="frac"><span class="num">${entry.a.n}</span><span class="den">${entry.a.d}</span></span>
          <span class="op">${entry.op}</span>
          ${fractionSVG(entry.b.n, entry.b.d, { color: '#ff77bb', size: 32 })}
          <span class="frac"><span class="num">${entry.b.n}</span><span class="den">${entry.b.d}</span></span>
          <span class="op">=</span>
          <span class="frac frac-sm"><span class="num">${entry.answer.n}</span><span class="den">${entry.answer.d}</span></span>
        </div>
        <button class="review-clear">✓ 이해함</button>
      `;
      row.querySelector('.review-clear').addEventListener('click', () => {
        clearWrongOne(nickname, entry.key);
        audio.coin();
        this.renderReviewList();
      });
      list.appendChild(row);
    });
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

    this.add.text(x, y + 78, shopKey === 'merchant' ? '🧪 보급품 지급' : '🔧 장비 정비', {
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
    this.add.text(W/2, H * 0.07, '🚀 헤일메리호', {
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
    const btn = this.add.text(W/2, H * 0.88, '🚀  EVA 출격 (Enter)', {
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
    this.scene.start('Loading', {
      target: 'Dungeon', mode: 'enter',
      data: { uid: this.uid, player: this.player, dungeonMode: 'normal' },
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
    const owned =
      (item.type === 'weapon' && ownsWeapon(this.player, itemId)) ||
      (item.type === 'helmet' && ownsHelmet(this.player, itemId));
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
    // 미션 추적
    const nick = currentUser()?.nickname || 'guest';
    const { trackEvent } = await import('../../missions.js');
    trackEvent(nick, 'spent', item.price);
    if (item.type === 'potion') {
      addPotion(this.player, itemId);
    } else if (item.type === 'weapon') {
      this.player.weapons = this.player.weapons || ['sword_basic'];
      if (!this.player.weapons.includes(itemId)) this.player.weapons.push(itemId);
      this.player.equippedWeapon = itemId;
    } else if (item.type === 'helmet') {
      this.player.helmets = this.player.helmets || [];
      if (!this.player.helmets.includes(itemId)) this.player.helmets.push(itemId);
      this.player.equippedHelmet = itemId;
      // 헬멧 hpBonus를 maxHp에 반영
      const prevBonus = (this.player._helmetBonus || 0);
      const newBonus = item.hpBonus || 0;
      this.player.maxHp = (this.player.maxHp || 5) - prevBonus + newBonus;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + (newBonus - prevBonus));
      this.player._helmetBonus = newBonus;
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

// ============================================================
// BootScene — 헤일메리 SF 비주얼 (절차 생성, 외부 에셋 0)
// 디자인 언어: Godot 인디 SF 스타일
//   - 깔끔한 기하학 (원, 직사각형)
//   - 네온 글로우 외곽선
//   - 어두운 베이스 + 시안/오렌지/녹 강조
// ============================================================
import { CLASSES } from '../../classes.js';
import { getUser, loadProgress } from '../../firebase-config.js';
import { currentUser } from '../../auth.js';
import { hasSeenStory } from '../../story.js';

const pts = (...coords) => {
  const out = [];
  for (let i = 0; i < coords.length; i += 2) out.push({ x: coords[i], y: coords[i+1] });
  return out;
};

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    this.makeFloorTile();
    this.makeWallTile();
    this.makeTorchLight();   // 'torch' 키 유지 (호환성, 시안 글로우로 변경)
    this.makeMoveMarker();

    // 플레이어 (3직업 × 5단계)
    Object.values(CLASSES).forEach(cls => {
      for (let tier = 1; tier <= 5; tier++) {
        this.makeAstronaut(cls, tier);
      }
    });

    // 아스트로파지 변종 (6종)
    this.makeDroneSentry();    // m-skeleton
    this.makeMicrobe();         // m-zombie
    this.makeMiniAstrophage();  // m-imp
    this.makeEnergyResidue();   // m-wraith
    this.makeMeteorGolem();     // m-golem
    this.makeAstroMutant();     // m-dragon

    // NPC: AI 단말기
    this.makeMerchantAI();      // npc-merchant
    this.makeBlacksmithAI();    // npc-blacksmith

    // 라우팅
    try {
      await new Promise(r => setTimeout(r, 60));
      if (!currentUser()) { this.scene.start('Login'); return; }
      const user = await getUser();
      const player = await loadProgress(user.uid);
      if (!hasSeenStory(user.nickname, 'prologue')) {
        const next = player.class ? 'Loading' : 'ClassSelect';
        const nextData = player.class
          ? { target: 'Town', mode: 'return', data: { uid: user.uid, player } }
          : { uid: user.uid, player };
        this.scene.start('Opening', { next, nextData });
        return;
      }
      if (!player.class) {
        this.scene.start('ClassSelect', { uid: user.uid, player });
      } else {
        this.scene.start('Loading', {
          target: 'Town', mode: 'return',
          data: { uid: user.uid, player },
        });
      }
    } catch (err) {
      console.error('[BootScene routing] failed:', err);
      this.scene.start('Login');
    }
  }

  // ============================================================
  // 환경 — SF 패널 타일
  // ============================================================
  makeFloorTile() {
    const g = this.add.graphics();
    const S = 40;
    // 어두운 청흑 베이스
    g.fillStyle(0x0a1426, 1).fillRect(0, 0, S, S);
    // 미세한 그리드
    g.lineStyle(1, 0x1a2540, 0.6);
    g.lineBetween(0, S/2, S, S/2);
    g.lineBetween(S/2, 0, S/2, S);
    // 모서리 마커 (시안 점)
    g.fillStyle(0x4cc9f0, 0.3).fillRect(1, 1, 1, 1);
    g.fillStyle(0x4cc9f0, 0.3).fillRect(S-2, S-2, 1, 1);
    // 외곽 어둠
    g.lineStyle(1, 0x000000, 0.5).strokeRect(0, 0, S, S);
    g.generateTexture('floor', S, S);
    g.destroy();
  }

  makeWallTile() {
    const g = this.add.graphics();
    const S = 40;
    // 패널 베이스
    g.fillStyle(0x1a2540, 1).fillRect(0, 0, S, S);
    g.fillStyle(0x142540, 1).fillRect(0, S * 0.55, S, S * 0.45);
    // 상단 시안 광 (LED 스트립)
    g.fillStyle(0x4cc9f0, 0.7).fillRect(2, 2, S - 4, 1);
    // 패널 분할선
    g.lineStyle(1, 0x000000, 0.8);
    g.lineBetween(0, S/2, S, S/2);
    // 통풍구 라인 (4줄)
    g.lineStyle(1, 0x0a1426, 1);
    for (let i = 0; i < 4; i++) {
      const x = S * 0.2 + i * 4;
      g.lineBetween(x, S * 0.65, x, S * 0.95);
    }
    g.lineStyle(1, 0x3a5870, 0.6).strokeRect(0, 0, S, S);
    g.generateTexture('wall', S, S);
    g.destroy();
  }

  // 시안 글로우 (기존 'torch' 키 재사용)
  makeTorchLight() {
    const size = 320;
    const canvas = this.textures.createCanvas('torch', size, size);
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size/2, size/2, 8, size/2, size/2, size/2);
    grad.addColorStop(0,   'rgba(76, 201, 240, 0.55)');
    grad.addColorStop(0.4, 'rgba(76, 201, 240, 0.25)');
    grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  makeMoveMarker() {
    const g = this.add.graphics();
    const S = 40;
    g.lineStyle(2, 0x4cc9f0, 0.9).strokeRect(4, 4, S - 8, S - 8);
    g.lineStyle(1, 0x4cc9f0, 0.5).strokeRect(8, 8, S - 16, S - 16);
    g.generateTexture('marker', S, S);
    g.destroy();
  }

  // ============================================================
  // 우주비행사 — 헬멧 + 우주복
  // ============================================================
  makeAstronaut(cls, tier) {
    const W = 40, H = 56;
    const cx = W/2;
    const g = this.add.graphics();

    // 발광 (베이스)
    g.fillStyle(cls.glowColor, 0.15).fillCircle(cx, H - 4, 14);

    // 그림자 발 (어두운 타원)
    g.fillStyle(0x000000, 0.4).fillEllipse(cx, H - 2, 16, 4);

    // 우주복 본체 (사다리꼴, 위는 좁고 아래는 약간 넓음)
    const body = pts(
      cx - 9, 22,
      cx + 9, 22,
      cx + 11, H - 5,
      cx - 11, H - 5,
    );
    // 어두운 베이스
    g.fillStyle(0x0a1426, 1).fillPoints(body, true);
    // 직업색 본체
    g.fillStyle(cls.color, 1).fillPoints(body, true);
    // 가운데 어두운 세로 라인 (지퍼)
    g.fillStyle(0x000000, 0.5).fillRect(cx - 1, 24, 2, H - 32);

    // 라이프 서포트 디스플레이 (가슴) — 발광 사각형
    g.fillStyle(0x000000, 1).fillRect(cx - 6, 28, 12, 5);
    g.fillStyle(cls.glowColor, 0.95).fillRect(cx - 5, 29, 10, 3);
    g.fillStyle(0xffffff, 0.7).fillRect(cx - 5, 29, 3, 1);

    // 어깨 (둥근 두 원)
    g.fillStyle(cls.color, 1);
    g.fillCircle(cx - 10, 24, 4);
    g.fillCircle(cx + 10, 24, 4);
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(cx - 10, 25, 3.5);
    g.fillCircle(cx + 10, 25, 3.5);

    // Tier 2+: 견갑 강화 (시안 발광 라인)
    if (tier >= 2) {
      g.fillStyle(cls.glowColor, 0.85);
      g.fillRect(cx - 13, 23, 3, 1.5);
      g.fillRect(cx + 10, 23, 3, 1.5);
    }

    // 헬멧 (둥근 구체)
    g.fillStyle(0x152030, 1).fillCircle(cx, 14, 11);          // 헬멧 베이스
    g.fillStyle(cls.color, 0.6).fillCircle(cx, 14, 11);       // 직업색 오버레이
    // 헬멧 외곽 (시안)
    g.lineStyle(1.5, cls.glowColor, 0.9).strokeCircle(cx, 14, 11);

    // 바이저 (앞면 어두운 곡면)
    g.fillStyle(0x000000, 0.9);
    g.fillEllipse(cx, 14, 16, 9);

    // 바이저 발광 (눈처럼 보이는 가로 슬릿)
    g.fillStyle(cls.glowColor, 1);
    g.fillRect(cx - 5, 13, 10, 1.5);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(cx - 4, 13, 8, 0.8);

    // 바이저 반사광 (오른쪽 위 흰 반점)
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(cx + 4, 11, 4, 2);

    // Tier 3+: 헬멧 안테나/장식
    if (tier >= 3) {
      if (cls.id === 'mage') {
        // 과학자: 스캐너 안테나 (위쪽 막대)
        g.fillStyle(0xcccccc, 1).fillRect(cx - 0.5, 0, 1, 5);
        g.fillStyle(cls.glowColor, 1).fillCircle(cx, 0, 1.5);
      } else if (cls.id === 'warrior') {
        // 엔지니어: 보호용 보강대 (두 개 가로뿔)
        g.fillStyle(0xcccccc, 1);
        g.fillRect(cx - 11, 5, 3, 1.5);
        g.fillRect(cx + 8, 5, 3, 1.5);
      } else if (cls.id === 'rogue') {
        // 생물학자: 표본 채취기 (헬멧 위 작은 캔)
        g.fillStyle(0x222233, 1).fillRect(cx - 2, 2, 4, 4);
        g.fillStyle(cls.glowColor, 0.9).fillRect(cx - 1.5, 3, 3, 1);
      }
    }

    // 손에 든 도구 (직업별)
    this.drawTool(g, cls, cx, tier);

    // Tier 4+: 백팩 (산소통 등 뒷쪽 라인)
    if (tier >= 4) {
      g.fillStyle(0x152030, 1).fillRect(cx - 4, 30, 8, 14);
      g.fillStyle(cls.color, 0.6).fillRect(cx - 4, 30, 8, 14);
      g.fillStyle(cls.glowColor, 0.95).fillRect(cx - 3, 32, 6, 1);
      g.fillStyle(cls.glowColor, 0.95).fillRect(cx - 3, 35, 6, 1);
    }

    // Tier 5+: 마법 오라 (방사형 빛 링)
    if (tier >= 5) {
      g.lineStyle(1.5, cls.glowColor, 0.6).strokeCircle(cx, H/2, 20);
      g.lineStyle(1, cls.glowColor, 0.3).strokeCircle(cx, H/2, 24);
    }

    g.generateTexture(`player-${cls.id}-${tier}`, W, H);
    g.destroy();
  }

  drawTool(g, cls, cx, tier) {
    if (cls.id === 'warrior') {
      // 엔지니어: 다목적 도구 (오른쪽에 든 스패너 같은 도구)
      const x = cx + 14;
      g.fillStyle(0xcccccc, 1).fillRect(x - 1, 30, 2, 18);
      g.fillStyle(cls.glowColor, 0.9).fillRect(x - 2, 28, 4, 3);
      if (tier >= 3) {
        g.fillStyle(cls.glowColor, 0.6).fillRect(x - 3, 29, 1, 1);
        g.fillStyle(cls.glowColor, 0.6).fillRect(x + 2, 29, 1, 1);
      }
    } else if (cls.id === 'mage') {
      // 과학자: 스캐너 패드 (왼쪽 작은 사각형)
      const x = cx - 13;
      g.fillStyle(0x222233, 1).fillRect(x - 3, 32, 5, 8);
      g.fillStyle(cls.glowColor, 0.9).fillRect(x - 2, 33, 3, 1);
      g.fillStyle(cls.glowColor, 0.9).fillRect(x - 2, 35, 3, 1);
      if (tier >= 3) {
        g.fillStyle(cls.glowColor, 0.6).strokeCircle(x, 32, 3);
      }
    } else if (cls.id === 'rogue') {
      // 생물학자: 시료 바이알 (양쪽 작은 캔)
      g.fillStyle(0x222233, 1);
      g.fillRect(cx - 16, 32, 3, 6);
      g.fillRect(cx + 13, 32, 3, 6);
      g.fillStyle(cls.glowColor, 0.9);
      g.fillRect(cx - 15.5, 34, 2, 2);
      g.fillRect(cx + 13.5, 34, 2, 2);
    }
  }

  // ============================================================
  // 아스트로파지 변종 6종
  // ============================================================

  // 드론 보초 — 작고 각진 비행체
  makeDroneSentry() {
    const W = 36, H = 36;
    const cx = W/2, cy = H/2;
    const g = this.add.graphics();
    g.fillStyle(0xff8c42, 0.25).fillCircle(cx, cy + 8, 10);
    // 본체 (육각형 비슷)
    g.fillStyle(0x2a3540, 1);
    g.fillPoints(pts(cx, 8, cx + 10, 14, cx + 10, 22, cx, 28, cx - 10, 22, cx - 10, 14), true);
    // 패널 라인
    g.fillStyle(0x4cc9f0, 0.5).fillRect(cx - 8, 17, 16, 2);
    // 카메라 (가운데 큰 점)
    g.fillStyle(0x000000, 1).fillCircle(cx, 18, 3.5);
    g.fillStyle(0xff4466, 1).fillCircle(cx, 18, 2);
    g.fillStyle(0xffffff, 0.7).fillCircle(cx - 0.5, 17, 0.6);
    // 안테나
    g.fillStyle(0xcccccc, 1).fillRect(cx - 0.5, 4, 1, 4);
    g.fillStyle(0xff4466, 1).fillCircle(cx, 4, 1.2);
    g.generateTexture('m-skeleton', W, H);
    g.destroy();
  }

  // 변종 미생물 — 녹색 유기체
  makeMicrobe() {
    const W = 36, H = 36;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0x88dd55, 0.25).fillCircle(cx, 24, 12);
    // 본체 (둥근 블럽)
    g.fillStyle(0x2a4a2a, 1).fillCircle(cx, 20, 12);
    g.fillStyle(0x5a8a3a, 1).fillCircle(cx, 20, 11);
    // 내부 핵
    g.fillStyle(0x88dd55, 0.95).fillCircle(cx - 2, 18, 4);
    g.fillStyle(0xeeffcc, 0.9).fillCircle(cx - 2, 18, 1.8);
    // 섬모 (8방향)
    g.lineStyle(1.5, 0x5a8a3a, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * 11;
      const y1 = 20 + Math.sin(a) * 11;
      const x2 = cx + Math.cos(a) * 15;
      const y2 = 20 + Math.sin(a) * 15;
      g.lineBetween(x1, y1, x2, y2);
    }
    g.generateTexture('m-zombie', W, H);
    g.destroy();
  }

  // 미니 아스트로파지 — 작은 빛나는 구
  makeMiniAstrophage() {
    const W = 32, H = 32;
    const cx = W/2, cy = H/2;
    const g = this.add.graphics();
    g.fillStyle(0xff4422, 0.4).fillCircle(cx, cy + 2, 14);
    // 검은 구
    g.fillStyle(0x080404, 1).fillCircle(cx, cy, 11);
    // 균열 (붉은 빛)
    g.lineStyle(1.5, 0xff2200, 0.95);
    g.lineBetween(cx - 6, cy - 4, cx + 4, cy + 6);
    g.lineBetween(cx - 4, cy + 5, cx + 6, cy - 3);
    g.lineBetween(cx, cy - 8, cx + 3, cy);
    // 내부 핵 (밝은 빨강)
    g.fillStyle(0xff4422, 1).fillCircle(cx + 1, cy - 1, 3);
    g.fillStyle(0xffaa44, 0.9).fillCircle(cx + 1, cy - 1, 1.2);
    // 외곽선
    g.lineStyle(1, 0x2a0a0a, 1).strokeCircle(cx, cy, 11);
    g.generateTexture('m-imp', W, H);
    g.destroy();
  }

  // 에너지 잔재 — 떠다니는 청색 형체
  makeEnergyResidue() {
    const W = 36, H = 40;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xa3c4f3, 0.3).fillCircle(cx, 28, 14);
    // 떠다니는 코어
    g.fillStyle(0x2a4a7a, 0.7).fillCircle(cx, 16, 10);
    g.fillStyle(0x4cc9f0, 0.85).fillCircle(cx, 16, 8);
    g.fillStyle(0xffffff, 0.5).fillCircle(cx - 1, 14, 3);
    // 에너지 잔물결 (아래쪽 파티클)
    g.fillStyle(0x4cc9f0, 0.7);
    g.fillCircle(cx - 6, 28, 1.5);
    g.fillCircle(cx + 3, 30, 1.8);
    g.fillCircle(cx - 2, 34, 1.2);
    g.fillCircle(cx + 7, 33, 1.5);
    // 외곽 흐름선
    g.lineStyle(1, 0x88ddff, 0.4);
    g.strokeCircle(cx, 16, 12);
    g.generateTexture('m-wraith', W, H);
    g.destroy();
  }

  // 운석 골렘 — 거대 사각 운석
  makeMeteorGolem() {
    const W = 42, H = 50;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff8c42, 0.25).fillCircle(cx, H - 4, 16);
    // 몸통 (불규칙 다각형)
    g.fillStyle(0x3a2a20, 1);
    g.fillPoints(pts(
      cx - 14, 18,
      cx + 14, 16,
      cx + 16, H - 8,
      cx + 8, H - 4,
      cx - 8, H - 4,
      cx - 16, H - 8,
    ), true);
    // 표면 오버레이
    g.fillStyle(0x5a4030, 0.8);
    g.fillPoints(pts(
      cx - 14, 18,
      cx + 14, 16,
      cx + 16, H - 8,
      cx + 8, H - 4,
      cx - 8, H - 4,
      cx - 16, H - 8,
    ), true);
    // 균열 + 마그마 빛
    g.lineStyle(1.5, 0xff5522, 0.95);
    g.lineBetween(cx - 6, 24, cx + 4, 30);
    g.lineBetween(cx + 4, 30, cx - 2, 38);
    g.lineBetween(cx - 8, 32, cx, 36);
    // 빛나는 핵 (균열 중심)
    g.fillStyle(0xff8c42, 0.95).fillCircle(cx + 4, 30, 2.2);
    g.fillStyle(0xffd76b, 0.9).fillCircle(cx + 4, 30, 1);
    // 머리 (작은 사각)
    g.fillStyle(0x5a4030, 1).fillRect(cx - 6, 8, 12, 10);
    g.fillStyle(0xff4422, 1).fillCircle(cx - 3, 13, 1.5);
    g.fillStyle(0xff4422, 1).fillCircle(cx + 3, 13, 1.5);
    g.generateTexture('m-golem', W, H);
    g.destroy();
  }

  // 아스트로 변이체 — 촉수 달린 우주생명체
  makeAstroMutant() {
    const W = 50, H = 48;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff4422, 0.35).fillCircle(cx, H - 4, 18);
    // 본체 (큰 구)
    g.fillStyle(0x2a0a0a, 1).fillCircle(cx, 24, 14);
    g.fillStyle(0xa31621, 1).fillCircle(cx, 24, 13);
    // 촉수 (4방향 휘어진 라인)
    g.lineStyle(3, 0x4a0a08, 1);
    [-1.2, -0.4, 0.4, 1.2].forEach(angOffset => {
      const a = Math.PI / 2 + angOffset;
      const startX = cx + Math.cos(a) * 12;
      const startY = 24 + Math.sin(a) * 12;
      const midX   = cx + Math.cos(a) * 18;
      const midY   = 24 + Math.sin(a) * 18;
      const endX   = cx + Math.cos(a + 0.5) * 22;
      const endY   = 24 + Math.sin(a + 0.5) * 22;
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(midX, midY);
      g.lineTo(endX, endY);
      g.strokePath();
    });
    // 중앙 빛나는 눈
    g.fillStyle(0x000000, 1).fillCircle(cx, 22, 5);
    g.fillStyle(0xff8c42, 1).fillCircle(cx, 22, 3.5);
    g.fillStyle(0xffd76b, 0.95).fillCircle(cx - 0.5, 21, 1.5);
    g.fillStyle(0xffffff, 0.85).fillCircle(cx - 1, 20.5, 0.6);
    // 외곽 발광
    g.lineStyle(1, 0xff4422, 0.7).strokeCircle(cx, 24, 14);
    g.generateTexture('m-dragon', W, H);
    g.destroy();
  }

  // ============================================================
  // NPC — AI 단말기 (콘솔 + 홀로그램)
  // ============================================================
  makeMerchantAI() {
    const W = 44, H = 60;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0x4cc9f0, 0.2).fillCircle(cx, H - 4, 16);
    // 본체 콘솔 (둥근 모서리 사각)
    g.fillStyle(0x1a2540, 1).fillRect(cx - 14, 20, 28, H - 24);
    g.fillStyle(0x2a3550, 1).fillRect(cx - 13, 21, 26, H - 26);
    // 화면 (시안)
    g.fillStyle(0x0a1426, 1).fillRect(cx - 11, 24, 22, 14);
    g.fillStyle(0x4cc9f0, 0.9).fillRect(cx - 10, 25, 20, 12);
    g.fillStyle(0x000000, 1).fillRect(cx - 9, 27, 18, 1);
    g.fillStyle(0x000000, 1).fillRect(cx - 9, 30, 12, 1);
    g.fillStyle(0x000000, 1).fillRect(cx - 9, 33, 16, 1);
    // 보급 슬롯
    g.fillStyle(0x000000, 1).fillRect(cx - 8, 42, 16, 5);
    g.fillStyle(0xffd76b, 0.85).fillRect(cx - 7, 43, 14, 3);
    // 받침대
    g.fillStyle(0x152030, 1).fillRect(cx - 16, H - 6, 32, 4);
    g.fillStyle(0x4cc9f0, 0.5).fillRect(cx - 15, H - 5, 30, 1);
    // 위쪽 안테나
    g.fillStyle(0xcccccc, 1).fillRect(cx - 0.5, 16, 1, 4);
    g.fillStyle(0x4cc9f0, 1).fillCircle(cx, 16, 1.5);
    g.generateTexture('npc-merchant', W, H);
    g.destroy();
  }

  makeBlacksmithAI() {
    const W = 46, H = 60;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff8c42, 0.25).fillCircle(cx, H - 4, 16);
    // 본체
    g.fillStyle(0x2a1810, 1).fillRect(cx - 15, 20, 30, H - 24);
    g.fillStyle(0x3a2818, 1).fillRect(cx - 14, 21, 28, H - 26);
    // 정비 디스플레이 (오렌지)
    g.fillStyle(0x000000, 1).fillRect(cx - 12, 24, 24, 14);
    g.fillStyle(0xff8c42, 0.9).fillRect(cx - 11, 25, 22, 12);
    // 무기 진행 바
    g.fillStyle(0x000000, 1).fillRect(cx - 10, 28, 20, 2);
    g.fillStyle(0xffd76b, 0.95).fillRect(cx - 10, 28, 14, 2);
    // 정비 도구 슬롯
    g.fillStyle(0x000000, 1).fillRect(cx - 11, 33, 22, 3);
    // 측면 광원 (양쪽)
    g.fillStyle(0xff8c42, 0.95).fillRect(cx - 15, 28, 1, 6);
    g.fillStyle(0xff8c42, 0.95).fillRect(cx + 14, 28, 1, 6);
    // 도구 슬롯 (아래쪽)
    g.fillStyle(0x000000, 1).fillRect(cx - 10, 42, 20, 7);
    g.fillStyle(0xcccccc, 0.85);
    g.fillRect(cx - 8, 44, 4, 3);
    g.fillRect(cx - 2, 44, 4, 3);
    g.fillRect(cx + 4, 44, 4, 3);
    // 받침대
    g.fillStyle(0x1a0e08, 1).fillRect(cx - 17, H - 6, 34, 4);
    g.fillStyle(0xff8c42, 0.5).fillRect(cx - 16, H - 5, 32, 1);
    // 위 안테나
    g.fillStyle(0xcccccc, 1).fillRect(cx - 0.5, 16, 1, 4);
    g.fillStyle(0xff4422, 1).fillCircle(cx, 16, 1.5);
    g.generateTexture('npc-blacksmith', W, H);
    g.destroy();
  }
}

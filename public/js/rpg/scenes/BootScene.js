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
  // 우주비행사 — 큰 헬멧 + 흰 우주복 + 백팩 (NASA 스타일)
  // ============================================================
  makeAstronaut(cls, tier) {
    const W = 48, H = 64;
    const cx = W/2;
    const g = this.add.graphics();

    // 1. 발광 (베이스)
    g.fillStyle(cls.glowColor, 0.18).fillCircle(cx, H - 4, 18);
    // 2. 발 그림자
    g.fillStyle(0x000000, 0.5).fillEllipse(cx, H - 2, 20, 5);

    // 3. 부츠 (어두운 회색)
    g.fillStyle(0x1a2030, 1).fillRect(cx - 8, H - 12, 7, 8);
    g.fillStyle(0x1a2030, 1).fillRect(cx + 1, H - 12, 7, 8);
    g.fillStyle(0xcccccc, 1).fillRect(cx - 8, H - 12, 7, 1.5);
    g.fillStyle(0xcccccc, 1).fillRect(cx + 1, H - 12, 7, 1.5);

    // 4. 우주복 본체 (흰색/회색 베이스 — NASA EMU 풍)
    const bodyTop = 28, bodyBot = H - 12;
    // 다리 두 개 (회색 흰)
    g.fillStyle(0xd5dae0, 1).fillRect(cx - 8, bodyBot - 12, 7, 12);
    g.fillStyle(0xd5dae0, 1).fillRect(cx + 1, bodyBot - 12, 7, 12);
    g.fillStyle(0xa0a8b5, 0.5);
    g.fillRect(cx - 1, bodyBot - 12, 2, 12);   // 가운데 분할선
    // 몸통 (흰 사다리꼴)
    const body = pts(
      cx - 11, bodyTop,
      cx + 11, bodyTop,
      cx + 12, bodyBot,
      cx - 12, bodyBot
    );
    g.fillStyle(0xe5eaf0, 1).fillPoints(body, true);
    // 어두운 외곽선 (입체감)
    g.fillStyle(0x8a92a0, 0.45);
    g.fillRect(cx - 12, bodyTop, 1.5, bodyBot - bodyTop);
    g.fillRect(cx + 11, bodyTop, 1.5, bodyBot - bodyTop);

    // 5. 가슴 컨트롤 패널 (직업색)
    g.fillStyle(0x080a14, 1).fillRect(cx - 8, 33, 16, 11);
    g.fillStyle(cls.color, 0.9).fillRect(cx - 7, 34, 14, 9);
    // 패널 디스플레이 라인
    g.fillStyle(0x000000, 0.6);
    g.fillRect(cx - 6, 36, 12, 0.8);
    g.fillRect(cx - 6, 38, 8, 0.8);
    // 패널 발광 인디케이터
    g.fillStyle(cls.glowColor, 1).fillCircle(cx - 4, 41, 1.2);
    g.fillStyle(0xffd76b, 1).fillCircle(cx, 41, 1.2);
    g.fillStyle(0x88dd55, 1).fillCircle(cx + 4, 41, 1.2);

    // 6. 어깨 패드 (둥근 흰색 + 직업색 라인)
    g.fillStyle(0xd5dae0, 1).fillCircle(cx - 12, bodyTop + 2, 5);
    g.fillStyle(0xd5dae0, 1).fillCircle(cx + 12, bodyTop + 2, 5);
    g.fillStyle(cls.color, 1);
    g.fillRect(cx - 15, bodyTop + 1, 6, 1.5);
    g.fillRect(cx + 9, bodyTop + 1, 6, 1.5);
    // 어깨 외곽
    g.lineStyle(1, 0x8a92a0, 0.7).strokeCircle(cx - 12, bodyTop + 2, 5);
    g.lineStyle(1, 0x8a92a0, 0.7).strokeCircle(cx + 12, bodyTop + 2, 5);

    // 7. 백팩 (위에 살짝 보이는 부분 + Tier 4+ 크게)
    const bpY = bodyTop - 2;
    if (tier >= 4) {
      // 큰 백팩
      g.fillStyle(0xc0c5d0, 1).fillRect(cx - 7, bpY, 14, 4);
      g.fillStyle(0xa0a5b0, 1).fillRect(cx - 7, bpY + 4, 14, 1);
      g.fillStyle(cls.glowColor, 0.9).fillRect(cx - 5, bpY + 2, 3, 1);
      g.fillStyle(cls.glowColor, 0.9).fillRect(cx + 2, bpY + 2, 3, 1);
    } else {
      // 작은 백팩 (위쪽으로 살짝)
      g.fillStyle(0xa0a8b5, 1).fillRect(cx - 5, bpY, 10, 3);
    }

    // 8. 헬멧 (큰 둥근 돔 — 흰색 + 직업색 약간)
    const hCx = cx, hCy = 17;
    const hR = 12;
    // 헬멧 베이스 (흰색)
    g.fillStyle(0xeef0f3, 1).fillCircle(hCx, hCy, hR);
    // 헬멧 외곽 (어두운 라인)
    g.lineStyle(2, 0x8a92a0, 1).strokeCircle(hCx, hCy, hR);
    // 헬멧 직업색 라인 (가로 띠)
    g.fillStyle(cls.color, 0.8).fillRect(hCx - hR, hCy + hR - 4, hR * 2, 2);
    // 헬멧 윗부분 하이라이트
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(hCx - 3, hCy - 6, 5, 3);

    // 9. 바이저 (큰 검은 곡면 — 헬멧 거의 채움)
    g.fillStyle(0x080a14, 1);
    g.fillEllipse(hCx, hCy + 1, 18, 11);
    // 바이저 위쪽 광택 (직업색 발광 라인)
    g.fillStyle(cls.glowColor, 0.9);
    g.fillEllipse(hCx, hCy - 1, 16, 3);
    g.fillStyle(0xffffff, 0.7);
    g.fillEllipse(hCx - 3, hCy - 1.5, 7, 1.5);
    // 바이저 반사광 (오른쪽 위 큰 흰 반점)
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(hCx + 4, hCy - 2, 5, 3);
    // 바이저 외곽선
    g.lineStyle(1, 0x000000, 0.6).strokeEllipse(hCx, hCy + 1, 18, 11);

    // 10. Tier 3+: 헬멧 위 안테나/장식
    if (tier >= 3) {
      if (cls.id === 'mage') {
        // 과학자: 머리 위 스캐너 안테나
        g.fillStyle(0xcccccc, 1).fillRect(hCx - 0.5, 2, 1, 4);
        g.fillStyle(cls.glowColor, 1).fillCircle(hCx, 2, 1.8);
        g.fillStyle(0xffffff, 0.8).fillCircle(hCx, 2, 0.8);
      } else if (cls.id === 'warrior') {
        // 엔지니어: 양쪽 작은 헤드램프
        g.fillStyle(0xcccccc, 1);
        g.fillRect(hCx - 11, 8, 3, 2);
        g.fillRect(hCx + 8, 8, 3, 2);
        g.fillStyle(0xffd76b, 0.9);
        g.fillCircle(hCx - 9.5, 9, 1);
        g.fillCircle(hCx + 9.5, 9, 1);
      } else if (cls.id === 'rogue') {
        // 생물학자: 위에 작은 표본 캡슐
        g.fillStyle(0x222233, 1).fillRect(hCx - 2.5, 1, 5, 4);
        g.fillStyle(cls.glowColor, 0.9).fillRect(hCx - 2, 2, 4, 2);
      }
    }

    // 11. 팔 (어깨에서 내려오는 짧은 흰 라인 양쪽)
    g.fillStyle(0xd5dae0, 1);
    g.fillRect(cx - 14, bodyTop + 4, 5, 12);
    g.fillRect(cx + 9, bodyTop + 4, 5, 12);
    g.lineStyle(1, 0x8a92a0, 0.5);
    g.strokeRect(cx - 14, bodyTop + 4, 5, 12);
    g.strokeRect(cx + 9, bodyTop + 4, 5, 12);

    // 12. 손에 든 도구
    this.drawTool(g, cls, cx, tier);

    // 13. Tier 5+: 마법 오라
    if (tier >= 5) {
      g.lineStyle(1.5, cls.glowColor, 0.7).strokeCircle(cx, H/2, 24);
      g.lineStyle(1, cls.glowColor, 0.4).strokeCircle(cx, H/2, 28);
    }

    g.generateTexture(`player-${cls.id}-${tier}`, W, H);
    g.destroy();
  }

  drawTool(g, cls, cx, tier) {
    if (cls.id === 'warrior') {
      // 엔지니어: 다목적 도구 (오른손)
      const x = cx + 16;
      g.fillStyle(0xcccccc, 1).fillRect(x - 1, 38, 2, 14);
      g.fillStyle(0xff8c42, 0.95).fillRect(x - 2.5, 36, 5, 3);
      if (tier >= 3) g.fillStyle(cls.glowColor, 0.9).fillCircle(x, 35, 1.5);
    } else if (cls.id === 'mage') {
      // 과학자: 스캐너 패드 (왼손)
      const x = cx - 15;
      g.fillStyle(0x222233, 1).fillRect(x - 2.5, 40, 5, 7);
      g.fillStyle(cls.glowColor, 0.9).fillRect(x - 2, 41, 4, 5);
      g.fillStyle(0xffffff, 0.6).fillRect(x - 1.5, 41.5, 3, 1);
    } else if (cls.id === 'rogue') {
      // 생물학자: 양쪽 시료 바이알
      g.fillStyle(0x222233, 1);
      g.fillRect(cx - 17, 40, 3, 6);
      g.fillRect(cx + 14, 40, 3, 6);
      g.fillStyle(cls.glowColor, 0.95);
      g.fillRect(cx - 16.5, 41, 2, 4);
      g.fillRect(cx + 14.5, 41, 2, 4);
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

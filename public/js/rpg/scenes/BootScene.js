// ============================================================
// BootScene — 디아블로풍 절차적 스프라이트 생성 (외부 에셋 0)
// ============================================================
// 플레이어: 3직업 × 5단계 외형 = 15개 텍스처
// 몬스터: 6종 고유 실루엣
// ============================================================
import { CLASSES } from '../../classes.js';
import { getUser, loadProgress } from '../../firebase-config.js';

// Phaser fillPoints는 {x,y} 객체 배열을 요구 → flat→object 변환 헬퍼
const pts = (...coords) => {
  const out = [];
  for (let i = 0; i < coords.length; i += 2) out.push({ x: coords[i], y: coords[i+1] });
  return out;
};

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    // 환경 텍스처
    this.makeFloorTile();
    this.makeWallTile();
    this.makeTorchLight();
    this.makeMoveMarker();

    // 플레이어 (3 직업 × 5 단계)
    Object.values(CLASSES).forEach(cls => {
      for (let tier = 1; tier <= 5; tier++) {
        this.makePlayerSprite(cls, tier);
      }
    });

    // 몬스터 (6종 고유 디자인)
    this.makeSkeleton();
    this.makeZombie();
    this.makeImp();
    this.makeWraith();
    this.makeGolem();
    this.makeDragon();

    // NPC (상인 + 대장장이)
    this.makeMerchant();
    this.makeBlacksmith();

    // 라우팅: 직업 미선택 → ClassSelect / 있음 → Town 로딩
    try {
      const user = await getUser();
      const player = await loadProgress(user.uid);
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
      this.scene.start('ClassSelect');
    }
  }

  // ============================================================
  // 환경
  // ============================================================
  makeFloorTile() {
    const g = this.add.graphics();
    const S = 40;
    g.fillStyle(0x2a201a, 1).fillRect(0, 0, S, S);
    for (let i = 0; i < 28; i++) {
      const c = Phaser.Display.Color.GetColor(
        20 + Math.random() * 30,
        18 + Math.random() * 22,
        14 + Math.random() * 20,
      );
      g.fillStyle(c, 1).fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    // 깨진 돌 라인
    g.lineStyle(1, 0x000000, 0.5);
    g.lineBetween(Math.random()*S, 0, Math.random()*S, S);
    g.lineStyle(1, 0x000000, 0.4).strokeRect(0, 0, S, S);
    g.generateTexture('floor', S, S);
    g.destroy();
  }

  makeWallTile() {
    const g = this.add.graphics();
    const S = 40;
    g.fillStyle(0x3a2820, 1).fillRect(0, 0, S, S);
    g.fillStyle(0x2a1810, 1).fillRect(0, S * 0.55, S, S * 0.45);
    g.fillStyle(0x150a05, 1).fillRect(0, S - 5, S, 5);
    // 벽돌 줄눈
    g.lineStyle(1, 0x000000, 0.7);
    g.lineBetween(0, S/2, S, S/2);
    g.lineBetween(S/2, 0, S/2, S/2);
    g.lineBetween(S/3, S/2, S/3, S);
    g.lineBetween(2*S/3, S/2, 2*S/3, S);
    // 어두운 모서리
    g.lineStyle(1, 0x000000, 0.5).strokeRect(0, 0, S, S);
    g.generateTexture('wall', S, S);
    g.destroy();
  }

  makeTorchLight() {
    const size = 320;
    const canvas = this.textures.createCanvas('torch', size, size);
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size/2, size/2, 8, size/2, size/2, size/2);
    grad.addColorStop(0,   'rgba(255, 200, 100, 0.6)');
    grad.addColorStop(0.4, 'rgba(255, 140, 60, 0.25)');
    grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  makeMoveMarker() {
    const g = this.add.graphics();
    const S = 40;
    g.lineStyle(2, 0xd4af37, 0.9).strokeCircle(S/2, S/2, S/2 - 4);
    g.lineStyle(2, 0xd4af37, 0.5).strokeCircle(S/2, S/2, S/2 - 10);
    g.generateTexture('marker', S, S);
    g.destroy();
  }

  // ============================================================
  // 플레이어 스프라이트 — 후드 실루엣 (디아블로 캐릭터 선택 스타일)
  // ============================================================
  makePlayerSprite(cls, tier) {
    const W = 40, H = 56;
    const cx = W / 2;
    const g = this.add.graphics();

    // 1. 발광 (베이스 글로우)
    g.fillStyle(cls.glowColor, 0.15).fillCircle(cx, H - 8, 14);

    // 2. 망토 본체 (사다리꼴 — 아래로 갈수록 넓음)
    const bottomW = tier >= 4 ? 18 : 14;  // Tier 4+ 펄럭이는 망토
    const cloak = pts(
      cx - 8, 18,
      cx + 8, 18,
      cx + bottomW, H - 4,
      cx - bottomW, H - 4,
    );
    // 어두운 베이스
    g.fillStyle(0x080404, 1);
    g.fillPoints(cloak, true);
    // 직업 색상 오버레이
    g.fillStyle(cls.color, 0.92);
    g.fillPoints(cloak, true);
    // 망토 중앙 그림자 (입체감)
    g.fillStyle(0x000000, 0.35);
    g.fillPoints(pts(
      cx - 2, 22,
      cx + 2, 22,
      cx + 5, H - 4,
      cx - 5, H - 4,
    ), true);

    // 3. 후드 (머리 위 둥근 그림자)
    g.fillStyle(0x0a0506, 1);
    g.beginPath();
    g.arc(cx, 16, 11, Math.PI, Math.PI * 2, false);
    g.fillPath();
    g.closePath();

    // 후드 트림 (직업색)
    g.fillStyle(cls.color, 0.7);
    g.beginPath();
    g.arc(cx, 16, 11, Math.PI, Math.PI * 2, false);
    g.lineTo(cx + 9, 18);
    g.arc(cx, 16, 9, 0, Math.PI, true);
    g.fillPath();
    g.closePath();

    // 4. 얼굴 그림자 (후드 안쪽)
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx, 14, 6.5);

    // 5. 빛나는 눈 2개
    g.fillStyle(cls.glowColor, 1);
    g.fillCircle(cx - 2.5, 14, 1.2);
    g.fillCircle(cx + 2.5, 14, 1.2);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(cx - 2.5, 14, 0.5);
    g.fillCircle(cx + 2.5, 14, 0.5);

    // 6. Tier 2+: 어깨 갑옷 (직업색 견갑)
    if (tier >= 2) {
      g.fillStyle(cls.color, 1);
      g.fillTriangle(cx - 13, 19, cx - 7, 20, cx - 10, 26);
      g.fillTriangle(cx + 13, 19, cx + 7, 20, cx + 10, 26);
      // 견갑 광택
      g.fillStyle(cls.glowColor, 0.6);
      g.fillTriangle(cx - 12, 20, cx - 10, 20, cx - 11, 23);
      g.fillTriangle(cx + 12, 20, cx + 10, 20, cx + 11, 23);
    }

    // 7. Tier 3+: 직업별 머리장식
    if (tier >= 3) {
      this.drawHeadgear(g, cls, cx);
    }

    // 8. 무기 (직업별)
    this.drawWeapon(g, cls, cx, tier);

    // 9. Tier 5: 마법 오라 (방사형 외곽선)
    if (tier >= 5) {
      g.lineStyle(1.5, cls.glowColor, 0.6);
      g.strokeCircle(cx, H/2, 20);
      g.lineStyle(1, cls.glowColor, 0.3);
      g.strokeCircle(cx, H/2, 24);
    }

    g.generateTexture(`player-${cls.id}-${tier}`, W, H);
    g.destroy();
  }

  drawHeadgear(g, cls, cx) {
    if (cls.id === 'mage') {
      // 마법사 모자 (긴 삼각형 + 끝에 보석)
      g.fillStyle(cls.color, 1);
      g.fillTriangle(cx - 7, 8, cx + 7, 8, cx - 2, -4);
      g.fillStyle(0x000000, 0.4);
      g.fillTriangle(cx - 1, 6, cx + 7, 8, cx - 2, -4);
      g.fillStyle(cls.glowColor, 1);
      g.fillCircle(cx - 2, -4, 1.8);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 2, -4, 0.7);
    } else if (cls.id === 'warrior') {
      // 전사 투구 뿔 (양쪽 곡선 뿔)
      g.fillStyle(cls.color, 1);
      g.fillTriangle(cx - 9, 5, cx - 5, 6, cx - 7, -2);
      g.fillTriangle(cx + 9, 5, cx + 5, 6, cx + 7, -2);
      g.fillStyle(0xcfcfcf, 0.7);
      g.fillRect(cx - 1, 4, 2, 3);  // 정수리 장식
    } else if (cls.id === 'rogue') {
      // 도적 후드 끝 뾰족하게
      g.fillStyle(0x000000, 1);
      g.fillTriangle(cx - 5, 6, cx + 5, 6, cx - 1, -2);
    }
  }

  drawWeapon(g, cls, cx, tier) {
    if (cls.id === 'warrior') {
      // 검 — 오른쪽에 들고 있음
      const x = cx + 16;
      g.lineStyle(3, 0xdcdcdc, 1);
      g.lineBetween(x, 26, x, 50);
      g.fillStyle(0x6b3a18, 1);
      g.fillRect(x - 4, 24, 8, 3);   // 가드
      g.fillStyle(cls.glowColor, tier >= 3 ? 0.9 : 0.5);
      g.fillCircle(x, 22, 2);          // 발광 손잡이 보석
      if (tier >= 4) {
        // 칼끝 빛 트레일
        g.lineStyle(1, cls.glowColor, 0.7);
        g.lineBetween(x - 1, 50, x - 1, 56);
        g.lineBetween(x + 1, 50, x + 1, 56);
      }
    } else if (cls.id === 'mage') {
      // 지팡이 — 왼쪽에
      const x = cx - 17;
      g.lineStyle(2, 0x6b3a18, 1);
      g.lineBetween(x, 22, x, 52);
      // 발광 구
      g.fillStyle(0x000000, 1).fillCircle(x, 20, 4);
      g.fillStyle(cls.glowColor, 0.95).fillCircle(x, 20, 3);
      g.fillStyle(0xffffff, 0.8).fillCircle(x, 19, 1.2);
      if (tier >= 4) {
        // 구 주위 마법 원
        g.lineStyle(1, cls.glowColor, 0.6).strokeCircle(x, 20, 6);
      }
    } else if (cls.id === 'rogue') {
      // 단검 2자루 — 양쪽
      g.lineStyle(2, 0xdcdcdc, 1);
      g.lineBetween(cx + 14, 30, cx + 14, 40);
      g.lineBetween(cx - 14, 30, cx - 14, 40);
      g.fillStyle(0x6b3a18, 1);
      g.fillRect(cx + 12, 28, 4, 2);
      g.fillRect(cx - 16, 28, 4, 2);
      g.fillStyle(cls.glowColor, 0.7);
      g.fillCircle(cx + 14, 41, 1);
      g.fillCircle(cx - 14, 41, 1);
    }
  }

  // ============================================================
  // 몬스터 스프라이트 — 6종 고유 실루엣
  // ============================================================
  makeSkeleton() {
    // 키 큰 후드 망령 + 빛나는 눈
    const W = 36, H = 50;
    const cx = W/2;
    const g = this.add.graphics();
    // 글로우
    g.fillStyle(0xff7733, 0.2).fillCircle(cx, H - 6, 12);
    // 망토
    const skBody = pts(cx - 7, 16, cx + 7, 16, cx + 12, H - 4, cx - 12, H - 4);
    g.fillStyle(0x1a1610, 1);
    g.fillPoints(skBody, true);
    g.fillStyle(0x4a3a30, 0.8);
    g.fillPoints(skBody, true);
    // 갈비뼈 흔적
    g.lineStyle(1, 0xcfcfcf, 0.4);
    g.lineBetween(cx - 4, 26, cx + 4, 26);
    g.lineBetween(cx - 5, 30, cx + 5, 30);
    g.lineBetween(cx - 4, 34, cx + 4, 34);
    // 후드
    g.fillStyle(0x080606, 1);
    g.beginPath(); g.arc(cx, 14, 9, Math.PI, 0, false); g.fillPath();
    // 빛나는 눈 (주황빛)
    g.fillStyle(0xff7733, 1);
    g.fillCircle(cx - 2.5, 13, 1.4);
    g.fillCircle(cx + 2.5, 13, 1.4);
    g.fillStyle(0xffe5cc, 0.8);
    g.fillCircle(cx - 2.5, 13, 0.5);
    g.fillCircle(cx + 2.5, 13, 0.5);
    g.generateTexture('m-skeleton', W, H);
    g.destroy();
  }

  makeZombie() {
    // 굽은 그림자, 너덜너덜한 살색
    const W = 38, H = 46;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0x4a6b3a, 0.25).fillCircle(cx, H - 6, 12);
    // 굽은 몸
    const zBody = pts(cx - 9, 18, cx + 7, 16, cx + 14, H - 4, cx - 11, H - 4);
    g.fillStyle(0x2a3a1a, 1);
    g.fillPoints(zBody, true);
    g.fillStyle(0x5a7a3a, 0.75);
    g.fillPoints(zBody, true);
    // 너덜한 천 (아래쪽 들쑥날쑥)
    g.fillStyle(0x080808, 0.6);
    g.fillTriangle(cx - 8, H - 4, cx - 4, H - 4, cx - 6, H - 1);
    g.fillTriangle(cx, H - 4, cx + 4, H - 4, cx + 2, H - 2);
    g.fillTriangle(cx + 6, H - 4, cx + 10, H - 4, cx + 8, H);
    // 머리 + 멍한 눈
    g.fillStyle(0x4a5a2a, 1).fillCircle(cx - 1, 13, 8);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - 4, 12, 1.5);
    g.fillCircle(cx + 2, 14, 1.5);
    // 상처/꿰맨 자국
    g.lineStyle(1, 0x4a1010, 1);
    g.lineBetween(cx - 3, 16, cx + 3, 16);
    g.generateTexture('m-zombie', W, H);
    g.destroy();
  }

  makeImp() {
    // 작고 뾰족한 뿔 + 적안
    const W = 32, H = 38;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff4422, 0.3).fillCircle(cx, H - 4, 12);
    // 몸 — 짧고 뚱뚱
    const iBody = pts(cx - 8, 16, cx + 8, 16, cx + 11, H - 4, cx - 11, H - 4);
    g.fillStyle(0x4a0a0a, 1);
    g.fillPoints(iBody, true);
    g.fillStyle(0xa31621, 0.9);
    g.fillPoints(iBody, true);
    // 머리
    g.fillStyle(0xa31621, 1).fillCircle(cx, 12, 9);
    g.fillStyle(0x4a0a0a, 0.4).fillCircle(cx + 2, 13, 8);
    // 뿔
    g.fillStyle(0x080404, 1);
    g.fillTriangle(cx - 8, 8, cx - 4, 8, cx - 6, 0);
    g.fillTriangle(cx + 8, 8, cx + 4, 8, cx + 6, 0);
    // 빛나는 적안
    g.fillStyle(0xffdd00, 1);
    g.fillCircle(cx - 3, 12, 1.3);
    g.fillCircle(cx + 3, 12, 1.3);
    // 이빨
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(cx - 2, 16, cx - 1, 16, cx - 1.5, 18);
    g.fillTriangle(cx + 1, 16, cx + 2, 16, cx + 1.5, 18);
    g.generateTexture('m-imp', W, H);
    g.destroy();
  }

  makeWraith() {
    // 떠다니는 반투명 후드 형체
    const W = 38, H = 50;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xa3c4f3, 0.3).fillCircle(cx, H - 6, 14);
    // 떠다니는 망토 (위는 안개처럼)
    g.fillStyle(0x4a5a7a, 0.55);
    g.fillPoints(pts(cx - 10, 14, cx + 10, 14, cx + 14, H - 6, cx - 14, H - 6), true);
    // 안개 자락 (아래)
    g.fillStyle(0x3a4a6a, 0.4);
    g.fillTriangle(cx - 13, H - 8, cx - 10, H - 8, cx - 11, H);
    g.fillTriangle(cx - 6, H - 8, cx - 3, H - 8, cx - 4, H);
    g.fillTriangle(cx + 3, H - 8, cx + 6, H - 8, cx + 5, H);
    g.fillTriangle(cx + 9, H - 8, cx + 12, H - 8, cx + 11, H);
    // 후드
    g.fillStyle(0x1a2030, 1);
    g.beginPath(); g.arc(cx, 14, 11, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0x4a5a7a, 0.5);
    g.beginPath(); g.arc(cx, 14, 11, Math.PI, 0, false); g.fillPath();
    // 텅 빈 후드 (검은 얼굴 + 빛 점)
    g.fillStyle(0x000000, 1).fillCircle(cx, 13, 6);
    g.fillStyle(0xa3c4f3, 1);
    g.fillCircle(cx - 2, 13, 1.2);
    g.fillCircle(cx + 2, 13, 1.2);
    g.generateTexture('m-wraith', W, H);
    g.destroy();
  }

  makeGolem() {
    // 큰 사각 돌덩이
    const W = 42, H = 52;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0x6a5a4a, 0.3).fillCircle(cx, H - 4, 16);
    // 몸통 — 큰 사각형
    g.fillStyle(0x3a2a20, 1).fillRect(cx - 14, 16, 28, H - 18);
    g.fillStyle(0x6a5a4a, 0.9).fillRect(cx - 14, 16, 28, H - 18);
    // 머리 — 작은 사각형
    g.fillStyle(0x6a5a4a, 1).fillRect(cx - 8, 4, 16, 12);
    g.fillStyle(0x4a3a30, 0.5).fillRect(cx - 8, 8, 16, 8);
    // 균열 (라인)
    g.lineStyle(1, 0x000000, 0.7);
    g.lineBetween(cx - 6, 18, cx - 4, 30);
    g.lineBetween(cx - 4, 30, cx + 2, 28);
    g.lineBetween(cx + 2, 28, cx + 8, 38);
    g.lineBetween(cx - 10, 36, cx - 4, 42);
    // 빛나는 균열 안 마그마
    g.lineStyle(1, 0xff5500, 0.8);
    g.lineBetween(cx - 4, 30, cx + 2, 28);
    // 빛나는 눈 (큰 점)
    g.fillStyle(0xff8800, 1);
    g.fillCircle(cx - 4, 10, 1.5);
    g.fillCircle(cx + 4, 10, 1.5);
    g.generateTexture('m-golem', W, H);
    g.destroy();
  }

  // ---------- NPC: 상인 헬가 ----------
  makeMerchant() {
    const W = 40, H = 56;
    const cx = W/2;
    const g = this.add.graphics();
    // 발광
    g.fillStyle(0x88ddff, 0.18).fillCircle(cx, H - 8, 14);
    // 망토 (청색)
    const body = pts(cx - 9, 18, cx + 9, 18, cx + 14, H - 4, cx - 14, H - 4);
    g.fillStyle(0x080a14, 1).fillPoints(body, true);
    g.fillStyle(0x2d4a8a, 0.9).fillPoints(body, true);
    // 어깨 가방 (옆구리에)
    g.fillStyle(0x6b3a18, 1);
    g.fillRect(cx + 6, 26, 10, 14);
    g.fillStyle(0x4a2810, 1);
    g.fillRect(cx + 6, 26, 10, 2);
    // 황금 동전 표시
    g.fillStyle(0xffd700, 1);
    g.fillCircle(cx + 11, 33, 1.5);
    // 후드
    g.fillStyle(0x080a14, 1);
    g.beginPath(); g.arc(cx, 16, 11, Math.PI, Math.PI * 2, false); g.fillPath();
    g.fillStyle(0x2d4a8a, 0.6);
    g.beginPath(); g.arc(cx, 16, 11, Math.PI, Math.PI * 2, false); g.fillPath();
    // 얼굴 (밝은 분홍빛 — 친근감)
    g.fillStyle(0xeac0a0, 1).fillCircle(cx, 14, 5.5);
    // 미소 + 눈
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - 2, 13, 0.9);
    g.fillCircle(cx + 2, 13, 0.9);
    g.lineStyle(1, 0xa0000a, 1);
    g.lineBetween(cx - 2, 16, cx + 2, 16);
    // 동전 글로우 (어깨 가방 위)
    g.fillStyle(0xffd700, 0.4).fillCircle(cx + 11, 33, 4);
    g.generateTexture('npc-merchant', W, H);
    g.destroy();
  }

  // ---------- NPC: 대장장이 군나르 ----------
  makeBlacksmith() {
    const W = 44, H = 56;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff8855, 0.2).fillCircle(cx, H - 8, 14);
    // 몸 (어두운 갈색 망토)
    const body = pts(cx - 11, 18, cx + 11, 18, cx + 15, H - 4, cx - 15, H - 4);
    g.fillStyle(0x1a0e08, 1).fillPoints(body, true);
    g.fillStyle(0x5a3a20, 0.9).fillPoints(body, true);
    // 가죽 앞치마 (가운데)
    g.fillStyle(0x4a2810, 1);
    g.fillRect(cx - 8, 22, 16, 24);
    g.fillStyle(0x2a1408, 1);
    g.fillRect(cx - 8, 22, 16, 2);  // 끈
    // 앞치마 자국 (불꽃 그을림)
    g.fillStyle(0xa31621, 0.5);
    g.fillCircle(cx - 3, 30, 2);
    g.fillCircle(cx + 4, 36, 1.5);
    // 어깨 가죽끈
    g.lineStyle(2, 0x2a1408, 1);
    g.lineBetween(cx - 8, 22, cx + 8, 22);
    // 머리 (모자 없이, 굵은 얼굴)
    g.fillStyle(0x080404, 1).fillCircle(cx, 13, 8);
    g.fillStyle(0xc09060, 1).fillCircle(cx, 14, 6.5);  // 그을린 얼굴
    // 굵은 눈썹 + 눈
    g.fillStyle(0x080404, 1);
    g.fillRect(cx - 4, 11, 3, 1.5);
    g.fillRect(cx + 1, 11, 3, 1.5);
    g.fillCircle(cx - 2, 14, 0.9);
    g.fillCircle(cx + 2, 14, 0.9);
    // 수염
    g.fillStyle(0x4a2810, 1);
    g.fillTriangle(cx - 4, 17, cx + 4, 17, cx, 21);
    // 망치 (오른쪽에 들고 있음)
    const hx = cx + 16, hy = 30;
    g.fillStyle(0x6b3a18, 1).fillRect(hx - 1, hy, 2, 18);  // 손잡이
    g.fillStyle(0x4a4a4a, 1).fillRect(hx - 5, hy - 4, 10, 8);  // 머리
    g.lineStyle(1, 0x000000, 0.7).strokeRect(hx - 5, hy - 4, 10, 8);
    // 망치 광택
    g.fillStyle(0xcccccc, 0.6).fillRect(hx - 4, hy - 3, 8, 1);
    // 불꽃 (왼쪽 어깨 옆)
    g.fillStyle(0xff7733, 0.8).fillCircle(cx - 18, 28, 3);
    g.fillStyle(0xffd700, 1).fillCircle(cx - 18, 28, 1.5);
    g.generateTexture('npc-blacksmith', W, H);
    g.destroy();
  }

  makeDragon() {
    // 펼친 날개 + 가운데 몸 + 빛나는 눈
    const W = 50, H = 48;
    const cx = W/2;
    const g = this.add.graphics();
    g.fillStyle(0xff8833, 0.3).fillCircle(cx, H - 4, 16);
    // 날개 (양쪽 박쥐 형태)
    g.fillStyle(0x4a1a0a, 1);
    g.fillTriangle(cx - 6, 18, cx - 24, 12, cx - 22, 30);
    g.fillTriangle(cx + 6, 18, cx + 24, 12, cx + 22, 30);
    g.fillStyle(0xa3401a, 0.8);
    g.fillTriangle(cx - 6, 20, cx - 22, 14, cx - 20, 28);
    g.fillTriangle(cx + 6, 20, cx + 22, 14, cx + 20, 28);
    // 날개 뼈 (라인)
    g.lineStyle(1, 0x080404, 1);
    g.lineBetween(cx - 6, 20, cx - 23, 13);
    g.lineBetween(cx - 6, 20, cx - 21, 29);
    g.lineBetween(cx + 6, 20, cx + 23, 13);
    g.lineBetween(cx + 6, 20, cx + 21, 29);
    // 몸 (가운데)
    g.fillStyle(0xa31621, 1);
    g.fillPoints(pts(cx - 7, 18, cx + 7, 18, cx + 9, H - 6, cx - 9, H - 6), true);
    g.fillStyle(0x6a0a10, 0.6);
    g.fillTriangle(cx + 2, 20, cx + 9, H - 6, cx, H - 4);
    // 머리
    g.fillStyle(0xa31621, 1).fillCircle(cx, 14, 7);
    g.fillStyle(0x6a0a10, 0.4).fillCircle(cx + 2, 15, 6);
    // 뿔
    g.fillStyle(0xdcdcdc, 1);
    g.fillTriangle(cx - 6, 10, cx - 3, 10, cx - 5, 4);
    g.fillTriangle(cx + 6, 10, cx + 3, 10, cx + 5, 4);
    // 빛나는 눈
    g.fillStyle(0xffdd00, 1);
    g.fillCircle(cx - 2, 14, 1.3);
    g.fillCircle(cx + 2, 14, 1.3);
    // 이빨
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(cx - 2, 18, cx - 1, 18, cx - 1.5, 20);
    g.fillTriangle(cx + 1, 18, cx + 2, 18, cx + 1.5, 20);
    g.generateTexture('m-dragon', W, H);
    g.destroy();
  }
}

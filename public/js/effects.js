// ============================================================
// effects.js — 게임 "Juice" 시각 효과 헬퍼
// ============================================================
// 데미지 숫자 / 화면 흔들림 / 파티클 / 코인 궤적 / 크리티컬 강조
// 사용: import * as fx from '../../effects.js'
//       fx.damageNumber(scene, x, y, -1)
// ============================================================

// ----- 데미지 숫자 (떠올라서 사라짐) -----
export function damageNumber(scene, x, y, value, opts = {}) {
  const isHeal = value > 0;
  const isCrit = !!opts.crit;
  const isMiss = value === 0 || opts.miss;
  const color = opts.color || (isMiss ? '#888' : isHeal ? '#88ddff' : isCrit ? '#ffd700' : '#ff5544');
  const size = isCrit ? '32px' : '22px';
  const prefix = isHeal ? '+' : isMiss ? '' : '';
  const text = isMiss ? 'MISS' : `${prefix}${value}`;

  const txt = scene.add.text(x, y, text, {
    fontSize: size,
    color,
    fontFamily: 'Cinzel, Noto Serif KR, serif',
    stroke: '#000',
    strokeThickness: 4,
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(100);

  scene.tweens.add({
    targets: txt,
    y: y - 50,
    alpha: { from: 1, to: 0 },
    scale: isCrit ? { from: 0.6, to: 1.4 } : { from: 0.9, to: 1.1 },
    duration: 900,
    ease: 'Quad.easeOut',
    onComplete: () => txt.destroy(),
  });
}

// ----- 별가루 파티클 (정답/처치) -----
export function sparkle(scene, x, y, opts = {}) {
  const count = opts.count || 8;
  const color = opts.color || 0xffd700;
  const spread = opts.spread || 40;
  const duration = opts.duration || 500;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = spread * (0.5 + Math.random() * 0.5);
    const tx = x + Math.cos(angle) * dist;
    const ty = y + Math.sin(angle) * dist;

    const star = scene.add.circle(x, y, 3 + Math.random() * 2, color, 1).setDepth(60);
    scene.tweens.add({
      targets: star,
      x: tx, y: ty,
      scale: { from: 1, to: 0.2 },
      alpha: { from: 1, to: 0 },
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

// ----- 골드 폭발 (몬스터 처치) -----
export function goldBurst(scene, x, y, opts = {}) {
  const count = opts.count || 12;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const tx = x + Math.cos(angle) * speed;
    const ty = y + Math.sin(angle) * speed - 20; // 살짝 위로

    const coin = scene.add.circle(x, y, 4, 0xffd700, 1).setDepth(60)
      .setStrokeStyle(1, 0x8b6914);
    scene.tweens.add({
      targets: coin,
      x: tx, y: ty + 30, // 중력
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 0.5 },
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => coin.destroy(),
    });
  }
}

// ----- 화면 흔들림 (Phaser 내장 활용) -----
export function shake(scene, intensity = 0.008, duration = 200) {
  if (scene.cameras && scene.cameras.main) {
    scene.cameras.main.shake(duration, intensity);
  }
}

// 강도 프리셋
export const SHAKE = {
  light:  () => [150, 0.005],
  medium: () => [250, 0.012],
  heavy:  () => [400, 0.022],
  boss:   () => [500, 0.030],
};

// ----- 코인/XP 궤적 (몬스터 → HUD로) -----
export function coinTrail(scene, fromX, fromY, opts = {}) {
  const color = opts.color || 0xffd700;
  const count = opts.count || 5;
  for (let i = 0; i < count; i++) {
    const coin = scene.add.circle(fromX, fromY, 4, color, 1).setDepth(70)
      .setScrollFactor(0); // 화면 고정 좌표로 변환은 단순화 — 호출 시 미리 변환
    const targetX = opts.toX !== undefined ? opts.toX : fromX;
    const targetY = opts.toY !== undefined ? opts.toY : fromY - 100;
    scene.tweens.add({
      targets: coin,
      x: targetX,
      y: targetY,
      alpha: { from: 1, to: 0 },
      delay: i * 50,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => coin.destroy(),
    });
  }
}

// ----- 폭발 (보스 처치) -----
export function explosion(scene, x, y) {
  // 큰 원형 확장
  const ring = scene.add.circle(x, y, 10, 0xffaa33, 0.8).setDepth(80)
    .setStrokeStyle(3, 0xff5522, 1);
  scene.tweens.add({
    targets: ring,
    radius: 80,
    alpha: 0,
    scale: 8,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
  // 노란 섬광
  const flash = scene.add.circle(x, y, 60, 0xffffff, 0.9).setDepth(81);
  scene.tweens.add({
    targets: flash,
    scale: { from: 0.2, to: 3 },
    alpha: { from: 0.9, to: 0 },
    duration: 400,
    onComplete: () => flash.destroy(),
  });
  // 골드 폭발
  goldBurst(scene, x, y, { count: 20 });
  sparkle(scene, x, y, { count: 16, color: 0xff8833, spread: 100, duration: 800 });
}

// ----- 피격 플래시 (몬스터/플레이어) -----
export function hitFlash(scene, sprite, opts = {}) {
  if (!sprite || sprite.destroyed) return;
  const orig = sprite.tintTopLeft || 0xffffff;
  const flashColor = opts.color || 0xff4444;
  sprite.setTintFill ? sprite.setTintFill(flashColor) : sprite.setTint(flashColor);
  scene.time.delayedCall(80, () => {
    if (sprite && !sprite.destroyed) {
      sprite.clearTint();
      if (orig !== 0xffffff) sprite.setTint(orig);
    }
  });
}

// ----- DOM 데미지 숫자 (배틀 모달용 — Phaser 좌표 아닌 DOM 위치) -----
export function damageNumberDOM(parentEl, value, opts = {}) {
  const isHeal = value > 0;
  const isCrit = !!opts.crit;
  const text = opts.text || (isHeal ? `+${value}` : `${value}`);
  const el = document.createElement('span');
  el.className = `fx-damage ${isHeal ? 'heal' : 'damage'} ${isCrit ? 'crit' : ''}`;
  el.textContent = text;
  parentEl.appendChild(el);
  // 자동 정리
  setTimeout(() => el.remove(), 1100);
}

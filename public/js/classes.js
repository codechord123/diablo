// ============================================================
// classes.js — 직업 정의 + 능력 + 레벨 외형 단계
// ============================================================

export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '전사',
    nameEn: 'Warrior',
    color: 0xa31621,        // 핏빛 적색 (어두운 톤)
    glowColor: 0xff5544,    // 발광색
    icon: '⚔️',
    description: '강인한 육체. 오답을 더 견딘다.',
    ability: '굳건한 의지 — 시작 HP 7, 레벨업 시 +2 HP',
    startHp: 7,
    hpPerLevel: 2,
    evadeChance: 0,
    goldMul: 1.0,
    extraDamageEveryN: 0,
  },
  mage: {
    id: 'mage',
    name: '마법사',
    nameEn: 'Mage',
    color: 0x2d4a8a,        // 깊은 청색
    glowColor: 0x88ddff,
    icon: '🔮',
    description: '연속 정답으로 강력한 마법을 발동한다.',
    ability: '마법의 일격 — 정답 3번마다 추가 데미지 +1',
    startHp: 4,
    hpPerLevel: 1,
    evadeChance: 0,
    goldMul: 1.0,
    extraDamageEveryN: 3,
  },
  rogue: {
    id: 'rogue',
    name: '도적',
    nameEn: 'Rogue',
    color: 0x3a5c2e,        // 어두운 녹색
    glowColor: 0x88dd55,
    icon: '🗡️',
    description: '민첩과 행운. 회피하고 더 많이 약탈한다.',
    ability: '회피 — 오답 20% 무효 · 골드 +10%',
    startHp: 5,
    hpPerLevel: 1,
    evadeChance: 0.20,
    goldMul: 1.1,
    extraDamageEveryN: 0,
  },
};

export function getClass(key) { return CLASSES[key] || CLASSES.warrior; }

// 레벨 → 외형 단계 (1~5)
export function tierForLevel(level) {
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5)  return 2;
  return 1;
}

// 스프라이트 키 헬퍼
export function playerSpriteKey(classId, level) {
  return `player-${classId}-${tierForLevel(level)}`;
}

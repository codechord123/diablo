// ============================================================
// classes.js — 직업 정의 + 능력 + 레벨 외형 단계
// ============================================================

export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '엔지니어',
    nameEn: 'Engineer',
    color: 0xa3461c,        // 작업복 주황
    glowColor: 0xff8855,
    icon: '🛠️',
    description: '강인한 신체와 도구. 오류를 견디며 일한다.',
    ability: '강화 외골격 — 시작 HP 7, 레벨업 시 +2 HP',
    startHp: 7,
    hpPerLevel: 2,
    evadeChance: 0,
    goldMul: 1.0,
    extraDamageEveryN: 0,
  },
  mage: {
    id: 'mage',
    name: '과학자',
    nameEn: 'Scientist',
    color: 0x2d4a8a,        // 우주 청색
    glowColor: 0x88ddff,
    icon: '🔬',
    description: '연속 분석으로 강력한 발견을 일으킨다.',
    ability: '돌파구 — 정답 3번마다 추가 데미지 +1',
    startHp: 4,
    hpPerLevel: 1,
    evadeChance: 0,
    goldMul: 1.0,
    extraDamageEveryN: 3,
  },
  rogue: {
    id: 'rogue',
    name: '생물학자',
    nameEn: 'Biologist',
    color: 0x3a5c2e,        // 생명 녹색
    glowColor: 0x88dd55,
    icon: '🧬',
    description: '패턴을 읽고 적응한다. 행운이 따른다.',
    ability: '적응 본능 — 오답 20% 무효 · 시료 보너스 +10%',
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

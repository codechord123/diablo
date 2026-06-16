// ============================================================
// monsters.js — 몬스터 데이터 + 문제 유형 매핑
// ============================================================
// 각 몬스터는 고유한 문제 카테고리를 가진다 (학생이 만나는 몬스터의
// 종류로 어떤 문제가 나올지 예측 가능 → 전략적 사냥)
// ============================================================

export const MONSTERS = [
  { id: 'skeleton', name: '해골 전사',  hp: 2, xp: 10, gold: 5,
    emoji: '💀', color: '#cfd2cf', category: 'add-same' },
  { id: 'zombie',   name: '좀비',       hp: 2, xp: 14, gold: 7,
    emoji: '🧟', color: '#8db580', category: 'sub-same' },
  { id: 'imp',      name: '꼬마 악마',  hp: 3, xp: 22, gold: 12,
    emoji: '👹', color: '#d96459', category: 'add-same' },
  { id: 'wraith',   name: '망령',       hp: 3, xp: 30, gold: 18,
    emoji: '👻', color: '#a3c4f3', category: 'add-diff' },
  { id: 'golem',    name: '돌 골렘',    hp: 4, xp: 45, gold: 28,
    emoji: '🗿', color: '#9a8c98', category: 'sub-diff' },
  { id: 'dragon',   name: '새끼 드래곤', hp: 5, xp: 70, gold: 50,
    emoji: '🐲', color: '#f4a261', category: 'mixed' },
];

export function pickMonster(level) {
  const tier = Math.min(MONSTERS.length, Math.ceil(level / 4));
  const pool = MONSTERS.slice(0, tier);
  const base = pool[Math.floor(Math.random() * pool.length)];
  return { ...base, currentHp: base.hp, maxHp: base.hp };
}

export const xpToNext = (level) => 30 + level * 20;

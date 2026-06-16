// ============================================================
// monsters.js — 몬스터 데이터 (디아블로 분위기 차용)
// ============================================================

export const MONSTERS = [
  { id: 'skeleton',  name: '해골 전사',   hp: 2, xp: 10, emoji: '💀', color: '#cfd2cf' },
  { id: 'zombie',    name: '좀비',        hp: 2, xp: 12, emoji: '🧟', color: '#8db580' },
  { id: 'imp',       name: '꼬마 악마',   hp: 3, xp: 18, emoji: '👹', color: '#d96459' },
  { id: 'wraith',    name: '망령',        hp: 3, xp: 22, emoji: '👻', color: '#a3c4f3' },
  { id: 'golem',     name: '돌 골렘',     hp: 4, xp: 30, emoji: '🗿', color: '#9a8c98' },
  { id: 'dragon',    name: '새끼 드래곤', hp: 5, xp: 45, emoji: '🐲', color: '#f4a261' },
];

// 레벨에 비례해 적절한 몬스터 풀에서 무작위 선택
export function pickMonster(level) {
  const tier = Math.min(MONSTERS.length, Math.ceil(level / 4));
  const pool = MONSTERS.slice(0, tier);
  const base = pool[Math.floor(Math.random() * pool.length)];
  // 깊은 복사 — 인스턴스별로 HP가 깎이므로
  return { ...base, currentHp: base.hp, maxHp: base.hp };
}

// 레벨업에 필요한 경험치 (점진적 증가)
export const xpToNext = (level) => 30 + level * 20;

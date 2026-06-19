// ============================================================
// bosses.js — 보스 데이터 + 해금 조건
// ============================================================
export const BOSSES = [
  {
    id: 'skeleton-king', name: '달의 아스트로파지',
    emoji: '🌑', subEmoji: '☢️',
    hp: 8, timeSec: 60,
    goldReward: 100, xpReward: 80,
    unlockLevel: 5,
    color: 0xcfd2cf,
    category: 'sub-same',
    dungeonTheme: 'graveyard',
    intro: '"이 별의 기본 수학을 모두 갉아먹었다."',
    abilities: {
      autoAttackEverySec: 7,    // 7초마다 1 피해
      autoAttackDamage: 1,
      lockCategory: false,       // 카테고리 강제 안 함
      pierceEvade: false,        // 도적 회피 막지 않음
      armor: 0,                  // 데미지 감소 없음
      enrageBelowSec: 0,         // 분노 없음
    },
  },
  {
    id: 'necro-captain', name: '소행성 군집체',
    emoji: '🛰️', subEmoji: '☢️',
    hp: 12, timeSec: 75,
    goldReward: 200, xpReward: 150,
    unlockLevel: 10,
    color: 0x8db580,
    category: 'add-diff',
    dungeonTheme: 'swamp',
    intro: '"통분이라는 개념을 흩어버렸다."',
    abilities: {
      autoAttackEverySec: 0,
      autoAttackDamage: 0,
      lockCategory: true,        // 카테고리 고정 (이분모만)
      pierceEvade: false,
      armor: 0,
      enrageBelowSec: 0,
    },
  },
  {
    id: 'demon-knight', name: '플라즈마 폭풍 핵',
    emoji: '🌋', subEmoji: '⚡',
    hp: 16, timeSec: 90,
    goldReward: 350, xpReward: 250,
    unlockLevel: 15,
    color: 0xd96459,
    category: 'sub-diff',
    dungeonTheme: 'inferno',
    intro: '"분수의 차이는 내 에너지 속에 녹았다."',
    abilities: {
      autoAttackEverySec: 0,
      autoAttackDamage: 0,
      lockCategory: false,
      pierceEvade: true,         // 도적 회피 무효화
      armor: 1,                  // 정답 데미지 -1 (최소 1 보장)
      enrageBelowSec: 0,
    },
  },
  {
    id: 'dragon-lord', name: '아스트로파지 여왕',
    emoji: '🌟', subEmoji: '☢️',
    hp: 24, timeSec: 120,
    goldReward: 500, xpReward: 400,
    unlockLevel: 20,
    color: 0xf4a261,
    category: 'mixed',
    dungeonTheme: 'volcano',
    intro: '"마지막 시험이다. 모든 분수의 답이 내 안에 있다."',
    abilities: {
      autoAttackEverySec: 8,
      autoAttackDamage: 1,
      lockCategory: false,
      pierceEvade: true,
      armor: 1,
      enrageBelowSec: 30,        // 30초 미만 시 자동 공격 2배
    },
  },
];

export function availableBosses(player) {
  return BOSSES.filter(b => player.level >= b.unlockLevel);
}

export function nextLockedBoss(player) {
  return BOSSES.find(b => player.level < b.unlockLevel);
}

export function getBoss(id) {
  return BOSSES.find(b => b.id === id);
}

export function isBossDefeated(player, bossId) {
  return (player.defeatedBosses || []).includes(bossId);
}

export function markBossDefeated(player, bossId) {
  player.defeatedBosses = player.defeatedBosses || [];
  if (!player.defeatedBosses.includes(bossId)) {
    player.defeatedBosses.push(bossId);
  }
}

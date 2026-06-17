// ============================================================
// bosses.js — 보스 데이터 + 해금 조건
// ============================================================
export const BOSSES = [
  {
    id: 'skeleton-king', name: '해골 군주',
    emoji: '💀', subEmoji: '👑',
    hp: 8, timeSec: 60,
    goldReward: 100, xpReward: 80,
    unlockLevel: 5,
    color: 0xcfd2cf,
    category: 'sub-same',  // 주력 카테고리 (전투 중 랜덤 섞임)
    intro: '"무덤에서 일어선 자가, 너의 분수를 시험한다."',
  },
  {
    id: 'necro-captain', name: '부활한 사령관',
    emoji: '🧟', subEmoji: '⚔️',
    hp: 12, timeSec: 75,
    goldReward: 200, xpReward: 150,
    unlockLevel: 10,
    color: 0x8db580,
    category: 'add-diff',
    intro: '"통분의 늪에 가라앉으리라..."',
  },
  {
    id: 'demon-knight', name: '악마 기사',
    emoji: '👹', subEmoji: '🗡️',
    hp: 16, timeSec: 90,
    goldReward: 350, xpReward: 250,
    unlockLevel: 15,
    color: 0xd96459,
    category: 'sub-diff',
    intro: '"지옥의 분수가 너를 찢어내리라!"',
  },
  {
    id: 'dragon-lord', name: '드래곤 군주',
    emoji: '🐲', subEmoji: '👑',
    hp: 24, timeSec: 120,
    goldReward: 500, xpReward: 400,
    unlockLevel: 20,
    color: 0xf4a261,
    category: 'mixed',
    intro: '"마지막 시험이다. 모든 분수를 정복하라!"',
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

// ============================================================
// cards.js — 카드 기반 전술 시스템 (덱 빌딩)
// ============================================================
// 카드는 전투 중 1회용 부스터. 수학 문제를 대체하지 않음 (educational core 유지)
// ============================================================

export const CARDS = {
  amplify: {
    id: 'amplify', name: 'AMPLIFIER',
    desc: '다음 정답 데미지 +1',
    icon: '⚡', color: '#ffd76b',
    timing: 'pre',
    effect: { nextDmgBonus: 1 },
  },
  doubletap: {
    id: 'doubletap', name: 'DOUBLE TAP',
    desc: '다음 정답 데미지 ×2',
    icon: '🎯', color: '#ff8c42',
    timing: 'pre',
    effect: { nextDmgMul: 2 },
  },
  shield: {
    id: 'shield', name: 'PHASE SHIELD',
    desc: '다음 오답 1회 무효',
    icon: '🛡', color: '#4cc9f0',
    timing: 'pre',
    effect: { evadeNextMiss: true },
  },
  medkit: {
    id: 'medkit', name: 'NANO-KIT',
    desc: 'HP +3 즉시 회복',
    icon: '⚕', color: '#88dd55',
    timing: 'instant',
    effect: { heal: 3 },
  },
  scan: {
    id: 'scan', name: 'DEEP SCAN',
    desc: '현재 정답 강조',
    icon: '🔮', color: '#88ddff',
    timing: 'instant',
    effect: { revealAnswer: true },
  },
  freeze: {
    id: 'freeze', name: 'TEMPORAL FREEZE',
    desc: '보스 타이머 +10초',
    icon: '⏱', color: '#a3dfff',
    timing: 'instant',
    effect: { timeBonus: 10 },
  },
  refocus: {
    id: 'refocus', name: 'REFOCUS',
    desc: 'STREAK +3 즉시 부여',
    icon: '✨', color: '#ff77bb',
    timing: 'instant',
    effect: { streakBoost: 3 },
  },
};

export function listCards() { return Object.values(CARDS); }

// 학생이 보유한 카드 (소비형) — 합쳐서 정렬된 배열
export function getDeck(player) {
  const cards = player.cards || {};
  return Object.entries(cards)
    .filter(([id, count]) => CARDS[id] && count > 0)
    .map(([id, count]) => ({ ...CARDS[id], count }));
}

export function totalCards(player) {
  return Object.values(player.cards || {}).reduce((a, b) => a + b, 0);
}

// 카드 사용 → count -1
export function useCard(player, cardId) {
  player.cards = player.cards || {};
  if ((player.cards[cardId] || 0) <= 0) return false;
  player.cards[cardId] -= 1;
  if (player.cards[cardId] <= 0) delete player.cards[cardId];
  return true;
}

// 카드 획득 (count + delta)
export function grantCard(player, cardId, count = 1) {
  player.cards = player.cards || {};
  player.cards[cardId] = (player.cards[cardId] || 0) + count;
}

// 무작위 카드 1개 획득
export function grantRandomCard(player) {
  const ids = Object.keys(CARDS);
  const id = ids[Math.floor(Math.random() * ids.length)];
  grantCard(player, id, 1);
  return CARDS[id];
}

// 초기 덱 (신규 학생)
export function seedStarterDeck(player) {
  if (player.cards && Object.keys(player.cards).length > 0) return;
  player.cards = {
    amplify: 2,
    scan: 2,
    shield: 1,
    medkit: 1,
  };
}

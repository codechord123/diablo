// ============================================================
// skills.js — 직업별 스킬 트리 (3직업 × 3 스킬 × 3 랭크)
// ============================================================
// 사용:
//   getAvailablePoints(player) — 사용 가능한 SP
//   upgrade(player, classId, skillId) — 1 SP 사용
//   applyToBattle(player, ctx) — 전투 보너스 계산
// ============================================================

export const SKILLS = {
  warrior: [
    { id: 'tough',   name: '견고함',   desc: '시작 HP +1/+2/+3',           icon: '🛡️', maxRank: 3 },
    { id: 'smash',   name: '강타',     desc: '정답 데미지 +0/+1/+2 (확률)', icon: '💥', maxRank: 3 },
    { id: 'endure',  name: '인내심',   desc: '오답 데미지 50%/30% 확률 무효', icon: '💪', maxRank: 2 },
  ],
  mage: [
    { id: 'combo',   name: '마법 폭발', desc: '콤보 주기 3→2회마다 +1',     icon: '🌟', maxRank: 2 },
    { id: 'wisdom',  name: '지혜',     desc: 'XP 획득 +10/+20/+30%',        icon: '📚', maxRank: 3 },
    { id: 'precise', name: '정확성',   desc: '정답 시 추가 데미지 확률',     icon: '🎯', maxRank: 3 },
  ],
  rogue: [
    { id: 'evasive', name: '회피 마스터',desc: '회피 확률 +5/+10/+15%',       icon: '🌀', maxRank: 3 },
    { id: 'loot',    name: '보물 사냥꾼',desc: '골드 +10/+20/+30%',           icon: '💰', maxRank: 3 },
    { id: 'lucky',   name: '행운',      desc: '연속 정답 시 추가 보너스',     icon: '🍀', maxRank: 3 },
  ],
};

// 레벨당 1 SP, 사용한 SP 차감
export function totalPoints(player) {
  return Math.max(0, (player.level || 1) - 1);
}
export function spentPoints(player) {
  const s = player.skills || {};
  return Object.values(s).reduce((a, b) => a + b, 0);
}
export function getAvailablePoints(player) {
  return Math.max(0, totalPoints(player) - spentPoints(player));
}
export function getRank(player, skillId) {
  return (player.skills && player.skills[skillId]) || 0;
}

export function upgrade(player, classId, skillId) {
  const def = (SKILLS[classId] || []).find(s => s.id === skillId);
  if (!def) return { ok: false, error: '스킬 없음' };
  player.skills = player.skills || {};
  const cur = player.skills[skillId] || 0;
  if (cur >= def.maxRank) return { ok: false, error: '최대 랭크 도달' };
  if (getAvailablePoints(player) < 1) return { ok: false, error: 'SP 부족' };
  player.skills[skillId] = cur + 1;
  return { ok: true };
}

// 전투 시 적용 — 데미지/회피/HP 등에 보너스 (BattleScene에서 호출)
export function getBonuses(player) {
  const r = (id) => getRank(player, id);
  return {
    extraStartHp:  r('tough') * 1,
    bonusDmgChance: 0.20 * r('smash') + 0.15 * r('precise'),
    bonusDmg:      Math.min(2, r('smash')) + (r('precise') > 0 ? 1 : 0),
    missImmuneChance: 0.5 - (r('endure') === 2 ? 0.2 : (r('endure') === 1 ? 0 : 0.5)),
    // endure: rank 1 = 50% 무효, rank 2 = 30% 추가 (총 80%)? 단순화: rank 1 = 30%, rank 2 = 50%
    extraEvade:    0.05 * r('evasive'),
    goldMul:       1 + 0.10 * r('loot'),
    xpMul:         1 + 0.10 * r('wisdom'),
    comboShorten:  r('combo'),  // 0~2
    luckyStreak:   r('lucky'),
  };
}

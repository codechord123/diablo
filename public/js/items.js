// ============================================================
// items.js — 아이템 카탈로그
// ============================================================

export const ITEMS = {
  // ---------- 포션 (소모품) ----------
  potion_small: {
    id: 'potion_small',
    type: 'potion',
    name: '산소 캡슐 (소)',
    desc: 'HP 3 회복',
    heal: 3,
    price: 15,
    icon: '🧪',
  },
  potion_large: {
    id: 'potion_large',
    type: 'potion',
    name: '나노 치료 키트',
    desc: 'HP 7 회복',
    heal: 7,
    price: 40,
    icon: '💉',
  },

  // ---------- 무기 (장비) ----------
  sword_basic: {
    id: 'sword_basic',
    type: 'weapon',
    name: '다중 도구',
    desc: '정답 시 적 HP -1',
    damage: 1,
    price: 0,
    icon: '🔧',
  },
  sword_steel: {
    id: 'sword_steel',
    type: 'weapon',
    name: '전자 도구',
    desc: '정답 시 적 HP -2',
    damage: 2,
    price: 80,
    icon: '🔫',
  },
  sword_magic: {
    id: 'sword_magic',
    type: 'weapon',
    name: '양자 도구',
    desc: '정답 시 적 HP -3',
    damage: 3,
    price: 200,
    icon: '⚡',
  },

  // ---------- 투구 (방어구) ----------
  helmet_leather: {
    id: 'helmet_leather',
    type: 'helmet',
    name: '운영 헬멧',
    desc: '최대 HP +1',
    hpBonus: 1,
    price: 50,
    icon: '🪖',
  },
  helmet_steel: {
    id: 'helmet_steel',
    type: 'helmet',
    name: '강화 헬멧',
    desc: '최대 HP +2',
    hpBonus: 2,
    price: 120,
    icon: '⛑️',
  },
  helmet_magic: {
    id: 'helmet_magic',
    type: 'helmet',
    name: '양자 헬멧',
    desc: '최대 HP +3 · 데이터 +5%',
    hpBonus: 3,
    xpBonus: 0.05,
    price: 280,
    icon: '👨‍🚀',
  },
};

// 카탈로그 (NPC별 판매 목록)
export const SHOPS = {
  merchant:    ['potion_small', 'potion_large'],                              // 상인
  blacksmith:  ['sword_steel', 'sword_magic', 'helmet_leather', 'helmet_steel', 'helmet_magic'], // 대장장이 (검 + 투구)
};

export const POTION_CAP = 99;

// 인벤토리에 포션 추가 (상한 적용)
export function addPotion(player, itemId) {
  player.inventory = player.inventory || {};
  const cur = player.inventory[itemId] || 0;
  player.inventory[itemId] = Math.min(POTION_CAP, cur + 1);
}

export function usePotion(player, itemId) {
  player.inventory = player.inventory || {};
  const cur = player.inventory[itemId] || 0;
  if (cur <= 0) return false;
  const item = ITEMS[itemId];
  if (!item || item.type !== 'potion') return false;
  if (player.hp >= player.maxHp) return false;
  player.hp = Math.min(player.maxHp, player.hp + item.heal);
  player.inventory[itemId] = cur - 1;
  return true;
}

// 첫 보유 포션 자동 사용 (단축키용)
export function useFirstPotion(player) {
  const order = ['potion_small', 'potion_large']; // 약한 것부터
  for (const id of order) {
    if ((player.inventory?.[id] || 0) > 0) {
      return usePotion(player, id) ? id : null;
    }
  }
  return null;
}

export function totalPotions(player) {
  const inv = player.inventory || {};
  return Object.entries(inv)
    .filter(([id]) => ITEMS[id]?.type === 'potion')
    .reduce((a, [, n]) => a + n, 0);
}

export function getEquippedWeapon(player) {
  return ITEMS[player.equippedWeapon || 'sword_basic'] || ITEMS.sword_basic;
}

export function canAfford(player, item) {
  return (player.gold || 0) >= item.price;
}

export function ownsWeapon(player, itemId) {
  return !!(player.weapons && player.weapons.includes(itemId));
}

export function ownsHelmet(player, itemId) {
  return !!(player.helmets && player.helmets.includes(itemId));
}

export function getEquippedHelmet(player) {
  return ITEMS[player.equippedHelmet] || null;
}

export function helmetHpBonus(player) {
  const h = getEquippedHelmet(player);
  return h?.hpBonus || 0;
}

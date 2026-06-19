// ============================================================
// eva-missions.js — Roguelike EVA Mission System
// ============================================================
// 한 EVA 출격 = 1 RUN (3 섹터). 섹터 사이에 절차적 이벤트.
// 런 상태는 localStorage에 영속 (브라우저 새로고침해도 진행 유지)
// ============================================================

const RUN_KEY = (nick) => `fd:eva-run:${nick}`;

export function startRun(nickname, opts = {}) {
  const run = {
    type: opts.type || 'patrol',
    sector: 1,
    totalSectors: opts.totalSectors || 3,
    sectorIcons: ['◯', '◯', '◯'],
    bonusGoldTotal: 0,
    bonusXpTotal: 0,
    eventsEncountered: [],
    sectorNames: generateSectorNames(),
    startTime: Date.now(),
    bossId: opts.bossId || null,   // 보스 EVA 모드
  };
  localStorage.setItem(RUN_KEY(nickname), JSON.stringify(run));
  return run;
}

export function getCurrentRun(nickname) {
  try { return JSON.parse(localStorage.getItem(RUN_KEY(nickname)) || 'null'); }
  catch (_) { return null; }
}

export function saveRun(nickname, run) {
  localStorage.setItem(RUN_KEY(nickname), JSON.stringify(run));
}

export function endRun(nickname) {
  const run = getCurrentRun(nickname);
  localStorage.removeItem(RUN_KEY(nickname));
  return run;
}

// 섹터 이름 (절차 생성)
function generateSectorNames() {
  const sectors = ['ZETA', 'KEPLER', 'ORION', 'ANDROMEDA', 'CASSIOPEIA', 'LYRA',
                   'PHOENIX', 'CRUX', 'PEGASUS', 'HYDRA', 'CYGNUS', 'DRACO'];
  const result = [];
  while (result.length < 3) {
    const name = sectors[Math.floor(Math.random() * sectors.length)] + '-' +
                 Math.floor(Math.random() * 99);
    if (!result.includes(name)) result.push(name);
  }
  return result;
}

// ============================================================
// 이벤트 풀 — 섹터 사이에 무작위 등장
// ============================================================
export const EVENTS = [
  {
    id: 'supply-cache',
    title: 'SUPPLY CACHE',
    icon: '📦',
    desc: '버려진 우주선에서 보급품을 발견했다.\n나노 치료 키트 1개를 회수했다.',
    effect: { potion: 'potion_large', gold: 0, xp: 0, hp: 0 },
    type: 'reward',
  },
  {
    id: 'oxygen-leak',
    title: 'OXYGEN LEAK',
    icon: '⚠',
    desc: '산소 누출. 누설을 막는 동안 시간을 잃었다.\nHP 1 손실.',
    effect: { hp: -1, gold: 0, xp: 0 },
    type: 'penalty',
  },
  {
    id: 'subspace-anomaly',
    title: 'SUBSPACE ANOMALY',
    icon: '🌀',
    desc: '아공간 균열을 통해 데이터를 수집했다.\n데이터 +30 획득.',
    effect: { hp: 0, gold: 0, xp: 30 },
    type: 'reward',
  },
  {
    id: 'pirate-trader',
    title: 'PIRATE TRADER',
    icon: '🪐',
    desc: '외계 무역상과 접촉.\n작은 산소 캡슐과 크레딧 15를 교환.',
    effect: { potion: 'potion_small', gold: -15 },
    type: 'trade',
  },
  {
    id: 'distress-beacon',
    title: 'DISTRESS BEACON',
    icon: '📡',
    desc: '조난 신호에 응답.\n구조 보상으로 크레딧 40 획득.',
    effect: { hp: 0, gold: 40, xp: 0 },
    type: 'reward',
  },
  {
    id: 'meditation-pod',
    title: 'MEDITATION POD',
    icon: '💠',
    desc: '명상 포드에서 휴식.\nHP 3 회복.',
    effect: { hp: 3 },
    type: 'reward',
  },
  {
    id: 'astrophage-trace',
    title: 'ASTROPHAGE TRACE',
    icon: '☢',
    desc: '아스트로파지 흔적 분석 — 통신 데이터 강화.\n데이터 +20, 크레딧 +20.',
    effect: { xp: 20, gold: 20 },
    type: 'reward',
  },
  {
    id: 'micro-asteroid',
    title: 'MICRO-ASTEROID',
    icon: '🌑',
    desc: '미세 운석 충돌. 선체에 작은 손상.\nHP 1 손실 + 크레딧 25 보상 (보험금).',
    effect: { hp: -1, gold: 25 },
    type: 'mixed',
  },
];

export function pickEvent(history = []) {
  // 같은 이벤트 연속 방지
  const recent = history.slice(-2);
  const pool = EVENTS.filter(e => !recent.includes(e.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

// 이벤트 효과 적용
export function applyEvent(player, event) {
  const e = event.effect || {};
  if (e.hp) {
    player.hp = Math.max(0, Math.min(player.maxHp, player.hp + e.hp));
  }
  if (e.gold) player.gold = Math.max(0, (player.gold || 0) + e.gold);
  if (e.xp)   player.xp = (player.xp || 0) + e.xp;
  if (e.potion) {
    player.inventory = player.inventory || {};
    player.inventory[e.potion] = (player.inventory[e.potion] || 0) + 1;
  }
}

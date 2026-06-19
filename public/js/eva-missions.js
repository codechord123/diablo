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
// type: 'auto' (효과 즉시) | 'choice' (선택지) | 'puzzle' (수학 게이트)
// ============================================================
export const EVENTS = [
  // ----- AUTO (즉시 효과) -----
  {
    id: 'supply-cache',
    title: 'SUPPLY CACHE',
    icon: '📦',
    type: 'auto',
    desc: '버려진 우주선에서 보급품을 발견했다.\n나노 치료 키트 1개를 회수했다.',
    effect: { potion: 'potion_large' },
  },
  {
    id: 'meditation-pod',
    title: 'MEDITATION POD',
    icon: '💠',
    type: 'auto',
    desc: '명상 포드에서 휴식.\nHP 3 회복.',
    effect: { hp: 3 },
  },
  {
    id: 'micro-asteroid',
    title: 'MICRO-ASTEROID',
    icon: '🌑',
    type: 'auto',
    desc: '미세 운석 충돌. 선체 손상.\nHP 1 손실 + 보험금 25 CR.',
    effect: { hp: -1, gold: 25 },
  },
  // ----- CHOICE (선택지) -----
  {
    id: 'distress-signal',
    title: 'DISTRESS SIGNAL',
    icon: '📡',
    type: 'choice',
    desc: '미상 우주선이 구조 신호를 보내고 있다.\n어떻게 할 것인가?',
    choices: [
      {
        label: '응답하여 구조한다',
        sub: 'HP -1 · DATA +30 · CR +40',
        effect: { hp: -1, xp: 30, gold: 40 },
        outcome: '구조 작전 성공. 생존자가 데이터와 크레딧을 넘겨주었다.',
      },
      {
        label: '무시하고 계속 진행',
        sub: '안전 · 보상 없음',
        effect: {},
        outcome: '신호는 점점 약해졌다. 안전이 우선이었다.',
      },
    ],
  },
  {
    id: 'mysterious-artifact',
    title: 'MYSTERIOUS ARTIFACT',
    icon: '💎',
    type: 'choice',
    desc: '발견된 외계 유물. 분석 vs 매각?',
    choices: [
      {
        label: '분석한다 (DATA +60)',
        sub: '연구 가치 — 데이터 우선',
        effect: { xp: 60 },
        outcome: '유물 해독. 새로운 외계 수학 패턴 발견.',
      },
      {
        label: '시장에 매각 (CR +70)',
        sub: '즉시 현금 — 크레딧 우선',
        effect: { gold: 70 },
        outcome: '암시장에 처분. 출처는 묻지 마라.',
      },
    ],
  },
  {
    id: 'pirate-encounter',
    title: 'PIRATE ENCOUNTER',
    icon: '🏴‍☠️',
    type: 'choice',
    desc: '외계 해적단과 조우. 어떻게 대응?',
    choices: [
      {
        label: '협상한다 (CR -30)',
        sub: '안전한 통과 — 통행료 지불',
        effect: { gold: -30 },
        outcome: '협상 성립. 해적단이 길을 비켜주었다.',
      },
      {
        label: '교전한다 (HP -2, CR +80)',
        sub: '위험 — 전리품 약탈',
        effect: { hp: -2, gold: 80, xp: 30 },
        outcome: '교전 승리. 해적의 보물상자를 회수했다.',
      },
      {
        label: '회피 시도한다 (랜덤)',
        sub: '50% 성공 — 실패 시 HP -3',
        effect: { random: [
          { chance: 0.5, label: 'SUCCESS', effect: {} },
          { chance: 0.5, label: 'CAUGHT',  effect: { hp: -3 } },
        ] },
        outcome: null,  // 결과에 따라 다른 메시지
      },
    ],
  },
  {
    id: 'subspace-tunnel',
    title: 'SUBSPACE TUNNEL',
    icon: '🌀',
    type: 'choice',
    desc: '단축 항로 발견. 시간 절약 vs 위험.',
    choices: [
      {
        label: '아공간 점프한다',
        sub: 'DATA +40 / HP -1 (워프 스트레스)',
        effect: { xp: 40, hp: -1 },
        outcome: '아공간 점프 완료. 강한 중력파에 잠시 흔들렸다.',
      },
      {
        label: '정상 항로 유지',
        sub: '안전 — 추가 사건 없음',
        effect: {},
        outcome: '안전한 길을 택했다.',
      },
    ],
  },
  {
    id: 'alien-trader',
    title: 'ALIEN TRADER',
    icon: '🪐',
    type: 'choice',
    desc: '우주 상인이 두 가지 거래를 제안한다.',
    choices: [
      {
        label: '나노 키트 ↔ 50 CR',
        sub: 'HP 회복 키트 구매',
        effect: { gold: -50, potion: 'potion_large' },
        outcome: '거래 완료. 나노 치료 키트 획득.',
      },
      {
        label: '데이터 칩 ↔ 80 CR',
        sub: '대량 경험치',
        effect: { gold: -80, xp: 100 },
        outcome: '거래 완료. 외계 수학 칩에서 데이터 추출.',
      },
      {
        label: '거래 거절',
        sub: '둘 다 사양',
        effect: {},
        outcome: '상인은 어깨를 으쓱하고 떠났다.',
      },
    ],
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
  return applyEffect(player, e);
}

// 선택지 효과 적용 (랜덤 분기 지원)
export function applyChoiceEffect(player, choiceEffect) {
  if (choiceEffect && choiceEffect.random) {
    // 랜덤 선택
    const r = Math.random();
    let acc = 0;
    for (const opt of choiceEffect.random) {
      acc += opt.chance;
      if (r <= acc) {
        applyEffect(player, opt.effect);
        return { label: opt.label, effect: opt.effect };
      }
    }
  }
  applyEffect(player, choiceEffect);
  return null;
}

function applyEffect(player, e) {
  if (!e) return;
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

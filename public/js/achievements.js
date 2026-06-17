// ============================================================
// achievements.js — 도전과제(배지) 시스템
// ============================================================
const KEY = (nick) => `fd:achievements:${nick}`;

export const ACHIEVEMENTS = [
  { id: 'first-kill',       name: '첫 사냥',       desc: '첫 몬스터 처치',         icon: '🗡️', reward: 20 },
  { id: 'first-boss',       name: '보스 사냥꾼',   desc: '첫 보스 처치',           icon: '👑', reward: 100 },
  { id: 'all-bosses',       name: '왕좌의 주인',   desc: '모든 보스 4종 처치',     icon: '🏆', reward: 500 },
  { id: 'no-mistake',       name: '완벽한 전투',   desc: '오답 없이 1전투 클리어', icon: '💎', reward: 30 },
  { id: 'no-mistake-10',    name: '집중의 대가',   desc: '오답 없이 10전투',       icon: '✨', reward: 200 },
  { id: 'level-5',          name: '견습생',        desc: '레벨 5 도달',            icon: '⭐', reward: 50 },
  { id: 'level-10',         name: '베테랑',        desc: '레벨 10 도달',           icon: '🌟', reward: 150 },
  { id: 'level-20',         name: '전설',          desc: '레벨 20 도달',           icon: '🌠', reward: 500 },
  { id: 'rich-100',         name: '주머니 가득',   desc: '100골드 보유',           icon: '💰', reward: 0 },
  { id: 'rich-500',         name: '부자',          desc: '500골드 보유',           icon: '💎', reward: 0 },
  { id: 'sword-magic',      name: '마법 검사',     desc: '마법 검 획득',           icon: '🌟', reward: 50 },
  { id: 'review-master',    name: '복습 마스터',   desc: '오답 10개 클리어',       icon: '📚', reward: 100 },
  { id: 'streak-correct-10',name: '연속 정답',     desc: '연속 정답 10회',         icon: '🔥', reward: 80 },
];

export function listUnlocked(nickname) {
  try { return JSON.parse(localStorage.getItem(KEY(nickname)) || '[]'); }
  catch (_) { return []; }
}

export function isUnlocked(nickname, id) {
  return listUnlocked(nickname).includes(id);
}

export function unlock(nickname, id) {
  const arr = listUnlocked(nickname);
  if (arr.includes(id)) return null;
  arr.push(id);
  localStorage.setItem(KEY(nickname), JSON.stringify(arr));
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (def) showAchievementToast(def);
  return def;
}

// 토스트 알림 (게임 우측 상단 슬라이드 인)
let toastQueue = [];
let toastShowing = false;
export function showAchievementToast(def) {
  toastQueue.push(def);
  if (!toastShowing) drainToast();
}
function drainToast() {
  const def = toastQueue.shift();
  if (!def) { toastShowing = false; return; }
  toastShowing = true;
  let el = document.getElementById('achievement-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'achievement-toast';
    el.className = 'achievement-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="at-icon">${def.icon}</div>
    <div class="at-body">
      <div class="at-label">🏆 도전과제 달성!</div>
      <div class="at-name">${def.name}</div>
      <div class="at-desc">${def.desc}${def.reward ? ` &middot; +${def.reward}G` : ''}</div>
    </div>
  `;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(drainToast, 250);
  }, 3500);
}

// ----- 트리거 헬퍼 -----
// 체크해야 할 조건들을 player 상태에 따라 검사하고 골드 보상까지 자동 부여
export function checkAchievements(player, nickname, ctx = {}) {
  const checks = [
    [() => (player.kills || 0) >= 1, 'first-kill'],
    [() => (player.defeatedBosses || []).length >= 1, 'first-boss'],
    [() => (player.defeatedBosses || []).length >= 4, 'all-bosses'],
    [() => ctx.noMistakeBattle === true, 'no-mistake'],
    [() => (player.noMistakeBattles || 0) >= 10, 'no-mistake-10'],
    [() => (player.level || 0) >= 5, 'level-5'],
    [() => (player.level || 0) >= 10, 'level-10'],
    [() => (player.level || 0) >= 20, 'level-20'],
    [() => (player.gold || 0) >= 100, 'rich-100'],
    [() => (player.gold || 0) >= 500, 'rich-500'],
    [() => (player.weapons || []).includes('sword_magic'), 'sword-magic'],
    [() => (player.reviewedCount || 0) >= 10, 'review-master'],
    [() => (player.correctStreakMax || 0) >= 10, 'streak-correct-10'],
  ];
  const newly = [];
  for (const [cond, id] of checks) {
    if (isUnlocked(nickname, id)) continue;
    try {
      if (cond()) {
        const def = unlock(nickname, id);
        if (def) {
          player.gold = (player.gold || 0) + (def.reward || 0);
          newly.push(def);
        }
      }
    } catch (_) {}
  }
  return newly;
}

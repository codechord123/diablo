// ============================================================
// achievements.js — 도전과제(배지) 시스템
// ============================================================
const KEY = (nick) => `fd:achievements:${nick}`;

// 서사 발견 로그 — '도전과제'가 아니라 '선장 일지'
export const ACHIEVEMENTS = [
  { id: 'first-kill', icon: '◉', name: 'FIRST CONTACT',
    desc: '드론급 아스트로파지 변종과 첫 통신 성공. 외계 수학은 우리의 수학과 같다.',
    reward: 20 },
  { id: 'first-boss', icon: '☢', name: 'VARIANT ALPHA NEUTRALIZED',
    desc: '달의 아스트로파지 — 변종 알파. 동분모 신호 패턴 회수 완료.',
    reward: 100 },
  { id: 'all-bosses', icon: '✦', name: 'PROTOCOL: HAIL MARY',
    desc: '모든 아스트로파지 변종이 해독되었다. 지구로의 송신이 완료되었다.',
    reward: 500 },
  { id: 'no-mistake', icon: '◆', name: 'PERFECT HARMONIC',
    desc: '오류 0회로 통신 완료. 외계어 이해도가 99%에 도달했다.',
    reward: 30 },
  { id: 'no-mistake-10', icon: '✧', name: 'MASTER FREQUENCY',
    desc: '10회 연속 완벽 통신. 헤일메리호 통신 효율 +20%.',
    reward: 200 },
  { id: 'level-5', icon: '▲', name: 'CLEARANCE LV.5',
    desc: '경험 등급 5 인증. 추가 모듈 접근 권한 획득.',
    reward: 50 },
  { id: 'level-10', icon: '▲▲', name: 'CLEARANCE LV.10',
    desc: '경험 등급 10 인증. 상급 임무 자격 부여.',
    reward: 150 },
  { id: 'level-20', icon: '★', name: 'COMMAND CLEARANCE',
    desc: '최고 등급 20 인증. 임무 사령관 자격 획득.',
    reward: 500 },
  { id: 'rich-100', icon: '◇', name: 'RESOURCE STOCKPILE',
    desc: '100 크레딧 비축. 보급 모듈 활용 가능.',
    reward: 0 },
  { id: 'rich-500', icon: '◈', name: 'STRATEGIC RESERVE',
    desc: '500 크레딧 비축. 헤일메리호 비상 자원 확보.',
    reward: 0 },
  { id: 'sword-magic', icon: '⚡', name: 'QUANTUM TOOL EQUIPPED',
    desc: '양자 도구 활성화. 아스트로파지 분해 효율 +200%.',
    reward: 50 },
  { id: 'review-master', icon: '◊', name: 'PATTERN ANALYST',
    desc: '오답 10건 분석 완료. 변종 패턴 데이터베이스 구축 중.',
    reward: 100 },
  { id: 'streak-correct-10', icon: '⟁', name: 'PERFECT RESONANCE',
    desc: '10연속 하모닉 매칭. 우주의 수학적 진리가 보인다.',
    reward: 80 },
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

// ============================================================
// missions.js — 일일 미션 (매일 자정 갱신)
// ============================================================
const KEY = (nick) => `fd:missions:${nick}`;

const TEMPLATES = [
  { id: 'kill-5',    name: '몬스터 5마리 처치',  target: 5,  field: 'kills',         reward: 50 },
  { id: 'kill-10',   name: '몬스터 10마리 처치', target: 10, field: 'kills',         reward: 120 },
  { id: 'correct-15',name: '정답 15개 맞히기',   target: 15, field: 'corrects',      reward: 60 },
  { id: 'correct-30',name: '정답 30개 맞히기',   target: 30, field: 'corrects',      reward: 150 },
  { id: 'no-miss-1', name: '오답 없이 1전투',    target: 1,  field: 'perfectBattles',reward: 80 },
  { id: 'level-up',  name: '레벨 1회 상승',      target: 1,  field: 'levelUps',      reward: 70 },
  { id: 'spend-50',  name: '상점에서 50G 사용',  target: 50, field: 'spent',         reward: 40 },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTodaysMissions(nickname) {
  const stored = JSON.parse(localStorage.getItem(KEY(nickname)) || 'null');
  const today = todayKey();
  if (stored && stored.date === today) return stored;

  // 새 미션 — 무작위 3개
  const picks = shuffle(TEMPLATES).slice(0, 3).map(t => ({
    ...t,
    progress: 0,
    claimed: false,
  }));
  const fresh = { date: today, missions: picks, counters: {} };
  localStorage.setItem(KEY(nickname), JSON.stringify(fresh));
  return fresh;
}

// 이벤트 증가 (예: trackEvent(nick, 'kills', 1))
export function trackEvent(nickname, field, amount = 1) {
  const data = getTodaysMissions(nickname);
  data.counters[field] = (data.counters[field] || 0) + amount;
  // 미션 진행도 갱신
  data.missions.forEach(m => {
    if (m.field === field && !m.claimed) {
      m.progress = Math.min(m.target, data.counters[field]);
    }
  });
  localStorage.setItem(KEY(nickname), JSON.stringify(data));
}

export function claimMission(nickname, id) {
  const data = getTodaysMissions(nickname);
  const m = data.missions.find(x => x.id === id);
  if (!m || m.claimed || m.progress < m.target) return null;
  m.claimed = true;
  localStorage.setItem(KEY(nickname), JSON.stringify(data));
  return m;
}

export function hasCompletedMission(nickname) {
  const data = getTodaysMissions(nickname);
  return data.missions.some(m => m.progress >= m.target && !m.claimed);
}

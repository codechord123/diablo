// ============================================================
// dashboard.js — 학생 진도 대시보드
// ============================================================
import { listStudents, listClasses, getProgress } from './storage.js';

const CLASS_ICONS = { warrior: '⚔️', mage: '🔮', rogue: '🗡️' };
const CLASS_NAMES = { warrior: '전사', mage: '마법사', rogue: '도적' };

function xpToNext(level) { return 30 + level * 20; }

function loadAll() {
  return listStudents().map(s => ({
    ...s,
    progress: getProgress(s.nickname),
  }));
}

function compute(students) {
  const total = students.length;
  if (total === 0) return { total: 0, avgLevel: 0, totalKills: 0, totalBosses: 0 };
  let lvSum = 0, kills = 0, bosses = 0;
  students.forEach(s => {
    const p = s.progress || {};
    lvSum += p.level || 1;
    kills += p.kills || 0;
    bosses += (p.defeatedBosses || []).length;
  });
  return {
    total,
    avgLevel: (lvSum / total).toFixed(1),
    totalKills: kills,
    totalBosses: bosses,
  };
}

function sortStudents(students, mode) {
  const arr = [...students];
  switch (mode) {
    case 'xp':
      arr.sort((a, b) => {
        const al = (a.progress?.level || 0) * 10000 + (a.progress?.xp || 0);
        const bl = (b.progress?.level || 0) * 10000 + (b.progress?.xp || 0);
        return bl - al;
      });
      break;
    case 'kills':
      arr.sort((a, b) => (b.progress?.kills || 0) - (a.progress?.kills || 0));
      break;
    case 'bosses':
      arr.sort((a, b) =>
        ((b.progress?.defeatedBosses || []).length) -
        ((a.progress?.defeatedBosses || []).length)
      );
      break;
    case 'name':
      arr.sort((a, b) => a.nickname.localeCompare(b.nickname));
      break;
    case 'level':
    default:
      arr.sort((a, b) => (b.progress?.level || 0) - (a.progress?.level || 0));
  }
  return arr;
}

function renderClassFilter() {
  const sel = document.getElementById('filter-class');
  const classes = listClasses();
  sel.innerHTML = '<option value="">전체</option>';
  classes.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

function renderStats(stats) {
  document.getElementById('stat-students').textContent = stats.total;
  document.getElementById('stat-avg-level').textContent = stats.avgLevel;
  document.getElementById('stat-total-kills').textContent = stats.totalKills;
  document.getElementById('stat-bosses').textContent = stats.totalBosses;
}

function renderLeaderboard(students) {
  const ol = document.getElementById('leaderboard');
  ol.innerHTML = '';
  const top = sortStudents(students, 'xp').slice(0, 5);
  if (top.length === 0) {
    ol.innerHTML = '<li class="lb-empty">아직 학생이 없습니다</li>';
    return;
  }
  top.forEach((s, i) => {
    const p = s.progress || {};
    const li = document.createElement('li');
    li.className = `lb-row lb-rank-${i+1}`;
    li.innerHTML = `
      <span class="lb-rank">${['🥇','🥈','🥉','4','5'][i]}</span>
      <span class="lb-name">${s.nickname}</span>
      <span class="lb-class">${CLASS_ICONS[p.class] || ''} ${CLASS_NAMES[p.class] || ''}</span>
      <span class="lb-level">Lv ${p.level || 1}</span>
      <span class="lb-xp">${p.xp || 0} XP</span>
    `;
    ol.appendChild(li);
  });
}

function renderStudentGrid(students) {
  const grid = document.getElementById('student-grid');
  grid.innerHTML = '';
  if (students.length === 0) {
    grid.innerHTML = '<div class="empty">필터에 해당하는 학생이 없습니다</div>';
    return;
  }
  students.forEach(s => {
    const p = s.progress || {};
    const xpPct = p.level ? Math.min(100, (p.xp / xpToNext(p.level)) * 100) : 0;
    const hpPct = p.maxHp ? (p.hp / p.maxHp) * 100 : 0;
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="sc-header">
        <span class="sc-icon">${CLASS_ICONS[p.class] || '🧑‍🎓'}</span>
        <span class="sc-name">${s.nickname}</span>
        <span class="sc-class">${CLASS_NAMES[p.class] || '미선택'}</span>
      </div>
      <div class="sc-meta">학급: ${s.classCode || 'default'}</div>
      <div class="sc-stats">
        <div class="sc-stat">
          <div class="sc-stat-key">레벨</div>
          <div class="sc-stat-val">${p.level || 1}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-key">처치</div>
          <div class="sc-stat-val">${p.kills || 0}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-key">💰</div>
          <div class="sc-stat-val">${p.gold || 0}</div>
        </div>
        <div class="sc-stat">
          <div class="sc-stat-key">오답</div>
          <div class="sc-stat-val">${p.mistakes || 0}</div>
        </div>
      </div>
      <div class="sc-bar-label">HP ${p.hp || 0}/${p.maxHp || 0}</div>
      <div class="sc-bar"><div class="sc-bar-fill sc-bar-hp" style="width:${hpPct}%"></div></div>
      <div class="sc-bar-label">XP ${p.xp || 0}/${xpToNext(p.level || 1)}</div>
      <div class="sc-bar"><div class="sc-bar-fill sc-bar-xp" style="width:${xpPct}%"></div></div>
      <div class="sc-bosses">
        🐲 처치 보스: ${(p.defeatedBosses || []).length} / 4
        ${(p.defeatedBosses || []).map(b => bossEmoji(b)).join(' ')}
      </div>
    `;
    grid.appendChild(card);
  });
}

function bossEmoji(id) {
  return {
    'skeleton-king': '💀',
    'necro-captain': '🧟',
    'demon-knight':  '👹',
    'dragon-lord':   '🐲',
  }[id] || '⚔️';
}

function refresh() {
  const all = loadAll();
  const classFilter = document.getElementById('filter-class').value;
  const sortMode = document.getElementById('filter-sort').value;
  const filtered = all.filter(s => !classFilter || s.classCode === classFilter);
  const sorted = sortStudents(filtered, sortMode);
  renderStats(compute(filtered));
  renderLeaderboard(filtered);
  renderStudentGrid(sorted);
}

function init() {
  renderClassFilter();
  refresh();
  document.getElementById('filter-class').addEventListener('change', refresh);
  document.getElementById('filter-sort').addEventListener('change', refresh);
  document.getElementById('dash-refresh').addEventListener('click', refresh);
  // 5초마다 자동 갱신 (학생들이 플레이 중일 때 라이브 업데이트)
  setInterval(refresh, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================
// game.js — 게임 루프 및 DOM UI 컨트롤러
// ============================================================
import { generateProblem, checkAnswer, problemToHtml } from './fractionEngine.js';
import { pickMonster, xpToNext } from './monsters.js';
import { getUser, loadProgress, saveProgress } from './firebase-config.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  uid: null,
  player: null,     // { level, xp, hp, maxHp, kills, mistakes }
  monster: null,
  problem: null,
  locked: false,    // 채점 중 중복 입력 방지
};

// ------------------------------------------------------------
// 부팅
// ------------------------------------------------------------
async function boot() {
  const user = await getUser();
  state.uid = user.uid;
  state.player = await loadProgress(user.uid);
  renderPlayer();
  spawnMonster();
}

// ------------------------------------------------------------
// 몬스터 스폰 + 문제 생성
// ------------------------------------------------------------
function spawnMonster() {
  state.monster = pickMonster(state.player.level);
  state.problem = generateProblem(state.player.level);
  state.locked = false;
  renderMonster();
  renderProblem();
  $('#feedback').textContent = '';
}

// ------------------------------------------------------------
// 공격 처리 — 정답이면 데미지, 오답이면 자기 HP 감소
// ------------------------------------------------------------
async function attack(choice) {
  if (state.locked) return;
  state.locked = true;

  const correct = checkAnswer(choice, state.problem.answer);
  const feedback = $('#feedback');
  const monsterEl = $('#monster');

  if (correct) {
    state.monster.currentHp -= 1;
    feedback.innerHTML = `✨ 명중! ${problemToHtml(state.problem)} = ${state.problem.answer.toHtml()}`;
    feedback.className = 'feedback hit';
    monsterEl.classList.add('shake');
    setTimeout(() => monsterEl.classList.remove('shake'), 300);

    if (state.monster.currentHp <= 0) {
      await onMonsterKilled();
    } else {
      renderMonster();
      nextProblem();
    }
  } else {
    state.player.hp = Math.max(0, state.player.hp - 1);
    state.player.mistakes += 1;
    feedback.innerHTML = `💥 빗나감! 정답은 ${state.problem.answer.toHtml()}`;
    feedback.className = 'feedback miss';
    $('#player').classList.add('shake');
    setTimeout(() => $('#player').classList.remove('shake'), 300);
    renderPlayer();

    if (state.player.hp <= 0) {
      onPlayerDown();
    } else {
      nextProblem();
    }
  }
  await saveProgress(state.uid, state.player);
}

// 다음 문제로 — 잠깐 텀을 줘서 학생이 피드백을 읽을 시간 확보
function nextProblem() {
  setTimeout(() => {
    state.problem = generateProblem(state.player.level);
    renderProblem();
    state.locked = false;
  }, 700);
}

async function onMonsterKilled() {
  const gained = state.monster.xp;
  state.player.xp += gained;
  state.player.kills += 1;
  $('#feedback').textContent = `🏆 ${state.monster.name} 처치! +${gained} XP`;

  // 레벨업 체크
  while (state.player.xp >= xpToNext(state.player.level)) {
    state.player.xp -= xpToNext(state.player.level);
    state.player.level += 1;
    state.player.maxHp += 1;
    state.player.hp = state.player.maxHp;
    flashLevelUp();
  }
  renderPlayer();
  setTimeout(spawnMonster, 1100);
}

function onPlayerDown() {
  $('#feedback').textContent = '☠️ 쓰러졌습니다... 다시 일어납니다!';
  state.player.hp = state.player.maxHp;
  renderPlayer();
  setTimeout(spawnMonster, 1500);
}

function flashLevelUp() {
  const banner = $('#levelup');
  banner.textContent = `LEVEL UP! → Lv.${state.player.level}`;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 1500);
}

// ------------------------------------------------------------
// 렌더링
// ------------------------------------------------------------
function renderPlayer() {
  $('#lv').textContent = state.player.level;
  $('#hp').textContent = `${state.player.hp} / ${state.player.maxHp}`;
  $('#xp').textContent = `${state.player.xp} / ${xpToNext(state.player.level)}`;
  $('#kills').textContent = state.player.kills;
  const hpPct = (state.player.hp / state.player.maxHp) * 100;
  $('#hp-bar').style.width = `${hpPct}%`;
  const xpPct = (state.player.xp / xpToNext(state.player.level)) * 100;
  $('#xp-bar').style.width = `${xpPct}%`;
}

function renderMonster() {
  const m = state.monster;
  $('#monster-emoji').textContent = m.emoji;
  $('#monster-name').textContent = m.name;
  $('#monster-hp').textContent = `${m.currentHp} / ${m.maxHp}`;
  $('#monster').style.borderColor = m.color;
  const pct = (m.currentHp / m.maxHp) * 100;
  $('#monster-hp-bar').style.width = `${pct}%`;
}

function renderProblem() {
  // 진짜 분수 모양으로 렌더링
  $('#problem-text').innerHTML = `${problemToHtml(state.problem)} <span class="op">=</span> <span class="q">?</span>`;
  const box = $('#choices');
  box.innerHTML = '';
  state.problem.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    // 선택지 "n/d" 문자열을 분수 모양으로
    const [n, d] = c.split('/');
    btn.innerHTML = `<span class="frac frac-sm"><span class="num">${n}</span><span class="den">${d}</span></span>`;
    btn.addEventListener('click', () => attack(c));
    box.appendChild(btn);
  });
}

boot();

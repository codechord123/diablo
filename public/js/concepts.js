// ============================================================
// concepts.js — 개념 카드 (학생 친화 설명)
// ============================================================
import { fractionSVG } from './fraction-vis.js';

const SEEN_KEY = (nick, id) => `fd:concept:${nick}:${id}`;

export function hasSeen(nickname, id) {
  return localStorage.getItem(SEEN_KEY(nickname, id)) === '1';
}
export function markSeen(nickname, id) {
  localStorage.setItem(SEEN_KEY(nickname, id), '1');
}

// 개념 카드 콘텐츠
export const CONCEPTS = {
  intro: {
    id: 'intro',
    title: '🎓 환영합니다!',
    body: `
      <p>여기는 <strong>분수 던전</strong>!</p>
      <p>몬스터에게 공격하려면 <strong>분수 문제</strong>를 풀어야 합니다.</p>
      <p>정답을 맞히면 몬스터 HP가 줄어들고, 틀리면 내가 데미지를 받아요.</p>
      <p>중간에 <strong>📝 풀이 노트</strong>를 열어 계산해도 됩니다.</p>
    `,
    triggerOn: 'first_battle',
  },
  lcm: {
    id: 'lcm',
    title: '🎓 통분이란?',
    body: `
      <p>분모가 <strong>다른</strong> 두 분수를 더하거나 빼려면<br>
      먼저 <strong>분모를 같게</strong> 만들어야 합니다.</p>
      <div class="concept-example">
        ${fractionSVG(1, 2, { color: '#4cc9f0', size: 56 })}
        <span class="concept-op">+</span>
        ${fractionSVG(1, 3, { color: '#ff77bb', size: 56 })}
        <span class="concept-op">=</span>
        <span class="concept-question">?</span>
      </div>
      <p>두 분모 <strong>2와 3</strong>의 최소공배수: <strong>6</strong></p>
      <div class="concept-example">
        ${fractionSVG(3, 6, { color: '#4cc9f0', size: 48 })}
        <span class="concept-op">+</span>
        ${fractionSVG(2, 6, { color: '#ff77bb', size: 48 })}
        <span class="concept-op">=</span>
        ${fractionSVG(5, 6, { color: '#ffd700', size: 48 })}
      </div>
      <p class="concept-hint">💡 분모가 같아지면 분자끼리 더하면 됩니다!</p>
    `,
    triggerOn: 'first_diff_denom',
  },
  hint: {
    id: 'hint',
    title: '💡 막힐 땐 힌트!',
    body: `
      <p>문제 풀이 중 <strong>💡 힌트</strong> 버튼을 누르면<br>
      두 분모의 최소공배수를 알려줍니다.</p>
      <p>힌트를 사용해도 정답이 인정되지만<br>
      획득 경험치는 절반으로 줄어듭니다.</p>
    `,
    triggerOn: 'first_hint_available',
  },
};

// 모달 표시 — Promise(resolved on close)
export function showConcept(id) {
  return new Promise((resolve) => {
    const c = CONCEPTS[id];
    if (!c) return resolve();
    const modal = document.getElementById('concept-modal');
    document.getElementById('concept-title').textContent = c.title;
    document.getElementById('concept-body').innerHTML = c.body;
    modal.classList.add('show');
    const close = () => {
      modal.classList.remove('show');
      btn.removeEventListener('click', close);
      resolve();
    };
    const btn = document.getElementById('concept-close');
    btn.addEventListener('click', close);
  });
}

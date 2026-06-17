// ============================================================
// fractionEngine.js — 분수 게임 두뇌 v3
// ============================================================
// 정책:
// - 모든 문제는 이분모 (다른 분모) — 초5 핵심 학습 목표
// - 통분된 공통분모(LCM) ≤ 99 — 두 자릿수 이내
// - 같은 던전 내 같은 문제 중복 방지 (외부 Set 사용)
// ============================================================

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export class Fraction {
  constructor(n, d) {
    if (d === 0) throw new Error('분모는 0이 될 수 없습니다');
    const sign = d < 0 ? -1 : 1;
    const g = gcd(Math.abs(n), Math.abs(d));
    this.n = (sign * n) / g;
    this.d = Math.abs(d) / g;
  }
  add(f) { return new Fraction(this.n * f.d + f.n * this.d, this.d * f.d); }
  sub(f) { return new Fraction(this.n * f.d - f.n * this.d, this.d * f.d); }
  equals(f) { return this.n === f.n && this.d === f.d; }
  toString() { return `${this.n}/${this.d}`; }
  toHtml() {
    return `<span class="frac"><span class="num">${this.n}</span><span class="den">${this.d}</span></span>`;
  }
}

// 카테고리 라벨 (HUD/모달용)
export const CATEGORIES = {
  'add-same': { label: '이분모 덧셈' },
  'sub-same': { label: '이분모 뺄셈' },
  'add-diff': { label: '이분모 덧셈' },
  'sub-diff': { label: '이분모 뺄셈' },
  'mixed':    { label: '덧셈 + 뺄셈' },
};

const isAdd = (c) => c?.startsWith('add');
const isSub = (c) => c?.startsWith('sub');

// 레벨별 분모 범위 (LCM ≤ 99 항상 보장)
function denominatorRange(level) {
  if (level >= 15) return { min: 2, max: 11 };  // 최대 LCM lcm(9,11)=99
  if (level >= 10) return { min: 2, max: 9  };  // 최대 LCM lcm(8,9)=72
  if (level >= 5)  return { min: 2, max: 7  };  // 최대 LCM lcm(6,7)=42
  return { min: 2, max: 5 };                    // 최대 LCM lcm(4,5)=20
}

// 공개 API: opts.exclude = Set of "a/b op c/d" 키 (같은 던전 내 중복 방지)
export function generateProblem(level, requestedCategory = 'mixed', opts = {}) {
  let problem = null;
  const exclude = opts.exclude;
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = generateOne(level, requestedCategory);
    if (!exclude || !exclude.has(p.key)) {
      problem = p;
      break;
    }
  }
  // 폴백 — 40번 시도해도 중복뿐이면 그냥 반환
  if (!problem) problem = generateOne(level, requestedCategory);
  if (exclude) exclude.add(problem.key);
  return problem;
}

function generateOne(level, category) {
  const r = denominatorRange(level);
  // 연산 결정
  const op = isAdd(category) ? '+' : isSub(category) ? '-' : (Math.random() < 0.5 ? '+' : '-');

  // 두 분모 선택 — 다른 값 + LCM ≤ 99
  let d1, d2, lcmVal;
  for (let t = 0; t < 80; t++) {
    d1 = randInt(r.min, r.max);
    d2 = randInt(r.min, r.max);
    if (d1 === d2) continue;
    lcmVal = lcm(d1, d2);
    if (lcmVal <= 99) break;
  }
  if (d1 === d2 || lcm(d1, d2) > 99) {
    // 폴백 — 작은 안전한 쌍
    d1 = 3; d2 = 4;
  }

  // 분자: 1 ~ d-1 (진분수)
  let a = new Fraction(randInt(1, d1 - 1), d1);
  let b = new Fraction(randInt(1, d2 - 1), d2);

  // 뺄셈일 때 결과가 음수가 되지 않도록 보장
  if (op === '-' && (a.n / a.d) < (b.n / b.d)) [a, b] = [b, a];

  const answer = op === '+' ? a.add(b) : a.sub(b);
  const text = `${a.toString()} ${op} ${b.toString()}`;
  const key = `${a.n}/${a.d}|${op}|${b.n}/${b.d}`;

  return {
    a, b, op, answer, category, text, key,
    choices: buildChoices(answer),
  };
}

// 4지선다 — 정답 + 그럴듯한 오답 3개
function buildChoices(correct) {
  const set = new Set([correct.toString()]);
  // 학생이 잘 하는 실수 패턴: 분자만 더함, 분모만 더함, 약분 실수
  const candidates = [
    [correct.n + 1, correct.d],
    [correct.n - 1, correct.d],
    [correct.n,     correct.d + 1],
    [correct.n + 1, correct.d + 2],
    [correct.n * 2, correct.d * 2 + 1],
    [correct.n,     correct.d - 1],
  ];
  for (const [n, d] of candidates) {
    if (n <= 0 || d <= 0) continue;
    try {
      set.add(new Fraction(n, d).toString());
      if (set.size === 4) break;
    } catch (_) {}
  }
  // 모자라면 무작위로 채움
  let safety = 0;
  while (set.size < 4 && safety++ < 30) {
    const n = Math.max(1, correct.n + randInt(-2, 2));
    const d = Math.max(2, correct.d + randInt(-1, 2));
    try { set.add(new Fraction(n, d).toString()); } catch (_) {}
  }
  return shuffle([...set]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function checkAnswer(userInput, correctFraction) {
  const m = String(userInput).trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!m) return false;
  try {
    return new Fraction(+m[1], +m[2]).equals(correctFraction);
  } catch (_) { return false; }
}

export function problemToHtml(problem) {
  return `${problem.a.toHtml()} <span class="op">${problem.op}</span> ${problem.b.toHtml()}`;
}

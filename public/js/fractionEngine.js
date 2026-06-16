// ============================================================
// fractionEngine.js — 분수 게임의 두뇌 (카테고리 기반 v2)
// ============================================================
// 카테고리:
//   add-same  : 동분모 덧셈   (1레벨~)
//   sub-same  : 동분모 뺄셈   (3레벨~)
//   add-diff  : 이분모 덧셈   (8레벨~)
//   sub-diff  : 이분모 뺄셈   (12레벨~)
//   mixed     : 대/가분수 변환 (16레벨~)
// ============================================================

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
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

export const CATEGORIES = {
  'add-same': { minLevel: 1,  label: '동분모 덧셈' },
  'sub-same': { minLevel: 3,  label: '동분모 뺄셈' },
  'add-diff': { minLevel: 8,  label: '이분모 덧셈' },
  'sub-diff': { minLevel: 12, label: '이분모 뺄셈' },
  'mixed':    { minLevel: 16, label: '대분수' },
};

// 레벨에 따라 분모/분자 범위가 함께 커지는 난이도 곡선
function rangeFor(level) {
  // level 1 → max 5, level 20 → max 12
  const cap = Math.min(12, 4 + Math.floor(level * 0.5));
  return { min: 2, max: cap };
}

export function generateProblem(level, requestedCategory = null) {
  const category = pickCategory(level, requestedCategory);
  switch (category) {
    case 'sub-same': return makeSubSame(level, category);
    case 'add-diff': return makeAddDiff(level, category);
    case 'sub-diff': return makeSubDiff(level, category);
    case 'mixed':    return makeMixed(level, category);
    case 'add-same':
    default:         return makeAddSame(level, category);
  }
}

// 몬스터가 요청한 카테고리가 너무 어려우면 자동으로 가능한 가장 가까운 카테고리로 폴백
function pickCategory(level, requested) {
  const available = Object.entries(CATEGORIES)
    .filter(([_, c]) => level >= c.minLevel)
    .map(([k]) => k);
  if (requested && available.includes(requested)) return requested;
  if (requested) {
    // 폴백: 가장 비슷한 (덧셈 ↔ 덧셈, 뺄셈 ↔ 뺄셈)
    const isAdd = requested.startsWith('add');
    const fallback = available.reverse().find(c => c.startsWith(isAdd ? 'add' : 'sub'));
    if (fallback) return fallback;
  }
  return available[available.length - 1] || 'add-same';
}

// ---------- 카테고리별 문제 생성 ----------
function makeAddSame(level, category) {
  const r = rangeFor(level);
  const c = randInt(Math.max(3, r.min), r.max);
  const a = new Fraction(randInt(1, c - 2), c);
  const b = new Fraction(randInt(1, c - a.n), c);
  return pack(a, b, '+', category);
}

function makeSubSame(level, category) {
  const r = rangeFor(level);
  const c = randInt(Math.max(3, r.min), r.max);
  const an = randInt(2, c - 1);
  const a = new Fraction(an, c);
  const b = new Fraction(randInt(1, an - 1), c);
  return pack(a, b, '-', category);
}

function makeAddDiff(level, category) {
  const r = rangeFor(level);
  const d1 = randInt(r.min, Math.max(r.min + 1, r.max - 2));
  let d2 = randInt(r.min, r.max);
  while (d1 === d2) d2 = randInt(r.min, r.max);
  const a = new Fraction(randInt(1, d1 - 1), d1);
  const b = new Fraction(randInt(1, d2 - 1), d2);
  return pack(a, b, '+', category);
}

function makeSubDiff(level, category) {
  const r = rangeFor(level);
  const d1 = randInt(r.min, Math.max(r.min + 1, r.max - 2));
  let d2 = randInt(r.min, r.max);
  while (d1 === d2) d2 = randInt(r.min, r.max);
  let a = new Fraction(randInt(1, d1 - 1), d1);
  let b = new Fraction(randInt(1, d2 - 1), d2);
  if (a.n / a.d < b.n / b.d) [a, b] = [b, a];
  return pack(a, b, '-', category);
}

function makeMixed(level, category) {
  // 대분수 문제: 1과 2/5 + 1/5 형태를 가분수로 변환 후 계산
  const r = rangeFor(level);
  const d = randInt(3, r.max);
  const whole = randInt(1, 2);
  const a = new Fraction(whole * d + randInt(1, d - 1), d);
  const b = new Fraction(randInt(1, d - 1), d);
  return pack(a, b, '+', category);
}

function pack(a, b, op, category) {
  const answer = op === '+' ? a.add(b) : a.sub(b);
  return {
    a, b, op, answer, category,
    text: `${a.toString()} ${op} ${b.toString()}`,
    choices: buildChoices(answer),
  };
}

// 오답 3개 생성: 그럴듯한 실수 패턴 위주
function buildChoices(correct) {
  const set = new Set([correct.toString()]);
  // 정답에 가까운 분자/분모 변형
  const candidates = [
    [correct.n + 1, correct.d],
    [correct.n - 1, correct.d],
    [correct.n,     correct.d + 1],
    [correct.n + 1, correct.d + 1],
    [correct.n,     correct.d - 1],
    [correct.n * 2, correct.d * 2 + 1],
  ];
  for (const [n, d] of candidates) {
    if (n <= 0 || d <= 0) continue;
    try {
      const s = new Fraction(n, d).toString();
      set.add(s);
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
  } catch (_) {
    return false;
  }
}

export function problemToHtml(problem) {
  const opSpan = `<span class="op">${problem.op}</span>`;
  return `${problem.a.toHtml()} ${opSpan} ${problem.b.toHtml()}`;
}

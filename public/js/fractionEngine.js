// ============================================================
// fractionEngine.js — 분수 게임의 두뇌 (단일/멀티 공용)
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
  toLatex()  { return `\\frac{${this.n}}{${this.d}}`; }

  // 진짜 분수 모양 HTML — fraction.css와 함께 사용
  toHtml() {
    return `<span class="frac"><span class="num">${this.n}</span><span class="den">${this.d}</span></span>`;
  }
}

// 문제 텍스트(`a/b + c/d`)를 진짜 분수 모양 HTML로 변환
export function problemToHtml(problem) {
  const opSpan = `<span class="op">${problem.op}</span>`;
  return `${problem.a.toHtml()} ${opSpan} ${problem.b.toHtml()}`;
}

// ------------------------------------------------------------
// 레벨별 문제 생성기 — 학생 레벨에 따라 난이도 자동 조정
// ------------------------------------------------------------
export function generateProblem(level) {
  let a, b, op;

  if (level <= 5) {
    // 동분모 덧셈: a/c + b/c (합이 1 이하)
    const c = randInt(3, 9);
    a = new Fraction(randInt(1, c - 2), c);
    b = new Fraction(randInt(1, c - a.n), c);
    op = '+';
  } else if (level <= 10) {
    // 동분모 뺄셈: a/c - b/c (양수 결과)
    const c = randInt(3, 9);
    const an = randInt(2, c - 1);
    a = new Fraction(an, c);
    b = new Fraction(randInt(1, an - 1), c);
    op = '-';
  } else if (level <= 15) {
    // 이분모 덧셈 (통분 필요)
    const d1 = randInt(2, 6);
    let d2 = randInt(2, 8);
    while (d1 === d2) d2 = randInt(2, 8);
    a = new Fraction(randInt(1, d1 - 1), d1);
    b = new Fraction(randInt(1, d2 - 1), d2);
    op = '+';
  } else {
    // 이분모 뺄셈 (양수 결과 보장)
    const d1 = randInt(2, 6);
    let d2 = randInt(2, 8);
    while (d1 === d2) d2 = randInt(2, 8);
    a = new Fraction(randInt(1, d1 - 1), d1);
    b = new Fraction(randInt(1, d2 - 1), d2);
    if (a.n / a.d < b.n / b.d) [a, b] = [b, a]; // 음수 방지
    op = '-';
  }

  const answer = op === '+' ? a.add(b) : a.sub(b);
  return {
    a, b, op, answer,
    text: `${a.toString()} ${op} ${b.toString()}`,
    choices: buildChoices(answer),
  };
}

// 4지선다 — 정답 + 그럴듯한 오답 3개
function buildChoices(correct) {
  const set = new Set([correct.toString()]);
  let safety = 0;
  while (set.size < 4 && safety++ < 30) {
    // 오답 패턴: 분자만 살짝 바꾸기, 통분 실수, 약분 실수
    const dx = randInt(-2, 2);
    const dy = randInt(-1, 2);
    const n = Math.max(1, correct.n + dx);
    const d = Math.max(2, correct.d + dy);
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

// ------------------------------------------------------------
// 답 채점 — 학생 입력(문자열)을 안전하게 비교
// ------------------------------------------------------------
export function checkAnswer(userInput, correctFraction) {
  const m = String(userInput).trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!m) return false;
  try {
    return new Fraction(+m[1], +m[2]).equals(correctFraction);
  } catch (_) {
    return false;
  }
}

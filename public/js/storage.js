// ============================================================
// storage.js — 데이터 저장소 추상화 (Firebase 이전 가능 인터페이스)
// ============================================================
// 모든 UI/씬은 이 모듈만 사용. 백엔드 교체 시 이 파일만 수정.
// 현재 백엔드: LocalStorage. 추후 Firebase로 교체 가능.
// ============================================================

const KEYS = {
  session:   'fd:session',
  students:  'fd:students',
  progress:  (nick) => `fd:progress:${nick}`,
  recent:    (nick) => `fd:recent:${nick}`,    // 최근 정답/오답 5개
  wrong:     (nick) => `fd:wrong:${nick}`,     // 오답 기록 (오답 복습용)
};

// ----- 학생 목록 -----
export function listStudents() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.students) || '[]');
  } catch (_) { return []; }
}

export function findStudent(nickname) {
  return listStudents().find(s => s.nickname === nickname) || null;
}

export function saveStudent(student) {
  const all = listStudents();
  const idx = all.findIndex(s => s.nickname === student.nickname);
  if (idx >= 0) all[idx] = student;
  else all.push(student);
  localStorage.setItem(KEYS.students, JSON.stringify(all));
}

export function deleteStudent(nickname) {
  const all = listStudents().filter(s => s.nickname !== nickname);
  localStorage.setItem(KEYS.students, JSON.stringify(all));
  localStorage.removeItem(KEYS.progress(nickname));
}

// ----- 세션 (현재 로그인) -----
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.session) || 'null');
  } catch (_) { return null; }
}

export function setSession(session) {
  localStorage.setItem(KEYS.session, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}

// ----- 학생별 진행도 -----
export function getProgress(nickname) {
  try {
    const raw = localStorage.getItem(KEYS.progress(nickname));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function setProgress(nickname, progress) {
  localStorage.setItem(KEYS.progress(nickname), JSON.stringify(progress));
}

// ----- 학급별 학생 (대시보드용) -----
export function listStudentsInClass(classCode) {
  return listStudents()
    .filter(s => !classCode || s.classCode === classCode)
    .map(s => ({
      ...s,
      progress: getProgress(s.nickname),
    }));
}

// ----- 학급 코드 목록 -----
export function listClasses() {
  const codes = new Set();
  listStudents().forEach(s => codes.add(s.classCode || 'default'));
  return [...codes];
}

// ----- 최근 정답률 추적 (적응 난이도용) -----
const RECENT_LIMIT = 8;
export function recordAnswer(nickname, isCorrect) {
  const arr = JSON.parse(localStorage.getItem(KEYS.recent(nickname)) || '[]');
  arr.push(isCorrect ? 1 : 0);
  while (arr.length > RECENT_LIMIT) arr.shift();
  localStorage.setItem(KEYS.recent(nickname), JSON.stringify(arr));
}
export function getRecentAccuracy(nickname) {
  const arr = JSON.parse(localStorage.getItem(KEYS.recent(nickname)) || '[]');
  if (arr.length < 3) return null; // 표본 부족
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ----- 오답 기록 (복습 NPC용) -----
const WRONG_LIMIT = 20;
export function recordWrong(nickname, problem) {
  const arr = JSON.parse(localStorage.getItem(KEYS.wrong(nickname)) || '[]');
  // problem 객체 → 직렬화 가능한 형태
  const entry = {
    key: problem.key,
    a: { n: problem.a.n, d: problem.a.d },
    b: { n: problem.b.n, d: problem.b.d },
    op: problem.op,
    answer: { n: problem.answer.n, d: problem.answer.d },
    timestamp: Date.now(),
  };
  // 같은 key는 갱신
  const filtered = arr.filter(x => x.key !== entry.key);
  filtered.push(entry);
  while (filtered.length > WRONG_LIMIT) filtered.shift();
  localStorage.setItem(KEYS.wrong(nickname), JSON.stringify(filtered));
}
export function listWrong(nickname) {
  return JSON.parse(localStorage.getItem(KEYS.wrong(nickname)) || '[]');
}
export function clearWrongOne(nickname, key) {
  const arr = listWrong(nickname).filter(x => x.key !== key);
  localStorage.setItem(KEYS.wrong(nickname), JSON.stringify(arr));
}

// ============================================================
// 추후 Firebase 백엔드 교체 시 — 이 모듈의 export 시그니처만 유지하면
// 위 함수들이 await firestore... 로 바뀌어도 UI는 동일하게 동작.
// (단, 함수 반환을 Promise로 변경하여 UI에서 await 추가 필요)
// ============================================================

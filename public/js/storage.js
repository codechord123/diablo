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

// ============================================================
// 추후 Firebase 백엔드 교체 시 — 이 모듈의 export 시그니처만 유지하면
// 위 함수들이 await firestore... 로 바뀌어도 UI는 동일하게 동작.
// (단, 함수 반환을 Promise로 변경하여 UI에서 await 추가 필요)
// ============================================================

// ============================================================
// auth.js — 닉네임 + 4자리 PIN 인증 (Firebase Auth 이전 대비)
// ============================================================
import {
  listStudents, findStudent, saveStudent,
  getSession, setSession, clearSession,
} from './storage.js';

// 간단한 해시 (Firebase 연결 시 Auth로 강화)
function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) - h) + pin.charCodeAt(i);
    h |= 0;
  }
  return `h${h}_${pin.length}`;
}

export function validateNickname(nick) {
  if (typeof nick !== 'string') return '닉네임이 비어있습니다';
  const t = nick.trim();
  if (t.length < 2) return '닉네임은 2자 이상';
  if (t.length > 12) return '닉네임은 12자 이하';
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(t)) return '한글/영문/숫자만 가능';
  return null;
}

export function validatePin(pin) {
  if (typeof pin !== 'string') return 'PIN을 입력하세요';
  if (!/^\d{4}$/.test(pin)) return 'PIN은 숫자 4자리';
  return null;
}

// ----- 회원가입 -----
export function signUp({ nickname, pin, classCode }) {
  nickname = nickname.trim();
  const ne = validateNickname(nickname);
  if (ne) return { ok: false, error: ne };
  const pe = validatePin(pin);
  if (pe) return { ok: false, error: pe };

  if (findStudent(nickname)) {
    return { ok: false, error: '이미 사용 중인 닉네임입니다' };
  }
  const student = {
    nickname,
    pinHash: hashPin(pin),
    classCode: (classCode || 'default').trim() || 'default',
    createdAt: Date.now(),
  };
  saveStudent(student);
  setSession({ nickname: student.nickname, classCode: student.classCode });
  return { ok: true, student };
}

// ----- 로그인 -----
export function signIn({ nickname, pin }) {
  nickname = nickname.trim();
  const student = findStudent(nickname);
  if (!student) return { ok: false, error: '등록되지 않은 닉네임' };
  if (student.pinHash !== hashPin(pin)) {
    return { ok: false, error: 'PIN이 일치하지 않습니다' };
  }
  setSession({ nickname: student.nickname, classCode: student.classCode });
  return { ok: true, student };
}

// ----- 빠른 로그인 (학생 카드 선택) -----
export function signInQuick({ nickname, pin }) {
  // 동일 — 카드 클릭 후 PIN 입력 UX용
  return signIn({ nickname, pin });
}

// ----- 로그아웃 -----
export function signOut() {
  clearSession();
}

// ----- 현재 사용자 -----
export function currentUser() {
  const session = getSession();
  if (!session) return null;
  const student = findStudent(session.nickname);
  return student ? session : null;
}

// ----- PIN 재설정 (교사 마스터키) -----
const MASTER_RESET_KEY = 'teacher2026';
export function resetPin({ nickname, newPin, masterKey }) {
  if (masterKey !== MASTER_RESET_KEY) return { ok: false, error: '마스터키가 틀립니다' };
  const pe = validatePin(newPin);
  if (pe) return { ok: false, error: pe };
  const student = findStudent(nickname);
  if (!student) return { ok: false, error: '학생을 찾을 수 없습니다' };
  student.pinHash = hashPin(newPin);
  saveStudent(student);
  return { ok: true };
}

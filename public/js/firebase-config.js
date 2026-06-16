// ============================================================
// firebase-config.js — Firebase 초기화 + 진행도 저장/로드
// ============================================================
// ⚠️ 본인 Firebase 프로젝트 콘솔에서 발급받은 값으로 교체하세요.
// https://console.firebase.google.com/ → 프로젝트 설정 → 웹 앱 추가

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Firebase 설정이 비어있어도 게임은 동작 (LocalStorage 폴백)
const isConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
let app = null, auth = null, db = null;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ------------------------------------------------------------
// 진행도 저장 — 네트워크 실패 시에도 LocalStorage 백업
// ------------------------------------------------------------
const LS_KEY = 'fractionDungeon:progress';

export async function getUser() {
  if (!isConfigured) return { uid: 'local-player' };
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else signInAnonymously(auth).then((c) => resolve(c.user));
    });
  });
}

export async function loadProgress(uid) {
  const local = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  if (!isConfigured) return migrateProgress(local);
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    return migrateProgress(snap.exists() ? snap.data() : local);
  } catch (e) {
    console.warn('Firestore 로드 실패 — LocalStorage 사용', e);
    return migrateProgress(local);
  }
}

export async function saveProgress(uid, data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data)); // 항상 로컬에도 저장
  if (!isConfigured) return;
  try { await setDoc(doc(db, 'players', uid), data, { merge: true }); }
  catch (e) { console.warn('Firestore 저장 실패 — 다음 시도에 재전송', e); }
}

function defaultProgress() {
  return {
    level: 1, xp: 0, hp: 5, maxHp: 5,
    kills: 0, mistakes: 0, gold: 0,
    class: null,  // 미선택 시 ClassSelectScene으로 라우팅
  };
}

// 구버전 세이브 호환 (없는 필드 채움)
export function migrateProgress(p) {
  if (!p) return defaultProgress();
  return {
    level:    p.level    ?? 1,
    xp:       p.xp       ?? 0,
    hp:       p.hp       ?? 5,
    maxHp:    p.maxHp    ?? 5,
    kills:    p.kills    ?? 0,
    mistakes: p.mistakes ?? 0,
    gold:     p.gold     ?? 0,
    class:    p.class    ?? null,
  };
}

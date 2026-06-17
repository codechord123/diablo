// ============================================================
// firebase-config.js — 게임 진행도 로드/저장 (storage.js 위임)
// ============================================================
// 현재는 storage.js(LocalStorage)를 사용. Firebase 연결 시
// storage.js 백엔드만 교체하면 됨.
// ============================================================
import { currentUser } from './auth.js';
import { getProgress, setProgress } from './storage.js';

function defaultProgress() {
  return {
    level: 1, xp: 0, hp: 5, maxHp: 5,
    kills: 0, mistakes: 0, gold: 0,
    class: null,
    inventory: {}, weapons: ['sword_basic'], equippedWeapon: 'sword_basic',
    defeatedBosses: [],
  };
}

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
    inventory:        p.inventory       ?? {},
    weapons:          p.weapons         ?? ['sword_basic'],
    equippedWeapon:   p.equippedWeapon  ?? 'sword_basic',
    defeatedBosses:   p.defeatedBosses  ?? [],
  };
}

// ----- 인터페이스: getUser / loadProgress / saveProgress -----
// 기존 코드가 await로 호출하므로 동기지만 Promise로 감쌈
// (Firebase 이전 시 그대로 await 동작 보장)

export async function getUser() {
  const session = currentUser();
  if (!session) {
    // 세션 없음 → 익명 폴백 (게스트 모드)
    return { uid: 'guest', nickname: 'Guest', classCode: 'default' };
  }
  return { uid: session.nickname, nickname: session.nickname, classCode: session.classCode };
}

export async function loadProgress(uid) {
  const raw = getProgress(uid);
  return migrateProgress(raw);
}

export async function saveProgress(uid, data) {
  setProgress(uid, data);
}

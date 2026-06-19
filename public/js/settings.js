// ============================================================
// settings.js — 환경설정 (볼륨, 사운드 토글)
// ============================================================
const KEY = 'fd:settings';

const DEFAULTS = {
  masterVol: 0.6,
  bgmVol: 0.8,
  sfxOn: true,
  bgmOn: true,
};

let cache = null;

export function loadSettings() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (_) {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function saveSettings(s) {
  cache = { ...cache, ...s };
  localStorage.setItem(KEY, JSON.stringify(cache));
  applyToAudio();
  return cache;
}

export function applyToAudio() {
  if (!cache) loadSettings();
  // 동적 import로 순환 의존 회피
  import('./audio.js').then(({ default: audio }) => {
    audio.setVolume(cache.sfxOn ? cache.masterVol : 0);
    if (audio.setBgmVolume) audio.setBgmVolume(cache.bgmOn ? cache.bgmVol : 0);
  });
}

// 모달 UI 연결
export function bindSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal || modal._wired) return;
  modal._wired = true;

  const s = loadSettings();

  const inputs = {
    master: document.getElementById('s-master-vol'),
    bgm:    document.getElementById('s-bgm-vol'),
    sfxOn:  document.getElementById('s-sfx-on'),
    bgmOn:  document.getElementById('s-bgm-on'),
  };
  // 초기값
  inputs.master.value = Math.round(s.masterVol * 100);
  inputs.bgm.value    = Math.round(s.bgmVol * 100);
  inputs.sfxOn.checked = s.sfxOn;
  inputs.bgmOn.checked = s.bgmOn;
  document.getElementById('s-master-val').textContent = inputs.master.value;
  document.getElementById('s-bgm-val').textContent = inputs.bgm.value;

  inputs.master.addEventListener('input', e => {
    document.getElementById('s-master-val').textContent = e.target.value;
    saveSettings({ masterVol: e.target.value / 100 });
  });
  inputs.bgm.addEventListener('input', e => {
    document.getElementById('s-bgm-val').textContent = e.target.value;
    saveSettings({ bgmVol: e.target.value / 100 });
  });
  inputs.sfxOn.addEventListener('change', e => {
    saveSettings({ sfxOn: e.target.checked });
  });
  inputs.bgmOn.addEventListener('change', e => {
    saveSettings({ bgmOn: e.target.checked });
  });

  document.getElementById('s-close').addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

export function openSettings() {
  bindSettingsModal();
  document.getElementById('settings-modal').classList.add('show');
}

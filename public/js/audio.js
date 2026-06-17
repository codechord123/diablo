// ============================================================
// audio.js — Web Audio API 절차적 사운드 엔진 (외부 파일 0)
// ============================================================
// Chrome autoplay 정책: AudioContext는 사용자 제스처(첫 클릭/키) 후에만
// 작동. init()을 첫 제스처 핸들러에서 호출.
// ============================================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.volume = 0.4;
    // BGM 상태
    this.bgmGain = null;
    this.bgmIntervalId = null;
    this.bgmCurrentTrack = null;
    this.bgmStep = 0;
    this.bgmVolume = 0.5;
  }

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      // BGM 전용 게인 (개별 음량 조절)
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.masterGain);
    } catch (e) {
      console.warn('AudioContext init failed', e);
      this.enabled = false;
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }

  // ----- 기본 비프 -----
  beep(freq, dur, type = 'sine', vol = 0.3, startOffset = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  // 주파수 스윕 (시작 → 끝)
  sweep(freqStart, freqEnd, dur, type = 'sine', vol = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  // 짧은 노이즈 버스트 (타격감)
  noise(dur, vol = 0.2, filterFreq = 800) {
    if (!this.enabled || !this.ctx) return;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    src.start();
  }

  // ============================================================
  // 게임 이벤트 사운드
  // ============================================================
  hit() {
    this.beep(880, 0.08, 'sine', 0.35);
    this.beep(1320, 0.10, 'sine', 0.3, 0.05);
  }

  miss() {
    this.noise(0.15, 0.3, 400);
    this.beep(120, 0.12, 'square', 0.25);
  }

  evade() {
    this.sweep(440, 880, 0.18, 'triangle', 0.25);
  }

  levelUp() {
    const notes = [523, 659, 784, 1047]; // C E G C (옥타브)
    notes.forEach((f, i) => this.beep(f, 0.18, 'triangle', 0.3, i * 0.1));
  }

  killMonster() {
    this.beep(440, 0.08, 'sine', 0.25);
    this.beep(330, 0.15, 'sine', 0.25, 0.05);
  }

  step() {
    this.beep(180, 0.03, 'triangle', 0.08);
  }

  coin() {
    this.beep(988, 0.06, 'triangle', 0.25);
    this.beep(1318, 0.10, 'triangle', 0.25, 0.06);
  }

  potion() {
    this.sweep(523, 1047, 0.25, 'sine', 0.3);
  }

  doorOpen() {
    this.sweep(220, 110, 0.4, 'sawtooth', 0.2);
  }

  bossIntro() {
    // 깊은 럼블 + 종소리
    this.beep(55, 0.6, 'sawtooth', 0.35);
    this.beep(73, 0.6, 'sawtooth', 0.3, 0.1);
    this.beep(880, 0.3, 'triangle', 0.2, 0.4);
  }

  bossHit() {
    this.noise(0.3, 0.35, 200);
    this.beep(80, 0.2, 'sawtooth', 0.3);
  }

  victory() {
    const fanfare = [523, 659, 784, 1047, 1319];
    fanfare.forEach((f, i) => this.beep(f, 0.15, 'triangle', 0.35, i * 0.08));
  }

  defeat() {
    this.sweep(440, 110, 0.5, 'sawtooth', 0.3);
  }

  click() {
    this.beep(660, 0.04, 'square', 0.15);
  }

  magic() {
    // 마법사 콤보 발동음
    this.sweep(440, 1760, 0.25, 'triangle', 0.3);
    this.beep(2200, 0.1, 'sine', 0.2, 0.15);
  }

  // ============================================================
  // BGM — 절차 생성 루프 (외부 mp3 0)
  // ============================================================
  bgmNote(freq, dur, type = 'triangle', vol = 0.1) {
    if (!this.enabled || !this.ctx || !this.bgmGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    // ADSR 흉내 (간단한 attack/release)
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  playBGM(track) {
    if (this.bgmCurrentTrack === track) return; // 이미 재생 중
    this.stopBGM();
    if (!this.enabled || !this.ctx) {
      // ctx 미초기화 — 첫 제스처 후 재시도용으로 기억
      this._pendingBGM = track;
      return;
    }
    this.bgmCurrentTrack = track;
    this.bgmStep = 0;
    const pattern = BGM_PATTERNS[track];
    if (!pattern) return;
    const tick = () => {
      const note = pattern.notes[this.bgmStep % pattern.notes.length];
      if (note) this.bgmNote(note.f, note.d, note.t || 'triangle', note.v || 0.1);
      this.bgmStep++;
    };
    tick();
    this.bgmIntervalId = setInterval(tick, pattern.interval);
  }

  stopBGM() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.bgmCurrentTrack = null;
  }

  setBgmVolume(v) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume;
  }
}

// ============================================================
// BGM 패턴 — 절차 생성 루프
// f: 주파수, d: 길이(초), t: 파형, v: 음량
// interval: 노트 간격(ms)
// ============================================================
const BGM_PATTERNS = {
  // 마을: C 메이저 펜타토닉 (따뜻한 하프 톤)
  town: {
    interval: 400,
    notes: [
      { f: 523, d: 0.35, t: 'triangle', v: 0.10 },  // C5
      { f: 659, d: 0.35, t: 'triangle', v: 0.09 },  // E5
      { f: 784, d: 0.35, t: 'triangle', v: 0.09 },  // G5
      { f: 880, d: 0.50, t: 'triangle', v: 0.10 },  // A5
      null, null,
      { f: 659, d: 0.35, t: 'triangle', v: 0.08 },  // E5
      { f: 587, d: 0.35, t: 'triangle', v: 0.08 },  // D5
      { f: 523, d: 0.60, t: 'triangle', v: 0.10 },  // C5
      null, null, null,
      { f: 392, d: 0.40, t: 'triangle', v: 0.07 },  // G4 (저음 베이스)
      null,
    ],
  },
  // 던전: 어두운 드론 + 간헐적 종소리
  dungeon: {
    interval: 600,
    notes: [
      { f: 110, d: 0.70, t: 'sawtooth', v: 0.06 },  // A2 드론
      null, null,
      { f: 220, d: 0.30, t: 'triangle', v: 0.05 },  // A3
      null,
      { f: 165, d: 0.70, t: 'sawtooth', v: 0.06 },  // E3
      null, null,
      { f: 330, d: 0.20, t: 'sine',     v: 0.04 },  // E4 종
      null, null, null,
      { f: 110, d: 0.70, t: 'sawtooth', v: 0.06 },
      null, null,
      { f: 220, d: 0.40, t: 'sine',     v: 0.04 },  // A3 종
      null, null,
    ],
  },
  // 보스: 빠른 비트 + 단조 + 긴장감
  boss: {
    interval: 220,
    notes: [
      { f: 110, d: 0.18, t: 'sawtooth', v: 0.10 },
      { f: 220, d: 0.18, t: 'sawtooth', v: 0.08 },
      { f: 110, d: 0.18, t: 'sawtooth', v: 0.10 },
      { f: 165, d: 0.18, t: 'sawtooth', v: 0.08 },
      { f: 110, d: 0.18, t: 'sawtooth', v: 0.10 },
      { f: 247, d: 0.18, t: 'sawtooth', v: 0.08 },  // B3 (불협화)
      { f: 110, d: 0.18, t: 'sawtooth', v: 0.10 },
      { f: 196, d: 0.18, t: 'sawtooth', v: 0.08 },  // G3
    ],
  },
};

const audio = new AudioEngine();
// 첫 제스처 init 시 pending BGM이 있으면 자동 재생
const _origInit = audio.init.bind(audio);
audio.init = function() {
  _origInit();
  if (this._pendingBGM) {
    const t = this._pendingBGM;
    this._pendingBGM = null;
    this.playBGM(t);
  }
};
export default audio;

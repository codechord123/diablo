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
  }

  init() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
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
}

const audio = new AudioEngine();
export default audio;

// ============================================================
// EvaEventScene — 섹터 사이 절차 이벤트 (DOM 모달 + Phaser 배경)
// ============================================================
import { pickEvent, applyEvent, getCurrentRun, saveRun } from '../../eva-missions.js';
import { currentUser } from '../../auth.js';
import { saveProgress } from '../../firebase-config.js';
import audio from '../../audio.js';

export class EvaEventScene extends Phaser.Scene {
  constructor() { super('EvaEvent'); }

  init(data) {
    this.uid = data.uid;
    this.player = data.player;
    this._next = false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050810').setScroll(0, 0).setZoom(1);
    this.cameras.main.resetFX();

    // 우주 배경 — 별 + 깜빡이는 글로우
    const glow = this.add.image(W/2, H/2, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(5).setAlpha(0.2).setTint(0x4cc9f0);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.35 },
      duration: 2400, yoyo: true, repeat: -1,
    });

    this.add.text(W/2, H * 0.18, '◆ INTER-SECTOR EVENT ◆', {
      fontSize: '20px', color: '#4cc9f0',
      fontFamily: 'Orbitron, monospace',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.showEvent();
  }

  showEvent() {
    const nick = currentUser()?.nickname || 'guest';
    const run = getCurrentRun(nick);
    if (!run) { this.proceedToNextSector(); return; }

    const event = pickEvent(run.eventsEncountered || []);
    run.eventsEncountered = (run.eventsEncountered || []).concat([event.id]);
    saveRun(nick, run);

    // 이벤트 효과 즉시 적용
    applyEvent(this.player, event);
    saveProgress(this.uid, this.player);

    // 사운드
    if (event.type === 'reward') audio.coin();
    else if (event.type === 'penalty') audio.miss();
    else audio.click();

    // DOM 모달
    const modal = document.getElementById('eva-event-modal');
    document.getElementById('eve-icon').textContent = event.icon;
    document.getElementById('eve-title').textContent = event.title;
    document.getElementById('eve-desc').textContent = event.desc;
    document.getElementById('eve-sector').textContent =
      `SECTOR ${run.sector} / ${run.totalSectors}`;

    // 효과 표시 라인
    const effectsEl = document.getElementById('eve-effects');
    effectsEl.innerHTML = '';
    const e = event.effect || {};
    const addLine = (label, value, cls) => {
      const div = document.createElement('div');
      div.className = `eve-effect-line ${cls}`;
      const sign = value > 0 ? '+' : '';
      div.innerHTML = `<span class="eve-eff-key">${label}</span><span class="eve-eff-val">${sign}${value}</span>`;
      effectsEl.appendChild(div);
    };
    if (e.hp)   addLine('HULL',   e.hp,   e.hp > 0 ? 'pos' : 'neg');
    if (e.xp)   addLine('DATA',   e.xp,   'pos');
    if (e.gold) addLine('CR',     e.gold, e.gold > 0 ? 'pos' : 'neg');
    if (e.potion) addLine('O₂', '+1', 'pos');

    modal.classList.add('show');

    const btn = document.getElementById('eve-continue');
    const handler = () => {
      modal.classList.remove('show');
      btn.removeEventListener('click', handler);
      this.proceedToNextSector();
    };
    btn.addEventListener('click', handler);

    // 자동 진행 (10초)
    this.time.delayedCall(10000, () => {
      if (!this._next) handler();
    });
  }

  proceedToNextSector() {
    if (this._next) return;
    this._next = true;
    audio.doorOpen();
    this.scene.start('Loading', {
      target: 'Dungeon', mode: 'enter',
      data: {
        uid: this.uid,
        player: this.player,
        dungeonMode: 'normal',
      },
    });
  }
}

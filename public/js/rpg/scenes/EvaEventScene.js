// ============================================================
// EvaEventScene — 섹터 사이 절차 이벤트 (DOM 모달 + Phaser 배경)
// ============================================================
import { pickEvent, applyEvent, applyChoiceEffect, getCurrentRun, saveRun } from '../../eva-missions.js';
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
    this.currentEvent = event;

    const modal = document.getElementById('eva-event-modal');
    document.getElementById('eve-icon').textContent = event.icon;
    document.getElementById('eve-title').textContent = event.title;
    document.getElementById('eve-desc').textContent = event.desc;
    document.getElementById('eve-sector').textContent =
      `SECTOR ${run.sector} / ${run.totalSectors}`;

    audio.click();

    if (event.type === 'choice') {
      this.renderChoices(event);
    } else {
      // 자동 효과 적용
      applyEvent(this.player, event);
      saveProgress(this.uid, this.player);
      this.renderEffects(event.effect);
      this.showContinueBtn();
      if (event.type === 'reward') audio.coin();
      else if ((event.effect || {}).hp < 0) audio.miss();
    }

    modal.classList.add('show');
  }

  renderChoices(event) {
    const effectsEl = document.getElementById('eve-effects');
    effectsEl.innerHTML = '';
    document.getElementById('eve-continue').style.display = 'none';
    document.getElementById('eve-choices').style.display = 'flex';

    const list = document.getElementById('eve-choices');
    list.innerHTML = '';
    event.choices.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'eve-choice-btn';
      btn.innerHTML = `
        <span class="eve-choice-num">${i + 1}</span>
        <span class="eve-choice-body">
          <span class="eve-choice-label">${ch.label}</span>
          <span class="eve-choice-sub">${ch.sub || ''}</span>
        </span>
      `;
      btn.addEventListener('click', () => this.applyChoice(event, ch));
      list.appendChild(btn);
    });
  }

  applyChoice(event, choice) {
    const randomResult = applyChoiceEffect(this.player, choice.effect);
    saveProgress(this.uid, this.player);

    // 결과 메시지
    let outcomeMsg = choice.outcome || '';
    if (randomResult) {
      outcomeMsg = randomResult.label === 'SUCCESS'
        ? '✓ 회피 성공! 무사히 빠져나갔다.'
        : '✗ 잡혔다! 해적의 일격을 받았다.';
    }
    document.getElementById('eve-desc').textContent = outcomeMsg;
    document.getElementById('eve-choices').style.display = 'none';
    this.renderEffects(randomResult?.effect || choice.effect);

    // 사운드
    const finalE = randomResult?.effect || choice.effect;
    if (finalE && finalE.hp < 0) audio.miss();
    else if (finalE && (finalE.gold > 0 || finalE.xp > 0)) audio.coin();

    this.showContinueBtn();
  }

  renderEffects(effect) {
    const effectsEl = document.getElementById('eve-effects');
    effectsEl.innerHTML = '';
    if (!effect || effect.random) return;
    const addLine = (label, value, cls) => {
      const div = document.createElement('div');
      div.className = `eve-effect-line ${cls}`;
      const sign = value > 0 ? '+' : '';
      div.innerHTML = `<span class="eve-eff-key">${label}</span><span class="eve-eff-val">${sign}${value}</span>`;
      effectsEl.appendChild(div);
    };
    if (effect.hp)   addLine('HULL',   effect.hp,   effect.hp > 0 ? 'pos' : 'neg');
    if (effect.xp)   addLine('DATA',   effect.xp,   'pos');
    if (effect.gold) addLine('CR',     effect.gold, effect.gold > 0 ? 'pos' : 'neg');
    if (effect.potion) addLine('O₂', '+1', 'pos');
  }

  showContinueBtn() {
    const btn = document.getElementById('eve-continue');
    btn.style.display = 'inline-block';
    const handler = () => {
      document.getElementById('eva-event-modal').classList.remove('show');
      btn.removeEventListener('click', handler);
      this.proceedToNextSector();
    };
    btn.addEventListener('click', handler);
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

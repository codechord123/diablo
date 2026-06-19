// ============================================================
// OpeningScene — 게임 프롤로그 시네마틱 (텍스트 페이드 인)
// ============================================================
import { STORY, hasSeenStory, markSeenStory } from '../../story.js';
import { currentUser } from '../../auth.js';
import audio from '../../audio.js';

export class OpeningScene extends Phaser.Scene {
  constructor() { super('Opening'); }

  init(data) {
    this.next = (data && data.next) || 'Boot';
    this.nextData = (data && data.nextData) || {};
    this._skipped = false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#000000').setScroll(0, 0).setZoom(1);
    this.cameras.main.resetFX();

    try { audio.playBGM('dungeon'); } catch (_) {}

    // 배경 — 어두운 안개 + 횃불 글로우
    const fog = this.add.image(W/2, H/2, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(6).setAlpha(0.15).setTint(0x6a1622);
    this.tweens.add({
      targets: fog,
      alpha: { from: 0.1, to: 0.25 },
      scale: { from: 5.5, to: 6.5 },
      duration: 4000, yoyo: true, repeat: -1,
    });

    // 타이틀
    this.add.text(W/2, H * 0.12, '⚔️ 트리스트람의 어둠', {
      fontSize: '38px', color: '#a31621',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5);

    // 텍스트 표시 영역
    this.lineGroup = this.add.container(W/2, H/2);

    // 건너뛰기 안내
    const skipBtn = this.add.text(W - 24, H - 24, 'ENTER / 클릭 — 건너뛰기 ⏭', {
      fontSize: '13px', color: '#888', fontStyle: 'italic',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerdown', () => this.skip());
    this.input.keyboard.on('keydown-ENTER', () => this.skip());
    this.input.keyboard.on('keydown-SPACE', () => this.skip());
    this.input.keyboard.on('keydown-ESC',   () => this.skip());

    this.playSequence();
  }

  async playSequence() {
    const lines = STORY.prologue;
    let acc = 0;
    for (const ln of lines) {
      if (this._skipped) return;
      this.showLine(ln.line);
      await this.sleep(ln.delay);
    }
    this.finish();
  }

  showLine(text) {
    const W = this.scale.width;
    const txt = this.add.text(0, 0, text, {
      fontSize: '22px', color: '#ead7b7',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
      align: 'center', wordWrap: { width: W * 0.7 },
      lineSpacing: 8,
    }).setOrigin(0.5).setAlpha(0);
    this.lineGroup.add(txt);

    // 위로 스크롤 + 페이드
    const existing = this.lineGroup.list.filter(x => x !== txt);
    existing.forEach(prev => {
      this.tweens.add({
        targets: prev,
        y: prev.y - 36,
        alpha: { from: prev.alpha, to: Math.max(0, prev.alpha - 0.35) },
        duration: 800,
      });
    });
    // 너무 많이 쌓이면 첫 줄 제거
    if (this.lineGroup.list.length > 5) {
      const first = this.lineGroup.list[0];
      this.tweens.add({
        targets: first,
        alpha: 0,
        duration: 400,
        onComplete: () => first.destroy(),
      });
    }
    // 새 줄 페이드 인
    this.tweens.add({
      targets: txt,
      alpha: 1,
      duration: 1000, ease: 'Sine.easeInOut',
    });
  }

  sleep(ms) {
    return new Promise(res => this.time.delayedCall(ms, res));
  }

  skip() {
    if (this._skipped) return;
    this._skipped = true;
    this.finish();
  }

  finish() {
    if (this._finished) return;
    this._finished = true;
    const nick = currentUser()?.nickname || 'guest';
    markSeenStory(nick, 'prologue');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.next, this.nextData);
    });
  }
}

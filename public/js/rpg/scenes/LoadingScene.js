// ============================================================
// LoadingScene — Diablo식 맵 전환 로딩 화면
// ============================================================
// 사용: this.scene.start('Loading', { target: 'Dungeon', data: {...}, mode: 'enter' })
//   mode: 'enter' = 던전 입장, 'return' = 마을 귀환
// ============================================================

const FLAVOR_TEXTS = {
  enter: [
    '"어둠 속, 보물이 너를 기다린다..."',
    '"몬스터들이 풀린 분수를 갉아먹고 있다."',
    '"통분의 미궁이 너의 정신을 시험한다."',
    '"가져갈 수 있는 만큼만 살아남으리라."',
    '"용감한 자만이 깊이를 들여다본다."',
  ],
  return: [
    '"피로를 풀고 다음 사냥을 준비하라."',
    '"트리스트람의 횃불이 너를 맞이한다."',
    '"상인은 새 물건을 들였다고 한다."',
    '"대장장이의 망치 소리가 들린다."',
  ],
};

export class LoadingScene extends Phaser.Scene {
  constructor() { super('Loading'); }

  init(data) {
    this.target = (data && data.target) || 'Town';
    this.targetData = (data && data.data) || {};
    this.mode = (data && data.mode) || 'enter';
    this.duration = (data && data.duration) || 1200;
    this._transitioned = false;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#050203').setScroll(0,0).setZoom(1);

    // 어두운 베이스
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 1);

    // 분위기 글로우 (모드별 색)
    const tint = this.mode === 'enter' ? 0xa31621 : 0xff9933;
    const glow = this.add.image(W/2, H/2, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.5).setAlpha(0.25).setTint(tint);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.4 },
      scale: { from: 3.3, to: 3.7 },
      duration: 800, yoyo: true, repeat: -1,
    });

    // 제목
    const titleText = this.mode === 'enter' ? '⚔️  던전 입장 중' : '🏰  마을 귀환 중';
    const title = this.add.text(W/2, H * 0.4, titleText, {
      fontSize: '36px',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
      color: '#d4af37',
    }).setOrigin(0.5);

    // 깜빡이는 점들
    this.dotText = this.add.text(W/2, H * 0.4 + 4, '', {
      fontSize: '36px', color: '#d4af37',
    }).setOrigin(0, 0.5);
    this.dotText.x = title.x + title.width / 2 + 4;
    this.dotIndex = 0;
    this.dotTimer = this.time.addEvent({
      delay: 250,
      callback: () => {
        this.dotIndex = (this.dotIndex + 1) % 4;
        this.dotText.setText('.'.repeat(this.dotIndex));
      },
      loop: true,
    });

    // Flavor 텍스트
    const flavorPool = FLAVOR_TEXTS[this.mode] || FLAVOR_TEXTS.enter;
    const flavor = flavorPool[Math.floor(Math.random() * flavorPool.length)];
    this.add.text(W/2, H * 0.5, flavor, {
      fontSize: '15px',
      color: '#888',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // 진행바
    const barW = Math.min(360, W * 0.6);
    const barH = 14;
    const barX = W/2 - barW/2, barY = H * 0.6;
    this.add.rectangle(W/2, barY + barH/2, barW + 4, barH + 4, 0x000000, 1)
      .setStrokeStyle(1, 0x4a3a30);
    const fillBar = this.add.rectangle(barX, barY, 0, barH, 0xd4af37, 1)
      .setOrigin(0, 0);
    fillBar.setData('glow', false);

    // 진행 트윈
    this.tweens.add({
      targets: fillBar,
      width: barW,
      duration: this.duration,
      ease: 'Sine.easeInOut',
      onComplete: () => this.goNext(),
    });

    // 입력 차단
    this.input.keyboard.enabled = false;
    this.input.enabled = false;
  }

  goNext() {
    if (this._transitioned) return;
    this._transitioned = true;
    // 페이드 체인 제거 — 검은 화면 잔존 방지
    this.scene.start(this.target, this.targetData);
  }
}

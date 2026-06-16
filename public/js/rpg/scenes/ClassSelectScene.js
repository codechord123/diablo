// ============================================================
// ClassSelectScene — 직업 선택 화면 (첫 진입 시 + 캐릭터 변경 시)
// ============================================================
import { CLASSES } from '../../classes.js';
import { getUser, loadProgress, saveProgress } from '../../firebase-config.js';

export class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  init(data) {
    this.preset = data || {};
  }

  async create() {
    try {
      // 데이터가 init에서 안 왔으면 자체 로드 (직접 진입한 경우)
      if (!this.preset.uid) {
        const user = await getUser();
        this.uid = user.uid;
        this.player = await loadProgress(this.uid);
      } else {
        this.uid = this.preset.uid;
        this.player = this.preset.player;
      }

      this.cameras.main.setBackgroundColor('#080404').setScroll(0,0).setZoom(1);
      this.drawBackground();
      this.drawTitle();
      this.drawPanels();
    } catch (err) {
      console.error('[ClassSelectScene.create] failed:', err);
    }
  }

  drawBackground() {
    const W = this.scale.width, H = this.scale.height;
    // 어두운 배경 + 중앙 발광
    this.add.image(W/2, H/2, 'torch')
      .setScale(4.5)
      .setAlpha(0.4)
      .setTint(0xaa5522)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  drawTitle() {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W/2, Math.max(50, H * 0.08), '운명을 선택하라', {
      fontSize: this.responsiveFontSize(48, 36),
      color: '#d4af37',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5);

    this.add.text(W/2, Math.max(95, H * 0.14), '— Choose Your Class —', {
      fontSize: this.responsiveFontSize(16, 12),
      color: '#888',
      fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  drawPanels() {
    const W = this.scale.width, H = this.scale.height;
    const keys = ['warrior', 'mage', 'rogue'];
    const cols = (W < 720) ? 1 : 3;
    const panelW = cols === 1 ? Math.min(360, W - 40) : Math.min(260, (W - 80) / 3);
    const panelH = cols === 1 ? 180 : 380;
    const gap = cols === 1 ? 12 : 24;
    const totalW = cols === 1 ? panelW : (panelW * 3 + gap * 2);
    const totalH = cols === 1 ? (panelH * 3 + gap * 2) : panelH;
    const startX = (W - totalW) / 2 + panelW / 2;
    const startY = (H + 80) / 2 - totalH / 2 + panelH / 2;

    keys.forEach((key, i) => {
      const x = cols === 1 ? W/2 : (startX + i * (panelW + gap));
      const y = cols === 1 ? (startY + i * (panelH + gap)) : startY;
      this.makeClassPanel(x, y, panelW, panelH, key, cols === 1);
    });
  }

  makeClassPanel(x, y, w, h, classKey, compact) {
    const cls = CLASSES[classKey];
    const colorHex = '#' + cls.color.toString(16).padStart(6, '0');
    const glowHex  = '#' + cls.glowColor.toString(16).padStart(6, '0');

    // 패널 배경
    const panel = this.add.rectangle(x, y, w, h, 0x100806, 0.85)
      .setStrokeStyle(2, cls.color, 0.85)
      .setInteractive({ useHandCursor: true });

    if (compact) {
      // 좁은 화면: 가로 레이아웃
      this.add.image(x - w/2 + 50, y, `player-${classKey}-3`).setScale(1.4);
      this.add.text(x - w/2 + 100, y - 40, cls.name, {
        fontSize: '24px', color: glowHex, fontFamily: 'Cinzel, serif',
      });
      this.add.text(x - w/2 + 100, y - 10, cls.description, {
        fontSize: '13px', color: '#ead7b7', wordWrap: { width: w - 110 },
      });
      this.add.text(x - w/2 + 100, y + 30, cls.ability, {
        fontSize: '11px', color: '#d4af37', wordWrap: { width: w - 110 },
      });
    } else {
      // 데스크탑: 세로 레이아웃
      const glow = this.add.image(x, y - 90, 'torch')
        .setTint(cls.glowColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.0)
        .setAlpha(0.6);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.5, to: 0.8 },
        scale: { from: 0.95, to: 1.05 },
        duration: 1200, yoyo: true, repeat: -1,
      });

      const sprite = this.add.image(x, y - 90, `player-${classKey}-3`).setScale(2.0);
      this.tweens.add({
        targets: sprite,
        y: y - 94,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.add.text(x, y + 30, cls.name, {
        fontSize: '32px', color: glowHex, fontFamily: 'Cinzel, Noto Serif KR, serif',
      }).setOrigin(0.5);

      this.add.text(x, y + 70, cls.description, {
        fontSize: '13px', color: '#ead7b7',
        wordWrap: { width: w - 30 }, align: 'center',
      }).setOrigin(0.5);

      this.add.text(x, y + 130, cls.ability, {
        fontSize: '12px', color: '#d4af37',
        wordWrap: { width: w - 30 }, align: 'center',
      }).setOrigin(0.5);
    }

    // 선택 버튼
    const btnY = compact ? (y + h/2 - 22) : (y + h/2 - 28);
    const btnX = compact ? (x + w/2 - 60) : x;
    const btn = this.add.text(btnX, btnY, '⚔ 선택', {
      fontSize: '18px',
      color: '#080404',
      backgroundColor: glowHex,
      padding: { left: 22, right: 22, top: 8, bottom: 8 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#ffd700' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: glowHex }));
    btn.on('pointerdown', () => this.confirm(classKey));
    panel.on('pointerdown', () => this.confirm(classKey));
    panel.on('pointerover', () => panel.setStrokeStyle(3, cls.glowColor, 1));
    panel.on('pointerout',  () => panel.setStrokeStyle(2, cls.color, 0.85));
  }

  async confirm(classKey) {
    const cls = CLASSES[classKey];
    // 새 캐릭터 — 직업 능력에 맞춰 초기화
    const fresh = (this.preset.reset || !this.player.class);
    if (fresh) {
      this.player.level = 1;
      this.player.xp = 0;
      this.player.kills = 0;
      this.player.mistakes = 0;
      this.player.gold = 0;
      this.player.maxHp = cls.startHp;
      this.player.hp = cls.startHp;
    }
    this.player.class = classKey;
    await saveProgress(this.uid, this.player);
    // 직업 선택 후 마을부터 시작 (디아블로 흐름)
    this.scene.start('Town', { uid: this.uid, player: this.player });
  }

  responsiveFontSize(desktop, mobile) {
    return this.scale.width < 720 ? `${mobile}px` : `${desktop}px`;
  }
}

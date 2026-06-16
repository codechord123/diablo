// ============================================================
// main.js — Phaser 게임 부트스트랩
// ============================================================
import { BootScene } from './scenes/BootScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { BattleScene } from './scenes/BattleScene.js';

// eslint-disable-next-line no-undef
const config = {
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: 960,
  height: 640,
  backgroundColor: '#0d0908',
  pixelArt: false,
  scene: [BootScene, DungeonScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// eslint-disable-next-line no-undef, no-new
new Phaser.Game(config);

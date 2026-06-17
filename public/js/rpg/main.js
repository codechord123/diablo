// ============================================================
// main.js — Phaser 게임 부트스트랩 (반응형)
// ============================================================
import { BootScene } from './scenes/BootScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { TownScene } from './scenes/TownScene.js';
import { ClassSelectScene } from './scenes/ClassSelectScene.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { BossArenaScene } from './scenes/BossArenaScene.js';
import { initNotepad, toggleNotepad } from '../notepad.js';
import audio from '../audio.js';

const computeSize = () => {
  // HUD(70px) + 헬프바(36px) 제외한 영역을 캔버스에 할당
  const w = window.innerWidth;
  const h = Math.max(320, window.innerHeight - 70 - 36);
  return { width: w, height: h };
};

const { width, height } = computeSize();

const config = {
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width,
  height,
  backgroundColor: '#0d0908',
  pixelArt: false,
  scene: [BootScene, ClassSelectScene, LoadingScene, DungeonScene, BattleScene, BossArenaScene, TownScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

// 노트패드 — DOM 준비 + 전역 N 키
document.addEventListener('DOMContentLoaded', () => initNotepad());
if (document.readyState !== 'loading') initNotepad();

// N 키: 어디서나 노트 토글 (input 포커스 중엔 무시)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'n' && e.key !== 'N') return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  toggleNotepad();
});

// 오디오 — 첫 사용자 제스처에서 AudioContext 활성화 (Chrome autoplay 정책)
const gestureInit = () => {
  audio.init();
  window.removeEventListener('pointerdown', gestureInit);
  window.removeEventListener('keydown', gestureInit);
};
window.addEventListener('pointerdown', gestureInit, { once: true });
window.addEventListener('keydown', gestureInit, { once: true });

// 창 크기 변경 시 캔버스 + 비네팅 갱신
window.addEventListener('resize', () => {
  const s = computeSize();
  game.scale.resize(s.width, s.height);
  // 던전 씬의 비네팅 재그리기
  const dungeon = game.scene.getScene('Dungeon');
  if (dungeon && dungeon.scene.isActive() && dungeon.vignette) {
    dungeon.vignette.clear();
    const W = s.width, H = s.height;
    dungeon.vignette.fillStyle(0x000000, 0.5);
    dungeon.vignette.fillRect(0, 0, W, 80);
    dungeon.vignette.fillRect(0, H - 80, W, 80);
    dungeon.vignette.fillRect(0, 0, 80, H);
    dungeon.vignette.fillRect(W - 80, 0, 80, H);
  }
});

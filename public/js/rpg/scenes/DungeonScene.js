// ============================================================
// DungeonScene — 절차적 던전 + 클릭 이동 + 횃불 조명 + 몬스터 조우
// ============================================================
import { generateDungeon, TILE_SIZE, MAP_W, MAP_H, THEMES } from '../dungeon.js';
import { findPath } from '../pathfinding.js';
import { MONSTERS, pickMonster, xpToNext } from '../../monsters.js';
import { loadProgress, saveProgress, getUser } from '../../firebase-config.js';
import { CLASSES, getClass, playerSpriteKey, tierForLevel } from '../../classes.js';
import { ITEMS, useFirstPotion, totalPotions, getEquippedWeapon } from '../../items.js';
import { getBoss } from '../../bosses.js';
import audio from '../../audio.js';
import * as fx from '../../effects.js';
import { currentUser } from '../../auth.js';
import { checkAchievements } from '../../achievements.js';
import { trackEvent } from '../../missions.js';
import { Minimap } from '../../minimap.js';
import { openSettings } from '../../settings.js';
import { STORY } from '../../story.js';
import { getBonuses as getSkillBonuses } from '../../skills.js';
import { helmetHpBonus } from '../../items.js';
import { grantRandomCard, CARDS } from '../../cards.js';

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  init(data) {
    // 던전 모드: 'normal' (랜덤) | 'boss' (특정 보스의 던전)
    this.dungeonMode = (data && data.dungeonMode) || 'normal';
    this.bossId = (data && data.bossId) || null;
    this.bossData = this.bossId ? getBoss(this.bossId) : null;
    // 같은 던전 내 문제 중복 방지 풀
    this.problemPool = new Set();
  }

  async create() {
    this.ready = false;
    this._leaving = false;
    this._bossDefeated = false;
    this.cameras.main.resetFX();
    document.body.classList.add('in-dungeon');
    try {
      this.uid = (await getUser()).uid;
      this.player = await loadProgress(this.uid);

      // 직업 미선택 시 ClassSelectScene으로 라우팅
      if (!this.player.class) {
        this.scene.start('ClassSelect', { uid: this.uid, player: this.player });
        return;
      }
      this.classDef = getClass(this.player.class);

      // 테마 결정
      const themeKey = this.bossData ? this.bossData.dungeonTheme : 'default';
      this.theme = THEMES[themeKey] || THEMES.default;
      this.cameras.main.setBackgroundColor(this.theme.bgColor);
      // BGM: 보스 던전이면 boss, 아니면 dungeon
      try { audio.playBGM(this.bossData ? 'boss' : 'dungeon'); }
      catch (e) { console.warn('BGM 실패:', e); }

      const dungeon = generateDungeon();
      this.grid = dungeon.grid;
      this.rooms = dungeon.rooms;

      this.drawMap();
      this.spawnTorches();
      this.spawnPlayer(dungeon.spawn);
      this.spawnExitStairs(dungeon.spawn);
      this.spawnMonsters();
      // 미니맵
      this.minimap = new Minimap(this, this.grid);
      this.minimap.reveal(dungeon.spawn.x, dungeon.spawn.y, 5);
      this.minimap.redraw(this.playerSprite.tile, this.monsters, this.exitTile);

      // 보스 던전이면 인트로 모달
      if (this.bossData && STORY.bossIntros[this.bossData.id]) {
        this.showBossIntro(this.bossData.id);
      }
      this.setupCamera();
      this.setupLighting();
      this.setupInput();
      this.setupHud();
      this.events.on('battle-result', this.onBattleResult, this);
      this.ready = true; // 모든 셋업 완료 → update() 활성화
    } catch (err) {
      console.error('[DungeonScene.create] failed:', err);
    }
  }

  // ---------- 맵 그리기 (테마 적용) ----------
  drawMap() {
    this.tiles = this.add.container(0, 0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const isWall = this.grid[y][x] === 1;
        const key = isWall ? 'wall' : 'floor';
        const t = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, key);
        t.setTint(isWall ? this.theme.wallTint : this.theme.floorTint);
        this.tiles.add(t);
      }
    }
  }

  spawnTorches() {
    // 각 방의 모서리에 횃불 배치 → 따뜻한 빛 (블렌드)
    this.torches = [];
    for (const room of this.rooms) {
      const positions = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + room.h - 2 },
      ];
      for (const p of positions) {
        const px = p.x * TILE_SIZE + TILE_SIZE/2;
        const py = p.y * TILE_SIZE + TILE_SIZE/2;
        const light = this.add.image(px, py, 'torch')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(1.2)
          .setTint(this.theme.torchTint)
          .setDepth(10);
        // 깜박임 트윈
        this.tweens.add({
          targets: light,
          alpha: { from: 0.85, to: 1.0 },
          scale: { from: 1.15, to: 1.25 },
          duration: 600 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
        });
        this.torches.push(light);
      }
    }
  }

  spawnPlayer(spawn) {
    const px = spawn.x * TILE_SIZE + TILE_SIZE/2;
    const py = spawn.y * TILE_SIZE + TILE_SIZE/2;
    const spriteKey = playerSpriteKey(this.player.class, this.player.level);
    this.playerSprite = this.add.image(px, py, spriteKey).setDepth(20);
    this.playerSprite.tile = { ...spawn };
    this.playerSprite.currentTier = tierForLevel(this.player.level);
    // 발광 빛 (직업 색상)
    this.playerLight = this.add.image(px, py, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.0)
      .setAlpha(0.55)
      .setDepth(11)
      .setTint(this.classDef.glowColor);
    // (idle 부유 트윈 제거 — 이동 트윈과 좌표 충돌로 캐릭터가 튕김)
  }

  spawnMonsters() {
    this.monsters = [];
    if (this.dungeonMode === 'boss') {
      this.spawnBossDungeonMonsters();
      return;
    }
    // 일반 던전: 시작 방 제외, 각 방에 1~2마리 배치
    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const count = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < count; k++) {
        const data = pickMonster(this.player.level);
        const tx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const ty = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        if (this.grid[ty][tx] !== 0) continue;
        const wx = tx * TILE_SIZE + TILE_SIZE/2;
        const wy = ty * TILE_SIZE + TILE_SIZE/2;
        const sprite = this.add.image(wx, wy + 4, `m-${data.id}`).setDepth(20);
        // 카테고리 아이콘 (몬스터 머리 위 작은 표시)
        const catIcon = this.categoryIcon(data.category);
        const label = this.add.text(wx, wy - 30, catIcon, {
          fontSize: '14px',
        }).setOrigin(0.5).setDepth(21).setAlpha(0.7);
        this.monsters.push({ data, sprite, label, tile: { x: tx, y: ty } });

        // 살랑살랑 idle
        this.tweens.add({
          targets: sprite,
          y: wy + 1,
          duration: 800 + Math.random() * 400,
          yoyo: true,
          repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }
  }

  // 보스 던전: 부하 2~3마리 + 가장 먼 방에 보스
  spawnBossDungeonMonsters() {
    // 부하 = 약한 일반 몬스터 2~3마리 (방마다 1마리, 시작방 제외)
    const minionCount = 3;
    for (let i = 1; i <= Math.min(minionCount, this.rooms.length - 1); i++) {
      const room = this.rooms[i];
      const data = pickMonster(Math.max(1, this.player.level - 2));
      const tx = room.cx, ty = room.cy;
      if (!this.grid[ty] || this.grid[ty][tx] !== 0) continue;
      const wx = tx * TILE_SIZE + TILE_SIZE/2;
      const wy = ty * TILE_SIZE + TILE_SIZE/2;
      const sprite = this.add.image(wx, wy + 4, `m-${data.id}`).setDepth(20);
      const catIcon = this.categoryIcon(data.category);
      const label = this.add.text(wx, wy - 30, catIcon, { fontSize: '14px' })
        .setOrigin(0.5).setDepth(21).setAlpha(0.7);
      this.monsters.push({ data, sprite, label, tile: { x: tx, y: ty } });
      this.tweens.add({
        targets: sprite, y: wy + 1,
        duration: 800 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // 보스 — 가장 먼 방에 배치 (시작방으로부터 거리 최대)
    const spawnRoom = this.rooms[0];
    let bossRoom = this.rooms[this.rooms.length - 1];
    let maxDist = 0;
    for (const r of this.rooms) {
      const d = Math.abs(r.cx - spawnRoom.cx) + Math.abs(r.cy - spawnRoom.cy);
      if (d > maxDist) { maxDist = d; bossRoom = r; }
    }
    const bx = bossRoom.cx, by = bossRoom.cy;
    const bwx = bx * TILE_SIZE + TILE_SIZE/2;
    const bwy = by * TILE_SIZE + TILE_SIZE/2;
    // 보스 글로우 (강조)
    const bossGlow = this.add.image(bwx, bwy, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.5).setAlpha(0.7).setTint(0xff2222).setDepth(15);
    this.tweens.add({
      targets: bossGlow,
      alpha: { from: 0.5, to: 0.9 }, scale: { from: 2.3, to: 2.8 },
      duration: 800, yoyo: true, repeat: -1,
    });
    // 보스 스프라이트 (큰 이모지)
    const bossSprite = this.add.text(bwx, bwy, this.bossData.emoji, { fontSize: '52px' })
      .setOrigin(0.5).setDepth(22);
    const bossLabel = this.add.text(bwx, bwy - 38, '⚠️ 보스', {
      fontSize: '11px', color: '#ff3322',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { left: 4, right: 4, top: 1, bottom: 1 },
    }).setOrigin(0.5).setDepth(23);
    this.tweens.add({
      targets: bossSprite, y: bwy - 4,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // 보스 몬스터 데이터 (특수 마커)
    const bossMonsterData = {
      id: this.bossData.id,
      name: this.bossData.name,
      hp: this.bossData.hp,
      maxHp: this.bossData.hp,
      currentHp: this.bossData.hp,
      xp: this.bossData.xpReward,
      gold: this.bossData.goldReward,
      emoji: this.bossData.emoji,
      color: this.bossData.color,
      category: this.bossData.category,
      isBoss: true,
    };
    this.monsters.push({
      data: bossMonsterData,
      sprite: bossSprite,
      label: bossLabel,
      glow: bossGlow,
      tile: { x: bx, y: by },
      isBoss: true,
    });

    // 보스 등장 사운드
    audio.bossIntro();
  }

  showBossIntro(bossId) {
    const intro = STORY.bossIntros[bossId];
    if (!intro) return;
    const modal = document.getElementById('boss-intro-modal');
    if (!modal) return;
    document.getElementById('bi-title').textContent = intro.title;
    document.getElementById('bi-subtitle').textContent = intro.subtitle;
    document.getElementById('bi-lines').innerHTML = intro.lines
      .map(l => `<div class="bi-line">${l || '&nbsp;'}</div>`).join('');
    modal.classList.add('show');
    try { audio.bossIntro(); } catch (_) {}
    const closeBtn = document.getElementById('bi-close');
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    }
  }

  // 보스/레벨업 카드 드롭 알림
  showCardDrop(cards) {
    if (!cards || cards.length === 0) return;
    const html = cards.map(c =>
      `<span class="card-drop-item" style="color:${c.color}">${c.icon} ${c.name}</span>`
    ).join('');
    const banner = document.createElement('div');
    banner.className = 'card-drop-banner';
    banner.innerHTML = `<div class="cdb-label">+ CARDS</div><div class="cdb-list">${html}</div>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 50);
    setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
    }, 3000);
  }

  showBossVictory(bossId) {
    const text = STORY.bossVictory[bossId];
    if (!text) return;
    const modal = document.getElementById('boss-victory-modal');
    if (!modal) return;
    document.getElementById('bv-text').innerHTML = text.replace(/\n/g, '<br>');
    modal.classList.add('show');
    const closeBtn = document.getElementById('bv-close');
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    }
  }

  categoryIcon(category) {
    return {
      'add-same':  '➕',
      'sub-same':  '➖',
      'add-diff':  '🟦',
      'sub-diff':  '🟥',
      'mixed':     '🔢',
    }[category] || '❓';
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
  }

  // 비네팅 (화면 모서리 어둠) — 디아블로 폐쇄감
  setupLighting() {
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(50);
    const W = this.scale.width, H = this.scale.height;
    // 4개 직사각형으로 가장자리 어둡게
    this.vignette.fillStyle(0x000000, 0.5);
    this.vignette.fillRect(0, 0, W, 80);
    this.vignette.fillRect(0, H - 80, W, 80);
    this.vignette.fillRect(0, 0, 80, H);
    this.vignette.fillRect(W - 80, 0, 80, H);
  }

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      // UI 영역(상단 HUD/하단 헬프바) 클릭은 무시
      if (pointer.event.target !== this.game.canvas) return;
      const wx = pointer.worldX, wy = pointer.worldY;
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      this.moveTo({ x: tx, y: ty });
    });

    // 키보드: 방향키 + WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-H', () => this.usePotionInDungeon());
    this.input.keyboard.on('keydown-Q', () => this.returnToTown());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-M', () => {
      if (this.minimap) this.minimap.setVisible(!this.minimap.container.visible);
    });
    this.lastMoveTime = 0;
  }

  togglePause() {
    if (this.scene.isPaused()) return; // 전투 중엔 무시 (BattleScene이 ESC=도주 처리)
    const modal = document.getElementById('pause-modal');
    if (!modal) return;
    if (modal.classList.contains('show')) {
      modal.classList.remove('show');
      return;
    }
    modal.classList.add('show');
    if (!modal._wired) {
      modal._wired = true;
      document.getElementById('pause-resume').addEventListener('click', () => modal.classList.remove('show'));
      document.getElementById('pause-settings').addEventListener('click', () => openSettings());
      document.getElementById('pause-town').addEventListener('click', () => {
        modal.classList.remove('show');
        this.returnToTown();
      });
    }
  }

  async returnToTown() {
    if (this._leaving) return;
    this._leaving = true;
    await saveProgress(this.uid, this.player);
    this.scene.start('Loading', {
      target: 'Town', mode: 'return',
      data: { uid: this.uid, player: this.player },
    });
  }

  // 시작 방에 마을로 돌아가는 계단 배치 + 인접 시 인터랙션
  spawnExitStairs(spawn) {
    // 시작 방 모서리에 계단 위치 (스폰 위치에서 살짝 떨어진 곳)
    const sx = Math.max(1, spawn.x - 2);
    const sy = spawn.y;
    if (!this.grid[sy] || this.grid[sy][sx] === 1) {
      // 막혔으면 그냥 spawn 옆에
      this.exitTile = { x: spawn.x + 1, y: spawn.y };
    } else {
      this.exitTile = { x: sx, y: sy };
    }
    const wx = this.exitTile.x * TILE_SIZE + TILE_SIZE/2;
    const wy = this.exitTile.y * TILE_SIZE + TILE_SIZE/2;

    // 계단 그리기 (위 방향)
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(0x4a3a30, 1).fillRect(wx - 16, wy - 16, 32, 32);
    g.fillStyle(0x6a5a4a, 1).fillRect(wx - 14, wy - 14, 28, 4);
    g.fillStyle(0x8a7a6a, 1).fillRect(wx - 12, wy - 8,  24, 4);
    g.fillStyle(0xaa9a8a, 1).fillRect(wx - 10, wy - 2,  20, 4);
    g.fillStyle(0xcab9aa, 1).fillRect(wx - 8,  wy + 4,  16, 4);
    g.lineStyle(1, 0x000000, 0.6).strokeRect(wx - 16, wy - 16, 32, 32);
    // 위로 향하는 화살표 표시
    g.fillStyle(0xffd700, 0.9);
    g.fillTriangle(wx, wy - 22, wx - 5, wy - 14, wx + 5, wy - 14);

    // 따뜻한 빛
    const exitGlow = this.add.image(wx, wy, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4).setAlpha(0.5).setTint(0xffd17a).setDepth(9);
    this.tweens.add({
      targets: exitGlow,
      alpha: { from: 0.4, to: 0.7 },
      scale: { from: 1.3, to: 1.6 },
      duration: 900, yoyo: true, repeat: -1,
    });

    // 라벨
    this.exitLabel = this.add.text(wx, wy - 32, '🚀 우주선 (E)', {
      fontSize: '12px', color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(22).setVisible(false);

    // E 키 인터랙션
    this.input.keyboard.on('keydown-E', () => {
      if (this.isAdjacentToExit()) this.returnToTown();
    });
  }

  isAdjacentToExit() {
    if (!this.exitTile || !this.playerSprite) return false;
    const p = this.playerSprite.tile;
    return Math.abs(p.x - this.exitTile.x) <= 1 && Math.abs(p.y - this.exitTile.y) <= 1;
  }

  usePotionInDungeon() {
    if (this.player.hp >= this.player.maxHp) return;
    const usedId = useFirstPotion(this.player);
    if (!usedId) return;
    const item = ITEMS[usedId];
    this.setupHud();
    // 시각 피드백: 플레이어 빛 일시적으로 증폭
    this.tweens.add({
      targets: this.playerLight,
      alpha: { from: 1, to: 0.55 },
      scale: { from: 3.2, to: 2.0 },
      duration: 600,
    });
    saveProgress(this.uid, this.player);
  }

  // 매 프레임 키 상태 확인 → 한 타일씩 이동 (150ms 쿨다운)
  update(time) {
    // async create()가 끝나기 전엔 cursors/wasd 미존재 → 가드
    if (!this.ready || !this.cursors || !this.wasd) return;
    // 출구 인접 시 라벨 표시
    if (this.exitLabel) this.exitLabel.setVisible(this.isAdjacentToExit());
    if (this.moving || this.scene.isPaused()) return;
    if (time - this.lastMoveTime < 150) return;

    let dx = 0, dy = 0;
    const c = this.cursors, k = this.wasd;
    // 마지막 입력 우선 (대각선 어긋남 방지: 가로/세로 중 하나만)
    if (c.left.isDown || k.a.isDown)       dx = -1;
    else if (c.right.isDown || k.d.isDown) dx = 1;
    else if (c.up.isDown || k.w.isDown)    dy = -1;
    else if (c.down.isDown || k.s.isDown)  dy = 1;
    if (dx === 0 && dy === 0) return;

    this.stepDir(dx, dy);
    this.lastMoveTime = time;
  }

  // 키보드 한 칸 이동 (벽이면 무시, 인접 몬스터 있으면 전투 트리거)
  stepDir(dx, dy) {
    const cur = this.playerSprite.tile;
    const next = { x: cur.x + dx, y: cur.y + dy };
    if (next.y < 0 || next.y >= this.grid.length) return;
    if (next.x < 0 || next.x >= this.grid[0].length) return;
    if (this.grid[next.y][next.x] === 1) return;

    const enemy = this.monsters.find(m => m.tile.x === next.x && m.tile.y === next.y);
    if (enemy) { this.triggerBattle(enemy); return; }

    this.moving = true;
    audio.step();
    this.tweens.add({
      targets: [this.playerSprite, this.playerLight],
      x: next.x * TILE_SIZE + TILE_SIZE/2,
      y: next.y * TILE_SIZE + TILE_SIZE/2,
      duration: 130,
      onComplete: () => {
        this.playerSprite.tile = next;
        this.moving = false;
        if (this.minimap) {
          this.minimap.reveal(next.x, next.y, 5);
          this.minimap.redraw(next, this.monsters, this.exitTile);
        }
      },
    });
  }

  setupHud() {
    const lvl = this.player.level;
    document.getElementById('hud-lv').textContent  = lvl;
    document.getElementById('hud-hp').textContent  = `${this.player.hp} / ${this.player.maxHp}`;
    document.getElementById('hud-xp').textContent  = `${this.player.xp} / ${xpToNext(lvl)}`;
    document.getElementById('hud-kills').textContent = this.player.kills;
    document.getElementById('hud-gold').textContent  = this.player.gold || 0;
    // SVG 바 갱신
    const hullBar = document.getElementById('hud-hull-bar');
    if (hullBar) {
      const pct = (this.player.hp / this.player.maxHp) * 200;
      hullBar.setAttribute('width', pct);
    }
    const xpBar = document.getElementById('hud-xp-bar');
    if (xpBar) {
      const pct = Math.min(200, (this.player.xp / xpToNext(lvl)) * 200);
      xpBar.setAttribute('width', pct);
    }
    const classEl = document.getElementById('hud-class');
    if (classEl && this.classDef) {
      classEl.textContent = `${this.classDef.icon} ${this.classDef.name}`;
    }
    const weapon = getEquippedWeapon(this.player);
    const wEl = document.getElementById('hud-weapon');
    if (wEl) wEl.textContent = `${weapon.icon}`;
    const pEl = document.getElementById('hud-potion');
    if (pEl) pEl.textContent = totalPotions(this.player);
  }

  // ---------- 이동 ----------
  moveTo(target) {
    if (this.moving) return; // 이미 이동 중
    const start = this.playerSprite.tile;
    const path = findPath(this.grid, start, target);
    if (!path || path.length < 2) return;
    this.showMarker(target);
    this.walkPath(path);
  }

  showMarker(tile) {
    if (this.marker) this.marker.destroy();
    this.marker = this.add.image(
      tile.x * TILE_SIZE + TILE_SIZE/2,
      tile.y * TILE_SIZE + TILE_SIZE/2,
      'marker'
    ).setDepth(15);
    this.tweens.add({
      targets: this.marker,
      alpha: { from: 1, to: 0.2 },
      duration: 400,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.marker?.destroy(),
    });
  }

  walkPath(path) {
    this.moving = true;
    const step = (i) => {
      if (i >= path.length) { this.moving = false; return; }
      const next = path[i];
      // 한 칸 옆에 몬스터가 있으면 전투
      const enemy = this.monsters.find(m =>
        Math.abs(m.tile.x - next.x) + Math.abs(m.tile.y - next.y) <= 1
      );
      if (enemy && i > 0) {
        this.moving = false;
        this.triggerBattle(enemy);
        return;
      }
      this.tweens.add({
        targets: [this.playerSprite, this.playerLight],
        x: next.x * TILE_SIZE + TILE_SIZE/2,
        y: next.y * TILE_SIZE + TILE_SIZE/2,
        duration: 140,
        onComplete: () => {
          this.playerSprite.tile = next;
          step(i + 1);
        },
      });
    };
    step(1);
  }

  // ---------- 전투 ----------
  triggerBattle(enemy) {
    this.currentEnemy = enemy;
    this.scene.pause();
    this.scene.launch('Battle', {
      level: this.player.level,
      enemyName: enemy.data.name,
      enemyEmoji: enemy.data.emoji,
      enemyHp: enemy.data.maxHp,
      category: enemy.data.category,
      playerClass: this.player.class,
      player: this.player,
      // 보스 전투 정보 — 보스면 타이머 활성
      isBoss: !!enemy.isBoss,
      timeLimitSec: enemy.isBoss ? this.bossData.timeSec : 0,
      bossId: enemy.isBoss ? this.bossData.id : null,
      // 같은 던전 내 문제 중복 방지 풀
      problemPool: this.problemPool,
    });
  }

  async onBattleResult(result) {
    this.scene.resume();
    const enemy = this.currentEnemy;
    if (!enemy) return;

    if (result.victory) {
      // 시각 효과 — 처치 위치
      const ex = enemy.sprite.x, ey = enemy.sprite.y;
      if (enemy.isBoss) {
        fx.explosion(this, ex, ey);
        fx.shake(this, 0.025, 500);
      } else {
        fx.sparkle(this, ex, ey, { count: 10, color: 0xffd700 });
        fx.goldBurst(this, ex, ey, { count: 8 });
        fx.shake(this, 0.008, 150);
      }
      // 처치 애니메이션
      const targets = [enemy.sprite, enemy.label];
      if (enemy.glow) targets.push(enemy.glow);
      this.tweens.add({
        targets,
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => {
          enemy.sprite.destroy();
          enemy.label.destroy();
          enemy.glow && enemy.glow.destroy();
        },
      });
      this.monsters = this.monsters.filter(m => m !== enemy);
      this.gainXp(enemy.data.xp);
      this.player.kills += 1;
      // 도전과제 / 미션 트리거
      const nick = currentUser()?.nickname || 'guest';
      trackEvent(nick, 'kills', 1);
      // 오답 없는 전투면 완벽 전투 카운트 + 미션 진행
      if ((result.mistakes || 0) === 0) {
        this.player.noMistakeBattles = (this.player.noMistakeBattles || 0) + 1;
        trackEvent(nick, 'perfectBattles', 1);
      }
      checkAchievements(this.player, nick, { noMistakeBattle: (result.mistakes || 0) === 0 });
      // 보스 처치 시 — 사운드 + 처치 마킹 + 빅토리 시네마틱 + 카드 3장
      if (enemy.isBoss) {
        audio.victory();
        this._bossDefeated = true;
        const { markBossDefeated } = await import('../../bosses.js');
        markBossDefeated(this.player, this.bossData.id);
        // 보스 보상: 카드 3장
        const drops = [];
        for (let i = 0; i < 3; i++) drops.push(grantRandomCard(this.player));
        this.showBossVictory(this.bossData.id);
        this.showCardDrop(drops);
      } else {
        audio.killMonster();
      }
    } else {
      // HP는 BattleScene에서 즉시 차감됨 → 이미 player.hp에 반영
      if (this.player.hp <= 0 || result.defeated) {
        // 사망 → 마을 강제 귀환 (HP 회복은 TownScene이 처리)
        this.player.hp = this.player.maxHp;
        await saveProgress(this.uid, this.player);
        this._leaving = true;
        this.scene.start('Loading', {
          target: 'Town', mode: 'return',
          data: { uid: this.uid, player: this.player },
        });
        return;
      }
    }
    this.player.mistakes += result.mistakes || 0;
    if (result.victory) {
      // 도적 골드 보너스 + 스킬 보너스
      const sk = getSkillBonuses(this.player);
      const goldGain = Math.round(enemy.data.gold * (this.classDef.goldMul || 1) * (sk.goldMul || 1));
      this.player.gold = (this.player.gold || 0) + goldGain;
    }
    this.setupHud();
    await saveProgress(this.uid, this.player);

    // 던전 클리어 조건:
    //  - 일반 던전: 모든 몬스터 처치
    //  - 보스 던전: 보스만 처치하면 클리어 (부하는 무시)
    const cleared = (this.dungeonMode === 'boss')
      ? this._bossDefeated
      : this.monsters.length === 0;
    if (cleared) {
      this._leaving = true;
      // EVA 런 진행 — 다음 섹터 / 이벤트 / 마을 귀환
      const nick = currentUser()?.nickname || 'guest';
      const { getCurrentRun, saveRun, endRun } = await import('../../eva-missions.js');
      const run = getCurrentRun(nick);
      if (run && !this.bossData) {
        run.sectorIcons[run.sector - 1] = '◉';  // 현재 섹터 클리어 표시
        if (run.sector >= run.totalSectors) {
          // 런 완료 — 보상 + 마을 귀환
          this.applyRunRewards();
          endRun(nick);
          this.showRunDebrief(run, () => {
            this.scene.start('Loading', {
              target: 'Town', mode: 'return',
              data: { uid: this.uid, player: this.player },
            });
          });
          return;
        }
        // 다음 섹터로 — 이벤트 경유
        run.sector += 1;
        saveRun(nick, run);
        await saveProgress(this.uid, this.player);
        this.scene.start('EvaEvent', { uid: this.uid, player: this.player });
        return;
      }
      // 보스 던전이거나 런 없음 → 일반 귀환
      this.scene.start('Loading', {
        target: 'Town', mode: 'return',
        data: { uid: this.uid, player: this.player },
      });
    }
  }

  // 런 완료 보상 (섹터 수에 비례)
  applyRunRewards() {
    const nick = currentUser()?.nickname || 'guest';
    // import 중 (이미 위에서 로드되어 있음)
    import('../../eva-missions.js').then(({ getCurrentRun }) => {
      const run = getCurrentRun(nick);
      if (!run) return;
      const bonus = run.totalSectors * 50;
      this.player.gold = (this.player.gold || 0) + bonus;
      this.player.xp += run.totalSectors * 25;
    });
  }

  // 런 디브리핑 모달
  showRunDebrief(run, onContinue) {
    const modal = document.getElementById('eva-debrief-modal');
    if (!modal) { onContinue(); return; }
    const elapsed = Math.floor((Date.now() - run.startTime) / 1000);
    document.getElementById('debrief-sectors').textContent = `${run.totalSectors} / ${run.totalSectors}`;
    document.getElementById('debrief-events').textContent = (run.eventsEncountered || []).length;
    document.getElementById('debrief-time').textContent = `${Math.floor(elapsed/60)}m ${elapsed%60}s`;
    document.getElementById('debrief-bonus').textContent =
      `+${run.totalSectors * 50} CR / +${run.totalSectors * 25} XP`;
    document.getElementById('debrief-callsign').textContent =
      (currentUser()?.nickname || 'UNKNOWN').toUpperCase();
    modal.classList.add('show');
    audio.victory();
    const btn = document.getElementById('debrief-continue');
    const h = () => {
      modal.classList.remove('show');
      btn.removeEventListener('click', h);
      onContinue();
    };
    btn.addEventListener('click', h);
  }

  gainXp(xp) {
    const sk = getSkillBonuses(this.player);
    this.player.xp += Math.round(xp * (sk.xpMul || 1));
    let leveledUp = false;
    while (this.player.xp >= xpToNext(this.player.level)) {
      this.player.xp -= xpToNext(this.player.level);
      this.player.level += 1;
      this.player.maxHp += this.classDef.hpPerLevel || 1;
      this.player.hp = this.player.maxHp;
      this.showLevelUp();
      leveledUp = true;
      const nick = currentUser()?.nickname || 'guest';
      trackEvent(nick, 'levelUps', 1);
      checkAchievements(this.player, nick);
      // 레벨업 시 카드 1장 드롭
      const drop = grantRandomCard(this.player);
      this.showCardDrop([drop]);
    }
    if (leveledUp) this.maybeUpgradeAppearance();
  }

  maybeUpgradeAppearance() {
    const newTier = tierForLevel(this.player.level);
    if (newTier === this.playerSprite.currentTier) return;
    const newKey = playerSpriteKey(this.player.class, this.player.level);
    // 페이드 아웃 → 텍스처 교체 → 페이드 인
    this.tweens.add({
      targets: [this.playerSprite, this.playerLight],
      alpha: 0.1,
      duration: 400,
      yoyo: true,
      onYoyo: () => {
        this.playerSprite.setTexture(newKey);
        this.playerSprite.currentTier = newTier;
        this.playerLight.setScale(2.0 + newTier * 0.15);
      },
    });
  }

  showLevelUp() {
    const banner = document.getElementById('levelup-banner');
    banner.textContent = `LEVEL UP! → Lv.${this.player.level}`;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1500);
    audio.levelUp();
  }
}

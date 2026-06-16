// ============================================================
// DungeonScene — 절차적 던전 + 클릭 이동 + 횃불 조명 + 몬스터 조우
// ============================================================
import { generateDungeon, TILE_SIZE, MAP_W, MAP_H } from '../dungeon.js';
import { findPath } from '../pathfinding.js';
import { MONSTERS, pickMonster, xpToNext } from '../../monsters.js';
import { loadProgress, saveProgress, getUser } from '../../firebase-config.js';

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  async create() {
    this.uid = (await getUser()).uid;
    this.player = await loadProgress(this.uid);

    const dungeon = generateDungeon();
    this.grid = dungeon.grid;
    this.rooms = dungeon.rooms;

    this.drawMap();
    this.spawnTorches();
    this.spawnPlayer(dungeon.spawn);
    this.spawnMonsters();
    this.setupCamera();
    this.setupLighting();
    this.setupInput();
    this.setupHud();
    this.events.on('battle-result', this.onBattleResult, this);
  }

  // ---------- 맵 그리기 ----------
  drawMap() {
    this.tiles = this.add.container(0, 0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const key = this.grid[y][x] === 1 ? 'wall' : 'floor';
        const t = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, key);
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
    this.playerSprite = this.add.image(px, py, 'player').setDepth(20);
    this.playerSprite.tile = { ...spawn };
    // 발광 빛
    this.playerLight = this.add.image(px, py, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.0)
      .setAlpha(0.6)
      .setDepth(11)
      .setTint(0x4cc9f0);
  }

  spawnMonsters() {
    this.monsters = [];
    // 시작 방 제외, 각 방에 1~2마리 배치
    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const count = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < count; k++) {
        const data = pickMonster(this.player.level);
        const tx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const ty = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        if (this.grid[ty][tx] !== 0) continue;
        const sprite = this.add.image(
          tx * TILE_SIZE + TILE_SIZE/2,
          ty * TILE_SIZE + TILE_SIZE/2,
          `m-${data.id}`,
        ).setDepth(20);
        const label = this.add.text(sprite.x, sprite.y - 4, ['💀','🧟','👹','👻','🗿','🐲'][i % 6], {
          fontSize: '22px',
        }).setOrigin(0.5).setDepth(21);
        this.monsters.push({ data, sprite, label, tile: { x: tx, y: ty } });

        // 살랑살랑 idle 애니메이션
        this.tweens.add({
          targets: [sprite, label],
          y: '+=4',
          duration: 800 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
        });
      }
    }
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
      const wx = pointer.worldX, wy = pointer.worldY;
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      this.moveTo({ x: tx, y: ty });
    });
    // ESC / R = 던전 재생성 (디버그 편의)
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  setupHud() {
    // HUD는 DOM으로 — 분수 모양 일관성 + 가독성 ↑
    document.getElementById('hud-lv').textContent  = this.player.level;
    document.getElementById('hud-hp').textContent  = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-xp').textContent  = `${this.player.xp}/${xpToNext(this.player.level)}`;
    document.getElementById('hud-kills').textContent = this.player.kills;
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
      enemyEmoji: enemy.label.text,
      enemyHp: enemy.data.maxHp,
    });
  }

  async onBattleResult(result) {
    this.scene.resume();
    const enemy = this.currentEnemy;
    if (!enemy) return;

    if (result.victory) {
      // 처치 애니메이션
      this.tweens.add({
        targets: [enemy.sprite, enemy.label],
        alpha: 0,
        scale: 0.2,
        duration: 300,
        onComplete: () => {
          enemy.sprite.destroy();
          enemy.label.destroy();
        },
      });
      this.monsters = this.monsters.filter(m => m !== enemy);
      this.gainXp(enemy.data.xp);
      this.player.kills += 1;
    } else {
      this.player.hp = result.playerHpRemaining;
      if (this.player.hp <= 0) {
        this.player.hp = this.player.maxHp;
        // 시작 위치로 리스폰
        const spawn = this.rooms[0];
        this.playerSprite.x = spawn.cx * TILE_SIZE + TILE_SIZE/2;
        this.playerSprite.y = spawn.cy * TILE_SIZE + TILE_SIZE/2;
        this.playerSprite.tile = { x: spawn.cx, y: spawn.cy };
        this.playerLight.x = this.playerSprite.x;
        this.playerLight.y = this.playerSprite.y;
      }
    }
    this.player.mistakes += result.mistakes || 0;
    this.setupHud();
    await saveProgress(this.uid, this.player);

    // 모든 몬스터 처치 시 자동 던전 재생성
    if (this.monsters.length === 0) {
      this.scene.restart();
    }
  }

  gainXp(xp) {
    this.player.xp += xp;
    while (this.player.xp >= xpToNext(this.player.level)) {
      this.player.xp -= xpToNext(this.player.level);
      this.player.level += 1;
      this.player.maxHp += 1;
      this.player.hp = this.player.maxHp;
      this.showLevelUp();
    }
  }

  showLevelUp() {
    const banner = document.getElementById('levelup-banner');
    banner.textContent = `LEVEL UP! → Lv.${this.player.level}`;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1500);
  }
}

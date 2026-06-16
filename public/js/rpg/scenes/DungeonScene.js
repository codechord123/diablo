// ============================================================
// DungeonScene — 절차적 던전 + 클릭 이동 + 횃불 조명 + 몬스터 조우
// ============================================================
import { generateDungeon, TILE_SIZE, MAP_W, MAP_H } from '../dungeon.js';
import { findPath } from '../pathfinding.js';
import { MONSTERS, pickMonster, xpToNext } from '../../monsters.js';
import { loadProgress, saveProgress, getUser } from '../../firebase-config.js';
import { CLASSES, getClass, playerSpriteKey, tierForLevel } from '../../classes.js';

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  async create() {
    this.ready = false; // update() 가드용
    try {
      this.uid = (await getUser()).uid;
      this.player = await loadProgress(this.uid);

      // 직업 미선택 시 ClassSelectScene으로 라우팅
      if (!this.player.class) {
        this.scene.start('ClassSelect', { uid: this.uid, player: this.player });
        return;
      }
      this.classDef = getClass(this.player.class);

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
      this.ready = true; // 모든 셋업 완료 → update() 활성화
    } catch (err) {
      console.error('[DungeonScene.create] failed:', err);
    }
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
    // 살짝 떠다니는 idle
    this.tweens.add({
      targets: this.playerSprite,
      y: py - 2,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
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
    this.lastMoveTime = 0;
  }

  // 매 프레임 키 상태 확인 → 한 타일씩 이동 (150ms 쿨다운)
  update(time) {
    // async create()가 끝나기 전엔 cursors/wasd 미존재 → 가드
    if (!this.ready || !this.cursors || !this.wasd) return;
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
    this.tweens.add({
      targets: [this.playerSprite, this.playerLight],
      x: next.x * TILE_SIZE + TILE_SIZE/2,
      y: next.y * TILE_SIZE + TILE_SIZE/2,
      duration: 130,
      onComplete: () => {
        this.playerSprite.tile = next;
        this.moving = false;
      },
    });
  }

  setupHud() {
    document.getElementById('hud-lv').textContent  = this.player.level;
    document.getElementById('hud-hp').textContent  = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-xp').textContent  = `${this.player.xp}/${xpToNext(this.player.level)}`;
    document.getElementById('hud-kills').textContent = this.player.kills;
    document.getElementById('hud-gold').textContent  = this.player.gold || 0;
    const classEl = document.getElementById('hud-class');
    if (classEl && this.classDef) {
      classEl.textContent = `${this.classDef.icon} ${this.classDef.name}`;
    }
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
    if (result.victory) {
      // 도적 골드 보너스 적용
      const goldGain = Math.round(enemy.data.gold * (this.classDef.goldMul || 1));
      this.player.gold = (this.player.gold || 0) + goldGain;
    }
    this.setupHud();
    await saveProgress(this.uid, this.player);

    // 모든 몬스터 처치 시 마을로 복귀
    if (this.monsters.length === 0) {
      this.scene.start('Town', { player: this.player, uid: this.uid });
    }
  }

  gainXp(xp) {
    this.player.xp += xp;
    let leveledUp = false;
    while (this.player.xp >= xpToNext(this.player.level)) {
      this.player.xp -= xpToNext(this.player.level);
      this.player.level += 1;
      // 직업별 maxHp 성장률 (전사 +2, 그 외 +1)
      this.player.maxHp += this.classDef.hpPerLevel || 1;
      this.player.hp = this.player.maxHp;
      this.showLevelUp();
      leveledUp = true;
    }
    // 외형 단계가 바뀌었으면 스프라이트 교체 (페이드 트윈)
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
  }
}

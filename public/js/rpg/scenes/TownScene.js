// ============================================================
// TownScene — 마을 (Phase 1: placeholder, Phase 2: 상점/대장간 본격 구현)
// ============================================================
// 현재는 던전 클리어 후 잠시 머무는 휴식 공간.
// "다음 던전 입장" 버튼 / Enter 키 / 클릭으로 다음 던전 진입.
// ============================================================
import { TILE_SIZE } from '../dungeon.js';
import { xpToNext } from '../../monsters.js';
import { getClass, playerSpriteKey } from '../../classes.js';
import { ITEMS, SHOPS, canAfford, ownsWeapon, addPotion } from '../../items.js';
import { saveProgress } from '../../firebase-config.js';

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  init(data) {
    // 데이터 누락 대비 fallback
    this.player = (data && data.player) || { level: 1, xp: 0, hp: 5, maxHp: 5, kills: 0, mistakes: 0, gold: 0 };
    this.uid = (data && data.uid) || 'local-player';
  }

  create() {
    try {
      const W = this.scale.width;
      const H = this.scale.height;

      // 카메라 명시적 리셋 (이전 던전 zoom/scroll 잔재 제거)
      this.cameras.main.setScroll(0, 0).setZoom(1).setBackgroundColor('#1a0e08');

      // 마을 배경 — 단색 (gradient는 일부 환경 미지원)
      this.add.rectangle(W/2, H/2, W, H, 0x2a1a14).setDepth(-10);
      this.createUi(W, H);
    } catch (err) {
      console.error('[TownScene.create] failed:', err);
    }
  }

  createUi(W, H) {
    const classDef = getClass(this.player.class);

    // 모닥불 빛
    const fire = this.add.image(W/2, H * 0.62, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.0)
      .setTint(0xff7733);
    this.tweens.add({
      targets: fire,
      alpha: { from: 0.7, to: 1.0 },
      scale: { from: 2.8, to: 3.2 },
      duration: 700, yoyo: true, repeat: -1,
    });

    // 캐릭터 (직업 + 레벨에 맞는 스프라이트)
    const charSprite = this.add.image(W/2, H * 0.45, playerSpriteKey(this.player.class, this.player.level))
      .setScale(2.4);
    // 직업 발광
    const aura = this.add.image(W/2, H * 0.5, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.0)
      .setAlpha(0.5)
      .setTint(classDef.glowColor);
    this.tweens.add({
      targets: charSprite,
      y: H * 0.45 - 6,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.4, to: 0.7 },
      duration: 1200, yoyo: true, repeat: -1,
    });

    // 타이틀
    this.add.text(W/2, H * 0.08, '🏰 평화로운 마을', {
      fontSize: '40px',
      fontFamily: 'Cinzel, Noto Serif KR, serif',
      color: '#d4af37',
    }).setOrigin(0.5);

    this.add.text(W/2, H * 0.16, `${classDef.icon} ${classDef.name} · Lv ${this.player.level}`, {
      fontSize: '20px',
      color: '#ead7b7',
    }).setOrigin(0.5);

    // 진행도
    const stats = [
      `HP ${this.player.hp}/${this.player.maxHp}`,
      `XP ${this.player.xp}/${xpToNext(this.player.level)}`,
      `💰 ${this.player.gold || 0} G`,
      `처치 ${this.player.kills}`,
    ].join('   ·   ');
    this.add.text(W/2, H * 0.22, stats, {
      fontSize: '15px',
      color: '#d4af37',
    }).setOrigin(0.5);

    // 다음 던전 진입 버튼
    const btn = this.add.text(W/2, H * 0.82, '⚔️  다음 던전 입장 (Enter)', {
      fontSize: '22px',
      color: '#ead7b7',
      backgroundColor: '#3a2418',
      padding: { left: 24, right: 24, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5a3a24' }));
    btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#3a2418' }));
    btn.on('pointerdown', () => this.enterDungeon());

    // 캐릭터 변경 (작은 부가 버튼)
    const changeBtn = this.add.text(W/2, H * 0.91, '🔄 캐릭터 변경', {
      fontSize: '13px',
      color: '#888',
      padding: { left: 12, right: 12, top: 6, bottom: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    changeBtn.on('pointerover', () => changeBtn.setStyle({ color: '#d4af37' }));
    changeBtn.on('pointerout',  () => changeBtn.setStyle({ color: '#888' }));
    changeBtn.on('pointerdown', () => this.changeClass());

    // NPC 배치 (좌: 상인, 우: 대장장이)
    this.spawnNpc(W * 0.22, H * 0.62, 'merchant',   '🧙‍♀️', '상인 헬가',     '#88ddff');
    this.spawnNpc(W * 0.78, H * 0.62, 'blacksmith', '🧔',   '대장장이 군나르', '#ff8855');

    this.add.text(W/2, H * 0.74, 'NPC를 클릭하여 상점 열기', {
      fontSize: '12px', color: '#888',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.enterDungeon());
    this.input.keyboard.on('keydown-SPACE', () => this.enterDungeon());

    // 마을 입장 시 HP 회복
    this.player.hp = this.player.maxHp;
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    document.getElementById('hud-gold').textContent = this.player.gold || 0;
    const classEl = document.getElementById('hud-class');
    if (classEl) classEl.textContent = `${classDef.icon} ${classDef.name}`;
  }

  changeClass() {
    if (!confirm('캐릭터를 변경하면 레벨과 진행도가 초기화됩니다. 계속하시겠습니까?')) return;
    this.scene.start('ClassSelect', { uid: this.uid, player: this.player, reset: true });
  }

  enterDungeon() {
    if (this._shopOpen) return; // 상점 열린 상태면 입장 차단
    this.scene.start('Dungeon');
  }

  // ============================================================
  // NPC
  // ============================================================
  spawnNpc(x, y, shopKey, emoji, name, colorHex) {
    const glow = this.add.image(x, y, 'torch')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.4).setAlpha(0.55)
      .setTint(parseInt(colorHex.slice(1), 16));
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.45, to: 0.7 },
      duration: 1100, yoyo: true, repeat: -1,
    });

    const sprite = this.add.text(x, y, emoji, { fontSize: '54px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y + 45, name, {
      fontSize: '14px', color: colorHex,
      fontFamily: 'Cinzel, Noto Serif KR, serif',
    }).setOrigin(0.5);

    this.add.text(x, y + 64, shopKey === 'merchant' ? '🏪 포션' : '🔨 무기', {
      fontSize: '12px', color: '#d4af37',
    }).setOrigin(0.5);

    sprite.on('pointerover', () => sprite.setScale(1.1));
    sprite.on('pointerout',  () => sprite.setScale(1.0));
    sprite.on('pointerdown', () => this.openShop(shopKey, name));
  }

  // ============================================================
  // 상점 모달 (DOM 오버레이)
  // ============================================================
  openShop(shopKey, npcName) {
    const modal = document.getElementById('shop-modal');
    document.getElementById('shop-title').textContent = `${npcName}의 상점`;
    const list = document.getElementById('shop-items');
    list.innerHTML = '';
    this.shopKey = shopKey;
    this.shopNpcName = npcName;

    SHOPS[shopKey].forEach(itemId => this.renderShopItem(list, itemId));
    this.refreshShopGold();
    modal.classList.add('show');
    this._shopOpen = true;

    // ESC 닫기
    if (!this._escHandler) {
      this._escHandler = (e) => {
        if (e.key === 'Escape' && this._shopOpen) this.closeShop();
      };
      document.addEventListener('keydown', this._escHandler);
    }
    // 닫기 버튼 (1회 등록)
    const closeBtn = document.getElementById('shop-close');
    if (!closeBtn._wired) {
      closeBtn.addEventListener('click', () => this.closeShop());
      closeBtn._wired = true;
    }
  }

  renderShopItem(list, itemId) {
    const item = ITEMS[itemId];
    const row = document.createElement('div');
    row.className = 'shop-row';

    const owned = item.type === 'weapon' && ownsWeapon(this.player, itemId);
    const affordable = canAfford(this.player, item);
    const disabled = owned || !affordable;

    row.innerHTML = `
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div class="shop-price">💰 ${item.price}G</div>
      <button class="shop-buy" ${disabled ? 'disabled' : ''}>
        ${owned ? '보유 중' : (affordable ? '구매' : '골드 부족')}
      </button>
    `;
    const btn = row.querySelector('.shop-buy');
    if (!disabled) btn.addEventListener('click', () => this.buy(itemId, row));
    list.appendChild(row);
  }

  async buy(itemId, row) {
    const item = ITEMS[itemId];
    if (!canAfford(this.player, item)) return;
    this.player.gold -= item.price;
    if (item.type === 'potion') {
      addPotion(this.player, itemId);
    } else if (item.type === 'weapon') {
      this.player.weapons = this.player.weapons || ['sword_basic'];
      if (!this.player.weapons.includes(itemId)) this.player.weapons.push(itemId);
      this.player.equippedWeapon = itemId;
    }
    await saveProgress(this.uid, this.player);

    row.classList.add('shop-row-bought');
    setTimeout(() => this.refreshShopList(), 400);
    this.refreshShopGold();
    this.refreshHud();
  }

  refreshShopList() {
    const list = document.getElementById('shop-items');
    list.innerHTML = '';
    SHOPS[this.shopKey].forEach(itemId => this.renderShopItem(list, itemId));
  }

  refreshShopGold() {
    document.getElementById('shop-gold').textContent = this.player.gold || 0;
  }

  refreshHud() {
    document.getElementById('hud-gold').textContent = this.player.gold || 0;
    const weapon = ITEMS[this.player.equippedWeapon || 'sword_basic'];
    const potionCount = Object.entries(this.player.inventory || {})
      .filter(([id]) => ITEMS[id]?.type === 'potion')
      .reduce((a, [, n]) => a + n, 0);
    const wEl = document.getElementById('hud-weapon');
    if (wEl) wEl.textContent = `${weapon.icon}`;
    const pEl = document.getElementById('hud-potion');
    if (pEl) pEl.textContent = `🧪${potionCount}`;
  }

  closeShop() {
    document.getElementById('shop-modal').classList.remove('show');
    this._shopOpen = false;
  }
}

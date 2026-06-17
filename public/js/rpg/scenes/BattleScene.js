// ============================================================
// BattleScene — 분수 전투 (DOM 오버레이 모달)
// 분수 모양은 HTML이 가장 깔끔하므로 Phaser canvas 위에 DOM을 띄움
// ============================================================
import { generateProblem, checkAnswer, problemToHtml, CATEGORIES } from '../../fractionEngine.js';
import { getClass } from '../../classes.js';
import { ITEMS, useFirstPotion, getEquippedWeapon, totalPotions } from '../../items.js';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.level = data.level;
    this.enemyName = data.enemyName;
    this.enemyEmoji = data.enemyEmoji;
    this.enemyHp = data.enemyHp;
    this.enemyMaxHp = data.enemyHp;
    this.category = data.category;
    this.playerClass = data.playerClass;
    this.classDef = getClass(this.playerClass);
    this.player = data.player;
    this.weapon = getEquippedWeapon(this.player);
    this.playerMistakes = 0;
    this.correctStreak = 0;
    this.firstMistake = true;
    this.locked = false;
    // 보스 모드
    this.isBoss = !!data.isBoss;
    this.timeLimitSec = data.timeLimitSec || 0;
    this.bossId = data.bossId;
    this.timeLeft = this.timeLimitSec;
    this._timerExpired = false;
  }

  create() {
    this.modal = document.getElementById('battle-modal');
    this.modal.classList.add('show');
    this.modal.classList.toggle('boss', this.isBoss);
    document.getElementById('bm-enemy-emoji').textContent = this.enemyEmoji;
    document.getElementById('bm-enemy-name').textContent = (this.isBoss ? '⚠️ BOSS · ' : '') + this.enemyName;
    const catLabel = (CATEGORIES[this.category] || {}).label || '분수';
    document.getElementById('bm-category').textContent = `📚 ${catLabel}`;
    this.renderEnemyHp();
    this.nextProblem();

    // 보스 타이머 UI
    const timerEl = document.getElementById('bm-timer');
    if (this.isBoss) {
      timerEl.style.display = 'block';
      this.updateTimerDisplay();
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => this.tickTimer(),
      });
    } else {
      timerEl.style.display = 'none';
    }

    // 키보드: ESC=도주, 1~4 답 선택, H=포션
    this.input.keyboard.addKey('ESC').on('down', () => this.flee());
    this.input.keyboard.addKey('H').on('down', () => this.usePotion());
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => {
      this.input.keyboard.addKey(`${k}`).on('down', () => this.pickByIndex(i));
    });

    // 포션 버튼 (모달 안)
    const potionBtn = document.getElementById('bm-potion');
    if (potionBtn && !potionBtn._wired) {
      potionBtn.addEventListener('click', () => this.usePotion());
      potionBtn._wired = true;
    }
    this.refreshPotionBtn();
  }

  refreshPotionBtn() {
    const btn = document.getElementById('bm-potion');
    if (!btn) return;
    const count = totalPotions(this.player);
    btn.textContent = `🧪 포션 사용 (${count})`;
    btn.disabled = (count <= 0 || this.player.hp >= this.player.maxHp);
  }

  usePotion() {
    if (this.player.hp >= this.player.maxHp) return;
    const usedId = useFirstPotion(this.player);
    if (!usedId) return;
    const item = ITEMS[usedId];
    const fb = document.getElementById('bm-feedback');
    fb.innerHTML = `${item.icon} ${item.name} 사용! HP +${item.heal}`;
    fb.className = 'bm-feedback heal';
    this.refreshPotionBtn();
    // HUD 갱신 (실시간으로 보이게)
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    const pEl = document.getElementById('hud-potion');
    if (pEl) pEl.textContent = `🧪${totalPotions(this.player)}`;
  }

  pickByIndex(i) {
    if (this.locked) return;
    if (i < 0 || i >= this.problem.choices.length) return;
    this.answer(this.problem.choices[i]);
  }

  // ----- 보스 타이머 -----
  tickTimer() {
    if (this._timerExpired) return;
    this.timeLeft -= 1;
    this.updateTimerDisplay();
    if (this.timeLeft <= 0) {
      this._timerExpired = true;
      this.timerEvent && this.timerEvent.remove();
      this.finish({ victory: false, defeated: true, timeout: true });
    }
  }

  updateTimerDisplay() {
    const txt = document.getElementById('bm-timer-text');
    const bar = document.getElementById('bm-timer-bar');
    if (!txt || !bar) return;
    txt.textContent = `⏱ ${this.timeLeft}초`;
    const pct = (this.timeLeft / this.timeLimitSec) * 100;
    bar.style.width = `${Math.max(0, pct)}%`;
    bar.classList.toggle('danger', this.timeLeft <= 10);
    document.getElementById('bm-timer').classList.toggle('danger', this.timeLeft <= 10);
  }

  renderEnemyHp() {
    const pct = (this.enemyHp / this.enemyMaxHp) * 100;
    document.getElementById('bm-enemy-hpbar').style.width = `${pct}%`;
    document.getElementById('bm-enemy-hp').textContent = `${this.enemyHp} / ${this.enemyMaxHp}`;
  }

  nextProblem() {
    // 몬스터별 카테고리 사용 (레벨 부족 시 자동 폴백)
    this.problem = generateProblem(this.level, this.category);
    document.getElementById('bm-problem').innerHTML =
      `${problemToHtml(this.problem)} <span class="op">=</span> <span class="q">?</span>`;
    const box = document.getElementById('bm-choices');
    box.innerHTML = '';
    this.problem.choices.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'bm-choice';
      const [n, d] = c.split('/');
      btn.innerHTML = `
        <span class="bm-choice-key">${idx + 1}</span>
        <span class="frac frac-sm"><span class="num">${n}</span><span class="den">${d}</span></span>
      `;
      btn.addEventListener('click', () => this.answer(c));
      box.appendChild(btn);
    });
    document.getElementById('bm-feedback').innerHTML = '';
    this.locked = false;
  }

  answer(choice) {
    if (this.locked) return;
    this.locked = true;
    const correct = checkAnswer(choice, this.problem.answer);
    const fb = document.getElementById('bm-feedback');
    if (correct) {
      // 무기 데미지 + 마법사 능력 (3회 연속마다 +1)
      let dmg = this.weapon.damage || 1;
      this.correctStreak += 1;
      const everyN = this.classDef.extraDamageEveryN || 0;
      const bonus = (everyN > 0 && this.correctStreak % everyN === 0);
      if (bonus) dmg += 1;
      this.enemyHp -= dmg;
      fb.innerHTML = bonus
        ? `🔮 마법의 일격! +${dmg} 데미지 (정답: ${this.problem.answer.toHtml()})`
        : `✨ 명중! 정답: ${this.problem.answer.toHtml()}`;
      fb.className = 'bm-feedback hit';
      this.renderEnemyHp();
      if (this.enemyHp <= 0) {
        this.finish({ victory: true });
        return;
      }
    } else {
      // 도적 회피 — 첫 오답 제외, 20% 확률
      const evadeChance = this.classDef.evadeChance || 0;
      const evaded = !this.firstMistake && evadeChance > 0 && Math.random() < evadeChance;
      this.firstMistake = false;
      if (evaded) {
        fb.innerHTML = `🌀 회피! 데미지를 받지 않았다 (정답: ${this.problem.answer.toHtml()})`;
        fb.className = 'bm-feedback evade';
      } else {
        this.playerMistakes += 1;
        // HP 즉시 차감 (포션 사용 흐름과 일관성 유지)
        this.player.hp = Math.max(0, this.player.hp - 1);
        document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
        this.refreshPotionBtn(); // HP 변동 시 포션 버튼 재평가
        fb.innerHTML = `💥 빗나감! 정답: ${this.problem.answer.toHtml()}`;
        fb.className = 'bm-feedback miss';
        if (this.player.hp <= 0) {
          this.finish({ victory: false, defeated: true });
          return;
        }
      }
    }
    setTimeout(() => this.nextProblem(), 900);
  }

  flee() {
    this.finish({ fled: true });
  }

  finish(result) {
    this.modal.classList.remove('show');
    this.modal.classList.remove('boss');
    if (this.timerEvent) this.timerEvent.remove();
    if (this.isBoss) {
      const arena = this.scene.get('BossArena');
      arena && arena.events.emit('boss-result', {
        victory: !!result.victory,
        fled: !!result.fled,
        defeated: !!result.defeated,
        timeout: !!result.timeout,
        mistakes: this.playerMistakes,
        bossId: this.bossId,
      });
    } else {
      const dungeon = this.scene.get('Dungeon');
      dungeon && dungeon.events.emit('battle-result', {
        victory: !!result.victory,
        fled: !!result.fled,
        defeated: !!result.defeated,
        mistakes: this.playerMistakes,
        playerHpRemaining: this.player.hp,
      });
    }
    this.scene.stop();
  }
}

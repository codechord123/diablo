// ============================================================
// BattleScene — 분수 전투 (DOM 오버레이 모달)
// 분수 모양은 HTML이 가장 깔끔하므로 Phaser canvas 위에 DOM을 띄움
// ============================================================
import { generateProblem, checkAnswer, problemToHtml, problemHint, adjustedLevel, CATEGORIES } from '../../fractionEngine.js';
import { fractionWithVis, fractionSVG } from '../../fraction-vis.js';
import { hasSeen, markSeen, showConcept } from '../../concepts.js';
import { recordAnswer, recordWrong, getRecentAccuracy, clearWrongOne } from '../../storage.js';
import { currentUser } from '../../auth.js';
import { trackEvent } from '../../missions.js';
import { getBonuses as getSkillBonuses } from '../../skills.js';
import { getClass } from '../../classes.js';
import { ITEMS, useFirstPotion, getEquippedWeapon, totalPotions } from '../../items.js';
import { toggleNotepad } from '../../notepad.js';
import { getBoss } from '../../bosses.js';
import audio from '../../audio.js';
import * as fx from '../../effects.js';

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
    this.skillBonus = getSkillBonuses(this.player);
    this.playerMistakes = 0;
    this.correctStreak = 0;
    this.firstMistake = true;
    this.locked = false;
    // 보스 모드 + 능력
    this.isBoss = !!data.isBoss;
    this.timeLimitSec = data.timeLimitSec || 0;
    this.bossId = data.bossId;
    this.timeLeft = this.timeLimitSec;
    this._timerExpired = false;
    this.bossAbilities = (this.isBoss && this.bossId)
      ? (getBoss(this.bossId)?.abilities || {})
      : {};
    this._secsSinceLastAutoAttack = 0;
    // 같은 던전 내 문제 중복 방지용 풀 (DungeonScene 공유)
    this.problemPool = data.problemPool || null;
    // 5B: 사용자 닉네임 (정답률 추적용)
    this.nickname = currentUser()?.nickname || 'guest';
    this.hintUsed = false; // 이 문제에서 힌트 사용했는지
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
    // 첫 전투면 intro 개념 카드 표시
    if (!hasSeen(this.nickname, 'intro')) {
      markSeen(this.nickname, 'intro');
      showConcept('intro').then(() => this.nextProblem());
    } else {
      this.nextProblem();
    }

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
    // 노트 토글 버튼
    const noteBtn = document.getElementById('bm-notepad');
    if (noteBtn && !noteBtn._wired) {
      noteBtn.addEventListener('click', () => toggleNotepad());
      noteBtn._wired = true;
    }
    // 힌트 버튼
    const hintBtn = document.getElementById('bm-hint');
    if (hintBtn && !hintBtn._wired) {
      hintBtn.addEventListener('click', () => this.useHint());
      hintBtn._wired = true;
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
    audio.potion();
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

    // 보스 자동 공격
    const interval = this.bossAbilities.autoAttackEverySec || 0;
    if (interval > 0) {
      this._secsSinceLastAutoAttack += 1;
      if (this._secsSinceLastAutoAttack >= interval) {
        this._secsSinceLastAutoAttack = 0;
        this.bossAutoAttack();
      }
    }

    if (this.timeLeft <= 0) {
      this._timerExpired = true;
      this.timerEvent && this.timerEvent.remove();
      this.finish({ victory: false, defeated: true, timeout: true });
    }
  }

  bossAutoAttack() {
    if (this.player.hp <= 0) return;
    let dmg = this.bossAbilities.autoAttackDamage || 1;
    // 분노 — 시간 부족 시 데미지 2배
    const enrage = this.bossAbilities.enrageBelowSec || 0;
    if (enrage > 0 && this.timeLeft < enrage) dmg *= 2;
    audio.bossHit();
    this.player.hp = Math.max(0, this.player.hp - dmg);
    document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
    this.refreshPotionBtn();
    fx.shake(this, ...fx.SHAKE.boss());
    const hudHp = document.getElementById('hud-hp');
    if (hudHp) fx.damageNumberDOM(hudHp.parentElement, -dmg, { crit: true });

    // 텍스트 피드백 + DOM 흔들림
    const fb = document.getElementById('bm-feedback');
    fb.innerHTML = `⚡ 보스의 일격! (-${dmg} HP)`;
    fb.className = 'bm-feedback miss';
    const card = this.modal.querySelector('.bm-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 350);
    }
    if (this.player.hp <= 0) {
      this._timerExpired = true;
      this.timerEvent && this.timerEvent.remove();
      this.finish({ victory: false, defeated: true });
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
    const bar = document.getElementById('bm-enemy-hpbar');
    if (bar.tagName === 'rect') bar.setAttribute('width', pct);
    else bar.style.width = `${pct}%`;
    document.getElementById('bm-enemy-hp').textContent = `${this.enemyHp} / ${this.enemyMaxHp}`;
    // 플레이어 통합 게이지
    const playerBar = document.getElementById('bm-player-bar');
    const playerHpEl = document.getElementById('bm-player-hp');
    if (playerBar && this.player) {
      const ppct = (this.player.hp / this.player.maxHp) * 100;
      if (playerBar.tagName === 'rect') playerBar.setAttribute('width', ppct);
      else playerBar.style.width = `${ppct}%`;
    }
    if (playerHpEl && this.player) {
      playerHpEl.textContent = `${this.player.hp}/${this.player.maxHp}`;
    }
    // 하모닉 미터 — streak에 따라 바늘 회전 (-90~+90도)
    const needle = document.querySelector('.hm-needle');
    if (needle) {
      const streak = this.correctStreak || 0;
      const angle = Math.min(135, streak * 18) - 135; // 처음 -135, 7+ 정답 = +90
      needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
    const streakEl = document.getElementById('bm-streak');
    if (streakEl) streakEl.textContent = `STREAK ${this.correctStreak || 0}`;
  }

  async nextProblem() {
    // 적응 난이도: 최근 정답률 기반 레벨 조정 (보스전은 적용 안 함)
    const acc = getRecentAccuracy(this.nickname);
    const effLevel = this.isBoss ? this.level : adjustedLevel(this.level, acc);
    this.problem = generateProblem(effLevel, this.category, {
      exclude: this.problemPool,
    });
    this.hintUsed = false;

    // 첫 이분모 문제 시 통분 개념 카드
    if (!hasSeen(this.nickname, 'lcm')) {
      markSeen(this.nickname, 'lcm');
      await showConcept('lcm');
    }

    // 문제 영역 — 분수 시각화 (a + b = ?)
    const a = this.problem.a, b = this.problem.b;
    document.getElementById('bm-problem').innerHTML = `
      <span class="bm-frac-vis-wrap">
        ${fractionSVG(a.n, a.d, { color: '#4cc9f0', size: 40 })}
        <span class="frac"><span class="num">${a.n}</span><span class="den">${a.d}</span></span>
      </span>
      <span class="op">${this.problem.op}</span>
      <span class="bm-frac-vis-wrap">
        ${fractionSVG(b.n, b.d, { color: '#ff77bb', size: 40 })}
        <span class="frac"><span class="num">${b.n}</span><span class="den">${b.d}</span></span>
      </span>
      <span class="op">=</span>
      <span class="q">?</span>
    `;

    // 선택지 — 시각화 포함
    const box = document.getElementById('bm-choices');
    box.innerHTML = '';
    this.problem.choices.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'bm-choice';
      const [n, d] = c.split('/');
      btn.innerHTML = `
        <span class="bm-choice-key">${idx + 1}</span>
        ${fractionSVG(+n, +d, { color: '#ffd700', size: 28 })}
        <span class="frac frac-sm"><span class="num">${n}</span><span class="den">${d}</span></span>
      `;
      btn.addEventListener('click', () => this.answer(c));
      box.appendChild(btn);
    });
    document.getElementById('bm-feedback').innerHTML = '';
    document.getElementById('bm-hint-area').innerHTML = '';
    this.refreshHintBtn();
    this.locked = false;
  }

  // 힌트 버튼 동작
  refreshHintBtn() {
    const btn = document.getElementById('bm-hint');
    if (!btn) return;
    btn.disabled = this.hintUsed;
    btn.textContent = this.hintUsed ? '💡 힌트 사용됨' : '💡 힌트 (XP 절반)';
  }

  useHint() {
    if (this.hintUsed) return;
    this.hintUsed = true;
    const h = problemHint(this.problem);
    document.getElementById('bm-hint-area').innerHTML = `<div class="bm-hint-box">${h.html}</div>`;
    this.refreshHintBtn();
    // 첫 힌트 시 개념 카드
    if (!hasSeen(this.nickname, 'hint')) {
      markSeen(this.nickname, 'hint');
      showConcept('hint');
    }
  }

  answer(choice) {
    if (this.locked) return;
    this.locked = true;
    const correct = checkAnswer(choice, this.problem.answer);
    const fb = document.getElementById('bm-feedback');
    if (correct) {
      recordAnswer(this.nickname, true);
      trackEvent(this.nickname, 'corrects', 1);
      // 연속 정답 최대치 갱신 (도전과제용)
      this.player.correctStreakMax = Math.max(this.player.correctStreakMax || 0, this.correctStreak + 1);
      // 무기 데미지 + 마법사 능력 + 스킬 보너스
      let dmg = this.weapon.damage || 1;
      this.correctStreak += 1;
      // 콤보 주기 단축 (마법사 스킬)
      const everyN = Math.max(1, (this.classDef.extraDamageEveryN || 0) - (this.skillBonus.comboShorten || 0));
      const bonus = (this.classDef.extraDamageEveryN > 0 && this.correctStreak % everyN === 0);
      if (bonus) dmg += 1;
      // 강타/정확성 — 확률 추가 데미지
      if (this.skillBonus.bonusDmgChance && Math.random() < this.skillBonus.bonusDmgChance) {
        dmg += this.skillBonus.bonusDmg || 1;
      }
      // 보스 방어막 — 최소 1 데미지는 보장
      const armor = this.bossAbilities.armor || 0;
      if (armor > 0) dmg = Math.max(1, dmg - armor);
      // 힌트 사용 시 데미지 절반 (몬스터에 약함 = XP 적게)
      if (this.hintUsed) dmg = Math.max(1, Math.floor(dmg / 2));
      this.enemyHp -= dmg;
      // 적응 사운드: streak에 따라 점점 고음 하모닉
      if (bonus) audio.magic(); else audio.harmonic(this.correctStreak - 1);
      // 데미지 숫자 (DOM, 적 위에 떠오름) + 화면 흔들림
      const enemyEl = this.modal.querySelector('.bm-enemy');
      if (enemyEl) fx.damageNumberDOM(enemyEl, -dmg, { crit: bonus });
      fx.shake(this, ...(bonus ? fx.SHAKE.medium() : fx.SHAKE.light()));
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
      // 도적 회피 — 첫 오답 제외, 20% 확률 (보스의 pierceEvade가 막을 수 있음)
      const evadeChance = (this.classDef.evadeChance || 0) + (this.skillBonus.extraEvade || 0);
      const pierce = this.bossAbilities.pierceEvade;
      const evaded = !this.firstMistake && evadeChance > 0 && !pierce && Math.random() < evadeChance;
      this.firstMistake = false;
      if (evaded) {
        audio.evade();
        const playerEl = document.getElementById('hud-hp');
        if (playerEl) fx.damageNumberDOM(playerEl.parentElement, 0, { miss: true, text: '회피!' });
        fb.innerHTML = `🌀 회피! 데미지를 받지 않았다 (정답: ${this.problem.answer.toHtml()})`;
        fb.className = 'bm-feedback evade';
      } else if (pierce && evadeChance > 0 && Math.random() < evadeChance) {
        // 회피가 막혔다는 시각 피드백
        this.player.hp = Math.max(0, this.player.hp - 1);
        document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
        this.refreshPotionBtn();
        fb.innerHTML = `🛡️ 회피 무효! 보스의 마법이 회피를 뚫었다 (정답: ${this.problem.answer.toHtml()})`;
        fb.className = 'bm-feedback miss';
        if (this.player.hp <= 0) { this.finish({ victory: false, defeated: true }); return; }
      } else {
        recordAnswer(this.nickname, false);
        recordWrong(this.nickname, this.problem);
        this.playerMistakes += 1;
        // HP 즉시 차감 (포션 사용 흐름과 일관성 유지)
        this.player.hp = Math.max(0, this.player.hp - 1);
        document.getElementById('hud-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
        this.refreshPotionBtn(); // HP 변동 시 포션 버튼 재평가
        audio.miss();
        const hudHp = document.getElementById('hud-hp');
        if (hudHp) fx.damageNumberDOM(hudHp.parentElement, -1);
        fx.shake(this, ...fx.SHAKE.medium());
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
    // 보스 전투도 PR 4A부터 DungeonScene boss 모드로 통합 → 항상 Dungeon에 emit
    const dungeon = this.scene.get('Dungeon');
    dungeon && dungeon.events.emit('battle-result', {
      victory: !!result.victory,
      fled: !!result.fled,
      defeated: !!result.defeated,
      timeout: !!result.timeout,
      mistakes: this.playerMistakes,
      playerHpRemaining: this.player.hp,
    });
    this.scene.stop();
  }
}

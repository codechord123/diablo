// ============================================================
// BattleScene — 분수 전투 (DOM 오버레이 모달)
// 분수 모양은 HTML이 가장 깔끔하므로 Phaser canvas 위에 DOM을 띄움
// ============================================================
import { generateProblem, checkAnswer, problemToHtml } from '../../fractionEngine.js';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.level = data.level;
    this.enemyName = data.enemyName;
    this.enemyEmoji = data.enemyEmoji;
    this.enemyHp = data.enemyHp;
    this.enemyMaxHp = data.enemyHp;
    this.playerMistakes = 0;
    this.locked = false;
  }

  create() {
    this.modal = document.getElementById('battle-modal');
    this.modal.classList.add('show');
    document.getElementById('bm-enemy-emoji').textContent = this.enemyEmoji;
    document.getElementById('bm-enemy-name').textContent = this.enemyName;
    this.renderEnemyHp();
    this.nextProblem();

    this.escKey = this.input.keyboard.addKey('ESC');
    this.escKey.on('down', () => this.flee());
  }

  renderEnemyHp() {
    const pct = (this.enemyHp / this.enemyMaxHp) * 100;
    document.getElementById('bm-enemy-hpbar').style.width = `${pct}%`;
    document.getElementById('bm-enemy-hp').textContent = `${this.enemyHp} / ${this.enemyMaxHp}`;
  }

  nextProblem() {
    this.problem = generateProblem(this.level);
    document.getElementById('bm-problem').innerHTML =
      `${problemToHtml(this.problem)} <span class="op">=</span> <span class="q">?</span>`;
    const box = document.getElementById('bm-choices');
    box.innerHTML = '';
    this.problem.choices.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'bm-choice';
      const [n, d] = c.split('/');
      btn.innerHTML = `<span class="frac frac-sm"><span class="num">${n}</span><span class="den">${d}</span></span>`;
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
      this.enemyHp -= 1;
      fb.innerHTML = `✨ 명중! 정답: ${this.problem.answer.toHtml()}`;
      fb.className = 'bm-feedback hit';
      this.renderEnemyHp();
      if (this.enemyHp <= 0) {
        this.finish({ victory: true });
        return;
      }
    } else {
      this.playerMistakes += 1;
      fb.innerHTML = `💥 빗나감! 정답: ${this.problem.answer.toHtml()}`;
      fb.className = 'bm-feedback miss';
      // 학생도 HP 1 잃음 — DungeonScene에 전달
    }
    setTimeout(() => this.nextProblem(), 800);
  }

  flee() {
    this.finish({ fled: true });
  }

  finish(result) {
    this.modal.classList.remove('show');
    // DungeonScene 에 결과 전달 (mistake 수만큼 hp 차감)
    const dungeon = this.scene.get('Dungeon');
    const damage = result.victory ? 0 : this.playerMistakes;
    const playerHpRemaining = Math.max(0, dungeon.player.hp - damage);
    dungeon.events.emit('battle-result', {
      victory: !!result.victory,
      fled: !!result.fled,
      mistakes: this.playerMistakes,
      playerHpRemaining,
    });
    this.scene.stop();
  }
}

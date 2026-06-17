// ============================================================
// LoginScene — 학생 로그인/회원가입 (DOM 오버레이)
// ============================================================
import { listStudents, getProgress } from '../../storage.js';
import { signUp, signIn, currentUser } from '../../auth.js';
import audio from '../../audio.js';

export class LoginScene extends Phaser.Scene {
  constructor() { super('Login'); }

  create() {
    try {
      const W = this.scale.width, H = this.scale.height;
      this.cameras.main.setBackgroundColor('#0a0408').setScroll(0,0).setZoom(1);
      this.cameras.main.fadeIn(400, 0, 0, 0);

      // 배경 글로우
      this.add.image(W/2, H/2, 'torch')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(5).setAlpha(0.25).setTint(0xaa5522);

      // 타이틀
      this.add.text(W/2, H * 0.10, '⚔️ 분수 던전', {
        fontSize: '48px', color: '#d4af37',
        fontFamily: 'Cinzel, Noto Serif KR, serif',
      }).setOrigin(0.5);
      this.add.text(W/2, H * 0.16, '— Fraction Dungeon —', {
        fontSize: '14px', color: '#888', fontStyle: 'italic',
      }).setOrigin(0.5);

      this.showLoginModal();
    } catch (err) {
      console.error('[LoginScene.create] failed:', err);
    }
  }

  showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('show');
    this.renderStudentCards();
    this.renderForm();
  }

  hideLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
  }

  renderStudentCards() {
    const grid = document.getElementById('login-student-grid');
    grid.innerHTML = '';
    const students = listStudents();

    if (students.length === 0) {
      grid.innerHTML = `<div class="login-empty">아직 등록된 학생이 없습니다.<br>아래에서 새로 시작하세요!</div>`;
      return;
    }

    students.forEach(s => {
      const p = getProgress(s.nickname);
      const card = document.createElement('button');
      card.className = 'login-student-card';
      card.innerHTML = `
        <div class="ls-name">${s.nickname}</div>
        <div class="ls-meta">
          ${p?.class ? this.classIcon(p.class) : '🧑‍🎓'}
          Lv ${p?.level ?? 1}
          ${p?.classCode && p.classCode !== 'default' ? `· ${s.classCode}` : ''}
        </div>
      `;
      card.addEventListener('click', () => this.promptPinFor(s.nickname));
      grid.appendChild(card);
    });
  }

  classIcon(cls) {
    return { warrior: '⚔️', mage: '🔮', rogue: '🗡️' }[cls] || '🧑‍🎓';
  }

  promptPinFor(nickname) {
    document.getElementById('login-mode').value = 'signin';
    document.getElementById('login-nickname').value = nickname;
    document.getElementById('login-nickname').disabled = true;
    document.getElementById('login-classcode').style.display = 'none';
    document.getElementById('login-classcode-label').style.display = 'none';
    document.getElementById('login-submit').textContent = '🚪 입장';
    document.getElementById('login-toggle').textContent = '↩ 다른 학생 / 새 학생';
    document.getElementById('login-pin').focus();
    document.getElementById('login-error').textContent = '';
  }

  renderForm() {
    const modal = document.getElementById('login-modal');
    if (modal._wired) return;
    modal._wired = true;

    const form = document.getElementById('login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    document.getElementById('login-toggle').addEventListener('click', () => {
      const mode = document.getElementById('login-mode').value;
      this.switchMode(mode === 'signin' ? 'signup' : 'signin');
    });
  }

  switchMode(mode) {
    document.getElementById('login-mode').value = mode;
    document.getElementById('login-nickname').disabled = false;
    document.getElementById('login-nickname').value = '';
    document.getElementById('login-pin').value = '';
    document.getElementById('login-error').textContent = '';
    if (mode === 'signup') {
      document.getElementById('login-classcode').style.display = '';
      document.getElementById('login-classcode-label').style.display = '';
      document.getElementById('login-submit').textContent = '➕ 새 학생 등록';
      document.getElementById('login-toggle').textContent = '↩ 기존 학생 로그인';
    } else {
      document.getElementById('login-classcode').style.display = 'none';
      document.getElementById('login-classcode-label').style.display = 'none';
      document.getElementById('login-submit').textContent = '🚪 입장';
      document.getElementById('login-toggle').textContent = '➕ 새 학생 등록';
    }
  }

  handleSubmit() {
    const mode = document.getElementById('login-mode').value;
    const nickname = document.getElementById('login-nickname').value;
    const pin = document.getElementById('login-pin').value;
    const classCode = document.getElementById('login-classcode').value;

    const result = (mode === 'signup')
      ? signUp({ nickname, pin, classCode })
      : signIn({ nickname, pin });

    if (!result.ok) {
      document.getElementById('login-error').textContent = '⚠️ ' + result.error;
      audio.miss();
      return;
    }
    audio.coin();
    this.hideLoginModal();
    this.proceedToGame();
  }

  proceedToGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Boot이 직업 미선택/마을 라우팅 처리
      this.scene.start('Boot');
    });
  }
}

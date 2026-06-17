// ============================================================
// LoginScene — 학생 로그인/회원가입 (단일 폼: 닉네임 + PIN)
// 닉네임 존재 여부로 로그인/등록 자동 분기
// ============================================================
import { findStudent } from '../../storage.js';
import { signUp, signIn } from '../../auth.js';
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

      // 타이틀 (Phaser 텍스트 — 모달이 가리지 않는 상단)
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
    document.getElementById('login-modal').classList.add('show');
    document.getElementById('login-nickname').focus();
    this.wireForm();
  }

  hideLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
  }

  wireForm() {
    const form = document.getElementById('login-form');
    if (form._wired) return;
    form._wired = true;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  // 닉네임 존재 여부로 자동 분기
  handleSubmit() {
    const nickname = document.getElementById('login-nickname').value.trim();
    const pin = document.getElementById('login-pin').value;
    const classCode = document.getElementById('login-classcode').value;

    const existing = findStudent(nickname);
    const result = existing
      ? signIn({ nickname, pin })
      : signUp({ nickname, pin, classCode });

    if (!result.ok) {
      document.getElementById('login-error').textContent = '⚠️ ' + result.error;
      audio.miss();
      return;
    }
    document.getElementById('login-error').textContent = '';
    audio.coin();
    this.hideLoginModal();
    this.proceedToGame();
  }

  proceedToGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Boot');
    });
  }
}

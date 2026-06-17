// ============================================================
// notepad.js — 태블릿/마우스/스타일러스 손글씨 캔버스
// ============================================================
// 사용: import { initNotepad, toggleNotepad } from './notepad.js';
//      initNotepad();   // 한 번만 (DOM 준비 후)
//      toggleNotepad(); // N 키 / 버튼에서
// ============================================================

let instance = null;

class Notepad {
  constructor() {
    this.root      = document.getElementById('notepad');
    this.canvas    = document.getElementById('np-canvas');
    if (!this.root || !this.canvas) return;
    this.ctx       = this.canvas.getContext('2d');
    this.dpr       = Math.max(1, window.devicePixelRatio || 1);
    this.tool      = 'pen-black';
    this.lineWidth = 2.5;
    this.drawing   = false;
    this.lastX     = 0;
    this.lastY     = 0;
    this.activePointerId = null;

    this.resize();
    this.bindCanvas();
    this.bindToolbar();
    this.bindResize();
  }

  // ----- 캔버스 크기 + DPR 보정 -----
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    // 이전 그림 보존
    let prev = null;
    if (this.canvas.width && this.canvas.height) {
      try { prev = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height); }
      catch (_) {}
    }
    this.canvas.width  = Math.max(1, Math.floor(rect.width  * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    if (prev) { try { this.ctx.putImageData(prev, 0, 0); } catch (_) {} }
  }

  bindResize() {
    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.resize(), 200);
    });
  }

  // ----- 입력 -----
  bindCanvas() {
    const c = this.canvas;
    // Pointer Events: 마우스/터치/펜 통합
    c.addEventListener('pointerdown', (e) => this.start(e), { passive: false });
    c.addEventListener('pointermove', (e) => this.move(e),  { passive: false });
    c.addEventListener('pointerup',   (e) => this.end(e));
    c.addEventListener('pointercancel', (e) => this.end(e));
    c.addEventListener('pointerleave', (e) => this.end(e));
    // 터치 스크롤 방해 방지
    c.style.touchAction = 'none';
  }

  pointFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }

  start(e) {
    e.preventDefault();
    // 멀티터치 첫 손가락만
    if (this.activePointerId !== null) return;
    this.activePointerId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);
    this.drawing = true;
    const p = this.pointFromEvent(e);
    this.lastX = p.x; this.lastY = p.y;
    // 점 찍기 (탭만 했을 때도 표시)
    this.applyStyle();
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  move(e) {
    if (!this.drawing) return;
    if (this.activePointerId !== e.pointerId) return;
    e.preventDefault();
    const p = this.pointFromEvent(e);
    this.applyStyle();
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.lastX = p.x; this.lastY = p.y;
  }

  end(e) {
    if (this.activePointerId === e.pointerId) {
      this.activePointerId = null;
      this.drawing = false;
    }
  }

  applyStyle() {
    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth   = 18;
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      this.ctx.fillStyle   = 'rgba(0,0,0,1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.lineWidth   = this.lineWidth;
      const color = { 'pen-black': '#111', 'pen-blue': '#2160d4', 'pen-red': '#c41e1e' }[this.tool] || '#111';
      this.ctx.strokeStyle = color;
      this.ctx.fillStyle   = color;
    }
  }

  // ----- 도구 -----
  bindToolbar() {
    this.root.querySelectorAll('.np-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tool = btn.dataset.tool;
        this.root.querySelectorAll('.np-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    const clearBtn = this.root.querySelector('.np-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clear());
    const closeBtn = this.root.querySelector('.np-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  show() {
    this.root.classList.add('show');
    document.body.classList.add('notepad-open');
    // 표시 후 캔버스 크기 갱신 필요 (transform 적용 후 rect 계산)
    requestAnimationFrame(() => this.resize());
  }

  hide() {
    this.root.classList.remove('show');
    document.body.classList.remove('notepad-open');
  }

  toggle() {
    if (this.root.classList.contains('show')) this.hide();
    else this.show();
  }
}

export function initNotepad() {
  if (!instance) instance = new Notepad();
  return instance;
}

export function toggleNotepad() {
  initNotepad();
  instance && instance.toggle();
}

export function isNotepadOpen() {
  return instance ? instance.root.classList.contains('show') : false;
}

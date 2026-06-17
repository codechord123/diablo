// ============================================================
// fraction-vis.js — 분수 SVG 파이 차트 시각화
// ============================================================
// 사용: fractionSVG(n, d, color, size)
// ============================================================

const COLORS = [
  '#4cc9f0',  // 청 (a)
  '#ff77bb',  // 분홍 (b)
  '#ffd700',  // 황 (answer)
];

export function fractionSVG(n, d, opts = {}) {
  const size = opts.size || 36;
  const color = opts.color || '#ff5544';
  const bg = opts.bg || '#1a0e08';
  const stroke = opts.stroke || '#d4af37';

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 2;

  // n/d 비율이 1 이상이면 1로 클램프
  const ratio = Math.min(1, Math.max(0, n / d));
  const slices = [];

  // 분모만큼 구획 + 분자만큼 색칠
  for (let i = 0; i < d; i++) {
    const fromAng = (i / d) * Math.PI * 2 - Math.PI / 2;
    const toAng   = ((i + 1) / d) * Math.PI * 2 - Math.PI / 2;
    const fill = i < n ? color : bg;
    slices.push(slicePath(cx, cy, r, fromAng, toAng, fill, '#000', 0.5));
  }
  // 외곽선
  const outer = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="frac-vis">${slices.join('')}${outer}</svg>`;
}

function slicePath(cx, cy, r, a1, a2, fill, stroke, sw) {
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  const large = (a2 - a1) > Math.PI ? 1 : 0;
  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

// 분수 옆에 시각화 + 텍스트 (HTML 통합)
export function fractionWithVis(n, d, opts = {}) {
  const svg = fractionSVG(n, d, { color: opts.color, size: opts.size || 32 });
  const text = `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span>`;
  return `<span class="frac-vis-wrap">${svg}${text}</span>`;
}

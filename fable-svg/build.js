// node build.js  ->  lab/*.svg
// Fable's Napkin Lab, SVG edition. Every napkin is one standalone .svg file:
// geometry written as text, then handed to a "material" (a filter chain) to be ruined nicely.
'use strict';
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'lab');
fs.mkdirSync(OUT, { recursive: true });

const W = 800, H = 560, PX = 14, PY = 12, PW = 772, PH = 536;
const n1 = v => Math.round(v * 10) / 10;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FU = `filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"`;
const alphaFromR = (k, b) => `values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${k} 0 0 0 ${b}"`;

// ------------------------------------------------------------------ materials
const M = {
  // a hand: the same geometry, slightly unsure of itself
  hand: (id, seed = 2, scale = 2.2, freq = 0.03) => `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`,
  // graphite only reaches the peaks of the tooth
  pencil: (id, seed = 3, k = 2.8, b = -0.8) => `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${seed}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="${seed + 1}" result="g"/>
    <feColorMatrix in="g" type="matrix" ${alphaFromR(k, b)} result="gm"/>
    <feComposite in="d" in2="gm" operator="in"/>
  </filter>`,
  // ballpoint: a thin line that starves now and then
  biro: (id, seed = 5) => `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="${seed}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency=".09 .5" numOctaves="2" seed="${seed + 1}" result="g"/>
    <feColorMatrix in="g" type="matrix" ${alphaFromR(4.2, -1.25)} result="gm"/>
    <feComposite in="d" in2="gm" operator="in"/>
  </filter>`,
  // felt-tip: ink creeps into the fibres after the pen has gone
  felt: (id, seed = 7, scale = 3.5) => `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation=".8" result="b"/>
    <feComponentTransfer in="b"><feFuncA type="linear" slope="2.6" intercept="-.5"/></feComponentTransfer>
  </filter>`,
  // wax crayon: lumpy, skips the valleys
  crayon: (id, seed = 9) => `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="${seed}" result="w"/>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="3" seed="${seed + 1}" result="g"/>
    <feColorMatrix in="g" type="matrix" ${alphaFromR(8, -3.3)} result="gm"/>
    <feComposite in="d" in2="gm" operator="in"/>
  </filter>`,
  // watercolour: wandering edge, pigment pushed to the rim, pooling, granulation
  wash: (id, seed = 11, o = {}) => {
    const { scale = 18, freq = 0.02, rim = 5, edge = 0.85, pool = [2.6, -0.75], soft = 1 } = o;
    return `
  <filter id="${id}" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="${seed}" result="big"/>
    <feDisplacementMap in="SourceGraphic" in2="big" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="shape"/>
    <feGaussianBlur in="shape" stdDeviation="${soft}" result="soft"/>
    <feGaussianBlur in="shape" stdDeviation="${rim}" result="inner"/>
    <feComposite in="soft" in2="inner" operator="arithmetic" k1="0" k2="1" k3="-${edge}" k4="0" result="edgeDark"/>
    <feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="3" seed="${seed + 3}" result="pool"/>
    <feColorMatrix in="pool" type="matrix" ${alphaFromR(pool[0], pool[1])} result="poolA"/>
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="${seed + 5}" result="gr"/>
    <feColorMatrix in="gr" type="matrix" ${alphaFromR(1.8, -0.05)} result="grA"/>
    <feComposite in="soft" in2="poolA" operator="in" result="b1"/>
    <feComposite in="b1" in2="grA" operator="in" result="body"/>
    <feComposite in="edgeDark" in2="grA" operator="in" result="rimG"/>
    <feMerge><feMergeNode in="body"/><feMergeNode in="rimG"/></feMerge>
  </filter>`;
  },
};

// ------------------------------------------------------------------ signature
// one path, written once; every napkin runs it through its own material
const FOLD = 'M1,31 v12 h12 v-8 l-4,-4 z M9,31 v4 h4';
const WORD = 'M20,39 C26,37 31,26 32,14 C33,5 28,2 27,10 C26,20 28,42 28,54 C28,61 23,60 24,53 C25,46 31,41 37,38'
  + ' C41,36 45,27 51,25 C45,21 40,28 41,35 C42,41 49,40 52,28 C51,34 51,41 55,40 C58,39 61,34 63,29'
  + ' C67,20 69,7 66,4 C63,2 62,12 62,24 L62,39 C64,31 71,27 73,33 C75,39 69,43 63,39 C68,42 74,38 77,31'
  + ' C81,21 83,7 80,4 C77,2 76,14 76,27 C76,37 77,42 81,40 C84,39 86,36 88,33'
  + ' C92,31 96,27 93,24 C90,22 86,28 87,34 C88,40 95,41 101,36 C106,32 112,35 120,33';
function sign(x, y, s, attrs, foldAttrs) {
  return `<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke-linecap="round" stroke-linejoin="round" ${attrs}>`
    + `<path d="${FOLD}" ${foldAttrs || ''}/><path d="${WORD}"/></g>`;
}

// ------------------------------------------------------------------ the napkin itself
function frame({ title, tint = '#f6f1e6', seed = 1, defs = '', pressed = '', body = '', dots = true }) {
  const b0 = 12, b1 = 31;
  const band = `M${PX + b0},${PY + b0}h${PW - 2 * b0}v${PH - 2 * b0}h${-(PW - 2 * b0)}z M${PX + b1},${PY + b1}h${PW - 2 * b1}v${PH - 2 * b1}h${-(PW - 2 * b1)}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}">
<title>${title}</title>
<defs>
  <filter id="paper" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="${seed}" result="deckle"/>
    <feDisplacementMap in="SourceGraphic" in2="deckle" scale="7" xChannelSelector="R" yChannelSelector="G" result="sheet"/>
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="4" seed="${seed + 7}" result="tooth"/>
    <feDiffuseLighting in="tooth" surfaceScale=".75" diffuseConstant="1.1" lighting-color="#ffffff" result="lit"><feDistantLight azimuth="225" elevation="65"/></feDiffuseLighting>
    <feBlend in="sheet" in2="lit" mode="multiply" result="p"/>
    <feComposite in="p" in2="sheet" operator="in"/>
  </filter>
  <filter id="shadow" ${FU}><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000" flood-opacity=".4"/></filter>
  <!-- pressing: alpha is height, light comes from the upper left, flat ground is exactly mid-grey -->
  <filter id="press" ${FU}>
    <feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="h"/>
    <feDiffuseLighting in="h" surfaceScale="1.5" diffuseConstant="1" lighting-color="#ffffff"><feDistantLight azimuth="225" elevation="30"/></feDiffuseLighting>
  </filter>
  <pattern id="dots" width="10" height="17.3" patternUnits="userSpaceOnUse">
    <circle cx="0" cy="0" r="1.7"/><circle cx="10" cy="0" r="1.7"/><circle cx="5" cy="8.65" r="1.7"/><circle cx="0" cy="17.3" r="1.7"/><circle cx="10" cy="17.3" r="1.7"/>
  </pattern>
  <clipPath id="sheetClip"><rect x="${PX + 6}" y="${PY + 6}" width="${PW - 12}" height="${PH - 12}"/></clipPath>
  ${defs}
</defs>
<g filter="url(#shadow)"><rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" fill="${tint}" filter="url(#paper)"/></g>
<g style="mix-blend-mode:hard-light" clip-path="url(#sheetClip)" opacity=".75"><g filter="url(#press)">
  ${dots ? `<path d="${band}" fill="url(#dots)" fill-rule="evenodd"/>` : ''}
  ${pressed}
</g></g>
${body}
</svg>
`;
}
const label = (x, y, t, fill = '#8d8474', extra = '') =>
  `<text x="${x}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="12" fill="${fill}" ${extra}>${t}</text>`;

// ================================================================== 01 one line, eight hands
function hands() {
  const R = rng(4);
  const N = 140, X0 = 170, X1 = 720;
  const gesture = y0 => {
    const p = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      p.push([X0 + (X1 - X0) * t, y0 + 17 * Math.sin(2 * Math.PI * 1.75 * t + 0.4) * (0.45 + 0.55 * Math.sin(Math.PI * t))]);
    }
    return p;
  };
  const d = p => 'M' + p.map(q => n1(q[0]) + ',' + n1(q[1])).join('L');
  const rows = ['the idea', 'pencil', 'biro', 'felt-tip', 'dry brush', 'wash', 'crayon', 'no ink at all'];
  const y = i => 80 + 54 * i;
  const base = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  // dry brush: a bundle of hairs, each running out of ink on its own schedule
  let hairs = '';
  const g = gesture(y(4));
  for (let k = -7; k <= 7; k++) {
    const i0 = Math.floor(R() * 5), i1 = N - Math.floor(R() * 14);
    const q = [];
    for (let i = i0; i <= i1; i++) {
      const a = g[Math.max(0, i - 1)], b = g[Math.min(N, i + 1)];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny);
      const spread = 1.25 * (0.75 + 0.35 * Math.sin(i * 0.09 + 1));
      q.push([g[i][0] + nx / l * k * spread, g[i][1] + ny / l * k * spread]);
    }
    const dash = [];
    let wet = 260 + R() * 240;
    for (let j = 0; j < 7; j++) { dash.push(n1(wet), n1(2 + R() * (6 + j * 7))); wet = 20 + R() * 90 / (1 + j * 0.3); }
    hairs += `<path d="${d(q)}" stroke-width="${n1(0.7 + R() * 0.9)}" stroke-dasharray="${dash.join(' ')}" opacity="${n1(0.55 + R() * 0.4)}"/>`;
  }
  const body = `
  <g style="mix-blend-mode:multiply">
    ${rows.map((r, i) => label(58, y(i) + 4, r)).join('\n    ')}
    <path d="${d(gesture(y(0)))}" ${base} stroke="#3b3a38" stroke-width=".6"/>
    <path d="${d(gesture(y(1)))}" ${base} stroke="#3d3b3a" stroke-width="2.4" filter="url(#pencil)"/>
    <g filter="url(#biro)"><path d="${d(gesture(y(2)))}" ${base} stroke="#22308f" stroke-width="1.5"/></g>
    <path d="${d(gesture(y(3)))}" ${base} stroke="#0f7f78" stroke-width="7" opacity=".9" filter="url(#felt)"/>
    <g ${base} stroke="#191715" filter="url(#hand)">${hairs}</g>
    <path d="${d(gesture(y(5)))}" ${base} stroke="#3c4f9c" stroke-width="20" filter="url(#wash)"/>
    <path d="${d(gesture(y(6)))}" ${base} stroke="#e8792b" stroke-width="10" filter="url(#crayon)"/>
    ${sign(628, 474, 0.72, 'stroke="#3d3b3a" stroke-width="2.2" filter="url(#pencil)"')}
  </g>`;
  const pressed = `<path d="${d(gesture(y(7)))}" ${base} stroke="#000" stroke-width="5"/>`;
  return frame({
    title: 'one line, eight hands', seed: 3, pressed, body,
    defs: M.pencil('pencil', 3) + M.biro('biro', 5) + M.felt('felt', 7) + M.hand('hand', 9, 1.8, 0.04)
      + M.wash('wash', 21, { scale: 10, freq: 0.03, rim: 3.5, edge: 0.8 }) + M.crayon('crayon', 13),
  });
}

// ================================================================== 02 persimmons, in wash
function persimmons() {
  const R = rng(8);
  const fruit = (cx, cy, a, b, rot = 0, e = 2.7) => {
    const p = [];
    for (let i = 0; i < 48; i++) {
      const t = i / 48 * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
      let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
      const r = rot * Math.PI / 180;
      p.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
    }
    return 'M' + p.map(q => n1(q[0]) + ',' + n1(q[1])).join('L') + 'Z';
  };
  const calyx = (cx, cy, s, rot) => {
    let dd = '';
    for (let k = 0; k < 4; k++) {
      const a = (rot + k * 90) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const P = (u, v) => n1(cx + (u * ca - v * sa) * s) + ',' + n1(cy + (u * sa + v * ca) * s * 0.5);
      dd += `M${P(0, 0)}C${P(8, -15)} ${P(26, -11)} ${P(32, 0)}C${P(26, 11)} ${P(8, 15)} ${P(0, 0)}Z`;
    }
    return dd;
  };
  const F = [[236, 300, 80, 66, -4], [410, 322, 74, 61, 3], [566, 292, 66, 55, 6]];
  let washes = '', pencil = '';
  F.forEach(([cx, cy, a, b, rot], i) => {
    const hl = `M${cx - a * 0.42},${cy - b * 0.3}a${a * 0.2},${b * 0.14} -25 1 0 ${a * 0.3},${-b * 0.16}a${a * 0.2},${b * 0.14} -25 1 0 ${-a * 0.3},${b * 0.16}Z`;
    washes += `
    <ellipse cx="${cx + 26}" cy="${cy + b * 0.92}" rx="${a * 1.05}" ry="${b * 0.2}" fill="#5f5a80" filter="url(#wS${i})"/>
    <path d="${fruit(cx, cy, a, b, rot)}${hl}" fill-rule="evenodd" fill="#f6a52c" filter="url(#wA${i})"/>
    <path d="${fruit(cx + a * 0.13, cy + b * 0.17, a * 0.8, b * 0.76, rot)}" fill="#e85d1c" filter="url(#wB${i})"/>
    <path d="${fruit(cx + a * 0.34, cy + b * 0.46, a * 0.5, b * 0.42, rot + 20)}" fill="#b93a1c" filter="url(#wC${i})"/>
    <path d="${calyx(cx - a * 0.05, cy - b * 0.72, a / 80, 20 + i * 31)}" fill="#5d6f2a" filter="url(#wK${i})"/>
    <path d="${calyx(cx - a * 0.05, cy - b * 0.72, a / 150, 60 + i * 31)}" fill="#3e4a20" filter="url(#wK${i})"/>`;
    // the underdrawing: two loose passes that do not quite agree with the paint
    const j = () => (R() - 0.5) * 7;
    pencil += `<path d="${fruit(cx + j(), cy + j(), a * 1.01, b * 1.01, rot + j())}"/><path d="${fruit(cx + j(), cy + j(), a * 0.985, b * 1.0, rot + j(), 2.4)}" stroke-dasharray="${n1(120 + R() * 80)} ${n1(20 + R() * 40)}"/>`
      + `<path d="M${cx - a * 0.05},${cy - b * 0.72}l${n1(j() * 2)},${n1(-13 + j())}"/>`;
  });
  const defs = F.map((f, i) =>
    M.wash(`wS${i}`, 30 + i * 9, { scale: 16, rim: 4, edge: 0.6, pool: [2.2, -0.55] })
    + M.wash(`wA${i}`, 41 + i * 9, { scale: 13, rim: 6, edge: 0.9, pool: [2.4, -0.5] })
    + M.wash(`wB${i}`, 52 + i * 9, { scale: 22, rim: 8, edge: 0.75, pool: [3.4, -1.15], soft: 3 })
    + M.wash(`wC${i}`, 63 + i * 9, { scale: 26, rim: 7, edge: 0.7, pool: [3.6, -1.3], soft: 4 })
    + M.wash(`wK${i}`, 74 + i * 9, { scale: 7, freq: 0.05, rim: 2.5, edge: 0.8, pool: [2, -0.2] })
  ).join('') + M.wash('wT', 5, { scale: 34, freq: 0.012, rim: 9, edge: 0.8, pool: [2.6, -0.95], soft: 2 })
    + M.pencil('pencil', 3, 3.2, -0.95);
  const body = `
  <g style="mix-blend-mode:multiply">
    <path d="M96,352 C240,338 520,346 706,336 L712,430 C520,446 250,436 92,442Z" fill="#9db3bd" filter="url(#wT)"/>
    ${washes}
  </g>
  <g style="mix-blend-mode:multiply" fill="none" stroke="#4a4744" stroke-width="1.3" stroke-linecap="round" filter="url(#pencil)" opacity=".8">
    ${pencil}
    <path d="M84,349 C200,342 330,346 420,343 M540,340 C610,338 680,337 722,333"/>
  </g>
  <g style="mix-blend-mode:multiply">${sign(606, 462, 0.8, 'stroke="#b93a1c" stroke-width="5.5" filter="url(#wSig)"', 'stroke-width="3.5"')}</g>`;
  return frame({ title: 'three persimmons, in wash', seed: 6, body, defs: defs + M.wash('wSig', 90, { scale: 3, freq: 0.06, rim: 1.6, edge: 0.7, pool: [2, 0], soft: 0.5 }) });
}

// ================================================================== 03 an egg made only of lines
function egg() {
  const R = rng(11);
  const cx = 388, cy = 300, A = 128, B = 90, horizon = 322;
  const Lr = [-0.55, -0.62, 0.56], Ll = Math.hypot(...Lr), L = Lr.map(v => v / Ll);
  const inEgg = (x, y) => {
    const nx = (x - cx) / A; if (Math.abs(nx) >= 1) return null;
    const ny = (y - cy) / (B * (1 - 0.13 * nx)), q = nx * nx + ny * ny;
    return q >= 1 ? null : [nx, ny, Math.sqrt(1 - q)];
  };
  const tone = (x, y) => {
    const n = inEgg(x, y);
    if (n) {
      const lam = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      let d = 1 - 1.1 * Math.pow(lam, 0.85);
      d -= 0.3 * Math.max(0, n[1]) * (1 - n[2]);            // light bouncing back up off the table
      return clamp(d, 0, 0.93);
    }
    const fade = sstep(78, 150, x) * sstep(722, 650, x) * sstep(60, 120, y) * sstep(482, 440, y);
    if (y < horizon) return (0.25 + 0.27 * Math.exp(-Math.pow((x - 240) / 200, 2))) * (0.25 + 0.75 * fade) * sstep(0, 0.15, fade);
    const sx = cx + 92, sy = cy + B + 2, q = Math.pow((x - sx) / 185, 2) + Math.pow((y - sy) / 27, 2);
    return q < 1 ? 0.95 * Math.pow(1 - q, 0.55) : -fade;     // negative = bare table: a few level lines only
  };
  const layers = [[40, 5.5, 0.15], [-36, 5.5, 0.37], [82, 5, 0.57], [8, 4.4, 0.75]];
  let out = '';
  for (const [deg, pitch, thr] of layers) {
    let row = 0;
    const a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    let dd = '';
    for (let o = -520; o <= 520; o += pitch) {
      const oo = o + (R() - 0.5) * pitch * 0.5, tj = thr + (R() - 0.5) * 0.05, level = deg === 8 && row++ % 4 === 0, tl = 0.25 + R() * 0.5;
      let start = null, last = null;
      const flush = () => {
        if (start != null && last - start > 9) {
          const s0 = start - R() * R() * 16, s1 = last + R() * R() * 16, bow = (R() - 0.5) * 2.2;
          const P = s => [400 + ux * s + vx * oo, 280 + uy * s + vy * oo];
          const p0 = P(s0), p1 = P(s1), pm = P((s0 + s1) / 2);
          dd += `M${n1(p0[0])},${n1(p0[1])}Q${n1(pm[0] + vx * bow)},${n1(pm[1] + vy * bow)} ${n1(p1[0])},${n1(p1[1])}`;
        }
        start = null;
      };
      for (let s = -520; s <= 520; s += 2.5) {
        const x = 400 + ux * s + vx * oo, y = 280 + uy * s + vy * oo;
        const tn = tone(x, y);
        const on = x > 80 && x < 720 && y > 62 && y < 486 && (tn < 0 ? level && -tn > tl : tn > tj);
        if (on) { if (start == null) start = s; last = s; } else flush();
      }
      flush();
    }
    out += `<path d="${dd}"/>`;
  }
  const body = `
  <g style="mix-blend-mode:multiply" fill="none" stroke="#2a2420" stroke-width=".85" stroke-linecap="round" opacity=".92" filter="url(#hand)">${out}</g>
  <g style="mix-blend-mode:multiply">${sign(622, 458, 0.76, 'stroke="#2a2420" stroke-width="1.1" filter="url(#hand)"')}</g>`;
  return frame({ title: 'an egg made only of lines', seed: 12, body, defs: M.hand('hand', 6, 1.6, 0.05) });
}

// ================================================================== 04 pressed leaf, coffee ring
function pressed() {
  const ginkgo = (px, py, Rr, rot, seedK) => {
    const t0 = 203, t1 = 337, mid = 270, pts = [], veins = [];
    const rad = t => t * Math.PI / 180;
    const rOf = t => Rr * (1 + 0.03 * Math.sin(rad(t) * 11 + seedK) + 0.018 * Math.sin(rad(t) * 27 + 1)
      - 0.34 * Math.exp(-Math.pow((t - mid - 3) / 3.2, 2)) - 0.1 * Math.pow(Math.abs(t - mid) / 67, 3));
    for (let t = t0; t <= t1; t += 1.5) pts.push([n1(Rr * 0 + rOf(t) * Math.cos(rad(t))), n1(rOf(t) * Math.sin(rad(t)))]);
    for (let t = t0 + 2; t <= t1 - 2; t += 2.4) {
      const r = rOf(t) * 0.985, bend = (t - mid) * 0.12;
      veins.push(`M0,0Q${n1(r * 0.5 * Math.cos(rad(t - bend)))},${n1(r * 0.5 * Math.sin(rad(t - bend)))} ${n1(r * Math.cos(rad(t)))},${n1(r * Math.sin(rad(t)))}`);
    }
    const c1 = [n1(Rr * 0.42 * Math.cos(rad(t0 + 22))), n1(Rr * 0.42 * Math.sin(rad(t0 + 22)))];
    const c2 = [n1(Rr * 0.42 * Math.cos(rad(t1 - 22))), n1(Rr * 0.42 * Math.sin(rad(t1 - 22)))];
    const outline = `M0,0Q${c1} ${pts[0]}L${pts.join('L')}Q${c2} 0,0Z`;
    return `<g transform="translate(${px},${py}) rotate(${rot})">
      <path d="M0,0C${n1(Rr * 0.04)},${n1(Rr * 0.2)} ${n1(-Rr * 0.05)},${n1(Rr * 0.38)} ${n1(Rr * 0.06)},${n1(Rr * 0.6)}" fill="none" stroke="#e8e8e8" stroke-width="${n1(Rr * 0.028)}" stroke-linecap="round"/>
      <path d="${outline}" fill="#b4b4b4" stroke="#f4f4f4" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="${veins.join('')}" fill="none" stroke="#6e6e6e" stroke-width=".9"/>
    </g>`;
  };
  const R = rng(5);
  let drops = '';
  for (let i = 0; i < 7; i++) {
    const a = R() * 6.28, r = 92 + R() * 60;
    drops += `<circle cx="${n1(548 + Math.cos(a) * r)}" cy="${n1(352 + Math.sin(a) * r * 0.9)}" r="${n1(1.2 + R() * 3.4)}"/>`;
  }
  const defs = `
  <filter id="pressL" ${FU}>
    <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="la"/>
    <feGaussianBlur in="la" stdDeviation="1.1" result="h"/>
    <feDiffuseLighting in="h" surfaceScale="1.7" diffuseConstant="1" lighting-color="#ffffff"><feDistantLight azimuth="225" elevation="30"/></feDiffuseLighting>
  </filter>
  <filter id="ring" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="4" result="big"/>
    <feDisplacementMap in="SourceGraphic" in2="big" scale="9" xChannelSelector="R" yChannelSelector="G" result="shape"/>
    <feGaussianBlur in="shape" stdDeviation=".7" result="soft"/>
    <feGaussianBlur in="shape" stdDeviation="2.6" result="inner"/>
    <feComposite in="soft" in2="inner" operator="arithmetic" k1="0" k2="1.1" k3="-.75" k4="0" result="rim"/>
    <feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="2" seed="19" result="gap"/>
    <feColorMatrix in="gap" type="matrix" ${alphaFromR(5, -1.9)} result="gapA"/>
    <feComposite in="rim" in2="gapA" operator="in" result="r1"/>
    <feComponentTransfer in="soft" result="ghost"><feFuncA type="linear" slope=".16"/></feComponentTransfer>
    <feMerge><feMergeNode in="ghost"/><feMergeNode in="r1"/></feMerge>
  </filter>` + M.wash('stain', 33, { scale: 12, rim: 6, edge: 0.9, pool: [2.4, -0.95] })
    + M.wash('wSig', 90, { scale: 3, freq: 0.06, rim: 1.6, edge: 0.7, pool: [2, 0], soft: 0.5 });
  const body = `
  <g style="mix-blend-mode:hard-light" clip-path="url(#sheetClip)" opacity=".85"><g filter="url(#pressL)">
    <rect width="${W}" height="${H}" fill="#000"/>
    ${ginkgo(318, 372, 186, -14, 0.4)}
    ${ginkgo(590, 232, 92, 28, 2.1)}
    <g transform="translate(96,455) scale(.8)" fill="none" stroke="#bbb" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${FOLD}"/><path d="${WORD}"/></g>
  </g></g>
  <g style="mix-blend-mode:multiply">
    <circle cx="548" cy="352" r="71" fill="#7a5530" filter="url(#stain)" opacity=".3"/>
    <circle cx="548" cy="352" r="72" fill="none" stroke="#4e2f12" stroke-width="8" filter="url(#ring)"/>
    <path d="M618,395 a72,72 0 0 1 -54,28" fill="none" stroke="#4e2f12" stroke-width="5" filter="url(#ring)" transform="translate(9,7)"/>
    <g fill="#5a3818" filter="url(#ring)">${drops}</g>
  </g>`;
  return frame({ title: 'pressed leaf, coffee ring', seed: 20, body, defs });
}

// ================================================================== 05 lamp, rain
function lamp() {
  const R = rng(17);
  const G = 402;
  let rain = '', ripples = '', town = '';
  for (let i = 0; i < 110; i++) {
    const x = -40 + R() * 900, len = 9 + R() * 20, gap = 70 + R() * 150, per = len + gap, front = R() < 0.18;
    const y1 = front ? H : G + R() * 30, dur = n1(per / (front ? 520 : 380));
    rain += `<line x1="${n1(x)}" y1="-30" x2="${n1(x - (y1 + 30) * 0.17)}" y2="${n1(y1)}" stroke-width="${front ? 1.5 : n1(0.6 + R() * 0.5)}" stroke-dasharray="${n1(len)} ${n1(gap)}" stroke-dashoffset="${n1(R() * per)}">`
      + `<animate attributeName="stroke-dashoffset" by="${n1(-per)}" dur="${dur}s" repeatCount="indefinite"/></line>`;
  }
  for (let i = 0; i < 16; i++) {
    const x = 60 + R() * 680, y = G + 12 + R() * 110, k = 0.6 + (y - G) / 110, dur = n1(1.1 + R() * 0.9), bg = n1(-R() * 2);
    ripples += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(7 * k)}" ry="${n1(2 * k)}" opacity=".5">`
      + `<animate attributeName="rx" values="0;${n1(16 * k)}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>`
      + `<animate attributeName="ry" values="0;${n1(4.5 * k)}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>`
      + `<animate attributeName="opacity" values=".9;0" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/></ellipse>`;
  }
  const cols = ['#ffd9a0', '#ffc27a', '#cfe3ff', '#ffb36b', '#ffe9c4'];
  for (let i = 0; i < 13; i++) {
    const x = 470 + i * 19 + R() * 9, c = cols[Math.floor(R() * cols.length)], r = n1(1 + R() * 1.3);
    town += `<circle cx="${n1(x)}" cy="${n1(G - 6 - R() * 16)}" r="${r}" fill="${c}"/>`;
  }
  const defs = `
  <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="352" cy="166" r="210">
    <stop offset="0" stop-color="#fff1cf" stop-opacity="1"/><stop offset=".04" stop-color="#ffd98f" stop-opacity=".85"/>
    <stop offset=".14" stop-color="#ffb654" stop-opacity=".36"/><stop offset=".45" stop-color="#ff8f3a" stop-opacity=".1"/>
    <stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lit" gradientUnits="userSpaceOnUse" cx="352" cy="200" r="230">
    <stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a78" stop-opacity="0"/><stop offset=".72" stop-color="#4a5a8a" stop-opacity=".5"/><stop offset=".73" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="sink" gradientUnits="userSpaceOnUse" x1="0" y1="${G}" x2="0" y2="${H}"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>
  <mask id="litMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#lit)"/></mask>
  <mask id="sinkMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect y="${G}" width="${W}" height="${H - G}" fill="url(#sink)"/></mask>
  <filter id="water" ${FU}>
    <feTurbulence type="fractalNoise" baseFrequency=".006 .11" numOctaves="2" seed="3" result="w"><animate attributeName="seed" values="3;4;5;6;7;8" dur="1.8s" calcMode="discrete" repeatCount="indefinite"/></feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="w" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="1.6 .4"/>
  </filter>
  <filter id="soft" ${FU}><feGaussianBlur stdDeviation="1.3"/></filter>
  <filter id="neon" ${FU}><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <g id="rain" fill="none" stroke-linecap="round">${rain}</g>
  <g id="scene">
    <g filter="url(#soft)">${town}</g>
    <circle cx="352" cy="166" r="210" fill="url(#glow)"/>
    <path d="M300,${G} L300,196 C300,160 316,146 340,148" fill="none" stroke="#070910" stroke-width="5" stroke-linecap="round"/>
    <path d="M336,148 h30 l-5,13 h-20 z" fill="#070910"/>
    <ellipse cx="352" cy="163" rx="8" ry="4" fill="#fff6dc"/>
  </g>`;
  const body = `
  <rect width="${W}" height="${H}" fill="url(#dusk)" style="mix-blend-mode:screen" clip-path="url(#sheetClip)"/>
  <g style="mix-blend-mode:screen" clip-path="url(#sheetClip)">
    <use href="#scene" xlink:href="#scene"/>
    <g mask="url(#sinkMask)" opacity=".85"><g filter="url(#water)"><use href="#scene" xlink:href="#scene" transform="translate(0,${n1(1.45 * G)}) scale(1,-.45)"/></g></g>
    <use href="#rain" xlink:href="#rain" stroke="#93a8cf" opacity=".28"/>
    <g mask="url(#litMask)"><use href="#rain" xlink:href="#rain" stroke="#ffe6b0" opacity=".95"/></g>
    <g fill="none" stroke="#b9c8e6" stroke-width=".8">${ripples}</g>
    ${sign(626, 470, 0.74, 'stroke="#ffc978" stroke-width="1.8" filter="url(#neon)"')}
  </g>
  <path d="M300,${G} L300,196 C300,160 316,146 340,148" fill="none" stroke="#070910" stroke-width="5" stroke-linecap="round"/>
  <path d="M336,148 h30 l-5,13 h-20 z" fill="#070910"/>`;
  return frame({ title: 'lamp, rain', tint: '#1a2233', seed: 30, body, defs });
}

// ================================================================== 06 two stones, one pond
function pond() {
  const rings = (cx, cy, col) => {
    let s = '';
    for (let r = 3; r < 430; r += 6) s += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    return `<g fill="none" stroke="${col}" stroke-width="2.5">${s}</g>`;
  };
  const defs = `<clipPath id="pondClip"><circle cx="400" cy="270" r="204"/></clipPath>` + M.pencil('pencil', 3) + M.hand('hand', 4, 1.2, 0.02);
  const body = `
  <g style="mix-blend-mode:multiply" clip-path="url(#pondClip)">
    <g filter="url(#hand)" opacity=".9">
      ${rings(368, 270, '#27377a')}
      <g style="mix-blend-mode:multiply">${rings(432, 270, '#d8472a')}
        <animateTransform attributeName="transform" type="translate" values="0,0; -24,18; -64,0; -24,-18; 0,0" dur="28s" repeatCount="indefinite"/>
      </g>
    </g>
  </g>
  <g style="mix-blend-mode:multiply">
    <circle cx="400" cy="270" r="206" fill="none" stroke="#4a4744" stroke-width="1.6" filter="url(#pencil)"/>
    ${sign(634, 470, 0.72, 'stroke="#27377a" stroke-width="1.6"', 'stroke="#d8472a"')}
  </g>`;
  return frame({ title: 'two stones, one pond', seed: 40, body, defs });
}

// ================================================================== 07 the memory: a quiet winter morning
// Snow is the napkin left alone. The ghost has no pigment either: it is pressed into the paper,
// and found by two graphite dots and a shadow fainter than the tree's.
function winter(o = {}) {
  const R = rng(o.seed || 23);
  const d = p => 'M' + p.map(q => n1(q[0]) + ',' + n1(q[1])).join('L');
  const BX = 300, BY = 432, SX = 1.5, SY = 0.26;                // trunk base; where low sun throws things
  const cast = by => `matrix(1,0,${-SX},${-SY},${n1(SX * by)},${n1(by * (1 + SY))})`;

  // ---- the persimmon tree, grown rather than drawn
  let segs = '', snow = '';
  const tips = [];
  (function limb(x, y, ang, len, w, depth) {
    let a = ang;
    for (let i = 0; i < 3; i++) {
      a += (R() - 0.5) * 0.62;
      a += (-Math.PI / 2 - a) * 0.1;                             // everything still leans toward the sky
      const x1 = x + Math.cos(a) * len / 3, y1 = y + Math.sin(a) * len / 3, ww = w * (1 - 0.073 * i);
      segs += `<path d="${d([[x, y], [x1, y1]])}" stroke-width="${n1(ww)}"/>`;
      if (depth < 7 && ww > 2 && Math.abs(Math.cos(a)) > 0.6)
        snow += `<path d="${d([[x, y - ww * 0.36], [x1, y1 - ww * 0.36]])}" stroke-width="${n1(ww * 0.52)}"/>`;
      x = x1; y = y1;
    }
    if (depth <= 0) { tips.push([x, y]); return; }
    const n = R() < 0.28 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const spread = (k - (n - 1) / 2) * (0.62 + R() * 0.4) + (R() - 0.5) * 0.36;
      limb(x, y, a + spread, len * (0.66 + R() * 0.17), w * 0.66, depth - 1);
    }
  })(BX, BY, -Math.PI / 2 + 0.1, 104, 15, 7);
  // the one fruit left on the tree: the tip that reaches furthest toward the ghost
  const tip = tips.filter(t => t[1] > 150 && t[1] < 275).sort((p, q) => (q[0] - 0.4 * Math.abs(q[1] - 205)) - (p[0] - 0.4 * Math.abs(p[1] - 205)))[0] || tips[0];
  const fx = tip[0] + 1, fy = tip[1] + 14;

  // ---- far things
  let ridge = 'M60,305';
  for (let x = 60; x <= 742; x += 5) {
    const clump = 7 * Math.exp(-Math.pow((x - 430) / 60, 2)) + 5 * Math.exp(-Math.pow((x - 610) / 90, 2));
    ridge += `L${x},${n1(297 - 4 - 3 * Math.sin(x * 0.05) - 2.5 * Math.sin(x * 0.13 + 1) - R() * 3.5 - clump)}`;
  }
  ridge += 'L742,305Z';

  const GHOST = 'M-20,0C-20,-16 -17,-55 0,-55C17,-55 20,-16 20,0Q15,-10 10,0Q5,-10 0,0Q-5,-10 -10,0Q-15,-10 -20,0Z';
  const GX = 524, GY = 402, gT = `translate(${GX},${GY}) rotate(6)`;
  const tint = '#f7f4ee';

  const defs = `
  <radialGradient id="skyG" gradientUnits="userSpaceOnUse" cx="128" cy="262" r="600">
    <stop offset="0" stop-color="#fbd2a6"/><stop offset=".2" stop-color="#f3d9c6"/><stop offset=".55" stop-color="#cdd6e3"/><stop offset="1" stop-color="#b3c0d4"/>
  </radialGradient>
  <radialGradient id="halo" gradientUnits="userSpaceOnUse" cx="128" cy="258" r="70">
    <stop offset=".2" stop-color="#ffb866" stop-opacity=".75"/><stop offset=".5" stop-color="#ffc98a" stop-opacity=".3"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="smokeG" gradientUnits="userSpaceOnUse" x1="0" y1="280" x2="0" y2="196"><stop offset="0" stop-color="#6c728a" stop-opacity="1"/><stop offset="1" stop-color="#7c8299" stop-opacity="0"/></linearGradient>
  <clipPath id="inner"><rect x="${PX + 34}" y="${PY + 34}" width="${PW - 68}" height="${PH - 68}"/></clipPath>
  <clipPath id="ghostClip"><path d="${GHOST}"/></clipPath>
  <filter id="puff" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="drift" ${FU}><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="pressL" ${FU}>
    <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="la"/>
    <feGaussianBlur in="la" stdDeviation="1" result="h"/>
    <feDiffuseLighting in="h" surfaceScale="2.8" diffuseConstant="1" lighting-color="#ffffff"><feDistantLight azimuth="225" elevation="30"/></feDiffuseLighting>
  </filter>
  <mask id="snowMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#fff"/>
    <g fill="none" stroke="#000" stroke-linecap="round" filter="url(#hand)">${snow}</g>
  </mask>
  <g id="tree" fill="none" stroke-linecap="round" stroke-linejoin="round">${segs}</g>`
    + M.hand('hand', 14, 1.6, 0.05) + M.felt('ink', 31, 2.4) + M.pencil('pencil', 3, 2.8, -0.8)
    + M.wash('wSky', 52, { scale: 26, freq: 0.008, rim: 11, edge: 0.5, pool: [2.3, -0.4], soft: 2 })
    + M.wash('wHill', 61, { scale: 14, freq: 0.012, rim: 6, edge: 0.4, pool: [2, -0.45], soft: 3 })
    + M.wash('wRidge', 67, { scale: 5, freq: 0.03, rim: 3, edge: 0.6, pool: [2.2, -0.35], soft: 1.5 })
    + M.wash('wShade', 73, { scale: 7, freq: 0.02, rim: 3, edge: 0.45, pool: [1.8, -0.15], soft: 1.7 })
    + M.wash('wFruit', 80, { scale: 2.5, freq: 0.06, rim: 2.2, edge: 0.8, pool: [2, 0.1], soft: 0.6 });

  const body = `
  <!-- pressure: the ghost raised, the name written in the snow, the snow itself barely rolling -->
  <g style="mix-blend-mode:hard-light" clip-path="url(#sheetClip)" opacity=".9"><g filter="url(#pressL)">
    <rect width="${W}" height="${H}" fill="#808080"/>
    <g filter="url(#drift)"><ellipse cx="330" cy="372" rx="170" ry="16" fill="#8e8e8e"/><ellipse cx="610" cy="452" rx="150" ry="18" fill="#8c8c8c"/><ellipse cx="170" cy="492" rx="130" ry="14" fill="#747474"/><ellipse cx="${BX}" cy="${BY + 4}" rx="44" ry="9" fill="#929292"/></g>
    <g transform="${gT}"><g clip-path="url(#ghostClip)"><path d="${GHOST}" fill="#fff" filter="url(#puff)"/></g></g>
    <g transform="translate(78,452) scale(.82)" fill="none" stroke="#505050" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${FOLD}"/><path d="${WORD}"/></g>
  </g></g>
  <!-- sky: one wash, warm where the sun is; the sun itself is paper -->
  <g style="mix-blend-mode:multiply"><g filter="url(#wSky)">
    <path d="M70,62C250,50 560,58 734,66L738,300C560,296 250,304 66,298ZM143,258a15,15 0 1 0 -30,0a15,15 0 1 0 30,0Z" fill="url(#skyG)" fill-rule="evenodd"/>
    <path d="M198,258a70,70 0 1 0 -140,0a70,70 0 1 0 140,0ZM143,258a15,15 0 1 0 -30,0a15,15 0 1 0 30,0Z" fill="url(#halo)" fill-rule="evenodd"/>
  </g></g>
  <g style="mix-blend-mode:multiply">
    <path d="M60,300C180,270 300,264 420,282C520,295 640,272 742,286L742,305L60,305Z" fill="#9aa5c2" filter="url(#wHill)"/>
    <path d="${ridge}" fill="#5d6583" filter="url(#wRidge)"/>
  </g>
  <!-- a house, awake -->
  <path d="M642,293l13,-10l13,10z" fill="${tint}"/>
  <path d="M642,293l13,-10l13,10" fill="none" stroke="#8a90a8" stroke-width=".7"/>
  <rect x="645.5" y="293" width="19" height="9" fill="#585d77"/><rect x="661" y="281" width="3" height="6" fill="#585d77"/>
  <rect x="652" y="295" width="4.5" height="4.5" fill="#ffbf5a"/>
  <path d="M662.5,280C660,266 667,256 663,242C660,230 666,221 664,198" fill="none" stroke="url(#smokeG)" stroke-width="2.2" stroke-linecap="round" filter="url(#pencil)"/>
  <!-- shadows: the same tree and the same ghost, laid down across the snow by a matrix -->
  <g style="mix-blend-mode:multiply" clip-path="url(#inner)">
    <path d="M96,350C240,341 410,349 566,343C410,356 240,355 96,350Z" fill="#b9c5dd" filter="url(#wHill)"/>
    <g filter="url(#wShade)"><use href="#tree" xlink:href="#tree" stroke="#7f8cc0" transform="${cast(BY)}"/></g>
    <g filter="url(#wShade)" opacity=".5"><g transform="${cast(GY + 6)}"><path d="${GHOST}" transform="${gT}" fill="#7f8cc0"/></g></g>
  </g>
  <g style="mix-blend-mode:multiply" mask="url(#snowMask)"><g filter="url(#ink)" opacity=".93"><use href="#tree" xlink:href="#tree" stroke="#2b2726"/></g></g>
  <!-- kimori-gaki: the last persimmon, left on the tree -->
  <g style="mix-blend-mode:multiply">
    <path d="M${n1(tip[0])},${n1(tip[1])}L${n1(fx)},${n1(fy - 8)}" stroke="#2b2726" stroke-width="1.1" fill="none"/>
    <ellipse cx="${n1(fx)}" cy="${n1(fy)}" rx="10" ry="9" fill="#f59a1c" filter="url(#wFruit)"/>
    <ellipse cx="${n1(fx + 2.2)}" cy="${n1(fy + 2)}" rx="7" ry="6.2" fill="#e4521a" filter="url(#wFruit)"/>
    <ellipse cx="${n1(fx)}" cy="${n1(fy - 7.2)}" rx="4.6" ry="1.7" fill="#3f4a1e"/>
  </g>
  <path d="M${n1(fx - 6.5)},${n1(fy - 7.6)}c2,-5 11,-5 13,0c-3,1.6 -10,1.6 -13,0z" fill="${tint}"/>
  <!-- the only marks the ghost gets -->
  <g transform="${gT}" fill="#35322f" style="mix-blend-mode:multiply"><ellipse cx="-9" cy="-38" rx="2.2" ry="3"/><ellipse cx="1.5" cy="-40.2" rx="2.2" ry="3"/></g>`;
  return frame({ title: 'a quiet winter morning', tint, seed: 50, body, defs });
}

// ================================================================== 08 after Mellan: a face on a napkin, in one line
// Claude Mellan, 1649: a whole face engraved as a single spiral that starts at the tip of the nose.
// Looking closely at it, the line carries two separate signals. Its WIDTH is light and shade.
// Its sideways BEND is relief: the lettering in his cloth is not darker, the line just steps over it.
// Here both are used: the ghost is swell, the name is bend. The ink is one closed outline of one line.
function oneLine(o = {}) {
  const CX = 400, CY = 276, R0 = 216, PITCH = o.pitch || 3.2, B = PITCH / (2 * Math.PI);
  const BEND = !!o.bend, KG = o.kg == null ? (BEND ? 10 : 6) : o.kg, KW = o.kw == null ? 2.6 : o.kw, SHADE = BEND ? 0 : 0.42, G = 0.9;
  const lerp = (a, b, t) => a + (b - a) * t;

  // the ghost as a distance field; origin = the spiral's centre = where a nose would be
  const sdf = (x, y) => {
    x /= G; y /= G;
    const d1 = Math.hypot(x, y + 36) - 86;
    const hw = 86 + 10 * sstep(-36, 110, y);
    const hem = 104 + 15 * Math.pow(Math.abs(Math.sin(Math.PI * x / 48)), 0.8);
    return Math.min(d1, Math.max(Math.abs(x) - hw, y - hem, -36 - y)) * G;
  };

  // the name, flattened to segments, as a height field
  const WS = 1.25, WY = 160, word = [];
  {
    const t = WORD.match(/[MCL]|-?\d+(?:\.\d+)?/g), P = (x, y) => [(x - 70) * WS, (y - 31) * WS + WY];
    let i = 0, cur = null, cmd = 'M';
    while (i < t.length) {
      if (/[MCL]/.test(t[i])) cmd = t[i++];
      if (cmd !== 'C') { const p = [+t[i++], +t[i++]]; if (cmd === 'L') word.push([P(...cur), P(...p)]); cur = p; continue; }
      const a = cur, b = [+t[i++], +t[i++]], c = [+t[i++], +t[i++]], e = [+t[i++], +t[i++]];
      let prev = a;
      for (let k = 1; k <= 8; k++) {
        const u = k / 8, v = 1 - u;
        const p = [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * e[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * e[1]];
        word.push([P(...prev), P(...p)]); prev = p;
      }
      cur = e;
    }
  }
  const wb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [a, b] of word) for (const p of [a, b]) { wb[0] = Math.min(wb[0], p[0]); wb[1] = Math.min(wb[1], p[1]); wb[2] = Math.max(wb[2], p[0]); wb[3] = Math.max(wb[3], p[1]); }
  const hWord = (x, y) => {
    if (x < wb[0] - 8 || x > wb[2] + 8 || y < wb[1] - 8 || y > wb[3] + 8) return 0;
    let best = 1e9;
    for (const [a, b] of word) {
      const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1e-9;
      const u = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / l2, 0, 1);
      const dd = (x - a[0] - vx * u) ** 2 + (y - a[1] - vy * u) ** 2;
      if (dd < best) best = dd;
    }
    return sstep(5, 1.4, Math.sqrt(best));
  };
  // the same ghost as height instead of tone: a low dome, with the eyes and mouth as dimples
  const height = (x, y) => {
    const dome = sstep(0, -26, sdf(x, y));
    if (!BEND) return dome;
    let pit = 0;
    for (const ex of [-30 * G, 30 * G]) pit = Math.max(pit, 0.92 * sstep(1.3, 0.15, Math.hypot((x - ex) / (12 * G), (y + 36 * G) / (17 * G))));
    const my = y - 2 * G;
    pit = Math.max(pit, 0.4 * sstep(0.95, 0.5, Math.abs(Math.atan2(my, x) - Math.PI / 2)) * sstep(6, 1, Math.abs(Math.hypot(x, my) - 16 * G)));
    return dome * (1 - pit);
  };

  const tone = (x, y) => {
    const d = sdf(x, y), r = Math.hypot(x, y);
    let t;
    if (d < 0) {
      const s = sstep(-34, 0, sdf(x + 10, y + 8));
      t = 0.035 + 0.34 * s * s;                                            // the sheet turning away from the light
      t += 0.1 * sstep(30, 100, y) * (0.5 + 0.5 * Math.cos(2 * Math.PI * x / (48 * G)));   // folds rising from the hem
      t += 0.09 * (Math.exp(-((x - 50 * G) ** 2 + (y + 6 * G) ** 2) / 170) + Math.exp(-((x + 50 * G) ** 2 + (y + 6 * G) ** 2) / 170));
      for (const ex of [-30 * G, 30 * G]) {
        const e = Math.hypot((x - ex) / (12 * G), (y + 36 * G) / (17 * G));
        const glint = sstep(3.2 * G, 4.8 * G, Math.hypot(x - ex + 4 * G, y + 43 * G));
        t = lerp(t, 0.97, sstep(1.1, 0.9, e) * glint);
      }
      const my = y - 2 * G, mr = Math.hypot(x, my), ma = Math.atan2(my, x);
      t = lerp(t, 0.9, sstep(0.78, 0.6, Math.abs(ma - Math.PI / 2)) * sstep(2.7, 1.3, Math.abs(mr - 16 * G)));
    } else {
      t = 0.55 + 0.32 * sstep(30, 0, sdf(x - 14, y - 12));                 // its shadow on the cloth
      t *= 1 - 0.62 * sstep(R0 * 0.7, R0, r);
    }
    t += SHADE * (hWord(x - 1.4, y - 1.4) - hWord(x + 1.4, y + 1.4));        // the name catches the light like a ridge
    return clamp(t, 0, 1);
  };

  // ---- walk the spiral once
  const S = [], thMax = 2 * Math.PI * R0 / PITCH;
  for (let th = 0; th < thMax;) {
    const r = B * th, c = Math.cos(th), s = Math.sin(th);
    const tx = B * c - r * s, ty = B * s + r * c, tl = Math.hypot(tx, ty) || 1, nx = ty / tl, ny = -tx / tl;
    const push = -KG * (1 - height(r * c, r * s));                   // the cloth lies lower than the ghost
    const qx = r * c + nx * push, bend = KW * hWord(qx, r * s + ny * push), qy = r * s + ny * push - bend;
    const taper = 0.2 + 0.8 * sstep(thMax, thMax - 4 * Math.PI, th);
    const w = (BEND ? 0.85 : 0.32 + (PITCH * 0.9 - 0.32) * tone(qx, qy)) * taper;
    S.push({ x: qx, y: qy, nx, ny, w, r, f: w + 0.6 * bend + 0.3 * push });
    th += Math.min(1.5, 0.3 + r * 0.2) / Math.hypot(r, B);
  }
  // a burin cannot change its mind instantly: let the width swell and taper over a few pixels
  { const w0 = S.map(p => p.w), g = [1, 4, 6, 4, 1];
    for (let i = 2; i < S.length - 2; i++) { let a = 0; for (let k = -2; k <= 2; k++) a += w0[i + k] * g[k + 2]; S[i].w = a / 16; S[i].f += S[i].w - w0[i]; } }
  // keep every sample where something is changing; elsewhere only as many as the curve needs
  const K = [S[0]];
  for (let i = 1; i < S.length - 1; i++) {
    const a = S[i], last = K[K.length - 1], gap = Math.hypot(a.x - last.x, a.y - last.y);
    const busy = Math.abs(a.f - S[i - 1].f) > 0.05 || Math.abs(S[i + 1].f - a.f) > 0.05;
    if (busy || gap > Math.min(6, 0.3 + 0.45 * Math.sqrt(a.r)) || Math.abs(a.f - last.f) > 0.1) K.push(a);
  }
  K.push(S[S.length - 1]);
  const ring = K.map(p => [CX + p.x + p.nx * p.w / 2, CY + p.y + p.ny * p.w / 2])
    .concat(K.slice().reverse().map(p => [CX + p.x - p.nx * p.w / 2, CY + p.y - p.ny * p.w / 2]));
  const num = v => { let s = v.toFixed(1).replace(/\.0$/, ''); if (s === '-0') s = '0'; return s.replace(/^(-?)0\./, '$1.'); };
  let px = n1(ring[0][0]), py = n1(ring[0][1]), dd = `M${px},${py}l`, first = true;
  for (let i = 1; i < ring.length; i++) {
    const dx = n1(ring[i][0] - px), dy = n1(ring[i][1] - py);
    if (dx === 0 && dy === 0) continue;
    px = n1(px + dx); py = n1(py + dy);
    const a = num(dx), b = num(dy);
    dd += (first || a[0] === '-' ? '' : ' ') + a + (b[0] === '-' ? '' : ' ') + b; first = false;
  }
  dd += 'z';

  const plate = `x="172" y="50" width="456" height="454" rx="3"`;
  const defs = `
  <filter id="pressL" ${FU}>
    <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="la"/>
    <feGaussianBlur in="la" stdDeviation=".9" result="h"/>
    <feDiffuseLighting in="h" surfaceScale="3" diffuseConstant="1" lighting-color="#ffffff"><feDistantLight azimuth="225" elevation="30"/></feDiffuseLighting>
  </filter>`;
  const body = `
  <!-- the plate mark: the whole print sits a little lower than the napkin; the folded corner is pressed, not inked -->
  <g style="mix-blend-mode:hard-light" clip-path="url(#sheetClip)" opacity=".9"><g filter="url(#pressL)">
    <rect width="${W}" height="${H}" fill="#808080"/>
    <rect ${plate} fill="#727272"/>
    <g transform="translate(594,462) scale(1.5)" fill="none" stroke="#3a3a3a" stroke-width="1.6" stroke-linejoin="round"><path d="${FOLD}" transform="translate(-1,-31)"/></g>
  </g></g>
  <rect ${plate} fill="#cdb98e" opacity=".17" style="mix-blend-mode:multiply"/>
  <!-- one line: ${K.length} points along ${Math.round(thMax / (2 * Math.PI))} turns, drawn as a single closed outline -->
  <path d="${dd}" fill="#1b1816" opacity=".94" style="mix-blend-mode:multiply"/>`;
  return frame({ title: BEND ? 'after Mellan: the same face, by bending alone' : 'after Mellan: a face on a napkin, in one line', seed: BEND ? 62 : 61, body, defs });
}

const studies = { '01-hands': hands, '02-persimmons': persimmons, '03-egg': egg, '04-pressed': pressed, '05-lamp': lamp, '06-pond': pond, '07-winter-morning': winter, '08-one-line': oneLine, '09-one-line-bend': () => oneLine({ bend: true }) };
for (const [name, fn] of Object.entries(studies)) {
  const svg = fn();
  fs.writeFileSync(path.join(OUT, name + '.svg'), svg);
  console.log(name + '.svg', (svg.length / 1024).toFixed(1) + ' kB');
}

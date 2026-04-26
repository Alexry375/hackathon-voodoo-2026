// Fake-fail overlay — scripted "ALMOST!" beat with hearts and a TAP TO CONTINUE
// CTA. The playable never genuinely loses; tapping refills HP and lets the
// player land the killing blow → forcewin → endcard.

import { drawHandCursor, showHandOn, hideHand } from './hand_cursor.js';

const W = 540, H = 960;
const CTA_BTN = { x: 90, y: 700, w: 360, h: 92, r: 18 };
const FADE_MS = 280;
const SCALE_IN_MS = 350;

let _visible = false;
let _opacity = 0;
let _fadingOut = false;
let _t0 = 0;
let _tapped = false;
let _tapHandlerInstalled = false;

export function showFailScreen() {
  _visible = true;
  _fadingOut = false;
  _tapped = false;
  _t0 = performance.now();
  showHandOn({ x: CTA_BTN.x + CTA_BTN.w / 2, y: CTA_BTN.y - 40 });
}

export function hideFailScreen() {
  if (!_visible) return;
  _fadingOut = true;
  _t0 = performance.now();
  hideHand();
}

/** @returns {boolean} */
export function isFailScreenShown() {
  // Returns true as soon as showFailScreen() runs (so the very first draw
  // call can bootstrap _opacity), and stays true through the fade-out tail.
  return _visible || _opacity > 0.05;
}

/** @returns {boolean} */
export function isFailScreenInteractive() {
  return _visible && !_fadingOut && !_tapped && _opacity >= 0.99;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => void} onContinue
 */
export function installFailScreenTap(canvas, onContinue) {
  if (_tapHandlerInstalled) return;
  _tapHandlerInstalled = true;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!isFailScreenInteractive()) return;
    ev.preventDefault();
    _tapped = true;
    hideFailScreen();
    try { onContinue(); } catch (e) { console.error(e); }
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds, for the pulse
 */
export function drawFailScreen(ctx, t) {
  const now = performance.now();
  if (_visible && !_fadingOut) {
    _opacity = Math.min(1, (now - _t0) / FADE_MS);
  } else if (_fadingOut) {
    _opacity = Math.max(0, 1 - (now - _t0) / FADE_MS);
    if (_opacity <= 0) { _visible = false; _fadingOut = false; }
  }
  if (_opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = _opacity;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  // Title with scale-in
  const sinceShow = _fadingOut ? SCALE_IN_MS : Math.min(SCALE_IN_MS, now - _t0);
  const k = sinceShow / SCALE_IN_MS;
  const eased = 1 - Math.pow(1 - k, 3);
  const titleScale = 0.7 + 0.3 * eased;

  ctx.save();
  ctx.translate(W / 2, 300);
  ctx.scale(titleScale, titleScale);
  ctx.fillStyle = '#FFD23A';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('ALMOST!', 0, 0);
  ctx.fillText('ALMOST!', 0, 0);
  ctx.restore();

  // Subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('Tougher than it looks!', W / 2, 370);
  ctx.fillText('Tougher than it looks!', W / 2, 370);

  // Hearts row — two full, rightmost broken
  const heartSize = 64;
  const spacing = 80;
  const heartY = 470;
  const cxMid = W / 2;
  drawHeart(ctx, cxMid - spacing, heartY, heartSize, true);
  drawHeart(ctx, cxMid,           heartY, heartSize, true);
  drawHeart(ctx, cxMid + spacing, heartY, heartSize, false);

  // CTA pulse (1 Hz)
  const pulse = 1 + 0.04 * Math.sin(t * 2 * Math.PI);
  const bcx = CTA_BTN.x + CTA_BTN.w / 2;
  const bcy = CTA_BTN.y + CTA_BTN.h / 2;
  ctx.save();
  ctx.translate(bcx, bcy);
  ctx.scale(pulse, pulse);
  ctx.translate(-bcx, -bcy);
  ctx.fillStyle = '#3FB13F';
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, CTA_BTN.x + 4, CTA_BTN.y + 4, CTA_BTN.w - 8, 14, CTA_BTN.r - 4);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('TAP TO CONTINUE', bcx, bcy + 2);
  ctx.fillText('TAP TO CONTINUE', bcx, bcy + 2);
  ctx.restore();

  // Hand cursor on top of the CTA
  drawHandCursor(ctx, t);

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} size  approx total height in px
 * @param {boolean} filled  true = full red heart, false = broken outline
 */
function drawHeart(ctx, cx, cy, size, filled) {
  const s = size / 64;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  // Cartoon heart: two top arcs + triangular bottom.
  const r = 16;            // lobe radius
  const lobeY = -8;        // lobe centre y
  const leftX = -r;
  const rightX = r;
  const tipY = 28;         // bottom tip

  ctx.beginPath();
  ctx.moveTo(0, lobeY + r * 0.7);
  ctx.arc(leftX, lobeY, r, 0, Math.PI, true);
  ctx.lineTo(leftX - r, lobeY);
  ctx.bezierCurveTo(leftX - r, lobeY + 14, -8, tipY - 4, 0, tipY);
  ctx.bezierCurveTo(8, tipY - 4, rightX + r, lobeY + 14, rightX + r, lobeY);
  ctx.arc(rightX, lobeY, r, Math.PI, 0, true);
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = '#E03B3B';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
    // soft top highlight
    ctx.beginPath();
    ctx.ellipse(-10, lobeY - 4, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
    // Diagonal jagged crack across the heart.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-22, -22);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-12, 2);
    ctx.lineTo(4, 12);
    ctx.lineTo(-2, 20);
    ctx.lineTo(20, 28);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

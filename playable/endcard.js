// End card — fades in after force-win, shows the install CTA.
// Background = ENDCARD_BG (frame_55s.jpg) inlined via window.ASSETS.
// Tap anywhere on the canvas (during endcard) → Voodoo.playable.redirectToInstallPage().

import { getImage, isImageReady } from '../shared/assets.js';

let _opacity = 0;       // 0..1 fade-in progress (driven by script.js)
let _shown = false;     // gates the tap handler
let _tapHandlerInstalled = false;

const W = 540, H = 960;
const CTA_BTN = { x: 90, y: 700, w: 360, h: 92, r: 18 };

/** @param {number} v */
export function setEndcardOpacity(v) {
  _opacity = Math.max(0, Math.min(1, v));
  _shown = _opacity > 0.01;
}

export function isEndcardShown() { return _shown; }

/**
 * Install a one-time pointerdown handler that redirects when the endcard
 * is shown. Idempotent.
 * @param {HTMLCanvasElement} canvas
 */
export function installEndcardTap(canvas) {
  if (_tapHandlerInstalled) return;
  _tapHandlerInstalled = true;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!_shown || _opacity < 0.6) return;
    ev.preventDefault();
    try { /** @type {any} */ (window).Voodoo?.playable?.redirectToInstallPage(); } catch (e) { console.error(e); }
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t  seconds, for the pulse
 */
export function drawEndcard(ctx, t) {
  if (_opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = _opacity;

  // Background: full-canvas frame_55s.jpg, otherwise solid color fallback.
  if (isImageReady('ENDCARD_BG')) {
    ctx.drawImage(getImage('ENDCARD_BG'), 0, 0, W, H);
  } else {
    getImage('ENDCARD_BG'); // kick the load
    ctx.fillStyle = '#1A2A4A';
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette darken
  const grad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#FFD23A';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('VICTORY!', W / 2, 280);
  ctx.fillText('VICTORY!', W / 2, 280);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeText('Build your castle.', W / 2, 400);
  ctx.fillText('Build your castle.', W / 2, 400);
  ctx.strokeText('Crush your enemies.', W / 2, 444);
  ctx.fillText('Crush your enemies.', W / 2, 444);

  // CTA button — pulse 1.0 Hz
  const pulse = 1 + 0.04 * Math.sin(t * 2 * Math.PI * 1.0);
  const cx = CTA_BTN.x + CTA_BTN.w / 2;
  const cy = CTA_BTN.y + CTA_BTN.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);
  // Button body (green)
  ctx.fillStyle = '#3FB13F';
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.fill();
  // top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, CTA_BTN.x + 4, CTA_BTN.y + 4, CTA_BTN.w - 8, 14, CTA_BTN.r - 4);
  ctx.fill();
  // outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.stroke();
  // label
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 44px sans-serif';
  ctx.strokeText('PLAY NOW', cx, cy + 4);
  ctx.fillText('PLAY NOW', cx, cy + 4);
  ctx.restore();

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

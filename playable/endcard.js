// End card — fades in after force-win, shows the install CTA.
// Background = ENDCARD_BG (frame_55s.jpg) inlined via window.ASSETS.
// Tap ANYWHERE on the canvas (during endcard) → Voodoo.playable.redirectToInstallPage().
//
// Juice (matches AppLovin reference playables):
//   - 3-star row, staggered easeOutBack scale-in
//   - confetti burst on first appearance (~1.2s lifecycle)
//   - "social proof" rating line
//   - shimmer band sweep across CTA (~3s loop) on top of the existing 1Hz pulse

import { getImage, isImageReady } from '../shared/assets.js';
import { fireConfetti, drawConfetti, resetConfetti } from './confetti.js';

let _opacity = 0;
let _shown = false;
let _tapHandlerInstalled = false;
let _entryT = 0; // perf.now() ms when the endcard first became visible
let _confettiFired = false;

const W = 540, H = 960;
const CTA_BTN = { x: 90, y: 720, w: 360, h: 96, r: 18 };

// 3 stars centered above the title (placed below the BG wordmark, above title).
const STARS_Y = 290;
const STAR_SIZE = 70;
const STAR_GAP = 100;
const STAR_STAGGER_MS = 150;
const STAR_DUR_MS = 420;

/** @param {number} v */
export function setEndcardOpacity(v) {
  const prev = _opacity;
  _opacity = Math.max(0, Math.min(1, v));
  _shown = _opacity > 0.01;
  if (_shown && prev <= 0.01) {
    _entryT = performance.now();
    _confettiFired = false;
  } else if (!_shown && prev > 0.01) {
    // Reset on exit so a re-entry replays the burst (dev hook re-trigger).
    resetConfetti();
    _confettiFired = false;
    _entryT = 0;
  }
}

export function isEndcardShown() { return _shown; }

/**
 * Install a one-time pointerdown handler. Tap-anywhere triggers redirect.
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
 * @param {number} t  seconds, for the pulse / shimmer
 */
export function drawEndcard(ctx, t) {
  if (_opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = _opacity;

  // BG
  if (isImageReady('ENDCARD_BG')) {
    ctx.drawImage(getImage('ENDCARD_BG'), 0, 0, W, H);
  } else {
    getImage('ENDCARD_BG');
    ctx.fillStyle = '#1A2A4A';
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Center darkening band behind text content for legibility on busy BGs.
  const bandGrad = ctx.createLinearGradient(0, 240, 0, 620);
  bandGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bandGrad.addColorStop(0.15, 'rgba(0,0,0,0.55)');
  bandGrad.addColorStop(0.85, 'rgba(0,0,0,0.55)');
  bandGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 240, W, 380);

  const elapsed = _entryT ? performance.now() - _entryT : 0;

  // Stars (above title)
  _drawStars(ctx, elapsed);

  // Title
  ctx.fillStyle = '#FFD23A';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('VICTORY!', W / 2, 400);
  ctx.fillText('VICTORY!', W / 2, 400);

  // Subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeText('Build your castle.', W / 2, 480);
  ctx.fillText('Build your castle.', W / 2, 480);
  ctx.strokeText('Crush your enemies.', W / 2, 522);
  ctx.fillText('Crush your enemies.', W / 2, 522);

  // Social proof
  _drawSocialProof(ctx, 590);

  // CTA + tap hint below
  _drawCTA(ctx, t);
  _drawTapHint(ctx, t);

  // Confetti on top of everything but BELOW we already painted CTA — that's
  // intentional: confetti reads as a foreground ribbon. It does not block taps
  // (tap handler is anywhere-on-canvas).
  if (!_confettiFired && _opacity > 0.4) {
    fireConfetti(110, W);
    _confettiFired = true;
  }
  drawConfetti(ctx, t);

  ctx.restore();
}

function _drawStars(ctx, elapsed) {
  const cx = W / 2;
  const total = 3;
  for (let i = 0; i < total; i++) {
    const tStar = elapsed - i * STAR_STAGGER_MS;
    let scale;
    if (tStar <= 0) {
      scale = 0;
    } else if (tStar >= STAR_DUR_MS) {
      scale = 1;
    } else {
      // easeOutBack 0 → 1.2 → 1.0
      const u = tStar / STAR_DUR_MS;
      const c1 = 1.70158;
      const c3 = c1 + 1;
      scale = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
    if (scale <= 0) continue;
    const x = cx + (i - 1) * STAR_GAP;
    _drawStar(ctx, x, STARS_Y, STAR_SIZE * 0.5 * scale, '#FFD23A');
  }
}

function _drawStar(ctx, cx, cy, r, color) {
  const spikes = 5;
  const inner = r * 0.45;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (Math.PI / spikes) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();
  // inner highlight
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
}

function _drawSocialProof(ctx, y) {
  const cx = W / 2;
  // "★ 4.8  ·  12M+ players" — use a polygon star (no emoji font dependency).
  ctx.save();
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const text = '4.8   ·   12M+ players';
  const textW = ctx.measureText(text).width;
  const starR = 13;
  const gap = 10;
  const totalW = starR * 2 + gap + textW;
  const startX = cx - totalW / 2;

  _drawStar(ctx, startX + starR, y, starR, '#FFD23A');

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#FFFFFF';
  const tx = startX + starR * 2 + gap;
  ctx.strokeText(text, tx, y);
  ctx.fillText(text, tx, y);
  ctx.restore();
}

function _drawCTA(ctx, t) {
  const pulse = 1 + 0.04 * Math.sin(t * 2 * Math.PI * 1.0);
  const cx = CTA_BTN.x + CTA_BTN.w / 2;
  const cy = CTA_BTN.y + CTA_BTN.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);

  // Body
  ctx.fillStyle = '#3FB13F';
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.fill();

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, CTA_BTN.x + 4, CTA_BTN.y + 4, CTA_BTN.w - 8, 14, CTA_BTN.r - 4);
  ctx.fill();

  // Shimmer band — clipped to button rect, sweeps across every 3s.
  ctx.save();
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.clip();
  const period = 3.0;
  const phase = ((t % period) / period); // 0..1
  const bandW = 90;
  const sweepRange = CTA_BTN.w + bandW * 2;
  const bx = CTA_BTN.x - bandW + phase * sweepRange;
  const sg = ctx.createLinearGradient(bx, 0, bx + bandW, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  // Skewed band for a nicer diagonal sweep.
  ctx.beginPath();
  ctx.moveTo(bx, CTA_BTN.y);
  ctx.lineTo(bx + bandW, CTA_BTN.y);
  ctx.lineTo(bx + bandW - 30, CTA_BTN.y + CTA_BTN.h);
  ctx.lineTo(bx - 30, CTA_BTN.y + CTA_BTN.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  roundRect(ctx, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('PLAY NOW', cx, cy + 4);
  ctx.fillText('PLAY NOW', cx, cy + 4);

  ctx.restore();
}

function _drawTapHint(ctx, t) {
  // Tiny "tap anywhere" affordance below the CTA — fades in after 1s.
  const elapsed = _entryT ? performance.now() - _entryT : 0;
  const a = Math.max(0, Math.min(1, (elapsed - 1000) / 400));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const y = CTA_BTN.y + CTA_BTN.h + 36;
  ctx.strokeText('Tap anywhere to install', W / 2, y);
  ctx.fillText('Tap anywhere to install', W / 2, y);
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

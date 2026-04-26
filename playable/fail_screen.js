// Fake-fail overlay — scripted "ALMOST!" beat with hearts, a big PLAY NOW
// button (with a hand sprite drawing the eye), and a smaller dimmer CONTINUE
// option below. The playable never genuinely loses:
//   - PLAY NOW  → window.Voodoo.playable.redirectToInstallPage() (the goal)
//   - CONTINUE  → refill HP and let the player land the killing blow

import { drawHandCursor, showHandOn, hideHand } from './hand_cursor.js';

const W = 540, H = 960;

// PLAY NOW — big, centred, pulsing green (the primary CTA).
const PLAY_BTN = { x: 60, y: 640, w: 420, h: 120, r: 22 };
// CONTINUE — smaller, dimmer, lower (the deflection option).
const CONT_BTN = { x: 150, y: 800, w: 240, h: 60, r: 14 };

const FADE_MS = 280;
const SCALE_IN_MS = 350;

let _visible = false;
let _opacity = 0;
let _fadingOut = false;
let _t0 = 0;
let _tapped = false;
let _tapHandlerInstalled = false;
let _onContinueCb = null;

export function showFailScreen() {
  _visible = true;
  _fadingOut = false;
  _tapped = false;
  _t0 = performance.now();
  // Hand points at PLAY NOW (centre of big button), tip just above the top edge.
  showHandOn({ x: PLAY_BTN.x + PLAY_BTN.w / 2, y: PLAY_BTN.y - 6 });
}

export function hideFailScreen() {
  if (!_visible) return;
  _fadingOut = true;
  _t0 = performance.now();
  hideHand();
}

/** @returns {boolean} */
export function isFailScreenShown() {
  return _visible || _opacity > 0.05;
}

/** @returns {boolean} */
export function isFailScreenInteractive() {
  return _visible && !_fadingOut && !_tapped && _opacity >= 0.99;
}

/**
 * Install a single pointerdown handler. Hit-tests both buttons.
 *  - PLAY NOW → redirectToInstallPage (NO continue callback)
 *  - CONTINUE → onContinue callback
 * @param {HTMLCanvasElement} canvas
 * @param {() => void} onContinue
 */
export function installFailScreenTap(canvas, onContinue) {
  _onContinueCb = onContinue;
  if (_tapHandlerInstalled) return;
  _tapHandlerInstalled = true;
  canvas.addEventListener('pointerdown', (ev) => {
    if (!isFailScreenInteractive()) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * sx;
    const y = (ev.clientY - rect.top) * sy;

    const inPlay = x >= PLAY_BTN.x && x <= PLAY_BTN.x + PLAY_BTN.w
                && y >= PLAY_BTN.y && y <= PLAY_BTN.y + PLAY_BTN.h;
    const inCont = x >= CONT_BTN.x && x <= CONT_BTN.x + CONT_BTN.w
                && y >= CONT_BTN.y && y <= CONT_BTN.y + CONT_BTN.h;

    if (inPlay) {
      ev.preventDefault();
      ev.stopPropagation();
      _tapped = true;
      hideFailScreen();
      try { /** @type {any} */ (window).Voodoo?.playable?.redirectToInstallPage(); }
      catch (e) { console.error(e); }
    } else if (inCont) {
      ev.preventDefault();
      ev.stopPropagation();
      _tapped = true;
      hideFailScreen();
      try { _onContinueCb?.(); } catch (e) { console.error(e); }
    }
  }, true); // capture so persistent_cta's handler doesn't grab the event first
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
  ctx.translate(W / 2, 270);
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
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('Tougher than it looks!', W / 2, 340);
  ctx.fillText('Tougher than it looks!', W / 2, 340);

  // Hearts row — two full, rightmost broken
  const heartSize = 64;
  const spacing = 80;
  const heartY = 440;
  const cxMid = W / 2;
  drawHeart(ctx, cxMid - spacing, heartY, heartSize, true);
  drawHeart(ctx, cxMid,           heartY, heartSize, true);
  drawHeart(ctx, cxMid + spacing, heartY, heartSize, false);

  // "TAP PLAY NOW" instruction text
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('TAP PLAY NOW TO INSTALL', W / 2, 570);
  ctx.fillText('TAP PLAY NOW TO INSTALL', W / 2, 570);

  // === PLAY NOW (primary, big, pulsing) ===
  const pulse = 1 + 0.045 * Math.sin(t * 2 * Math.PI);
  const pcx = PLAY_BTN.x + PLAY_BTN.w / 2;
  const pcy = PLAY_BTN.y + PLAY_BTN.h / 2;
  ctx.save();
  ctx.translate(pcx, pcy);
  ctx.scale(pulse, pulse);
  ctx.translate(-pcx, -pcy);
  ctx.fillStyle = '#3FB13F';
  roundRect(ctx, PLAY_BTN.x, PLAY_BTN.y, PLAY_BTN.w, PLAY_BTN.h, PLAY_BTN.r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, PLAY_BTN.x + 4, PLAY_BTN.y + 4, PLAY_BTN.w - 8, 18, PLAY_BTN.r - 4);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  roundRect(ctx, PLAY_BTN.x, PLAY_BTN.y, PLAY_BTN.w, PLAY_BTN.h, PLAY_BTN.r);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('PLAY NOW', pcx, pcy + 4);
  ctx.fillText('PLAY NOW', pcx, pcy + 4);
  ctx.restore();

  // === CONTINUE (secondary, smaller, dimmer, no pulse) ===
  const ccx = CONT_BTN.x + CONT_BTN.w / 2;
  const ccy = CONT_BTN.y + CONT_BTN.h / 2;
  ctx.fillStyle = '#5A5A5A';
  roundRect(ctx, CONT_BTN.x, CONT_BTN.y, CONT_BTN.w, CONT_BTN.h, CONT_BTN.r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 3;
  roundRect(ctx, CONT_BTN.x, CONT_BTN.y, CONT_BTN.w, CONT_BTN.h, CONT_BTN.r);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Continue', ccx, ccy + 1);

  // Hand cursor on top of everything (already targeted at PLAY NOW)
  drawHandCursor(ctx, t);

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} size
 * @param {boolean} filled
 */
function drawHeart(ctx, cx, cy, size, filled) {
  const s = size / 64;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  const r = 16, lobeY = -8, leftX = -r, rightX = r, tipY = 28;

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
    ctx.beginPath();
    ctx.ellipse(-10, lobeY - 4, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.stroke();
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

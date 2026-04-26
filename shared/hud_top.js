// Top HP bar — visible in both scenes. Reads state.hp_self_pct / hp_enemy_pct.
// Layout matches source clip2.mp4:
//   - full-width blue bar (left half) and red bar (right half), spanning 0→W
//   - bars are 20px tall, sitting at the very top (y=0)
//   - large bold "VS" centered, drawn over bars
//   - 44×44 castle icon thumbnails in top corners, overlapping bar row
//   - HP% text below each icon, bold 16px

import { state } from './state.js';
import { getImage, isImageReady } from './assets.js';

const ICON_SZ = 52;
const BAR_H   = 28;
const TOP     = 0;

/** @param {CanvasRenderingContext2D} ctx */
export function drawTopHud(ctx) {
  const W = ctx.canvas.width;
  const halfW = W / 2;
  const barY  = TOP;
  const centerX = W / 2;

  // ── Bar backgrounds (full width, split at center) ─────────────────────────
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, barY, W, BAR_H);

  // ── Blue fill (left half, grows left→right) ───────────────────────────────
  const bluePct = Math.max(0, Math.min(1, state.hp_self_pct / 100));
  const blueGrad = ctx.createLinearGradient(0, barY, 0, barY + BAR_H);
  blueGrad.addColorStop(0,   '#4AABFF');
  blueGrad.addColorStop(0.5, '#2B8FE8');
  blueGrad.addColorStop(1,   '#1666BB');
  ctx.fillStyle = blueGrad;
  ctx.fillRect(0, barY, halfW * bluePct, BAR_H);
  if (bluePct > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(1, barY + 2, halfW * bluePct - 2, 4);
  }

  // ── Red fill (right half, grows right→left) ───────────────────────────────
  const redPct = Math.max(0, Math.min(1, state.hp_enemy_pct / 100));
  const redW = halfW * redPct;
  const redGrad = ctx.createLinearGradient(0, barY, 0, barY + BAR_H);
  redGrad.addColorStop(0,   '#FF5555');
  redGrad.addColorStop(0.5, '#E83030');
  redGrad.addColorStop(1,   '#BB1111');
  ctx.fillStyle = redGrad;
  ctx.fillRect(W - redW, barY, redW, BAR_H);
  if (redPct > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(W - redW, barY + 2, redW - 1, 4);
  }

  // ── Bar border — thick black outline, looks like styled UI panel ──────────
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, barY, W, BAR_H);
  // center divider
  ctx.beginPath();
  ctx.moveTo(centerX, barY);
  ctx.lineTo(centerX, barY + BAR_H);
  ctx.stroke();

  // ── VS badge: slightly rounded pill behind text ───────────────────────────
  const vsW = 42, vsH = BAR_H + 8;
  const vsBadgeX = centerX - vsW / 2, vsBadgeY = barY - 3;
  ctx.fillStyle = '#222222';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(vsBadgeX, vsBadgeY, vsW, vsH, 5);
  } else {
    ctx.rect(vsBadgeX, vsBadgeY, vsW, vsH);
  }
  ctx.fill();
  ctx.stroke();

  // ── VS text centered on bar ───────────────────────────────────────────────
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000';
  ctx.strokeText('VS', centerX, barY + BAR_H / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('VS', centerX, barY + BAR_H / 2);

  // ── Castle icons (44×44, top corners) ────────────────────────────────────
  _drawIcon(ctx, 'BLUE_CASTLE', 2, TOP, false);
  _drawIcon(ctx, 'RED_CASTLE', W - ICON_SZ - 2, TOP, true);

  // ── HP percentage text (below each icon) ─────────────────────────────────
  const pctY = TOP + ICON_SZ + 2;
  const iconCenterL = 2 + ICON_SZ / 2;
  const iconCenterR = W - ICON_SZ - 2 + ICON_SZ / 2;
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#000';

  ctx.strokeText(`${Math.round(state.hp_self_pct)}%`, iconCenterL, pctY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${Math.round(state.hp_self_pct)}%`, iconCenterL, pctY);

  ctx.strokeText(`${Math.round(state.hp_enemy_pct)}%`, iconCenterR, pctY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${Math.round(state.hp_enemy_pct)}%`, iconCenterR, pctY);
}

function _drawIcon(ctx, assetName, x, y, mirror) {
  if (!isImageReady(assetName)) { getImage(assetName); return; }
  ctx.save();
  if (mirror) {
    ctx.translate(x + ICON_SZ, y);
    ctx.scale(-1, 1);
    ctx.drawImage(getImage(assetName), 0, 0, ICON_SZ, ICON_SZ);
  } else {
    ctx.drawImage(getImage(assetName), x, y, ICON_SZ, ICON_SZ);
  }
  ctx.restore();
}

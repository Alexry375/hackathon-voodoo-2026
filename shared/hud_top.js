// Top HP bar — visible in both scenes. Reads state.hp_self_pct / hp_enemy_pct.
// Layout matches source clip2.mp4:
//   - full-width blue bar (left half) and red bar (right half), spanning 0→W
//   - bars are 20px tall, sitting at the very top (y=0)
//   - large bold "VS" centered, drawn over bars
//   - 44×44 castle icon thumbnails in top corners, overlapping bar row
//   - HP% text below each icon, bold 16px

import { state } from './state.js';
import { getImage, isImageReady } from './assets.js';

const ICON_SZ = 44;
const BAR_H   = 20;
const TOP     = 0;

/** @param {CanvasRenderingContext2D} ctx */
export function drawTopHud(ctx) {
  const W = ctx.canvas.width;
  const halfW = W / 2;
  const barY  = TOP;
  const centerX = W / 2;

  // ── Bar backgrounds (full width, split at center) ─────────────────────────
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, barY, W, BAR_H);

  // ── Blue fill (left half, grows left→right) ───────────────────────────────
  const bluePct = Math.max(0, Math.min(1, state.hp_self_pct / 100));
  ctx.fillStyle = '#2B8FE8';
  ctx.fillRect(0, barY, halfW * bluePct, BAR_H);
  if (bluePct > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(0, barY + 1, halfW * bluePct, 4);
  }

  // ── Red fill (right half, grows right→left) ───────────────────────────────
  const redPct = Math.max(0, Math.min(1, state.hp_enemy_pct / 100));
  const redW = halfW * redPct;
  ctx.fillStyle = '#E83030';
  ctx.fillRect(W - redW, barY, redW, BAR_H);
  if (redPct > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(W - redW, barY + 1, redW, 4);
  }

  // ── Bar border ────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, barY, W, BAR_H);
  // center divider
  ctx.beginPath();
  ctx.moveTo(centerX, barY);
  ctx.lineTo(centerX, barY + BAR_H);
  ctx.stroke();

  // ── VS text centered on bar ───────────────────────────────────────────────
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
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
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
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

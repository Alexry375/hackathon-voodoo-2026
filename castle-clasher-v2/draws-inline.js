// AUTO-EXTRACTED from showcases by extract-draws.mjs — do not edit by hand.
// Each section is wrapped in an IIFE for scope isolation. Public APIs are lifted onto window.

// ============== fx-explosion ==============
(function(){
'use strict';

// ============================================================
// FX EXPLOSION — drawExplosion(ctx, cx, cy, t, seed, kind='big')
//   kind ∈ 'big' | 'small'
//   t ∈ [0,1] — 0=spawn, 1=fin de vie.
//   Lifetime gameplay : big ~600ms / small ~400ms
// ============================================================

function rng(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

function drawExplosion(ctx, cx, cy, t, seed, kind){
  if(t<0||t>1) return;
  if(kind==='small') return drawExplosionSmall(ctx, cx, cy, t, seed);
  return drawExplosionBig(ctx, cx, cy, t, seed);
}

// ------------------------------------------------------------
// BIG — POW violet dramatique (≈50 ops, "wow moment")
// ------------------------------------------------------------
function drawExplosionBig(ctx, cx, cy, t, seed){
  const r = rng(seed);
  const grow = 1 - Math.pow(1 - Math.min(1, t/0.25), 3);
  const baseR = 14 + 46*grow;
  const fade = t < 0.55 ? 1 : Math.max(0, 1 - (t-0.55)/0.45);
  const earlyFade = t < 0.35 ? 1 : Math.max(0, 1 - (t-0.35)/0.30);
  const shardFade = t < 0.7 ? 1 : Math.max(0, 1 - (t-0.7)/0.3);

  // 0) white inner flash
  if(t<0.25){
    const flashA = (1 - t/0.25);
    ctx.save();
    ctx.globalAlpha = flashA*0.7;
    const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR*1.1);
    flash.addColorStop(0, 'rgba(255,255,255,1)');
    flash.addColorStop(0.5, 'rgba(255,210,240,0.5)');
    flash.addColorStop(1, 'rgba(255,180,230,0)');
    ctx.fillStyle = flash;
    ctx.fillRect(cx-baseR*1.2, cy-baseR*1.2, baseR*2.4, baseR*2.4);
    ctx.restore();
  }

  // 1) violet aura
  ctx.save();
  ctx.globalAlpha = 0.8*fade;
  const halo = ctx.createRadialGradient(cx, cy, baseR*0.15, cx, cy, baseR*2.2);
  halo.addColorStop(0, 'rgba(140, 50, 180, 0.9)');
  halo.addColorStop(0.35, 'rgba(90, 25, 135, 0.65)');
  halo.addColorStop(0.7, 'rgba(55, 12, 90, 0.3)');
  halo.addColorStop(1, 'rgba(30, 5, 55, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx-baseR*2.3, cy-baseR*2.3, baseR*4.6, baseR*4.6);
  ctx.restore();

  // 2) white spike rays
  if(earlyFade>0){
    ctx.save();
    ctx.translate(cx,cy);
    ctx.globalAlpha = earlyFade;
    ctx.fillStyle = '#ffffff';
    const rays = 9;
    const baseAng = (seed*0.13)%(Math.PI*2);
    for(let i=0;i<rays;i++){
      ctx.save();
      const jitter = (r()-0.5)*0.18;
      ctx.rotate(baseAng + i*Math.PI*2/rays + jitter);
      const len = baseR*(2.0 + r()*0.7);
      const w = baseR*0.10*(1 - t*0.4);
      ctx.beginPath();
      ctx.moveTo(0, -w);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, w);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 3) magenta dagger spikes
  if(earlyFade>0){
    ctx.save();
    ctx.translate(cx,cy);
    ctx.globalAlpha = earlyFade;
    const spikes = 8;
    const off = (seed*0.07)%(Math.PI*2) + Math.PI/spikes;
    for(let i=0;i<spikes;i++){
      ctx.save();
      ctx.rotate(off + i*Math.PI*2/spikes + (r()-0.5)*0.22);
      const len = baseR*(1.7 + r()*0.6);
      const w = baseR*0.12;
      ctx.fillStyle = '#5a0e6e';
      ctx.beginPath();
      ctx.moveTo(0,-w); ctx.lineTo(len,0); ctx.lineTo(0,w); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff3d8a';
      ctx.beginPath();
      ctx.moveTo(0,-w*0.45); ctx.lineTo(len*0.85,0); ctx.lineTo(0,w*0.45); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 4) lumpy black cloud
  ctx.save();
  ctx.globalAlpha = 0.95*fade;
  ctx.fillStyle = '#160820';
  ctx.beginPath();
  ctx.arc(cx, cy, baseR*0.62, 0, Math.PI*2);
  ctx.fill();
  const lobes = 7;
  for(let i=0;i<lobes;i++){
    const a = i/lobes*Math.PI*2 + r()*0.7;
    const d = baseR*(0.45 + r()*0.3);
    const lr = baseR*(0.32 + r()*0.22);
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, lr, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = '#05010a';
  for(let i=0;i<3;i++){
    const a = r()*Math.PI*2;
    const d = baseR*0.18*r();
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, baseR*(0.22+r()*0.14), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 5) magenta POW star
  if(t<0.55){
    ctx.save();
    ctx.translate(cx,cy);
    const starFade = 1 - t/0.55;
    ctx.globalAlpha = starFade;
    ctx.strokeStyle = '#ff2d6f';
    ctx.lineWidth = Math.max(1.5, baseR*0.045);
    ctx.lineJoin = 'round';
    const pts = 5, rOut = baseR*0.32, rIn = baseR*0.13;
    ctx.beginPath();
    for(let i=0;i<=pts*2;i++){
      const ang = i*Math.PI/pts - Math.PI/2;
      const rad = i%2===0?rOut:rIn;
      const x = Math.cos(ang)*rad, y = Math.sin(ang)*rad;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 6) angular black shards
  ctx.save();
  ctx.fillStyle = '#0a0410';
  ctx.globalAlpha = shardFade;
  const shards = 9;
  for(let i=0;i<shards;i++){
    const a = i/shards*Math.PI*2 + r()*0.6;
    const d = baseR*(0.95 + t*0.9 + r()*0.4);
    const sx = cx+Math.cos(a)*d, sy = cy+Math.sin(a)*d;
    const sz = baseR*0.08*(1+r()*0.8);
    ctx.save();
    ctx.translate(sx,sy);
    ctx.rotate(a*1.7 + r()*Math.PI);
    ctx.beginPath();
    ctx.moveTo(0,-sz); ctx.lineTo(sz*0.8,0); ctx.lineTo(0,sz*1.2); ctx.lineTo(-sz*0.5,sz*0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 7) sparks
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1-t*1.1);
  for(let i=0;i<16;i++){
    const a = r()*Math.PI*2;
    const d = baseR*(0.85 + t*1.3 + r()*0.7);
    const x = cx+Math.cos(a)*d, y = cy+Math.sin(a)*d;
    ctx.fillStyle = i%3===0 ? '#ff5fa0' : '#ffffff';
    const sz = 1 + r()*1.8;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------
// SMALL — puff de fumée + sparks dorés (~25 ops, standard hit)
// Palette : gris-blanc clair (pas noir), sparks dorés/orangés, débris pierre clairs.
// Pas d'étoile rouge, pas de rayons blancs nets, halo jaune très léger.
// ------------------------------------------------------------
function drawExplosionSmall(ctx, cx, cy, t, seed){
  const r = rng(seed);
  // grow + plateau plus rapide (impact court)
  const grow = 1 - Math.pow(1 - Math.min(1, t/0.20), 3);
  const baseR = 8 + 17*grow;            // ~25 max — 40% du big
  const fade  = t < 0.50 ? 1 : Math.max(0, 1 - (t-0.50)/0.50);
  const earlyFade = t < 0.30 ? 1 : Math.max(0, 1 - (t-0.30)/0.25);
  const shardFade = t < 0.65 ? 1 : Math.max(0, 1 - (t-0.65)/0.35);

  // 0) flash jaune bref (punch initial, pas blanc pur pour rester chaud)
  if(t<0.15){
    const fa = (1 - t/0.15);
    ctx.save();
    ctx.globalAlpha = fa*0.45;
    const fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR*0.85);
    fl.addColorStop(0, 'rgba(255,245,200,1)');
    fl.addColorStop(0.6, 'rgba(255,215,110,0.45)');
    fl.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = fl;
    ctx.fillRect(cx-baseR, cy-baseR, baseR*2, baseR*2);
    ctx.restore();
  }

  // 1) halo jaune léger (warm glow, pas violet)
  ctx.save();
  ctx.globalAlpha = 0.50*fade;
  const halo = ctx.createRadialGradient(cx, cy, baseR*0.2, cx, cy, baseR*1.7);
  halo.addColorStop(0,   'rgba(255,225,80,0.55)');
  halo.addColorStop(0.5, 'rgba(255,180,70,0.22)');
  halo.addColorStop(1,   'rgba(255,160,60,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx-baseR*1.8, cy-baseR*1.8, baseR*3.6, baseR*3.6);
  ctx.restore();

  // 2) puff de fumée gris (lobes mid-tone pour rester visible sur fond clair)
  ctx.save();
  ctx.globalAlpha = 0.94*fade;
  // dark-mid base donne contraste sur mur gris clair
  ctx.fillStyle = '#5e5e5e';
  ctx.beginPath();
  ctx.arc(cx, cy, baseR*0.72, 0, Math.PI*2);
  ctx.fill();
  // mid-tone lobes
  ctx.fillStyle = '#8a8a8a';
  const lobes = 6;
  for(let i=0;i<lobes;i++){
    const a = i/lobes*Math.PI*2 + r()*0.6;
    const d = baseR*(0.45 + r()*0.30);
    const lr = baseR*(0.36 + r()*0.22);
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, lr, 0, Math.PI*2);
    ctx.fill();
  }
  // light highlight lobes (top side, asymétrique pour volume)
  ctx.fillStyle = '#cfcfcf';
  for(let i=0;i<3;i++){
    const a = -Math.PI*0.5 + (r()-0.5)*1.4;
    const d = baseR*(0.30 + r()*0.25);
    const lr = baseR*(0.22 + r()*0.16);
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, lr, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // 3) sparks dorés en éventail — longs, prominents, élément signature
  if(earlyFade>0){
    ctx.save();
    ctx.translate(cx,cy);
    ctx.globalAlpha = earlyFade;
    ctx.lineCap = 'round';
    const nSp = 10;
    const baseAng = (seed*0.11)%(Math.PI*2);
    for(let i=0;i<nSp;i++){
      const a = baseAng + i*Math.PI*2/nSp + (r()-0.5)*0.30;
      const inner = baseR*(0.60 + r()*0.20);
      const outer = baseR*(1.55 + t*0.9 + r()*0.55);
      ctx.strokeStyle = (i%2===0) ? '#ffeb3b' : '#ff9933';
      ctx.lineWidth = Math.max(1.2, baseR*0.09*(1 - t*0.4));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*inner, Math.sin(a)*inner);
      ctx.lineTo(Math.cos(a)*outer, Math.sin(a)*outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4) débris pierre clairs (petits cailloux qui partent)
  ctx.save();
  ctx.globalAlpha = shardFade;
  ctx.fillStyle = '#cfcfcf';
  ctx.strokeStyle = '#7a7a7a';
  ctx.lineWidth = 1;
  const debris = 5;
  for(let i=0;i<debris;i++){
    const a = i/debris*Math.PI*2 + r()*0.8;
    const d = baseR*(1.0 + t*1.1 + r()*0.4);
    const sx = cx+Math.cos(a)*d, sy = cy+Math.sin(a)*d;
    const sz = baseR*0.10*(0.7+r()*0.7);
    ctx.save();
    ctx.translate(sx,sy);
    ctx.rotate(a*1.3 + r()*Math.PI);
    ctx.beginPath();
    ctx.moveTo(-sz,-sz*0.6); ctx.lineTo(sz*0.9,-sz*0.4); ctx.lineTo(sz*0.6,sz*0.8); ctx.lineTo(-sz*0.7,sz*0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 5) micro-points dorés (étincelles fines en suspension)
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t*1.2);
  for(let i=0;i<8;i++){
    const a = r()*Math.PI*2;
    const d = baseR*(0.7 + t*1.0 + r()*0.5);
    const x = cx+Math.cos(a)*d, y = cy+Math.sin(a)*d;
    ctx.fillStyle = (i%2===0) ? '#ffeb3b' : '#fff2a0';
    const sz = 0.8 + r()*1.1;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}
  window.drawExplosion = typeof drawExplosion !== 'undefined' ? drawExplosion : window.drawExplosion;
  window.drawExplosionBig = typeof drawExplosionBig !== 'undefined' ? drawExplosionBig : window.drawExplosionBig;
  window.drawExplosionSmall = typeof drawExplosionSmall !== 'undefined' ? drawExplosionSmall : window.drawExplosionSmall;
  window.rng = typeof rng !== 'undefined' ? rng : window.rng;
})();

// ============== fx-chunks ==============
(function(){
'use strict';

// ============================================================
// FX CHUNKS — drawChunk(ctx, cx, cy, t, seed, opts)
// (cx,cy) = point d'origine du détachement
// t ∈ [0,1] où 0=détaché, 1=touche le sol
// opts: { width, height, vx, spinDir (1|-1), kind ('wall'|'roof') }
// Lifetime ~1200ms côté gameplay
// ============================================================

function rng(seed){let s=seed||1;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

function drawChunk(ctx, cx, cy, t, seed, opts){
  if(t<0||t>1) return;
  opts = opts||{};
  const W = opts.width  || 56;
  const H = opts.height || 56;
  const vx = (opts.vx==null?70:opts.vx);
  const spinDir = opts.spinDir||1;
  const kind = opts.kind||'wall';
  const r = rng(seed);

  // Trajectoire physique
  // x = cx + vx*t  (vx est en px total parcourus à t=1)
  // y : parabole — monte, retombe, atterrit à cy + fallTarget
  const px = cx + vx * t;
  const initialVy = -25;       // léger saut au détachement
  const fallTarget = 140;      // atterrit ~140 px plus bas
  const py = cy + initialVy*t + (fallTarget - initialVy) * t*t;
  const angle = spinDir * t * 4*Math.PI;

  // ---------- TRAÎNÉE DE DÉBRIS / POUSSIÈRE (panache violet le long de la trajectoire)
  if(t > 0.04){
    const trailR = rng(seed+7);
    const samples = 9;
    for(let i=1;i<=samples;i++){
      const tt = Math.max(0, t - i*0.055);
      if(tt<=0) continue;
      const tpx = cx + vx*tt;
      const tpy = cy + initialVy*tt + (fallTarget - initialVy) * tt*tt;
      const ageK = i/samples;            // 0 = juste derrière, 1 = ancien
      const a = (1 - ageK) * Math.min(1, t*3) * 1.0;

      // poussière violette diffuse — taille croissante avec l'âge (panache)
      ctx.save();
      ctx.globalAlpha = a*0.7;
      const puffR = 11 + ageK*22;
      const g = ctx.createRadialGradient(tpx, tpy, 0, tpx, tpy, puffR);
      g.addColorStop(0, 'rgba(160,60,200,0.85)');
      g.addColorStop(0.45, 'rgba(90,15,135,0.45)');
      g.addColorStop(1, 'rgba(30,5,55,0)');
      ctx.fillStyle = g;
      ctx.fillRect(tpx-puffR, tpy-puffR, puffR*2, puffR*2);
      ctx.restore();

      // masse sombre lumpy seulement sur les premiers samples (proche du chunk)
      if(ageK < 0.45){
        ctx.save();
        ctx.globalAlpha = a*0.55;
        ctx.fillStyle = '#160820';
        const lobes = 2;
        for(let j=0;j<lobes;j++){
          const ang = trailR()*Math.PI*2;
          const d = puffR*0.2*trailR();
          const lr = puffR*(0.22 + trailR()*0.14);
          ctx.beginPath();
          ctx.arc(tpx+Math.cos(ang)*d, tpy+Math.sin(ang)*d, lr, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
      }

      // micro-débris + sparks
      ctx.save();
      ctx.globalAlpha = a;
      const k = 3 + (trailR()*3|0);
      for(let j=0;j<k;j++){
        const ang = trailR()*Math.PI*2;
        const d = trailR()*puffR*0.9;
        const sx = tpx + Math.cos(ang)*d;
        const sy = tpy + Math.sin(ang)*d;
        const sz = 1.2 + trailR()*2.2;
        ctx.fillStyle = (j%4===0) ? '#ff3d8a' : (j%4===1 ? '#ffffff' : '#0a0410');
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- AURA VIOLETTE autour du chunk en vol
  if(t < 0.95){
    ctx.save();
    const auraR = Math.max(W,H)*1.05;
    // pic d'intensité au début (chunk vient juste d'être éjecté), décroît ensuite
    const auraA = 0.85 * (1 - t*0.6);
    ctx.globalAlpha = Math.max(0, auraA);
    const ag = ctx.createRadialGradient(px, py, 0, px, py, auraR);
    ag.addColorStop(0, 'rgba(160,60,200,0.85)');
    ag.addColorStop(0.45, 'rgba(90,15,135,0.45)');
    ag.addColorStop(1, 'rgba(30,5,55,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(px-auraR, py-auraR, auraR*2, auraR*2);
    ctx.restore();
  }

  // ---------- LE CHUNK (translate + rotate)
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

  drawChunkBody(ctx, W, H, kind, seed);

  ctx.restore();

  // ---------- IMPACT AU SOL (t > 0.85): mini explosion poussière violette
  if(t > 0.85){
    const it = (t - 0.85) / 0.15;   // 0..1
    drawGroundImpact(ctx, px, py + H*0.5, it, seed);
  }

  // ---------- SPARKS d'IMPACT INCIPIENT (t entre 0.65 et 0.85): quelques étincelles avant le sol
  if(t > 0.65 && t < 0.92){
    const it = (t - 0.65) / 0.27;
    ctx.save();
    ctx.globalAlpha = 1 - Math.abs(it-0.5)*1.5;
    const sR = rng(seed+33);
    for(let i=0;i<8;i++){
      const ang = -Math.PI/2 + (sR()-0.5)*Math.PI*0.9;
      const len = 8 + sR()*22;
      const sx = px + Math.cos(ang)*len;
      const sy = py + H*0.4 + Math.sin(ang)*len;
      ctx.fillStyle = i%2===0 ? '#ffffff' : '#ff3d8a';
      ctx.beginPath();
      ctx.arc(sx, sy, 1+sR()*1.6, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ----- corps du chunk : briques cartoon, traits noirs épais -----
function drawChunkBody(ctx, W, H, kind, seed){
  const r = rng(seed+101);
  const hw = W/2, hh = H/2;

  // Silhouette du chunk (path brisé : un rectangle aux bords cassés)
  // Construit un polygone avec arêtes "cassées" pour signaler une fracture
  const pts = [];
  // top edge (cassée)
  const topPts = 4;
  for(let i=0;i<=topPts;i++){
    const x = -hw + (W*i/topPts);
    const y = -hh + (r()-0.5)*H*0.18;
    pts.push([x,y]);
  }
  // right edge
  const rPts = 3;
  for(let i=1;i<=rPts;i++){
    const y = -hh + (H*i/rPts);
    const x = hw + (r()-0.5)*W*0.10;
    pts.push([x,y]);
  }
  // bottom edge (plus régulière — base)
  const botPts = 3;
  for(let i=1;i<=botPts;i++){
    const x = hw - (W*i/botPts);
    const y = hh + (r()-0.5)*H*0.06;
    pts.push([x,y]);
  }
  // left edge (cassée)
  const lPts = 3;
  for(let i=1;i<lPts;i++){
    const y = hh - (H*i/lPts);
    const x = -hw + (r()-0.5)*W*0.18;
    pts.push([x,y]);
  }

  // ombre portée (offset, sombre violet)
  ctx.save();
  ctx.translate(3,4);
  ctx.fillStyle = 'rgba(10,4,16,0.45)';
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // pierre claire (couleur de base #cfcfcf)
  ctx.fillStyle = '#cfcfcf';
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fill();

  // (optionnel) bande de "base brique" si chunk de type 'wall' avec base — sinon pierre seule
  // On l'inclut sur ~22% du chunk pour évoquer la base brun.
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
  ctx.clip();
  const hasBase = (kind==='wall');
  if(hasBase){
    ctx.fillStyle = '#8b6f4d';
    ctx.fillRect(-hw-2, hh - H*0.22, W+4, H*0.30);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw-2, hh - H*0.22);
    ctx.lineTo( hw+2, hh - H*0.22);
    ctx.stroke();
  }

  // motifs briques pierre claire (zone haute)
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#1a1a1a';
  const brickH = H*0.20;
  const brickW = W*0.36;
  const stoneBottom = hasBase ? (hh - H*0.22) : hh;
  for(let row=0; row<4; row++){
    const y = -hh + brickH*(row+0.5);
    if(y + brickH/2 > stoneBottom) break;
    const offset = row%2===0 ? 0 : brickW/2;
    for(let col=-2; col<=2; col++){
      const x = col*brickW + offset - brickW/2;
      ctx.strokeRect(x, y - brickH/2, brickW*0.92, brickH*0.88);
    }
  }
  // 1 rangée briques base marron (si présent)
  if(hasBase){
    for(let col=-2; col<=2; col++){
      const x = col*brickW*0.75 - brickW*0.35;
      ctx.strokeRect(x, hh - H*0.18, brickW*0.7, H*0.14);
    }
  }
  ctx.restore();

  // toit noir pointu (si kind === 'roof') — triangle dépassant en haut
  if(kind==='roof'){
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-hw*0.85, -hh + 2);
    ctx.lineTo(0, -hh - H*0.55);
    ctx.lineTo( hw*0.85, -hh + 2);
    ctx.closePath();
    ctx.fill();
    // contour
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // CONTOUR PRINCIPAL épais noir (signature comic)
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
  ctx.stroke();

  // arêtes de fracture: éclats magenta + spikes blancs dépassant des bords cassés
  ctx.save();
  // spikes blancs nets (énergie qui s'échappe de la fracture — top edge cassé)
  ctx.fillStyle = '#ffffff';
  for(let i=0;i<topPts;i++){
    const [x,y] = pts[i];
    if(r() < 0.55){
      const len = 6 + r()*10;
      const w = 1.6;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(-Math.PI/2 + (r()-0.5)*0.6);
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.lineTo(w, -len*0.6); ctx.lineTo(0, -len); ctx.lineTo(-w, -len*0.6); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // dagger magenta plus longs sur quelques bords cassés
  ctx.fillStyle = '#ff3d8a';
  for(let i=0;i<3;i++){
    const idx = (r()*topPts)|0;
    const [x,y] = pts[idx];
    const len = 8 + r()*8;
    const w = 2;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(-Math.PI/2 + (r()-0.5)*0.9);
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(w, -len*0.6); ctx.lineTo(0, -len); ctx.lineTo(-w, -len*0.6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // points magenta sur les arêtes
  ctx.fillStyle = '#ff3d8a';
  for(let i=0;i<4;i++){
    const idx = (r()*pts.length)|0;
    const [x,y] = pts[idx];
    const sz = 1.8 + r()*2;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ----- mini explosion poussière à l'impact -----
function drawGroundImpact(ctx, gx, gy, it, seed){
  const r = rng(seed+999);
  const grow = 1 - Math.pow(1-it, 2);
  const R = 26 + 32*grow;
  const fade = 1 - it*0.7;

  // halo violet
  ctx.save();
  ctx.globalAlpha = 0.85*fade;
  const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, R*1.4);
  halo.addColorStop(0, 'rgba(140,50,180,0.9)');
  halo.addColorStop(0.5, 'rgba(90,15,135,0.45)');
  halo.addColorStop(1, 'rgba(30,5,55,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(gx-R*1.5, gy-R*1.5, R*3, R*3);
  ctx.restore();

  // masse sombre lumpy (demi-cercle, écrasée au sol)
  ctx.save();
  ctx.globalAlpha = 0.95*fade;
  ctx.fillStyle = '#160820';
  ctx.beginPath();
  ctx.ellipse(gx, gy, R*0.85, R*0.45, 0, 0, Math.PI*2);
  ctx.fill();
  // lobes
  for(let i=0;i<6;i++){
    const a = -Math.PI + (i/5)*Math.PI;  // demi-cercle au-dessus du sol
    const d = R*(0.5 + r()*0.3);
    const lr = R*(0.25 + r()*0.18);
    ctx.beginPath();
    ctx.arc(gx + Math.cos(a)*d, gy + Math.sin(a)*d*0.55, lr, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // spikes blancs courts (rays)
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#ffffff';
  for(let i=0;i<7;i++){
    const a = -Math.PI + (i/6)*Math.PI + (r()-0.5)*0.2;
    const len = R*(0.9 + r()*0.5);
    const w = R*0.06;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0,-w); ctx.lineTo(len,0); ctx.lineTo(0,w); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // débris/sparks
  ctx.save();
  ctx.globalAlpha = fade;
  for(let i=0;i<10;i++){
    const a = -Math.PI + r()*Math.PI;
    const d = R*(0.7 + r()*0.7);
    const x = gx + Math.cos(a)*d;
    const y = gy + Math.sin(a)*d*0.5;
    ctx.fillStyle = i%3===0 ? '#ff3d8a' : (i%3===1 ? '#ffffff' : '#0a0410');
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + r()*1.8, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ---- Render lifecycle 5 frames ----
// Pour les vignettes : on positionne (cx,cy) en haut à gauche pour que le chunk
// reste visible pendant qu'il chute à droite.
  window.drawChunk = typeof drawChunk !== 'undefined' ? drawChunk : window.drawChunk;
})();

// ============== fx-projectile ==============
(function(){
'use strict';

// ============================================================
// FX PROJECTILE — drawProjectile(ctx, sx, sy, tx, ty, t, seed, kind)
// kind ∈ 'rocket' | 'bomb' | 'laser'
// t ∈ [0,1], lifetime ~700-1000ms
// Trajectoire : parabole gravitée pour rocket/bomb, droite pour laser
// ============================================================

function rng(seed){let s=seed||1;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

// Position le long de la trajectoire à instant tt, avec sa tangente
function trajectory(sx, sy, tx, ty, tt, kind){
  if(kind==='laser'){
    return {
      x: sx + (tx-sx)*tt,
      y: sy + (ty-sy)*tt,
      ang: Math.atan2(ty-sy, tx-sx)
    };
  }
  // arc parabolique : x linéaire, y = lerp + dip vers le haut
  const x = sx + (tx-sx)*tt;
  const lin = sy + (ty-sy)*tt;
  const dist = Math.hypot(tx-sx, ty-sy);
  const arc = dist*0.35; // hauteur de la cloche (px au-dessus de la corde)
  const dip = -4*arc*tt*(1-tt); // négatif = vers le haut (canvas y-down)
  const y = lin + dip;
  // tangente : dérivée (dx/dt, dy/dt)
  const dx = (tx-sx);
  const dy = (ty-sy) + (-4*arc)*(1-2*tt);
  return { x, y, ang: Math.atan2(dy, dx) };
}

function drawProjectile(ctx, sx, sy, tx, ty, t, seed, kind){
  if(t<0||t>1) return;
  kind = kind || 'rocket';
  const r = rng(seed);
  const pos = trajectory(sx, sy, tx, ty, t, kind);

  // ---- Smoke trail : 12 puffs denses en arrière dans le temps
  // Trail densité haute → nappe continue (chaque puff overlap son voisin)
  if(kind!=='laser'){
    const PUFFS = 14;
    const STEP = 0.022;
    ctx.save();
    for(let i=PUFFS; i>=1; i--){
      const dt = i*STEP;
      const tt = t - dt;
      if(tt < 0) continue;
      const pp = trajectory(sx, sy, tx, ty, tt, kind);
      const ageFrac = i/PUFFS;
      // alpha forte près du projectile, fade lent (cf. ref 07s : nappe continue)
      const baseA = Math.pow(1 - ageFrac, 0.9) * 0.85 + 0.1;
      // size grandit avec l'âge ; assez gros pour overlap fort = nappe continue
      const sz = 7 + ageFrac*13;
      // jitter perpendiculaire à la tangente, contenu (max 35% de sz)
      const perp = pp.ang + Math.PI/2;
      const off = (r()-0.5)*sz*0.35;
      const jx = Math.cos(perp)*off;
      const jy = Math.sin(perp)*off;
      if(kind==='rocket'){
        // ROCKET trail = nappe chaude (rouge/orange) qui fade en gris
        // proche : rouge-orange dense ; loin : gris-rosé pâle
        let r1, g1, b1;
        if(ageFrac < 0.3){
          // chaud : orange vif
          r1=255; g1=120; b1=50;
        } else if(ageFrac < 0.6){
          // rouge sombre
          r1=170; g1=60; b1=55;
        } else {
          // gris foncé saturé (pas blanc)
          r1=85; g1=80; b1=90;
        }
        ctx.fillStyle = `rgba(${r1},${g1},${b1},${baseA})`;
        ctx.beginPath();
        ctx.arc(pp.x+jx, pp.y+jy, sz, 0, Math.PI*2);
        ctx.fill();
        // highlight intérieur jaune pour les puffs proches
        if(ageFrac < 0.4){
          ctx.fillStyle = `rgba(255,220,120,${baseA*0.7})`;
          ctx.beginPath();
          ctx.arc(pp.x+jx*0.4, pp.y+jy*0.4, sz*0.45, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        // BOMB trail = fumée grise classique
        ctx.fillStyle = `rgba(110,108,115,${baseA*0.85})`;
        ctx.beginPath();
        ctx.arc(pp.x+jx, pp.y+jy, sz, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = `rgba(185,182,190,${baseA*0.55})`;
        ctx.beginPath();
        ctx.arc(pp.x+jx*0.5 - 2, pp.y+jy*0.5 - 2, sz*0.6, 0, Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---- Body
  if(kind==='rocket'){
    drawRocket(ctx, pos.x, pos.y, pos.ang, t, r);
  } else if(kind==='bomb'){
    drawBomb(ctx, pos.x, pos.y, t, r, seed);
  } else if(kind==='laser'){
    drawLaser(ctx, sx, sy, tx, ty, pos.x, pos.y, pos.ang, t);
  }

  // ---- Muzzle flash (rocket/bomb only, t<0.1)
  if(t<0.12 && kind!=='laser'){
    const fa = 1 - t/0.12;
    ctx.save();
    ctx.globalAlpha = fa;
    // halo violet
    const ang0 = Math.atan2(ty-sy, tx-sx);
    const fx = sx + Math.cos(ang0)*8;
    const fy = sy + Math.sin(ang0)*8;
    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 26);
    halo.addColorStop(0, 'rgba(255,255,255,1)');
    halo.addColorStop(0.3, 'rgba(255,200,100,0.85)');
    halo.addColorStop(0.7, 'rgba(140,50,180,0.4)');
    halo.addColorStop(1, 'rgba(90,15,135,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(fx-26, fy-26, 52, 52);
    // 4 petites pointes blanches
    ctx.fillStyle = '#fff';
    ctx.translate(fx, fy);
    ctx.rotate(ang0);
    for(let i=0;i<4;i++){
      ctx.save();
      ctx.rotate(i*Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0,-2); ctx.lineTo(14,0); ctx.lineTo(0,2); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

function drawRocket(ctx, x, y, ang, t, r){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // proportion roquette : longue, pointue. Plus grande pour lisibilité comic
  const L = 30, W = 11;
  // ailerons noirs arrière
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(-L*0.5, -W*0.6);
  ctx.lineTo(-L*0.3, -W*0.5);
  ctx.lineTo(-L*0.3,  W*0.5);
  ctx.lineTo(-L*0.5,  W*0.6);
  ctx.closePath();
  ctx.fill();
  // ailerons sup/inf
  ctx.beginPath();
  ctx.moveTo(-L*0.45, -W*0.5);
  ctx.lineTo(-L*0.25, -W*1.1);
  ctx.lineTo(-L*0.15, -W*0.5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-L*0.45,  W*0.5);
  ctx.lineTo(-L*0.25,  W*1.1);
  ctx.lineTo(-L*0.15,  W*0.5);
  ctx.closePath();
  ctx.fill();
  // corps principal rouge — ogive
  ctx.fillStyle = '#c73838';
  ctx.beginPath();
  ctx.moveTo(-L*0.35, -W*0.5);
  ctx.lineTo( L*0.35, -W*0.5);
  ctx.lineTo( L*0.5,  0);
  ctx.lineTo( L*0.35,  W*0.5);
  ctx.lineTo(-L*0.35,  W*0.5);
  ctx.closePath();
  ctx.fill();
  // bande rouge clair dessus
  ctx.fillStyle = '#d83232';
  ctx.fillRect(-L*0.35, -W*0.5, L*0.7, W*0.3);
  // pointe blanche (highlight)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(L*0.32, -W*0.35);
  ctx.lineTo(L*0.5, 0);
  ctx.lineTo(L*0.32, -W*0.05);
  ctx.closePath();
  ctx.fill();
  // outline noir net (comic)
  ctx.strokeStyle = '#0a0410';
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-L*0.5, -W*0.6);
  ctx.lineTo(-L*0.3, -W*0.5);
  ctx.lineTo(-L*0.3, -W*0.5);
  ctx.lineTo(L*0.35, -W*0.5);
  ctx.lineTo(L*0.5, 0);
  ctx.lineTo(L*0.35, W*0.5);
  ctx.lineTo(-L*0.3, W*0.5);
  ctx.lineTo(-L*0.5, W*0.6);
  ctx.closePath();
  ctx.stroke();
  // flamme arrière (jet)
  ctx.fillStyle = '#ff7733';
  ctx.beginPath();
  ctx.moveTo(-L*0.5, -W*0.4);
  ctx.lineTo(-L*0.85 - r()*4, 0);
  ctx.lineTo(-L*0.5,  W*0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.moveTo(-L*0.5, -W*0.22);
  ctx.lineTo(-L*0.7 - r()*2, 0);
  ctx.lineTo(-L*0.5,  W*0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBomb(ctx, x, y, t, r, seed){
  ctx.save();
  ctx.translate(x, y);
  const R = 11;
  // sphère + highlight tournent ; mèche reste vers le haut (gravité visuelle)
  ctx.save();
  ctx.rotate(t * 6 * Math.PI);
  // sphère noire
  ctx.fillStyle = '#0a0410';
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fill();
  // gradient interne
  const g = ctx.createRadialGradient(-R*0.3, -R*0.3, 0, 0, 0, R);
  g.addColorStop(0, '#160820');
  g.addColorStop(1, '#0a0410');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI*2);
  ctx.fill();
  // outline
  ctx.strokeStyle = '#5a0e6e';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // highlight blanc
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(-R*0.4, -R*0.45, R*0.25, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore(); // fin rotation sphère
  // mèche fixe vers le haut (orientée monde)
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(R*0.4, -R*0.7);
  ctx.lineTo(R*0.8, -R*1.4);
  ctx.stroke();
  // étincelle
  const sp = 1 + r()*1.5;
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(R*0.8, -R*1.4, 2.8+sp, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#ff7733';
  ctx.beginPath();
  ctx.arc(R*0.8, -R*1.4, 1.8, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawLaser(ctx, sx, sy, tx, ty, hx, hy, ang, t){
  // Trait du canon vers la position courante (head). Halo violet + cœur blanc.
  ctx.save();
  // halo violet large
  ctx.strokeStyle = 'rgba(140,50,180,0.55)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // halo violet vif
  ctx.strokeStyle = 'rgba(255,61,138,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // cœur blanc
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // tête : disque blanc + halo
  const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.4, 'rgba(255,61,138,0.7)');
  halo.addColorStop(1, 'rgba(140,50,180,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(hx-14, hy-14, 28, 28);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, hy, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// ---- 5 lifecycle frames (rocket par défaut)
  window.drawProjectile = typeof drawProjectile !== 'undefined' ? drawProjectile : window.drawProjectile;
})();

// ============== fx-damage ==============
(function(){
'use strict';

// ============================================================
// FX DAMAGE TEXT — itérer ici. API drawDamage(ctx,cx,cy,t,value,opts)
// (cx,cy) = point d'impact (spawn). t∈[0,1], lifetime ~700ms.
// opts: { color: 'white'|'red'|'yellow', critical: bool }
// Comic-book look : outline noir-violet épais, italic bold, overshoot+rise+fade.
// ============================================================

function drawDamage(ctx, cx, cy, t, value, opts){
  if(t<0 || t>1) return;
  opts = opts || {};
  const critical = !!opts.critical || value >= 100;
  // ----- couleur: white par défaut, red si critical/≥100, yellow si opts.color
  let fill = '#ffffff';
  if(opts.color === 'red' || critical) fill = '#ff2d6f';
  else if(opts.color === 'yellow') fill = '#ffeb3b';
  else if(opts.color === 'white') fill = '#ffffff';

  // ----- size by tier
  let size = 32;
  if(critical) size = 42;
  else if(value < 20) size = 28;

  // ----- easing
  // overshoot: 0.75 → 1.30 (at t≈0.08) → 1.0 (at t≈0.20) → 1.0
  // (start visible immediately, snappy punch-in)
  let scale;
  if(t < 0.08){
    scale = 0.75 + (1.30 - 0.75) * (t/0.08);
  } else if(t < 0.20){
    scale = 1.30 - (1.30 - 1.0) * ((t-0.08)/0.12);
  } else {
    scale = 1.0;
  }
  // rise (ease-out)
  const yOffset = -t * 45;
  // alpha: full until 0.6, then linear fade
  const alpha = t < 0.6 ? 1 : Math.max(0, 1 - (t-0.6)/0.4);
  // jiggle horizontal (premiers 30%)
  const jiggle = t < 0.3 ? Math.sin(t*40) * 1.5 * (1 - t/0.3) : 0;

  const text = '-' + value + (critical ? '!' : '');

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx + jiggle, cy + yOffset);
  ctx.scale(scale, scale);
  ctx.font = `900 italic ${size}px "Arial Black", "Impact", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // ----- halo magenta derrière les criticals (compact, contrasté)
  if(critical){
    const haloR = size * 0.85;
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
    halo.addColorStop(0, 'rgba(255,80,150,0.95)');
    halo.addColorStop(0.55, 'rgba(255,45,111,0.4)');
    halo.addColorStop(1, 'rgba(255,45,111,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-haloR, -haloR, haloR*2, haloR*2);
  }

  // ----- shadow drop subtile
  ctx.save();
  ctx.translate(2, 2);
  ctx.fillStyle = 'rgba(22,8,32,0.5)';
  ctx.fillText(text, 0, 0);
  ctx.restore();

  // ----- crit : pré-stroke blanc + stroke noir-violet (effet double-outline comic)
  if(critical){
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, 0, 0);
  }
  // ----- stroke principal épais
  ctx.lineWidth = critical ? 7 : 7;
  ctx.strokeStyle = '#160820';
  ctx.strokeText(text, 0, 0);
  // ----- fill
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

// ---- helper: paint green bg
function bg(c){
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9CC98B';
  ctx.fillRect(0,0,c.width,c.height);
  return ctx;
}

// ---- lifecycle (un -140 rouge POW)
  window.drawDamage = typeof drawDamage !== 'undefined' ? drawDamage : window.drawDamage;
})();

// ============== castle-damaged ==============
(function(){
'use strict';

// ============================================================
// CASTLE DAMAGED — drawCastle(ctx, cx, cy, w, h, hpFrac, opts)
//   (cx,cy) = pivot point au sol (centre bas du château)
//   (w,h)   = taille rendue
//   hpFrac ∈ [0,1] (1 intact, 0 ruine)
//   opts: { side:'blue'|'red', t?: ms, seed?: number }
// ============================================================

const CASTLE_PATHS = {
  blue: 'blue-castle.png',
  red:  'red-castle.png',
};
const CASTLE_IMG = { blue:null, red:null };

function loadCastles(){
  return Promise.all(Object.entries(CASTLE_PATHS).map(([k,p])=>new Promise(res=>{
    const img = new Image();
    img.onload  = ()=>{ CASTLE_IMG[k]=img; res(); };
    img.onerror = ()=>{ CASTLE_IMG[k]=null; res(); };
    img.src = p;
  })));
}

// Deterministic PRNG
function rng(seed){let s=seed|0||1;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

// Pre-baked damage patterns per seed (so the same château at the same hp shows same cracks)
function bakeDamage(seed, w, h){
  const r = rng(seed);
  // crack polylines
  const cracks = [];
  for(let i=0;i<18;i++){
    const startX = 0.18 + r()*0.64;
    const startY = 0.22 + r()*0.55;
    const segs = 2 + (r()*4|0);
    let x = startX, y = startY;
    let ang = (r()-0.5)*Math.PI;
    const pts = [[x,y]];
    for(let s=0;s<segs;s++){
      ang += (r()-0.5)*1.3;
      const len = 0.03 + r()*0.07;
      x += Math.cos(ang)*len;
      y += Math.sin(ang)*len*0.8 + 0.012;
      pts.push([x,y]);
    }
    cracks.push({
      pts,
      depth: r(),
      thick: 0.5 + r()*1.4,
    });
  }
  // holes — small irregular patches (much smaller than before)
  const holes = [];
  for(let i=0;i<14;i++){
    holes.push({
      x: 0.20 + r()*0.60,
      y: 0.30 + r()*0.50,
      r: 0.018 + r()*0.030,        // 3.2 → 8.6 px sur 180 → bien plus discret
      depth: r(),
      lobes: 2 + (r()*3|0),
      seed: r()*1000,
    });
  }
  // missing chunks (silhouette amputée) — bord uniquement, francs.
  // Forcer au moins 1 chunk de chaque côté pour avoir un château reconnaissable mais clairement amputé.
  const chunks = [
    { side:'L', y: 0.30 + r()*0.10, r: 0.07 + r()*0.03, depth: 0.55 + r()*0.10 },
    { side:'R', y: 0.40 + r()*0.10, r: 0.08 + r()*0.04, depth: 0.55 + r()*0.10 },
    { side:'T', y: 0.30 + r()*0.30, r: 0.06 + r()*0.04, depth: 0.65 + r()*0.10 },
    { side:'L', y: 0.55 + r()*0.15, r: 0.05 + r()*0.05, depth: 0.78 + r()*0.10 },
    { side:'R', y: 0.20 + r()*0.10, r: 0.05 + r()*0.04, depth: 0.78 + r()*0.10 },
  ];
  return { cracks, holes, chunks };
}
const DAMAGE_CACHE = new Map();
function getDamage(seed, w, h){
  const key = seed + '|' + w + '|' + h;
  let d = DAMAGE_CACHE.get(key);
  if(!d){ d = bakeDamage(seed, w, h); DAMAGE_CACHE.set(key, d); }
  return d;
}

function drawCastle(ctx, cx, cy, w, h, hpFrac, opts){
  opts = opts || {};
  const side = opts.side || 'blue';
  const t = opts.t || 0;
  const seed = opts.seed || 7;
  const img = CASTLE_IMG[side];
  hpFrac = Math.max(0, Math.min(1, hpFrac));
  const dmg = 1 - hpFrac; // 0 intact → 1 ruine

  // Damage thresholds
  const showCrackThin    = dmg > 0.10;             // 75%+
  const showCrackHeavy   = dmg > 0.30;             // 50%+
  const showHoles        = dmg > 0.30;             // 50%+
  const showSoot         = dmg > 0.20;             // 75%+ légèrement
  const showChunks       = dmg > 0.55;             // 25%+
  const showDust         = dmg > 0.45;             // 25%+
  const showRubble       = dmg > 0.85;             // 0%

  // tilt angle: 0%→0, 25%→7, 50%→3, 75%→1, 100%→18
  // ramp: small wobble between 50→25, then strong at 0
  // 0%→0  25%→0.6  50%→2  75%→7  100%→18
  let tiltDeg;
  if(dmg < 0.25)      tiltDeg = dmg*2.4;             // 0..0.6
  else if(dmg < 0.50) tiltDeg = 0.6 + (dmg-0.25)*5.6;// 0.6..2
  else if(dmg < 0.75) tiltDeg = 2 + (dmg-0.50)*20;   // 2..7
  else                tiltDeg = 7 + (dmg-0.75)*44;   // 7..18
  const tilt = tiltDeg * Math.PI/180;
  // sway léger lié à t (petite oscillation perma)
  const sway = (showDust ? Math.sin(t*0.003)*0.012*dmg : 0);

  // château top-left dans le repère "tilt" autour du pivot bas
  const x0 = cx - w/2;
  const y0 = cy - h;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt + sway);
  // Slight vertical squish at very low HP — effondrement
  if(dmg > 0.85){
    const sq = 1 - (dmg-0.85) * 0.55;  // up to 8% compression at 0%
    ctx.scale(1.04, sq);
  }
  ctx.translate(-cx, -cy);

  // ---- Persistent dust halo behind château (low HP only) ----
  if(showDust){
    const dustA = Math.min(1, (dmg-0.45)/0.55) * 0.95;
    // halo low + wide (au pied du château)
    const hx = cx, hy = cy - h*0.30;
    const drx = w * (1.05 + dmg*0.35);
    const dry = h * (0.55 + dmg*0.20);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(drx/dry, 1);
    const grd = ctx.createRadialGradient(0, 0, dry*0.10, 0, 0, dry);
    grd.addColorStop(0,    `rgba(140, 50, 180, ${0.55*dustA})`);
    grd.addColorStop(0.40, `rgba(90, 25, 135, ${0.40*dustA})`);
    grd.addColorStop(0.75, `rgba(60, 15, 95, ${0.18*dustA})`);
    grd.addColorStop(1,    'rgba(30,5,55,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(-dry, -dry, dry*2, dry*2);
    ctx.restore();
  }

  // ---- Castle base PNG ----
  if(img){
    // we draw the image, then overlay damage, clipping to the image alpha
    // strategy: draw image, then draw damage with composite source-atop so
    // overlays only land on opaque pixels (the silhouette).
    ctx.drawImage(img, x0, y0, w, h);

    // Damage overlay clipped to silhouette via source-atop
    if(showCrackThin || showHoles || showSoot){
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const dmgInfo = getDamage(seed, w, h);

      // 1) soot smears (purple-ink) — broad localized darkening
      if(showSoot){
        const sootA = Math.min(1, (dmg-0.30)/0.5);
        ctx.fillStyle = `rgba(50,15,80, ${0.40*sootA})`;
        const r = rng(seed*3+1);
        const nSoot = 3 + Math.round(dmg*4);
        for(let i=0;i<nSoot;i++){
          const sx = x0 + (0.15 + r()*0.7)*w;
          const sy = y0 + (0.20 + r()*0.55)*h;
          const sr = w*(0.10 + r()*0.10);
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
          grd.addColorStop(0, `rgba(50,15,80, ${0.55*sootA})`);
          grd.addColorStop(1, 'rgba(50,15,80, 0)');
          ctx.fillStyle = grd;
          ctx.fillRect(sx-sr, sy-sr, sr*2, sr*2);
        }
      }

      // 2) holes — dark organic patches in the masonry
      if(showHoles){
        const holeA = Math.min(1, (dmg-0.30)/0.4);
        ctx.fillStyle = '#0a0410';
        const visible = dmgInfo.holes.filter(h0 => h0.depth < holeA);
        for(const h0 of visible){
          const hx = x0 + h0.x*w, hy = y0 + h0.y*h;
          const baseR = h0.r * w;
          // central blob
          ctx.beginPath();
          ctx.arc(hx, hy, baseR, 0, Math.PI*2);
          ctx.fill();
          // organic lobes
          const r2 = rng(h0.seed|0);
          for(let l=0;l<h0.lobes;l++){
            const a = l/h0.lobes*Math.PI*2 + r2()*0.6;
            const d = baseR*0.6;
            const lr = baseR*(0.45 + r2()*0.35);
            ctx.beginPath();
            ctx.arc(hx+Math.cos(a)*d, hy+Math.sin(a)*d, lr, 0, Math.PI*2);
            ctx.fill();
          }
          // tiny magenta ember at hole edge for drama
          if(h0.depth < 0.3 && dmg > 0.5){
            ctx.fillStyle = 'rgba(255,45,111,0.55)';
            ctx.beginPath();
            ctx.arc(hx + baseR*0.4, hy - baseR*0.2, baseR*0.18, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#0a0410';
          }
        }
      }

      // 3) cracks — black thin polylines
      if(showCrackThin){
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const crackA = Math.min(1, dmg/0.7);
        for(const c of dmgInfo.cracks){
          if(c.depth > crackA) continue;
          // thicker if heavy crack threshold passed AND crack is "deep"
          const heavy = showCrackHeavy && c.depth < 0.55;
          ctx.lineWidth = (heavy ? 2.2 : 1.0) * c.thick;
          ctx.beginPath();
          for(let i=0;i<c.pts.length;i++){
            const px = x0 + c.pts[i][0]*w;
            const py = y0 + c.pts[i][1]*h;
            if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.stroke();
          // accent on heavy: thin white highlight along one side for chip
          if(heavy){
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.strokeStyle = '#1a1a1a';
          }
        }
      }

      ctx.restore();
    }

    // 4) chunks missing (carve away silhouette) — destination-out
    if(showChunks){
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const dmgInfo = getDamage(seed, w, h);
      const chunkA = Math.min(1, (dmg-0.55)/0.35);
      for(const ch of dmgInfo.chunks){
        if(ch.depth - 0.5 > chunkA) continue; // gradual reveal
        let cxC, cyC;
        if(ch.side==='L'){ cxC = x0 + 0.05*w; cyC = y0 + ch.y*h; }
        else if(ch.side==='R'){ cxC = x0 + 0.95*w; cyC = y0 + ch.y*h; }
        else { cxC = x0 + ch.y*w; cyC = y0 + 0.10*h; }
        const cr = ch.r * w * (0.8 + chunkA*0.6);
        ctx.beginPath();
        ctx.arc(cxC, cyC, cr, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // Re-stroke the carved edges with a dark inner border so chunks read
      // as torn/burnt rather than transparent. We do this by re-drawing
      // small dark arcs just inside each chunk edge using source-atop.
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(10,5,20,0.55)';
      const dmgInfo2 = getDamage(seed, w, h);
      const chunkA2 = Math.min(1, (dmg-0.55)/0.35);
      for(const ch of dmgInfo2.chunks){
        if(ch.depth - 0.5 > chunkA2) continue;
        let cxC, cyC;
        if(ch.side==='L'){ cxC = x0 + 0.05*w; cyC = y0 + ch.y*h; }
        else { cxC = x0 + 0.95*w; cyC = y0 + ch.y*h; }
        const cr = ch.r * w * (0.8 + chunkA2*0.6);
        ctx.beginPath();
        ctx.arc(cxC, cyC, cr*1.05, 0, Math.PI*2);
        ctx.arc(cxC, cyC, cr*0.85, 0, Math.PI*2, true);
        ctx.fill();
      }
      ctx.restore();
    }
  } else {
    // Fallback rectangle if image missing
    ctx.fillStyle = '#cfcfcf';
    ctx.fillRect(x0+w*0.15, y0+h*0.20, w*0.70, h*0.78);
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4;
    ctx.strokeRect(x0+w*0.15, y0+h*0.20, w*0.70, h*0.78);
  }

  // ---- Rubble pile at base (0% only) ----
  if(showRubble){
    const a = Math.min(1, (dmg-0.85)/0.15);
    ctx.save();
    ctx.fillStyle = `rgba(20,8,32, ${0.85*a})`;
    const rb = rng(seed*7+5);
    for(let i=0;i<8;i++){
      const rx = cx + (rb()-0.5)*w*0.95;
      const ry = cy - rb()*8;
      const rw = w*(0.05 + rb()*0.10);
      const rh = h*(0.015 + rb()*0.025);
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();

  // ---- Foreground sparks/embers (low HP, animate over t) ----
  if(showDust){
    const a = Math.min(1, (dmg-0.40)/0.6);
    const r = rng((seed*11 + (t*0.05|0)) | 0);
    const n = 3 + Math.round(dmg*5);
    ctx.save();
    for(let i=0;i<n;i++){
      const ang = r()*Math.PI*2;
      const dist = w*(0.30 + r()*0.30);
      const px = cx + Math.cos(ang)*dist;
      const py = cy - h*0.55 + Math.sin(ang)*dist*0.6;
      ctx.fillStyle = (i%4===0) ? 'rgba(255,45,111,0.85)' : 'rgba(255,255,255,0.7)';
      ctx.globalAlpha = a * (0.5 + r()*0.5);
      const sz = 1 + r()*1.6;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

// ============================================================
// RENDER
// ============================================================
function paintBg(c){
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9CC98B';
  ctx.fillRect(0,0,c.width,c.height);
}
  window.drawCastle = typeof drawCastle !== 'undefined' ? drawCastle : window.drawCastle;
  window.CASTLE_IMG = typeof CASTLE_IMG !== 'undefined' ? CASTLE_IMG : window.CASTLE_IMG;
})();

// ============== scene-decor ==============
(function(){
'use strict';

// ============================================================
// SCENE DECOR — APIs:
//   drawParallax(ctx, x, y, w, h, scrollX)
//     scrollX cumulatif (px). Layers : sky (0.2x), hills (0.5x), ground (1.0x).
//   drawTracks(ctx, cx, cy, w, h, phase)
//     2 roues dentées + chaîne crantée. phase ∈ [0,1] boucle.
// ============================================================

const COL = {
  ink:        '#160820',
  trackMetal: '#3a3a3a',
  trackDark:  '#1a1a1a',
  trackHi:    '#5a5a5a',
  mud:        '#8b6f4d',
  mudDark:    '#5a4530',
  green1:     '#9CC98B',
  green2:     '#7BAE74',
  green3:     '#C4DFA7',
};

const BG_PATH = '';

let BG_IMG = null;
// 3 offscreen canvases : sky strip, hills strip, ground strip
const STRIP = { sky: null, hills: null, ground: null };

function loadBg(){
  return new Promise(res=>{
    const img = new Image();
    img.onload  = ()=>{ BG_IMG = img; buildStrips(); res(); };
    img.onerror = ()=>{ BG_IMG = null; res(); };
    img.src = BG_PATH;
  });
}

// Slice the source PNG into 3 horizontal bands and cache as offscreen canvases.
// Source: 5084×1830 — bands : sky [0..600], hills [600..1300], ground [1300..1830]
function buildStrips(){
  if(!BG_IMG) return;
  const W = BG_IMG.width, H = BG_IMG.height;
  const bands = [
    { key:'sky',    y0:0,    y1:Math.round(H*0.33) },
    { key:'hills',  y0:Math.round(H*0.33), y1:Math.round(H*0.71) },
    { key:'ground', y0:Math.round(H*0.71), y1:H },
  ];
  for(const b of bands){
    const c = document.createElement('canvas');
    c.width = W; c.height = b.y1 - b.y0;
    c.getContext('2d').drawImage(BG_IMG, 0, b.y0, W, c.height, 0, 0, W, c.height);
    STRIP[b.key] = c;
  }
}

// ---- DRAW PARALLAX ----
// Tile each strip horizontally with its own scroll speed. Mod by strip.width for seamless loop.
function drawParallax(ctx, x, y, w, h, scrollX){
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  // fallback if BG missing : flat sky-green-ground
  if(!STRIP.sky){
    drawParallaxFallback(ctx, x, y, w, h, scrollX);
    ctx.restore();
    return;
  }

  // Vertical partition of viewport (matches the source image proportions roughly)
  const skyH    = Math.round(h * 0.42);
  const hillsH  = Math.round(h * 0.34);
  const groundH = h - skyH - hillsH;

  // Each layer scaled to fit its viewport-band height; horizontal scale is uniform.
  // We pick a layer width (in viewport px) such that hills feel like distant
  // and ground feels closer (slightly bigger). To keep simple we compute the
  // displayed-tile width from each strip natural ratio scaled so its height matches the band.
  const layers = [
    { strip: STRIP.sky,    speed: 0.2, dy: y,                   dh: skyH },
    { strip: STRIP.hills,  speed: 0.5, dy: y + skyH,            dh: hillsH },
    { strip: STRIP.ground, speed: 1.0, dy: y + skyH + hillsH,   dh: groundH },
  ];

  for(const L of layers){
    const ratio = L.strip.width / L.strip.height;
    const tileW = L.dh * ratio;
    const off = ((scrollX * L.speed) % tileW + tileW) % tileW;
    // start one tile to the left of the left edge so it never gaps
    let dx = x - off;
    while(dx < x + w){
      ctx.drawImage(L.strip, dx, L.dy, tileW, L.dh);
      dx += tileW;
    }
  }
  ctx.restore();
}

function drawParallaxFallback(ctx, x, y, w, h, scrollX){
  drawParallaxGreen(ctx, x, y, w, h, scrollX);
}

// Synthetic palette-matched parallax (cartoon vert pastel, brief-compliant).
// 3 layers : sky gradient + clouds 0.2x ; rolling hills 0.5x ; ground tufts 1.0x.
function drawParallaxGreen(ctx, x, y, w, h, scrollX){
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  const skyH    = Math.round(h*0.38);
  const hillsH  = Math.round(h*0.34);
  const groundY = y + skyH + hillsH;
  const groundH = h - skyH - hillsH;

  // ---- SKY (gradient + drifting clouds @ 0.2x) ----
  const sky = ctx.createLinearGradient(0, y, 0, y+skyH);
  sky.addColorStop(0, '#bfe6f5');
  sky.addColorStop(1, '#e6f5db');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, skyH);
  // clouds : 4 fluffy clusters tiled
  const cloudTile = 220;
  const offS = ((scrollX*0.2) % cloudTile + cloudTile) % cloudTile;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
  for(let i=-1; i<=w/cloudTile+1; i++){
    const cx0 = x + i*cloudTile - offS;
    drawCloud(ctx, cx0+30,  y + 24, 22);
    drawCloud(ctx, cx0+130, y + 50, 28);
  }

  // ---- DISTANT HILLS (mid layer, paler green @ 0.5x) ----
  const hillsTile = 300;
  const offH = ((scrollX*0.5) % hillsTile + hillsTile) % hillsTile;
  ctx.fillStyle = COL.green3;
  for(let i=-1; i<=w/hillsTile+1; i++){
    const bx = x + i*hillsTile - offH;
    drawHillBlob(ctx, bx,        y+skyH, hillsTile, hillsH+8, 0);
  }
  // mid-back hills
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
  for(let i=-1; i<=w/hillsTile+1; i++){
    const bx = x + i*hillsTile - offH;
    drawHillBlob(ctx, bx, y+skyH, hillsTile, hillsH+8, 1);
  }

  // ---- NEAR HILLS (darker green, slightly bigger @ 0.5x but offset) ----
  const hills2Tile = 240;
  const offH2 = ((scrollX*0.7) % hills2Tile + hills2Tile) % hills2Tile;
  ctx.fillStyle = COL.green2;
  for(let i=-1; i<=w/hills2Tile+1; i++){
    const bx = x + i*hills2Tile - offH2;
    drawHillBlob(ctx, bx, y+skyH+hillsH*0.45, hills2Tile, hillsH*0.7+10, 2);
  }

  // ---- GROUND (1.0x baseline) ----
  ctx.fillStyle = COL.green1;
  ctx.fillRect(x, groundY, w, groundH);
  // path-like darker band on top edge
  ctx.fillStyle = COL.green2;
  ctx.fillRect(x, groundY, w, 4);
  ctx.fillStyle = COL.ink;
  ctx.fillRect(x, groundY-2, w, 2);
  // tufts (grass clumps) @ 1.0x — tile 36px
  const tuftTile = 36;
  const offG = ((scrollX*1.0) % tuftTile + tuftTile) % tuftTile;
  ctx.fillStyle = COL.green2;
  for(let i=-1; i<=w/tuftTile+1; i++){
    const tx = x + i*tuftTile - offG;
    // tuft: 3 small triangles
    ctx.beginPath();
    ctx.moveTo(tx,    groundY+10);
    ctx.lineTo(tx+5,  groundY+2);
    ctx.lineTo(tx+10, groundY+10);
    ctx.fill();
  }
  // foreground darker speed lines (sells motion)
  ctx.fillStyle = 'rgba(22,8,32,0.18)';
  for(let i=-1; i<=w/tuftTile+1; i++){
    const tx = x + i*tuftTile - offG;
    ctx.fillRect(tx, groundY + groundH*0.55, 18, 3);
  }

  ctx.restore();
}

function drawCloud(ctx, cx, cy, r){
  ctx.beginPath();
  ctx.arc(cx,        cy,      r,        0, Math.PI*2);
  ctx.arc(cx + r*0.9,cy + r*0.15, r*0.85, 0, Math.PI*2);
  ctx.arc(cx - r*0.85,cy + r*0.20, r*0.75, 0, Math.PI*2);
  ctx.arc(cx + r*0.3, cy - r*0.45, r*0.65, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
}

// Hill blob, deterministic per kind so neighbors tile without seam.
function drawHillBlob(ctx, x, y, w, h, kind){
  const fill = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(x, y+h);
  if(kind===0){ // back range : 2 round bumps
    ctx.lineTo(x, y+h*0.55);
    ctx.quadraticCurveTo(x+w*0.25, y-h*0.05, x+w*0.50, y+h*0.45);
    ctx.quadraticCurveTo(x+w*0.75, y+h*0.10, x+w,      y+h*0.55);
  } else if(kind===1){ // black outline pass for kind=0 silhouette
    ctx.lineTo(x, y+h*0.55);
    ctx.quadraticCurveTo(x+w*0.25, y-h*0.05, x+w*0.50, y+h*0.45);
    ctx.quadraticCurveTo(x+w*0.75, y+h*0.10, x+w,      y+h*0.55);
    ctx.lineTo(x+w, y+h);
    ctx.stroke();
    return;
  } else { // mid range : single fat bump
    ctx.lineTo(x, y+h*0.65);
    ctx.quadraticCurveTo(x+w*0.50, y-h*0.10, x+w, y+h*0.65);
  }
  ctx.lineTo(x+w, y+h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
  ctx.stroke();
}

// ---- DRAW SINGLE LAYER (showcase only) ----
function drawSingleLayer(ctx, x, y, w, h, key, scrollX, speed){
  ctx.save();
  ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  if(!STRIP[key]){
    ctx.fillStyle = '#222'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle = '#888'; ctx.font='12px system-ui';
    ctx.fillText('(strip "'+key+'" not loaded)', x+8, y+20);
    ctx.restore(); return;
  }
  const strip = STRIP[key];
  const ratio = strip.width / strip.height;
  const tileW = h * ratio;
  const off = ((scrollX * speed) % tileW + tileW) % tileW;
  let dx = x - off;
  while(dx < x + w){
    ctx.drawImage(strip, dx, y, tileW, h);
    dx += tileW;
  }
  ctx.restore();
  // outline for clarity
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.strokeRect(x,y,w,h);
}

// ---- DRAW TRACKS ----
// Two toothed wheels + a closed loop chain wrapping them.
// (cx,cy) = center, w = full width (wheel-to-wheel + radius), h = chain height.
function drawTracks(ctx, cx, cy, w, h, phase){
  ctx.save();
  ctx.translate(cx, cy);

  const wheelR    = h * 0.45;          // ~27 if h=60
  const wheelDx   = (w - wheelR*2) / 2; // distance from center to each wheel center
  const innerY    = -h*0.30;
  const outerY    =  h*0.30;
  const teethCount = 12;
  const rotAngle   = phase * Math.PI*2;

  // ----- mud splatter under tracks -----
  ctx.save();
  ctx.fillStyle = COL.mud;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, h*0.42, w*0.55, h*0.15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = COL.mudDark;
  for(let i=0;i<5;i++){
    const a = i*1.7 + phase*0.5;
    const px = (i-2)*w*0.18 + Math.cos(a)*4;
    const py = h*0.42 + Math.sin(a)*2;
    ctx.beginPath(); ctx.arc(px, py, 2 + (i%2)*1.5, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ----- chain body (rounded rect "stadium" shape around wheels) -----
  // outline ink
  ctx.fillStyle = COL.ink;
  roundedStadium(ctx, -w/2, -h/2, w, h, h/2);
  ctx.fill();

  // metal fill (slightly inset)
  const inset = 4;
  ctx.fillStyle = COL.trackMetal;
  roundedStadium(ctx, -w/2+inset, -h/2+inset, w-inset*2, h-inset*2, (h-inset*2)/2);
  ctx.fill();

  // ----- chain teeth (cleats) — animated by phase, looped around perimeter -----
  // We approximate the perimeter with 2 straight segments (top/bottom) + 2 half-circle caps.
  // Distribute N teeth uniformly along the perimeter using arc-length.
  const cleatCount = 14;
  const straightLen = (w - h); // distance between wheel centers along x
  const halfCircLen = Math.PI * (h/2);
  const perim = 2*straightLen + 2*halfCircLen;
  const cleatStep = perim / cleatCount;
  const phaseOffset = phase * cleatStep;

  ctx.fillStyle = COL.trackDark;
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 1.5;
  for(let i=0;i<cleatCount;i++){
    const s = ((i*cleatStep + phaseOffset) % perim + perim) % perim;
    const p = perimPos(s, w, h, straightLen, halfCircLen);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    // small tooth: rectangle 6×8 sticking outward
    ctx.fillRect(-4, -3, 8, 6);
    ctx.strokeRect(-4, -3, 8, 6);
    ctx.restore();
  }

  // ----- center divider line on chain (mechanical detail) -----
  ctx.strokeStyle = COL.trackHi;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w/2 + h/2, 0);
  ctx.lineTo( w/2 - h/2, 0);
  ctx.stroke();

  // ----- wheels (left + right), rotating with phase -----
  drawToothedWheel(ctx, -wheelDx, 0, wheelR, teethCount, rotAngle);
  drawToothedWheel(ctx,  wheelDx, 0, wheelR, teethCount, rotAngle);

  ctx.restore();
}

// stadium = rounded rect with semicircle caps
function roundedStadium(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.arc(x+w-r, y+r, r, -Math.PI/2, Math.PI/2);
  ctx.lineTo(x+r, y+h);
  ctx.arc(x+r, y+r, r, Math.PI/2, -Math.PI/2);
  ctx.closePath();
}

// position along stadium perimeter starting at top-left of straight, CW.
function perimPos(s, w, h, straightLen, halfCircLen){
  // 0..straightLen           : top straight, left→right, y = -h/2, ang=0
  // straightLen..+halfCirc   : right cap, top→bottom, around (w/2 - h/2, 0)
  // +straightLen             : bottom straight, right→left, y = h/2, ang=PI
  // +halfCirc                : left cap, bottom→top, around (-w/2 + h/2, 0)
  let cur = s;
  if(cur < straightLen){
    const x = -w/2 + h/2 + cur;
    return { x, y: -h/2, ang: 0 };
  }
  cur -= straightLen;
  if(cur < halfCircLen){
    const a = -Math.PI/2 + (cur/halfCircLen)*Math.PI;
    const cx = w/2 - h/2;
    return { x: cx + Math.cos(a)*(h/2), y: Math.sin(a)*(h/2), ang: a + Math.PI/2 };
  }
  cur -= halfCircLen;
  if(cur < straightLen){
    const x = w/2 - h/2 - cur;
    return { x, y: h/2, ang: Math.PI };
  }
  cur -= straightLen;
  const a = Math.PI/2 + (cur/halfCircLen)*Math.PI;
  const cx = -w/2 + h/2;
  return { x: cx + Math.cos(a)*(h/2), y: Math.sin(a)*(h/2), ang: a + Math.PI/2 };
}

function drawToothedWheel(ctx, cx, cy, r, teeth, ang){
  ctx.save();
  ctx.translate(cx, cy);
  // outer ink ring
  ctx.fillStyle = COL.ink;
  ctx.beginPath(); ctx.arc(0, 0, r+2, 0, Math.PI*2); ctx.fill();
  // hub disk
  ctx.fillStyle = COL.trackDark;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  // teeth ring (rotates)
  ctx.save();
  ctx.rotate(ang);
  ctx.fillStyle = COL.ink;
  for(let i=0;i<teeth;i++){
    const a = i/teeth*Math.PI*2;
    const tx = Math.cos(a)*r, ty = Math.sin(a)*r;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(a);
    ctx.fillRect(-2, -3, 5, 6);
    ctx.restore();
  }
  ctx.restore();
  // inner hub
  ctx.fillStyle = COL.trackHi;
  ctx.beginPath(); ctx.arc(0, 0, r*0.42, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = COL.ink;
  ctx.beginPath(); ctx.arc(0, 0, r*0.18, 0, Math.PI*2); ctx.fill();
  // 3 spokes (rotate with ang) so the eye reads movement
  ctx.save();
  ctx.rotate(ang);
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 2;
  for(let i=0;i<3;i++){
    const a = i/3*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*r*0.85, Math.sin(a)*r*0.85);
    ctx.stroke();
  }
  ctx.restore();
  // outline
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

// ---- mock castle silhouette to sit on top of tracks ----
function drawMockCastle(ctx, cx, cy, w, h, color){
  ctx.save();
  // body
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2, cy-h, w, h);
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 4;
  ctx.strokeRect(cx-w/2, cy-h, w, h);
  // crenellations
  const n = 5, cw = w/n;
  ctx.fillStyle = color;
  for(let i=0;i<n;i++){
    if(i%2===0){
      ctx.fillRect(cx-w/2 + i*cw, cy-h - 14, cw, 14);
      ctx.strokeRect(cx-w/2 + i*cw, cy-h - 14, cw, 14);
    }
  }
  // door
  ctx.fillStyle = COL.ink;
  ctx.fillRect(cx-12, cy-32, 24, 32);
  // tower
  ctx.fillStyle = color;
  ctx.fillRect(cx-w/2 - 14, cy-h-22, 22, h+22);
  ctx.strokeRect(cx-w/2 - 14, cy-h-22, 22, h+22);
  ctx.fillStyle = '#D83232';
  ctx.beginPath();
  ctx.moveTo(cx-w/2 - 3, cy-h-22);
  ctx.lineTo(cx-w/2 - 3, cy-h-40);
  ctx.lineTo(cx-w/2 + 14, cy-h-32);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// ============================================================
// RENDER
// ============================================================
function paintBg(c, color){
  const ctx = c.getContext('2d');
  ctx.fillStyle = color || '#9CC98B';
  ctx.fillRect(0,0,c.width,c.height);
}
  window.drawParallax = typeof drawParallax !== 'undefined' ? drawParallax : window.drawParallax;
  window.drawParallaxGreen = typeof drawParallaxGreen !== 'undefined' ? drawParallaxGreen : window.drawParallaxGreen;
  window.drawTracks = typeof drawTracks !== 'undefined' ? drawTracks : window.drawTracks;
})();

// ============== ui-deck-hud ==============
(function(){
'use strict';

// ============================================================
// UI DECK + HUD — APIs:
//   drawCard(ctx, x, y, w, h, opts)
//     opts: { kind:'orc'|'skeleton'|'cyclop', state:'idle'|'hover'|'dragging'|'cooldown', cooldownT?:[0..1] }
//   drawHud(ctx, x, y, w, h, opts)
//     opts: { playerHp:[0..1], enemyHp:[0..1], playerPct, enemyPct }
// ============================================================

const COL = {
  blue:    '#3B9EDB',
  red:     '#D83232',
  ink:     '#160820',
  white:   '#ffffff',
  darkSq:  '#2a2a2a',
  liteSq:  '#cfcfcf',
  magenta: '#ff2d6f',
};

// ---- portrait images (PNG) cached ----
const PORTRAITS = {};
const PORTRAIT_PATHS = {
  orc:      '',
  skeleton: '',
  cyclop:   '',
};
function loadPortraits(){
  return Promise.all(Object.entries(PORTRAIT_PATHS).map(([k,p])=>new Promise(res=>{
    const img = new Image();
    img.onload = ()=>{ PORTRAITS[k]=img; res(); };
    img.onerror = ()=>{ PORTRAITS[k]=null; res(); };
    img.src = p;
  })));
}

// ---- vector fallback portrait if PNG missing ----
function drawVectorPortrait(ctx, cx, cy, r, kind){
  ctx.save();
  if(kind==='orc'){
    // body
    ctx.fillStyle = '#7a2222';
    ctx.fillRect(cx-r*0.55, cy+r*0.05, r*1.1, r*0.85);
    // head
    ctx.fillStyle = COL.red;
    ctx.beginPath(); ctx.arc(cx, cy-r*0.25, r*0.55, 0, Math.PI*2); ctx.fill();
    // tusks
    ctx.fillStyle = COL.white;
    ctx.fillRect(cx-r*0.18, cy, r*0.10, r*0.25);
    ctx.fillRect(cx+r*0.08, cy, r*0.10, r*0.25);
    // eyes
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(cx-r*0.28, cy-r*0.32, r*0.16, r*0.10);
    ctx.fillRect(cx+r*0.12, cy-r*0.32, r*0.16, r*0.10);
  } else if(kind==='skeleton'){
    ctx.fillStyle = COL.ink;
    ctx.fillRect(cx-r*0.55, cy+r*0.10, r*1.1, r*0.80);
    ctx.fillStyle = '#e8e0d8';
    ctx.beginPath(); ctx.arc(cx, cy-r*0.25, r*0.50, 0, Math.PI*2); ctx.fill();
    // eye sockets
    ctx.fillStyle = COL.ink;
    ctx.beginPath(); ctx.arc(cx-r*0.18, cy-r*0.25, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.18, cy-r*0.25, r*0.10, 0, Math.PI*2); ctx.fill();
    // glow eyes
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(cx-r*0.18, cy-r*0.25, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.18, cy-r*0.25, r*0.05, 0, Math.PI*2); ctx.fill();
  } else if(kind==='cyclop'){
    ctx.fillStyle = '#5a8c2a';
    ctx.fillRect(cx-r*0.6, cy+r*0.05, r*1.2, r*0.85);
    ctx.fillStyle = '#7ab83a';
    ctx.beginPath(); ctx.arc(cx, cy-r*0.20, r*0.60, 0, Math.PI*2); ctx.fill();
    // horns
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.moveTo(cx-r*0.55, cy-r*0.45); ctx.lineTo(cx-r*0.30, cy-r*0.75); ctx.lineTo(cx-r*0.25, cy-r*0.40);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx+r*0.55, cy-r*0.45); ctx.lineTo(cx+r*0.30, cy-r*0.75); ctx.lineTo(cx+r*0.25, cy-r*0.40);
    ctx.closePath(); ctx.fill();
    // single eye
    ctx.fillStyle = COL.white;
    ctx.beginPath(); ctx.arc(cx, cy-r*0.20, r*0.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = COL.ink;
    ctx.beginPath(); ctx.arc(cx, cy-r*0.20, r*0.09, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ---- rounded rect helper ----
function rrect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ---- DRAW CARD ----
function drawCard(ctx, x, y, w, h, opts){
  const kind  = opts.kind || 'orc';
  const state = opts.state || 'idle';
  const cdT   = (opts.cooldownT==null) ? 0.6 : opts.cooldownT;

  ctx.save();

  // hover/dragging: scale up around center
  let scale = 1;
  if(state==='hover')    scale = 1.04;
  if(state==='dragging') scale = 1.10;
  if(scale!==1){
    const cx = x + w/2, cy = y + h/2;
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
  }

  // dragging glow magenta behind (radial halo)
  if(state==='dragging'){
    ctx.save();
    const cx = x + w/2, cy = y + h/2;
    const rr = Math.max(w, h) * 0.85;
    const halo = ctx.createRadialGradient(cx, cy, rr*0.45, cx, cy, rr);
    halo.addColorStop(0, 'rgba(255,45,111,0.85)');
    halo.addColorStop(0.6, 'rgba(255,45,111,0.35)');
    halo.addColorStop(1, 'rgba(255,45,111,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx-rr, cy-rr, rr*2, rr*2);
    ctx.restore();
  }

  // ---- card body fill (parchment-like cream) ----
  ctx.fillStyle = '#f0e6d2';
  rrect(ctx, x, y, w, h, 10);
  ctx.fill();

  // ---- portrait area background (sky blue gradient like CR) ----
  const padX = 8, padTop = 8;
  const portraitH = h * 0.62;
  const px = x + padX, py = y + padTop, pw = w - padX*2, ph = portraitH;

  // clip portrait area
  ctx.save();
  rrect(ctx, px, py, pw, ph, 6); ctx.clip();
  // sky-ish vertical gradient
  const sky = ctx.createLinearGradient(0, py, 0, py+ph);
  sky.addColorStop(0, '#7ec8e8');
  sky.addColorStop(1, '#3b6da0');
  ctx.fillStyle = sky;
  ctx.fillRect(px, py, pw, ph);

  // portrait
  const img = PORTRAITS[kind];
  if(img){
    // fit into portrait area
    const ar = img.width/img.height;
    let dw = pw*0.92, dh = dw/ar;
    if(dh > ph*0.95){ dh = ph*0.95; dw = dh*ar; }
    const dx = px + (pw-dw)/2;
    const dy = py + (ph-dh) - 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    drawVectorPortrait(ctx, px+pw/2, py+ph*0.55, Math.min(pw, ph)*0.42, kind);
  }
  ctx.restore();

  // portrait outline
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 3;
  rrect(ctx, px, py, pw, ph, 6); ctx.stroke();

  // ---- checker frame strip below portrait ----
  const stripY = py + ph + 4;
  const stripH = 14;
  const sqN = 10;
  const sqW = (w - padX*2) / sqN;
  for(let i=0;i<sqN;i++){
    ctx.fillStyle = i%2===0 ? COL.darkSq : COL.liteSq;
    ctx.fillRect(x + padX + i*sqW, stripY, sqW+0.5, stripH);
  }
  // strip outline
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + padX, stripY, w - padX*2, stripH);

  // ---- cost gem bottom-left ----
  const gemR = 14;
  const gx = x + padX + gemR + 2;
  const gy = stripY + stripH + 14;
  ctx.fillStyle = COL.magenta;
  ctx.beginPath(); ctx.arc(gx, gy, gemR, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(gx, gy, gemR, 0, Math.PI*2); ctx.stroke();
  // cost number
  ctx.fillStyle = COL.white;
  ctx.font = 'italic 900 16px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = COL.ink;
  ctx.strokeText('3', gx, gy+1);
  ctx.fillText('3', gx, gy+1);

  // ---- card outer outline (heavy comic stroke) ----
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = 4;
  rrect(ctx, x, y, w, h, 10); ctx.stroke();

  // ---- HOVER: bright magenta ring (no scale handled above) ----
  if(state==='hover'){
    ctx.strokeStyle = COL.magenta;
    ctx.lineWidth = 3;
    rrect(ctx, x+2, y+2, w-4, h-4, 8); ctx.stroke();
  }

  // ---- COOLDOWN: dim + clock sweep ----
  if(state==='cooldown'){
    ctx.save();
    rrect(ctx, x, y, w, h, 10); ctx.clip();
    ctx.fillStyle = 'rgba(10,5,20,0.55)';
    ctx.fillRect(x, y, w, h);
    // clock sweep on portrait area
    const ccx = px + pw/2, ccy = py + ph/2;
    const cR = Math.max(pw, ph) * 0.9;
    ctx.fillStyle = 'rgba(10,5,20,0.55)';
    ctx.beginPath();
    ctx.moveTo(ccx, ccy);
    const startA = -Math.PI/2;
    const endA   = startA + cdT*Math.PI*2;
    ctx.arc(ccx, ccy, cR, startA, endA);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // pct text
    ctx.fillStyle = COL.white;
    ctx.font = 'italic 900 22px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = COL.ink;
    const txt = Math.round((1-cdT)*100) + '%';
    ctx.strokeText(txt, x+w/2, py+ph/2);
    ctx.fillText(txt, x+w/2, py+ph/2);
  }

  ctx.restore();
}

// ---- DRAW HUD ----
function drawHud(ctx, x, y, w, h, opts){
  const pHp = Math.max(0, Math.min(1, opts.playerHp));
  const eHp = Math.max(0, Math.min(1, opts.enemyHp));
  const pPct = (opts.playerPct!=null) ? opts.playerPct : Math.round(pHp*100);
  const ePct = (opts.enemyPct !=null) ? opts.enemyPct  : Math.round(eHp*100);

  ctx.save();

  // bandeau noir
  ctx.fillStyle = COL.ink;
  rrect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = COL.white;
  ctx.lineWidth = 3;
  rrect(ctx, x, y, w, h, 8); ctx.stroke();

  // dimensions
  const pad = 10;
  const iconR = (h - pad*2) * 0.42;
  const iconLeftCx  = x + pad + iconR;
  const iconRightCx = x + w - pad - iconR;
  const cy = y + h/2;

  // VS center reservation
  const vsW = 64;
  const vsX = x + (w - vsW)/2;

  // bar zones
  const barH = 26;
  const barY = cy - barH/2 + 2;
  const barLeftX  = iconLeftCx + iconR + 8;
  const barLeftW  = (vsX - 6) - barLeftX;
  const barRightX = vsX + vsW + 6;
  const barRightW = (iconRightCx - iconR - 8) - barRightX;

  // ---- player castle icon (left) ----
  drawCastleIcon(ctx, iconLeftCx, cy+2, iconR, COL.blue);
  // ---- enemy castle icon (right) ----
  drawCastleIcon(ctx, iconRightCx, cy+2, iconR, COL.red);

  // ---- player HP bar (left, blue, fills from left) ----
  drawHpBar(ctx, barLeftX, barY, barLeftW, barH, pHp, COL.blue, 'left');
  // ---- enemy HP bar (right, red, fills from right) ----
  drawHpBar(ctx, barRightX, barY, barRightW, barH, eHp, COL.red, 'right');

  // ---- pct centered ON the bars (white with thick stroke) ----
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 900 14px system-ui';
  ctx.lineWidth = 4; ctx.strokeStyle = COL.ink;
  ctx.fillStyle = COL.white;
  ctx.textAlign = 'center';
  ctx.strokeText(pPct+'%', barLeftX + barLeftW/2, barY + barH/2 + 1);
  ctx.fillText  (pPct+'%', barLeftX + barLeftW/2, barY + barH/2 + 1);
  ctx.strokeText(ePct+'%', barRightX + barRightW/2, barY + barH/2 + 1);
  ctx.fillText  (ePct+'%', barRightX + barRightW/2, barY + barH/2 + 1);

  // ---- VS center (last so it's on top) — big red letters with thick black stroke ----
  ctx.save();
  ctx.translate(x + w/2, cy + 2);
  ctx.font = 'italic 900 42px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // shadow under
  ctx.lineWidth = 8; ctx.strokeStyle = COL.ink; ctx.lineJoin = 'round';
  ctx.strokeText('VS', 0, 2);
  // red fill
  ctx.fillStyle = COL.red;
  ctx.fillText('VS', 0, 0);
  // inner highlight
  ctx.lineWidth = 1.5; ctx.strokeStyle = COL.white;
  ctx.strokeText('VS', 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawCastleIcon(ctx, cx, cy, r, color){
  ctx.save();
  // shield outline
  ctx.fillStyle = COL.ink;
  ctx.beginPath(); ctx.arc(cx, cy, r+2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  // castle silhouette
  ctx.fillStyle = COL.white;
  const cw = r*1.3, ch = r*0.95;
  const baseY = cy + ch*0.45;
  // base
  ctx.fillRect(cx-cw/2, baseY-ch*0.5, cw, ch*0.5);
  // crenellations
  const crenW = cw/5;
  for(let i=0;i<5;i++){
    if(i%2===0) ctx.fillRect(cx-cw/2+i*crenW, baseY-ch*0.7, crenW, ch*0.22);
  }
  // door
  ctx.fillStyle = COL.ink;
  ctx.fillRect(cx-crenW*0.4, baseY-ch*0.35, crenW*0.8, ch*0.35);
  ctx.restore();
}

function drawHpBar(ctx, x, y, w, h, hp, color, side){
  // outer black
  ctx.fillStyle = COL.ink;
  rrect(ctx, x-2, y-2, w+4, h+4, 5); ctx.fill();
  // empty track
  ctx.fillStyle = '#3a2640';
  rrect(ctx, x, y, w, h, 4); ctx.fill();
  // fill
  const fw = w * hp;
  ctx.save();
  rrect(ctx, x, y, w, h, 4); ctx.clip();
  if(side==='right'){
    ctx.fillStyle = color;
    ctx.fillRect(x + (w - fw), y, fw, h);
    // hi-light
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(x + (w - fw), y+1, fw, h*0.30);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(x, y+1, fw, h*0.30);
  }
  ctx.restore();
  // outline
  ctx.strokeStyle = COL.white;
  ctx.lineWidth = 1.5;
  rrect(ctx, x, y, w, h, 4); ctx.stroke();
}

// ============================================================
// RENDER
// ============================================================
function paintBg(c, color){
  const ctx = c.getContext('2d');
  ctx.fillStyle = color || '#9CC98B';
  ctx.fillRect(0,0,c.width,c.height);
}
  window.drawCard = typeof drawCard !== 'undefined' ? drawCard : window.drawCard;
  window.drawHud = typeof drawHud !== 'undefined' ? drawHud : window.drawHud;
  window.PORTRAITS = typeof PORTRAITS !== 'undefined' ? PORTRAITS : window.PORTRAITS;
})();

// ============== end-card ==============
(function(){
'use strict';

// ============================================================
// END-CARD — itérer ici. API stable :
//   drawEndCard(ctx, x, y, w, h, opts)
//   opts: { result:'victory'|'defeat', t?:ms, cta?:string }
//   getCtaRect(x, y, w, h) -> {x, y, w, h}  (hitbox bouton)
// ============================================================

// PRNG déterministe
function rng(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

// --------- helpers comic text ---------
function comicText(ctx, txt, cx, cy, size, opts){
  const o = opts || {};
  const fill = o.fill || '#ffffff';
  const stroke = o.stroke || '#160820';
  const strokeW = o.strokeW || Math.max(6, size*0.18);
  const italic = o.italic !== false;
  const weight = o.weight || 900;
  ctx.save();
  ctx.font = `${italic?'italic ':''}${weight} ${size}px "Arial Black", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = stroke;
  ctx.strokeText(txt, cx, cy);
  ctx.fillStyle = fill;
  ctx.fillText(txt, cx, cy);
  ctx.restore();
}

// rounded rect path
function rrPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// CTA hitbox (used both for drawing & for game tap detection)
function getCtaRect(x, y, w, h){
  const bw = Math.min(w*0.86, 480);
  const bh = Math.max(110, h*0.13);
  const bx = x + (w - bw)/2;
  const by = y + h*0.55;
  return { x: bx, y: by, w: bw, h: bh };
}

function drawCtaButton(ctx, rect, label, t){
  // pulse: 1.0 → 1.06 → 1.0 sur 800ms (sin demi-cycle, peak à 400ms)
  const phase = ((t||0) % 800) / 800;
  const pulse = Math.sin(phase * Math.PI); // 0..1..0
  const s = 1 + 0.06 * pulse;
  const cx = rect.x + rect.w/2;
  const cy = rect.y + rect.h/2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);

  // halo magenta radial derrière (intensifié au peak)
  ctx.save();
  const haloR = Math.max(rect.w, rect.h) * (0.95 + 0.18*pulse);
  const halo = ctx.createRadialGradient(cx, cy, rect.h*0.2, cx, cy, haloR);
  const haloA = 0.55 + 0.30*pulse;
  halo.addColorStop(0, `rgba(255,80,150,${haloA})`);
  halo.addColorStop(0.5, `rgba(255,45,111,${haloA*0.5})`);
  halo.addColorStop(1, 'rgba(255,45,111,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx-haloR, cy-haloR, haloR*2, haloR*2);
  ctx.restore();

  // ombre portée
  ctx.save();
  ctx.fillStyle = 'rgba(8,2,16,0.55)';
  rrPath(ctx, rect.x+6, rect.y+10, rect.w, rect.h, rect.h*0.32);
  ctx.fill();
  ctx.restore();

  // corps bouton (gradient rose vif)
  const bg = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y+rect.h);
  bg.addColorStop(0, '#ff5a92');
  bg.addColorStop(0.55, '#ff2d6f');
  bg.addColorStop(1, '#c8155a');
  ctx.fillStyle = bg;
  rrPath(ctx, rect.x, rect.y, rect.w, rect.h, rect.h*0.32);
  ctx.fill();

  // outline noir-violet TRÈS épais
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#160820';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // glossy highlight haut
  ctx.save();
  ctx.globalAlpha = 0.45;
  rrPath(ctx, rect.x+rect.h*0.18, rect.y+rect.h*0.12, rect.w-rect.h*0.36, rect.h*0.32, rect.h*0.18);
  const gloss = ctx.createLinearGradient(0, rect.y, 0, rect.y+rect.h*0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.8)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();

  // texte
  comicText(ctx, label, cx, cy+2, rect.h*0.46, {
    fill:'#ffffff', stroke:'#160820', strokeW: Math.max(5, rect.h*0.085), italic:true, weight:900
  });

  ctx.restore();
}

// confettis / étoiles POW (déterministes)
function drawConfetti(ctx, x, y, w, h, t, seed){
  const r = rng(seed);
  ctx.save();
  const N = 28;
  for(let i=0;i<N;i++){
    const px = x + r()*w;
    const py = y + r()*h*0.85;
    const sz = 4 + r()*8;
    const rot = r()*Math.PI*2 + (t||0)*0.001;
    const palette = ['#ff2d6f','#ffeb3b','#ffffff','#ff3d8a','#9b3dff'];
    const col = palette[i%palette.length];
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.fillRect(-sz/2, -sz*0.25, sz, sz*0.5);
    ctx.restore();
  }
  // petites étoiles POW blanches
  for(let i=0;i<6;i++){
    const px = x + r()*w;
    const py = y + r()*h*0.9;
    const rad = 6 + r()*10;
    ctx.save();
    ctx.translate(px, py);
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for(let k=0;k<4;k++){
      ctx.rotate(Math.PI/4);
      ctx.beginPath();
      ctx.moveTo(-rad,0); ctx.lineTo(rad,0);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawEndCard(ctx, x, y, w, h, opts){
  const o = opts || {};
  const result = o.result || 'victory';
  const t = o.t || 0;
  const isWin = result === 'victory';
  const cta = o.cta || (isWin ? 'PLAY NOW' : 'TRY AGAIN');

  ctx.save();

  // 1) overlay sombre semi-transparent (gradient pour focus central)
  const ov = ctx.createRadialGradient(x+w/2, y+h*0.45, w*0.1, x+w/2, y+h*0.5, w*0.85);
  if(isWin){
    ov.addColorStop(0, 'rgba(70,20,90,0.45)');
    ov.addColorStop(0.6, 'rgba(22,8,32,0.72)');
    ov.addColorStop(1, 'rgba(8,2,16,0.88)');
  } else {
    ov.addColorStop(0, 'rgba(40,8,20,0.50)');
    ov.addColorStop(0.6, 'rgba(15,4,18,0.78)');
    ov.addColorStop(1, 'rgba(4,1,8,0.90)');
  }
  ctx.fillStyle = ov;
  ctx.fillRect(x, y, w, h);

  // confettis (uniquement victory) — derrière le titre
  if(isWin){
    drawConfetti(ctx, x, y+h*0.05, w, h*0.55, t, 42);
  }

  // 2) titre
  const titleCx = x + w/2;
  const titleCy = y + h*0.25;
  const titleSize = w*0.20;
  const title = isWin ? 'VICTORY!' : 'DEFEAT!';

  // halo derrière le titre
  ctx.save();
  const tHalo = ctx.createRadialGradient(titleCx, titleCy, 10, titleCx, titleCy, w*0.55);
  if(isWin){
    tHalo.addColorStop(0,'rgba(255,235,59,0.45)');
    tHalo.addColorStop(0.5,'rgba(255,45,111,0.25)');
    tHalo.addColorStop(1,'rgba(255,45,111,0)');
  } else {
    tHalo.addColorStop(0,'rgba(150,30,60,0.4)');
    tHalo.addColorStop(1,'rgba(0,0,0,0)');
  }
  ctx.fillStyle = tHalo;
  ctx.fillRect(x, titleCy-w*0.55, w, w*1.1);
  ctx.restore();

  // titre rotation slight pour comic feel
  ctx.save();
  ctx.translate(titleCx, titleCy);
  ctx.rotate(isWin ? -0.05 : 0.04);
  comicText(ctx, title, 0, 0, titleSize, {
    fill: isWin ? '#ffeb3b' : '#ff2d4f',
    stroke: '#160820',
    strokeW: titleSize*0.16,
    italic: true, weight: 900
  });
  // sub-fill comic shadow under
  ctx.restore();

  // 3) sous-titre
  const subCy = y + h*0.40;
  const subSize = w*0.068;
  const sub = isWin ? 'WANT MORE CHAOS?' : 'READY FOR REVENGE?';
  comicText(ctx, sub, titleCx, subCy, subSize, {
    fill:'#ffffff', stroke:'#160820', strokeW: subSize*0.32, italic:true, weight:900
  });

  // accent sous le sous-titre
  ctx.save();
  ctx.strokeStyle = isWin ? '#ffeb3b' : '#ff5a6f';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const accW = w*0.18;
  ctx.beginPath();
  ctx.moveTo(titleCx-accW, subCy+subSize*0.85);
  ctx.lineTo(titleCx+accW, subCy+subSize*0.85);
  ctx.stroke();
  ctx.restore();

  // 4) bouton CTA pulsant
  const rect = getCtaRect(x, y, w, h);
  drawCtaButton(ctx, rect, cta, t);

  // 5) hint "tap to install" sous le bouton
  const hintCy = rect.y + rect.h + 44;
  comicText(ctx, isWin ? 'FREE INSTALL · NO ADS' : 'ONE TAP · INSTANT FUN', titleCx, hintCy, w*0.040, {
    fill:'#ffeb3b', stroke:'#160820', strokeW: 4, italic:true, weight:900
  });

  // chevron flèche down vers bouton (microcue de tap) — au-dessus du bouton
  ctx.save();
  const arrCy = rect.y - 22;
  const arrPulse = Math.sin((((t||0)%800)/800) * Math.PI);
  ctx.globalAlpha = 0.5 + 0.5*arrPulse;
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(titleCx-14, arrCy-8);
  ctx.lineTo(titleCx, arrCy+6);
  ctx.lineTo(titleCx+14, arrCy-8);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// expose
window.drawEndCard = drawEndCard;
window.getCtaRect = getCtaRect;
window.drawCtaButton = drawCtaButton;

// =========== render ===========

// fake gameplay background derrière l'overlay (pour montrer la transparence)
function fakeBackground(ctx, w, h, mood){
  // ciel
  const sky = ctx.createLinearGradient(0,0,0,h);
  if(mood==='win'){
    sky.addColorStop(0,'#7fb8e0'); sky.addColorStop(1,'#bfe3a8');
  } else {
    sky.addColorStop(0,'#5a4a70'); sky.addColorStop(1,'#806a5a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,w,h);
  // sol
  ctx.fillStyle = mood==='win' ? '#9CC98B' : '#6a7a5a';
  ctx.fillRect(0, h*0.7, w, h*0.3);
  // château silhouette
  ctx.fillStyle = mood==='win' ? '#5a3a8a' : '#3a2a3a';
  ctx.fillRect(w*0.15, h*0.45, w*0.25, h*0.28);
  ctx.fillRect(w*0.6, h*0.5, w*0.25, h*0.23);
  // créneaux
  for(let i=0;i<5;i++){
    ctx.fillRect(w*0.15+i*w*0.05, h*0.42, w*0.025, w*0.04);
  }
  // soleil/lune
  ctx.fillStyle = mood==='win' ? '#ffeb3b' : '#cfb8a8';
  ctx.beginPath(); ctx.arc(w*0.78, h*0.18, w*0.06, 0, Math.PI*2); ctx.fill();
}
  window.drawEndCard = typeof drawEndCard !== 'undefined' ? drawEndCard : window.drawEndCard;
  window.getCtaRect = typeof getCtaRect !== 'undefined' ? getCtaRect : window.getCtaRect;
  window.drawCtaButton = typeof drawCtaButton !== 'undefined' ? drawCtaButton : window.drawCtaButton;
})();


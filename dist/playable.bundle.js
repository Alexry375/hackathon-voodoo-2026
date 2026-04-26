(() => {
  // shared/events.js
  var subs = (
    /** @type {Map<EventName, Set<Function>>} */
    /* @__PURE__ */ new Map()
  );
  function on(name, fn) {
    if (!subs.has(name)) subs.set(name, /* @__PURE__ */ new Set());
    subs.get(name).add(fn);
    return () => subs.get(name)?.delete(fn);
  }
  function emit(name, payload) {
    const set = subs.get(name);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[events] handler for "${name}" threw:`, e);
      }
    }
  }

  // shared/state.js
  var state = {
    hp_self_pct: 100,
    hp_enemy_pct: 100,
    turn_index: 0,
    units: [
      { id: "skeleton", alive: true, floor: 0 },
      { id: "cyclop", alive: true, floor: 1 },
      { id: "orc", alive: true, floor: 2 }
    ]
  };
  function killUnit(id) {
    const u = state.units.find((u2) => u2.id === id);
    if (u) u.alive = false;
  }

  // shared/scene_manager.js
  var current = "INTRO_INCOMING";
  var subscribers = (
    /** @type {Set<(s: SceneState) => void>} */
    /* @__PURE__ */ new Set()
  );
  function getState() {
    return current;
  }
  function subscribe(fn) {
    subscribers.add(fn);
    fn(current);
    return () => subscribers.delete(fn);
  }
  function transition(next) {
    if (next === current) return;
    current = next;
    for (const fn of subscribers) {
      try {
        fn(current);
      } catch (e) {
        console.error("[scene_manager] subscriber threw:", e);
      }
    }
  }
  on("player_fire", () => {
    transition("EXTERIOR_RESOLVE");
  });
  on("cut_to_interior", (payload) => {
    state.hp_self_pct = payload.hp_self_after;
    state.hp_enemy_pct = payload.hp_enemy_after;
    for (const id of payload.units_destroyed_ids || []) killUnit(id);
    state.turn_index += 1;
    if (state.hp_enemy_pct <= 5) {
      transition("END_VICTORY");
      return;
    }
    if (state.hp_self_pct <= 0) {
      transition("END_DEFEAT");
      return;
    }
    transition("INTERIOR_AIM");
  });
  on("unit_killed", (payload) => {
    killUnit(payload.unit_id);
  });
  function start() {
    transition("INTRO_INCOMING");
  }
  function ready_for_player_input() {
    transition("INTERIOR_AIM");
  }
  function _devForceState(s) {
    transition(s);
  }

  // scene_interior/castle_section.js
  var C_LEFT = 20;
  var C_RIGHT = 520;
  var C_TOP = 170;
  var C_BOTTOM = 820;
  var C_WIDTH = C_RIGHT - C_LEFT;
  var C_HEIGHT = C_BOTTOM - C_TOP;
  var WALL_W = 56;
  var INT_LEFT = C_LEFT + WALL_W;
  var INT_RIGHT = C_RIGHT - WALL_W;
  var INT_WIDTH = INT_RIGHT - INT_LEFT;
  var FLOOR_H = 16;
  var LEDGE_W = Math.round(INT_WIDTH * 0.42);
  var FLOOR_SIDE = ["L", "R", "L"];
  var FLOOR_Y = [
    C_TOP + Math.round(C_HEIGHT * 0.34),
    C_TOP + Math.round(C_HEIGHT * 0.58),
    C_TOP + Math.round(C_HEIGHT * 0.82)
  ];
  var PIVOT_X = (C_LEFT + C_RIGHT) / 2;
  var PIVOT_Y = C_BOTTOM;
  var _anchors = [null, null, null];
  var _lastTilt = null;
  function drawCastleSection(ctx3, opts = {}) {
    const tilt = opts.tilt_deg ?? 0;
    const dmg2 = opts.damage_level ?? 0;
    const rad = tilt * Math.PI / 180;
    if (tilt !== _lastTilt) {
      _anchors = [null, null, null];
      _lastTilt = tilt;
    }
    ctx3.save();
    ctx3.translate(PIVOT_X, PIVOT_Y);
    ctx3.rotate(rad);
    ctx3.translate(-PIVOT_X, -PIVOT_Y);
    _drawBody(ctx3, dmg2);
    ctx3.restore();
  }
  function getFloorAnchor(floor) {
    if (_anchors[floor]) return _anchors[floor];
    const rad = (_lastTilt ?? 0) * Math.PI / 180;
    const { cx } = _ledgeRect(floor);
    const dx = cx - PIVOT_X;
    const dy = FLOOR_Y[floor] - PIVOT_Y;
    _anchors[floor] = {
      x: PIVOT_X + dx * Math.cos(rad) - dy * Math.sin(rad),
      y: PIVOT_Y + dx * Math.sin(rad) + dy * Math.cos(rad),
      width: LEDGE_W
    };
    return _anchors[floor];
  }
  function _ledgeRect(f) {
    const side = FLOOR_SIDE[f];
    const x = side === "L" ? INT_LEFT : INT_RIGHT - LEDGE_W;
    return { x, y: FLOOR_Y[f], w: LEDGE_W, cx: x + LEDGE_W / 2 };
  }
  var C = {
    dark: "#1A1C20",
    mid: "#28292E",
    light: "#35383F",
    outline: "#000",
    platBrown: "#7A4520",
    platLight: "#A06230",
    platDark: "#502E12",
    baseWood: "#8B5E3C",
    baseLight: "#A07040",
    spire: "#1A1C20",
    sky: "#BCD4B7",
    tread: "#2A2A2A",
    gear: "#7C7368"
  };
  function _drawBody(ctx3, dmg2) {
    _slab(ctx3, INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);
    const leftWallTopCut = C_TOP + Math.round(C_HEIGHT * (0.1 + dmg2 * 0.18));
    _slab(ctx3, C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);
    ctx3.fillStyle = C.dark;
    ctx3.fillRect(INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);
    _bricks(ctx3, INT_LEFT, C_TOP, INT_WIDTH, C_HEIGHT);
    _topCutout(ctx3, dmg2);
    for (let f = 0; f < 3; f++) {
      if (f === 0 && dmg2 >= 2) continue;
      const r = _ledgeRect(f);
      _ledge(ctx3, r.x, r.y, r.w, FLOOR_H, FLOOR_SIDE[f]);
    }
    if (dmg2 < 3) _spire(ctx3, INT_RIGHT, C_TOP, WALL_W);
    _wallBrokenTop(ctx3, C_LEFT, leftWallTopCut, WALL_W);
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 3;
    ctx3.strokeRect(INT_RIGHT, C_TOP, WALL_W, C_HEIGHT);
    ctx3.strokeRect(C_LEFT, leftWallTopCut, WALL_W, C_BOTTOM - leftWallTopCut);
    _base(ctx3, C_LEFT - 14, C_BOTTOM, C_WIDTH + 28, 50);
    _treads(ctx3, C_LEFT - 14, C_BOTTOM + 50, C_WIDTH + 28);
  }
  function _topCutout(ctx3, dmg2) {
    const yShoulder = C_TOP + Math.round(C_HEIGHT * 0.1) + dmg2 * 30;
    const yDip = yShoulder + Math.round(C_HEIGHT * 0.05);
    const xL = INT_LEFT - 10, xR = INT_RIGHT + 10, yTop = C_TOP - 60;
    const path = (close) => {
      ctx3.beginPath();
      if (close) {
        ctx3.moveTo(xL, yTop);
        ctx3.lineTo(xL, yShoulder);
      } else ctx3.moveTo(xL, yShoulder);
      _jaggedH(ctx3, xL, yShoulder, xL + INT_WIDTH * 0.3, yShoulder, 4, 5);
      _jaggedV(ctx3, xL + INT_WIDTH * 0.3, yShoulder, xL + INT_WIDTH * 0.32, yDip, 2, 3);
      _jaggedH(ctx3, xL + INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.32, yDip, 6, 5);
      _jaggedV(ctx3, xR - INT_WIDTH * 0.32, yDip, xR - INT_WIDTH * 0.3, yShoulder, 2, 3);
      _jaggedH(ctx3, xR - INT_WIDTH * 0.3, yShoulder, xR, yShoulder, 4, 5);
      if (close) {
        ctx3.lineTo(xR, yTop);
        ctx3.closePath();
      }
    };
    ctx3.save();
    ctx3.fillStyle = C.sky;
    path(true);
    ctx3.fill();
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 2.5;
    path(false);
    ctx3.stroke();
    ctx3.restore();
  }
  function _jaggedV(ctx3, x1, y1, x2, y2, steps, jit) {
    const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
    for (let i = 1; i <= steps; i++) {
      const px = x1 + dx * i + (i < steps ? Math.sin(i * 7.3) * jit : 0);
      const py = y1 + dy * i;
      ctx3.lineTo(px, py);
    }
  }
  function _jaggedH(ctx3, x1, y1, x2, y2, steps, jit) {
    const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
    for (let i = 1; i <= steps; i++) {
      const px = x1 + dx * i;
      const py = y1 + dy * i + (i < steps ? Math.cos(i * 5.1) * jit : 0);
      ctx3.lineTo(px, py);
    }
  }
  function _slab(ctx3, x, y, w, h) {
    ctx3.fillStyle = C.dark;
    ctx3.fillRect(x, y, w, h);
    _bricks(ctx3, x, y, w, h);
  }
  function _bricks(ctx3, x, y, w, h) {
    const BW = 30, BH = 20;
    ctx3.save();
    ctx3.beginPath();
    ctx3.rect(x, y, w, h);
    ctx3.clip();
    for (let r = 0; r <= Math.ceil(h / BH) + 1; r++) {
      const ry = y + r * BH;
      const shift = r % 2 ? BW / 2 : 0;
      for (let col = -1; col <= Math.ceil(w / BW) + 2; col++) {
        const rx = x + col * BW - shift;
        const t = (r * 3 + col * 2) % 5;
        ctx3.fillStyle = t > 3 ? C.light : t > 1 ? C.mid : C.dark;
        ctx3.fillRect(rx + 1, ry + 1, BW - 2, BH - 2);
      }
    }
    ctx3.restore();
  }
  function _ledge(ctx3, x, y, w, h, side) {
    ctx3.fillStyle = C.platBrown;
    ctx3.fillRect(x, y, w, h);
    ctx3.fillStyle = C.platLight;
    ctx3.fillRect(x, y, w, 4);
    ctx3.fillStyle = C.platDark;
    ctx3.fillRect(x, y + h - 3, w, 3);
    ctx3.strokeStyle = C.platDark;
    ctx3.lineWidth = 1;
    for (let px = x + 28; px < x + w - 4; px += 28) {
      ctx3.beginPath();
      ctx3.moveTo(px, y + 1);
      ctx3.lineTo(px, y + h - 1);
      ctx3.stroke();
    }
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 2;
    ctx3.strokeRect(x, y, w, h);
    ctx3.fillStyle = C.outline;
    if (side === "L") {
      ctx3.fillRect(x + 1, y + h - 1, 4, 4);
      ctx3.fillRect(x + 1, y + h + 3, 3, 3);
    } else {
      ctx3.fillRect(x + w - 5, y + h - 1, 4, 4);
      ctx3.fillRect(x + w - 4, y + h + 3, 3, 3);
    }
  }
  function _spire(ctx3, wx, wallTop, wallW) {
    const baseY = wallTop;
    const tipY = wallTop - 110;
    const cx = wx + wallW / 2;
    ctx3.fillStyle = C.spire;
    ctx3.beginPath();
    ctx3.moveTo(cx, tipY);
    ctx3.lineTo(wx - 8, baseY);
    ctx3.lineTo(wx + wallW + 8, baseY);
    ctx3.closePath();
    ctx3.fill();
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 3;
    ctx3.stroke();
    ctx3.fillStyle = C.mid;
    for (let i = 0; i < 3; i++) {
      ctx3.fillRect(wx + 4 + i * 18, baseY - 8, 12, 8);
    }
  }
  function _wallBrokenTop(ctx3, wx, cutY, wallW) {
    ctx3.fillStyle = C.dark;
    ctx3.beginPath();
    ctx3.moveTo(wx, cutY);
    const teeth = 5;
    for (let i = 0; i <= teeth; i++) {
      const tx = wx + i / teeth * wallW;
      const ty = cutY - (i % 2 === 0 ? 4 : 14);
      ctx3.lineTo(tx, ty);
    }
    ctx3.lineTo(wx + wallW, cutY);
    ctx3.closePath();
    ctx3.fill();
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 2.5;
    ctx3.stroke();
  }
  function _base(ctx3, x, y, w, h) {
    ctx3.fillStyle = C.baseWood;
    ctx3.fillRect(x, y, w, h);
    ctx3.fillStyle = C.baseLight;
    ctx3.fillRect(x + 3, y + 3, w - 6, 10);
    ctx3.fillStyle = "#3a2410";
    for (let i = 0; i < 2; i++) {
      const ax = x + 30 + i * (w - 110);
      ctx3.beginPath();
      ctx3.moveTo(ax, y + h);
      ctx3.lineTo(ax, y + 18);
      ctx3.arc(ax + 25, y + 18, 25, Math.PI, 0, false);
      ctx3.lineTo(ax + 50, y + h);
      ctx3.closePath();
      ctx3.fill();
    }
    ctx3.strokeStyle = C.outline;
    ctx3.lineWidth = 3;
    ctx3.strokeRect(x, y, w, h);
  }
  function _treads(ctx3, x, y, w) {
    const r = 22;
    ctx3.fillStyle = C.tread;
    ctx3.fillRect(x + 18, y - 6, w - 36, 16);
    for (const cx of [x + 60, x + w - 60]) {
      ctx3.fillStyle = C.tread;
      ctx3.beginPath();
      ctx3.arc(cx, y + 4, r, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.fillStyle = C.gear;
      ctx3.beginPath();
      ctx3.arc(cx, y + 4, r - 7, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.fillStyle = C.tread;
      ctx3.beginPath();
      ctx3.arc(cx, y + 4, r - 14, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.strokeStyle = C.outline;
      ctx3.lineWidth = 2;
      ctx3.beginPath();
      ctx3.arc(cx, y + 4, r, 0, Math.PI * 2);
      ctx3.stroke();
    }
  }

  // shared/assets.js
  var _cache = {};
  function getImage(name) {
    if (_cache[name]) return _cache[name];
    const src = (
      /** @type {any} */
      window.ASSETS?.[name]
    );
    if (!src) throw new Error(`asset missing: ${name} (window.ASSETS not loaded?)`);
    const img = new Image();
    img.src = src;
    _cache[name] = img;
    return img;
  }
  function isImageReady(name) {
    const img = _cache[name];
    return !!img && img.complete && img.naturalWidth > 0;
  }

  // scene_interior/units.js
  var SPRITE_SIZE = 110;
  var ASSET_BY_ID = { cyclop: "CYCLOP", skeleton: "SKELETON", orc: "ORC" };
  function drawUnits(ctx3, t) {
    const bob = Math.sin(t * 2 * Math.PI * 0.7) * 3;
    for (const u of state.units) {
      if (!u.alive) continue;
      const a = getFloorAnchor(u.floor);
      if (!a) continue;
      const assetName = ASSET_BY_ID[u.id];
      if (!assetName) continue;
      const img = getImage(assetName);
      const x = a.x - SPRITE_SIZE / 2;
      const y = a.y + bob - SPRITE_SIZE;
      ctx3.drawImage(img, x, y, SPRITE_SIZE, SPRITE_SIZE);
    }
  }

  // scene_interior/arrow.js
  var BASE_W = 46;
  var TRI_H = 50;
  var CLEAR = 80;
  var AMP = 5;
  var FREQ = 1;
  function drawArrow(ctx3, t, floor) {
    const anchor = getFloorAnchor(floor);
    const bob = Math.sin(t * 2 * Math.PI * FREQ) * AMP;
    const cx = anchor.x;
    const tipY = anchor.y - CLEAR + bob;
    const topY = tipY - TRI_H;
    const halfW = BASE_W / 2;
    ctx3.save();
    ctx3.translate(2, 2);
    ctx3.beginPath();
    ctx3.moveTo(cx - halfW, topY);
    ctx3.lineTo(cx + halfW, topY);
    ctx3.lineTo(cx, tipY);
    ctx3.closePath();
    ctx3.fillStyle = "rgba(0,0,0,0.4)";
    ctx3.fill();
    ctx3.translate(-2, -2);
    ctx3.beginPath();
    ctx3.moveTo(cx - halfW, topY);
    ctx3.lineTo(cx + halfW, topY);
    ctx3.lineTo(cx, tipY);
    ctx3.closePath();
    ctx3.lineJoin = "round";
    ctx3.lineWidth = 3;
    ctx3.strokeStyle = "#000";
    ctx3.stroke();
    ctx3.fillStyle = "#FFFFFF";
    ctx3.fill();
    ctx3.restore();
  }

  // scene_interior/turn.js
  var TURN_ORDER = (
    /** @type {(0|1|2)[]} */
    [1, 0, 2]
  );
  var cursor = 0;
  function getActiveFloor() {
    for (let i = 0; i < TURN_ORDER.length; i++) {
      const floor = TURN_ORDER[(cursor + i) % TURN_ORDER.length];
      const u = state.units.find((x) => x.floor === floor);
      if (u && u.alive) return floor;
    }
    return null;
  }
  function getActiveUnitId() {
    const f = getActiveFloor();
    if (f === null) return null;
    const u = state.units.find((x) => x.floor === f);
    return (
      /** @type {any} */
      u ? u.id : null
    );
  }
  on("cut_to_interior", () => {
    cursor = (cursor + 1) % TURN_ORDER.length;
  });

  // scene_interior/aim.js
  var HIT_RADIUS = 60;
  var ORIGIN_LIFT = 40;
  var FULL_POWER_PX = 200;
  var SIM_STEPS = 60;
  var SIM_GRAVITY = 0.5;
  var SIM_V0 = 18;
  var DOT_EVERY = 3;
  var DOT_RADIUS = 3;
  var DOT_COLOR = "#FFFFFF";
  var _canvas = null;
  var _aiming = false;
  var _dragStart = null;
  var _dragCurrent = null;
  function _toCanvas(canvas4, ev) {
    const rect = canvas4.getBoundingClientRect();
    const sx = canvas4.width / rect.width;
    const sy = canvas4.height / rect.height;
    return {
      x: (ev.clientX - rect.left) * sx,
      y: (ev.clientY - rect.top) * sy
    };
  }
  function _unitOrigin() {
    const f = getActiveFloor();
    if (f === null) return null;
    const a = getFloorAnchor(f);
    return { x: a.x, y: a.y - ORIGIN_LIFT };
  }
  function _onDown(ev) {
    const o = _unitOrigin();
    if (!o) return;
    const p = _toCanvas(_canvas, ev);
    const dx = p.x - o.x, dy = p.y - o.y;
    if (Math.hypot(dx, dy) > HIT_RADIUS) return;
    _aiming = true;
    _dragStart = p;
    _dragCurrent = p;
    try {
      _canvas.setPointerCapture(ev.pointerId);
    } catch (_) {
    }
    ev.preventDefault();
  }
  function _onMove(ev) {
    if (!_aiming) return;
    _dragCurrent = _toCanvas(_canvas, ev);
  }
  function _onUp(ev) {
    if (!_aiming) return;
    _dragCurrent = _toCanvas(_canvas, ev);
    const { angle_deg, power } = _resolveShot();
    _aiming = false;
    try {
      _canvas.releasePointerCapture(ev.pointerId);
    } catch (_) {
    }
    const unit_id = getActiveUnitId();
    if (unit_id) emit("player_fire", { unit_id, angle_deg, power });
  }
  function _onCancel() {
    _aiming = false;
  }
  function _resolveShot() {
    const dx = _dragStart.x - _dragCurrent.x;
    const dy = _dragStart.y - _dragCurrent.y;
    let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
    if (angle < 0) angle = 0;
    if (angle > 170) angle = 170;
    const len = Math.hypot(dx, dy);
    const power = Math.max(0, Math.min(1, len / FULL_POWER_PX));
    return { angle_deg: angle, power };
  }
  function installAim(canvas4) {
    _canvas = canvas4;
    canvas4.addEventListener("pointerdown", _onDown);
    canvas4.addEventListener("pointermove", _onMove);
    canvas4.addEventListener("pointerup", _onUp);
    canvas4.addEventListener("pointercancel", _onCancel);
    canvas4.style.touchAction = "none";
  }
  function drawDottedTrajectory(ctx3, origin, dragVecPx) {
    const dx = dragVecPx.x;
    const dy = dragVecPx.y;
    let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
    if (angle < 0) angle = 0;
    if (angle > 170) angle = 170;
    const len = Math.hypot(dx, dy);
    const power = Math.max(0, Math.min(1, len / FULL_POWER_PX));
    if (power <= 0.01) return;
    const rad = angle * Math.PI / 180;
    const cw = ctx3.canvas.width;
    let px = origin.x, py = origin.y;
    let vx = power * SIM_V0 * Math.cos(rad);
    let vy = -power * SIM_V0 * Math.sin(rad);
    ctx3.save();
    ctx3.fillStyle = DOT_COLOR;
    ctx3.shadowColor = "rgba(0,0,0,0.45)";
    ctx3.shadowBlur = 2;
    for (let i = 0; i < SIM_STEPS; i++) {
      px += vx;
      py += vy;
      vy += SIM_GRAVITY;
      if (py > 960 || px < 0 || px > cw) break;
      if (i < 1) continue;
      if (i % DOT_EVERY !== 0) continue;
      ctx3.beginPath();
      ctx3.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
      ctx3.fill();
    }
    ctx3.restore();
  }
  function drawAimOverlay(ctx3) {
    if (!_aiming || !_dragStart || !_dragCurrent) return;
    const o = _unitOrigin();
    if (!o) return;
    drawDottedTrajectory(ctx3, o, {
      x: _dragStart.x - _dragCurrent.x,
      y: _dragStart.y - _dragCurrent.y
    });
  }

  // scene_interior/hud_cards.js
  var PANEL_Y = 810;
  var PANEL_H = 110;
  var CARD_W = 140;
  var CARD_H = 130;
  var CARD_Y = 800;
  var CARD_GAP = (540 - CARD_W * 3) / 4;
  var CARDS = [
    { id: "cyclop", x: CARD_GAP, asset: "CYCLOP" },
    { id: "skeleton", x: CARD_GAP * 2 + CARD_W, asset: "SKELETON" },
    { id: "orc", x: CARD_GAP * 3 + CARD_W * 2, asset: "ORC" }
  ];
  var C2 = {
    wood: "#8B5E3C",
    woodLight: "#A07040",
    woodDark: "#5C3D24",
    outline: "#000",
    checkerD: "#3A3D44",
    checkerL: "#C8C8CC",
    bodyTop: "#9DA0A6",
    bodyBot: "#5C5F66",
    tread: "#2A2A2A",
    gear: "#7C7368",
    activeGlow: "#FFD23A"
  };
  function drawHudCards(ctx3, activeId = null) {
    _plank(ctx3);
    _gear(ctx3, 32, PANEL_Y + PANEL_H - 6);
    _gear(ctx3, 508, PANEL_Y + PANEL_H - 6);
    for (const c of CARDS) _card(ctx3, c.x, CARD_Y, c.id, c.asset, c.id === activeId);
  }
  function _plank(ctx3) {
    ctx3.fillStyle = C2.wood;
    ctx3.fillRect(-10, PANEL_Y, 560, PANEL_H);
    ctx3.fillStyle = C2.woodLight;
    ctx3.fillRect(-10, PANEL_Y, 560, 14);
    ctx3.fillStyle = C2.woodDark;
    ctx3.fillRect(-10, PANEL_Y + PANEL_H - 8, 560, 8);
    ctx3.strokeStyle = C2.woodDark;
    ctx3.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = PANEL_Y + 22 + i * 14;
      ctx3.beginPath();
      ctx3.moveTo(-10, y);
      ctx3.lineTo(550, y);
      ctx3.stroke();
    }
    ctx3.strokeStyle = C2.outline;
    ctx3.lineWidth = 4;
    ctx3.beginPath();
    ctx3.moveTo(-10, PANEL_Y);
    ctx3.lineTo(550, PANEL_Y);
    ctx3.stroke();
  }
  function _card(ctx3, x, y, id, assetName, isActive) {
    const r = 12;
    ctx3.save();
    _rr(ctx3, x, y, CARD_W, CARD_H, r);
    ctx3.clip();
    const g = ctx3.createLinearGradient(0, y, 0, y + CARD_H);
    g.addColorStop(0, C2.bodyTop);
    g.addColorStop(1, C2.bodyBot);
    ctx3.fillStyle = g;
    ctx3.fillRect(x, y, CARD_W, CARD_H);
    const portrait = 100;
    const cx = x + CARD_W / 2, cy = y + CARD_H / 2 + 4;
    const img = getImage(assetName);
    ctx3.drawImage(img, cx - portrait / 2, cy - portrait / 2, portrait, portrait);
    ctx3.restore();
    _checker(ctx3, x, y, CARD_W, CARD_H, r);
    if (isActive) {
      ctx3.strokeStyle = C2.activeGlow;
      ctx3.lineWidth = 5;
      _rr(ctx3, x, y, CARD_W, CARD_H, r);
      ctx3.stroke();
    }
    ctx3.strokeStyle = C2.outline;
    ctx3.lineWidth = 3;
    _rr(ctx3, x, y, CARD_W, CARD_H, r);
    ctx3.stroke();
  }
  function _checker(ctx3, x, y, w, h, r) {
    const T = 10, S = 10;
    ctx3.save();
    ctx3.beginPath();
    _rrSub(ctx3, x, y, w, h, r);
    _rrSub(ctx3, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
    ctx3.clip("evenodd");
    for (let py = y; py < y + h; py += S) {
      for (let px = x; px < x + w; px += S) {
        const k = (Math.floor((px - x) / S) + Math.floor((py - y) / S)) % 2;
        ctx3.fillStyle = k ? C2.checkerL : C2.checkerD;
        ctx3.fillRect(px, py, S, S);
      }
    }
    ctx3.restore();
    ctx3.strokeStyle = C2.outline;
    ctx3.lineWidth = 1.5;
    _rr(ctx3, x + T, y + T, w - T * 2, h - T * 2, Math.max(0, r - 4));
    ctx3.stroke();
  }
  function _rrSub(ctx3, x, y, w, h, r) {
    ctx3.moveTo(x + r, y);
    ctx3.lineTo(x + w - r, y);
    ctx3.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx3.lineTo(x + w, y + h - r);
    ctx3.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx3.lineTo(x + r, y + h);
    ctx3.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx3.lineTo(x, y + r);
    ctx3.quadraticCurveTo(x, y, x + r, y);
    ctx3.closePath();
  }
  function _rr(ctx3, x, y, w, h, r) {
    ctx3.beginPath();
    ctx3.moveTo(x + r, y);
    ctx3.lineTo(x + w - r, y);
    ctx3.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx3.lineTo(x + w, y + h - r);
    ctx3.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx3.lineTo(x + r, y + h);
    ctx3.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx3.lineTo(x, y + r);
    ctx3.quadraticCurveTo(x, y, x + r, y);
    ctx3.closePath();
  }
  function _gear(ctx3, cx, cy) {
    const r = 18;
    ctx3.fillStyle = C2.tread;
    ctx3.beginPath();
    ctx3.arc(cx, cy, r, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.fillStyle = C2.gear;
    ctx3.beginPath();
    ctx3.arc(cx, cy, r - 6, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.strokeStyle = C2.outline;
    ctx3.lineWidth = 2;
    ctx3.beginPath();
    ctx3.arc(cx, cy, r, 0, Math.PI * 2);
    ctx3.stroke();
    ctx3.beginPath();
    ctx3.moveTo(cx - r + 4, cy);
    ctx3.lineTo(cx + r - 4, cy);
    ctx3.moveTo(cx, cy - r + 4);
    ctx3.lineTo(cx, cy + r - 4);
    ctx3.stroke();
  }

  // scene_interior/rip.js
  var STONE_W = 70;
  var STONE_H = 90;
  function drawRipStones(ctx3) {
    for (const unit of state.units) {
      if (unit.alive) continue;
      const a = getFloorAnchor(unit.floor);
      if (!a) continue;
      _drawStone(ctx3, a.x, a.y);
    }
  }
  function _drawStone(ctx3, cx, groundY) {
    const w = STONE_W, h = STONE_H;
    const left = cx - w / 2;
    const top = groundY - h;
    const archR = w / 2;
    const archCenterY = top + archR;
    ctx3.save();
    ctx3.fillStyle = "#2D4A2D";
    ctx3.beginPath();
    ctx3.ellipse(cx, groundY, w / 2 + 6, 6, 0, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 2;
    ctx3.stroke();
    const bodyPath = () => {
      ctx3.beginPath();
      ctx3.moveTo(left, groundY);
      ctx3.lineTo(left, archCenterY);
      ctx3.arc(cx, archCenterY, archR, Math.PI, 0, false);
      ctx3.lineTo(left + w, groundY);
      ctx3.closePath();
    };
    ctx3.fillStyle = "#D8D8D2";
    bodyPath();
    ctx3.fill();
    ctx3.save();
    bodyPath();
    ctx3.clip();
    ctx3.fillStyle = "#E8E8E2";
    ctx3.beginPath();
    ctx3.moveTo(left, top);
    ctx3.lineTo(left + w * 0.55, top);
    ctx3.lineTo(left + w * 0.3, groundY);
    ctx3.lineTo(left, groundY);
    ctx3.closePath();
    ctx3.fill();
    ctx3.fillStyle = "#A8A8A2";
    ctx3.beginPath();
    ctx3.moveTo(left + w, top + archR * 0.5);
    ctx3.lineTo(left + w, groundY);
    ctx3.lineTo(left + w * 0.55, groundY);
    ctx3.closePath();
    ctx3.fill();
    ctx3.restore();
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 3;
    bodyPath();
    ctx3.stroke();
    const textY = archCenterY + 14;
    ctx3.strokeStyle = "#EFEFEA";
    ctx3.lineWidth = 1;
    ctx3.beginPath();
    ctx3.moveTo(cx - 16, textY - 12);
    ctx3.lineTo(cx + 16, textY - 12);
    ctx3.stroke();
    ctx3.fillStyle = "#3A3A3A";
    ctx3.font = "bold 22px sans-serif";
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.fillText("RIP", cx, textY + 4);
    ctx3.restore();
  }

  // shared/hud_top.js
  var ICON_SIZE = 50;
  var PAD = 12;
  function drawTopHud(ctx3) {
    const W3 = ctx3.canvas.width;
    ctx3.fillStyle = "#000";
    ctx3.fillRect(0, 0, W3, 22);
    const cx = W3 / 2;
    const barH = 22;
    const barY = 0;
    const bluePct = Math.max(0, Math.min(100, state.hp_self_pct)) / 100;
    const redPct = Math.max(0, Math.min(100, state.hp_enemy_pct)) / 100;
    const blueBarW = (cx - 4) * bluePct;
    ctx3.fillStyle = "#3DA0FF";
    ctx3.fillRect(0, barY, blueBarW, barH);
    ctx3.fillStyle = "rgba(0,0,0,0.18)";
    ctx3.fillRect(0, barY + barH - 5, blueBarW, 5);
    const redBarW = (cx - 4) * redPct;
    ctx3.fillStyle = "#FF4848";
    ctx3.fillRect(W3 - redBarW, barY, redBarW, barH);
    ctx3.fillStyle = "rgba(0,0,0,0.18)";
    ctx3.fillRect(W3 - redBarW, barY + barH - 5, redBarW, 5);
    ctx3.save();
    ctx3.font = "bold 30px sans-serif";
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.lineWidth = 6;
    ctx3.lineJoin = "round";
    ctx3.strokeStyle = "#000";
    ctx3.fillStyle = "#FFFFFF";
    ctx3.strokeText("VS", cx, 11);
    ctx3.fillText("VS", cx, 11);
    ctx3.restore();
    drawSide(ctx3, PAD, 30, "BLUE_CASTLE", state.hp_self_pct, false);
    drawSide(ctx3, W3 - PAD - ICON_SIZE, 30, "RED_CASTLE", state.hp_enemy_pct, true);
  }
  function drawSide(ctx3, iconX, iconY, assetName, hpPct, mirror) {
    if (isImageReady(assetName)) {
      ctx3.save();
      if (mirror) {
        ctx3.translate(iconX + ICON_SIZE, iconY);
        ctx3.scale(-1, 1);
        ctx3.drawImage(getImage(assetName), 0, 0, ICON_SIZE, ICON_SIZE);
      } else {
        ctx3.drawImage(getImage(assetName), iconX, iconY, ICON_SIZE, ICON_SIZE);
      }
      ctx3.restore();
    } else {
      getImage(assetName);
      ctx3.fillStyle = mirror ? "#9B2E29" : "#3D6FA8";
      ctx3.fillRect(iconX, iconY, ICON_SIZE, ICON_SIZE);
    }
    ctx3.save();
    ctx3.font = "bold 28px sans-serif";
    ctx3.textBaseline = "top";
    ctx3.lineWidth = 5;
    ctx3.lineJoin = "round";
    ctx3.strokeStyle = "#000";
    ctx3.fillStyle = "#FFFFFF";
    const txt = `${Math.round(hpPct)}%`;
    if (mirror) {
      ctx3.textAlign = "right";
      ctx3.strokeText(txt, iconX - 6, iconY + 14);
      ctx3.fillText(txt, iconX - 6, iconY + 14);
    } else {
      ctx3.textAlign = "left";
      ctx3.strokeText(txt, iconX + ICON_SIZE + 6, iconY + 14);
      ctx3.fillText(txt, iconX + ICON_SIZE + 6, iconY + 14);
    }
    ctx3.restore();
  }

  // playable/hand_cursor.js
  var _target = null;
  var _drag = null;
  function showHandOn(target) {
    _target = target;
    _drag = null;
  }
  function hideHand() {
    _target = null;
    _drag = null;
  }
  function showHandDrag(from, to, progress) {
    _target = null;
    _drag = { from, to, progress: Math.max(0, Math.min(1, progress)) };
  }
  function drawHandCursor(ctx3, t) {
    let x, y;
    if (_drag) {
      x = _drag.from.x + (_drag.to.x - _drag.from.x) * _drag.progress;
      y = _drag.from.y + (_drag.to.y - _drag.from.y) * _drag.progress;
      ctx3.save();
      ctx3.strokeStyle = "rgba(255,255,255,0.55)";
      ctx3.lineWidth = 4;
      ctx3.setLineDash([6, 8]);
      ctx3.beginPath();
      ctx3.moveTo(_drag.from.x, _drag.from.y);
      ctx3.lineTo(x, y);
      ctx3.stroke();
      ctx3.restore();
    } else if (_target) {
      x = _target.x;
      y = _target.y;
    } else {
      return;
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.4);
    const ringR = 30 + pulse * 14;
    ctx3.save();
    ctx3.strokeStyle = `rgba(255,255,255,${0.3 + 0.4 * (1 - pulse)})`;
    ctx3.lineWidth = 4;
    ctx3.beginPath();
    ctx3.arc(x, y, ringR, 0, Math.PI * 2);
    ctx3.stroke();
    const hx = x + 6, hy = y + 4;
    ctx3.translate(hx, hy);
    ctx3.rotate(-0.35);
    ctx3.fillStyle = "#FFFFFF";
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 2;
    ctx3.beginPath();
    ctx3.moveTo(0, 0);
    ctx3.lineTo(8, -22);
    ctx3.lineTo(16, -20);
    ctx3.lineTo(14, -2);
    ctx3.lineTo(20, -2);
    ctx3.lineTo(22, 14);
    ctx3.lineTo(20, 26);
    ctx3.lineTo(2, 28);
    ctx3.lineTo(-6, 22);
    ctx3.lineTo(-8, 8);
    ctx3.closePath();
    ctx3.fill();
    ctx3.stroke();
    ctx3.restore();
  }

  // playable/endcard.js
  var _opacity = 0;
  var _shown = false;
  var _tapHandlerInstalled = false;
  var W = 540;
  var H = 960;
  var CTA_BTN = { x: 90, y: 700, w: 360, h: 92, r: 18 };
  function setEndcardOpacity(v) {
    _opacity = Math.max(0, Math.min(1, v));
    _shown = _opacity > 0.01;
  }
  function installEndcardTap(canvas4) {
    if (_tapHandlerInstalled) return;
    _tapHandlerInstalled = true;
    canvas4.addEventListener("pointerdown", (ev) => {
      if (!_shown || _opacity < 0.6) return;
      ev.preventDefault();
      try {
        window.Voodoo?.playable?.redirectToInstallPage();
      } catch (e) {
        console.error(e);
      }
    });
  }
  function drawEndcard(ctx3, t) {
    if (_opacity <= 0) return;
    ctx3.save();
    ctx3.globalAlpha = _opacity;
    if (isImageReady("ENDCARD_BG")) {
      ctx3.drawImage(getImage("ENDCARD_BG"), 0, 0, W, H);
    } else {
      getImage("ENDCARD_BG");
      ctx3.fillStyle = "#1A2A4A";
      ctx3.fillRect(0, 0, W, H);
    }
    const grad = ctx3.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx3.fillStyle = grad;
    ctx3.fillRect(0, 0, W, H);
    ctx3.fillStyle = "#FFD23A";
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 6;
    ctx3.font = "bold 72px sans-serif";
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    ctx3.strokeText("VICTORY!", W / 2, 280);
    ctx3.fillText("VICTORY!", W / 2, 280);
    ctx3.fillStyle = "#FFFFFF";
    ctx3.font = "bold 32px sans-serif";
    ctx3.lineWidth = 4;
    ctx3.strokeText("Build your castle.", W / 2, 400);
    ctx3.fillText("Build your castle.", W / 2, 400);
    ctx3.strokeText("Crush your enemies.", W / 2, 444);
    ctx3.fillText("Crush your enemies.", W / 2, 444);
    const pulse = 1 + 0.04 * Math.sin(t * 2 * Math.PI * 1);
    const cx = CTA_BTN.x + CTA_BTN.w / 2;
    const cy = CTA_BTN.y + CTA_BTN.h / 2;
    ctx3.save();
    ctx3.translate(cx, cy);
    ctx3.scale(pulse, pulse);
    ctx3.translate(-cx, -cy);
    ctx3.fillStyle = "#3FB13F";
    roundRect(ctx3, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
    ctx3.fill();
    ctx3.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(ctx3, CTA_BTN.x + 4, CTA_BTN.y + 4, CTA_BTN.w - 8, 14, CTA_BTN.r - 4);
    ctx3.fill();
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 4;
    roundRect(ctx3, CTA_BTN.x, CTA_BTN.y, CTA_BTN.w, CTA_BTN.h, CTA_BTN.r);
    ctx3.stroke();
    ctx3.fillStyle = "#FFFFFF";
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 4;
    ctx3.font = "bold 44px sans-serif";
    ctx3.strokeText("PLAY NOW", cx, cy + 4);
    ctx3.fillText("PLAY NOW", cx, cy + 4);
    ctx3.restore();
    ctx3.restore();
  }
  function roundRect(ctx3, x, y, w, h, r) {
    ctx3.beginPath();
    ctx3.moveTo(x + r, y);
    ctx3.lineTo(x + w - r, y);
    ctx3.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx3.lineTo(x + w, y + h - r);
    ctx3.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx3.lineTo(x + r, y + h);
    ctx3.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx3.lineTo(x, y + r);
    ctx3.quadraticCurveTo(x, y, x + r, y);
    ctx3.closePath();
  }

  // playable/script.js
  var PHASE_INTRO_END = 4500;
  var PHASE_TUTORIAL_MAX = 22e3;
  var PHASE_FREEPLAY_END = 38e3;
  var PHASE_FORCEWIN_END = 42500;
  var ENDCARD_FADE_MS = 400;
  var game = {
    phase: (
      /** @type {'intro'|'tutorial'|'freeplay'|'forcewin'|'endcard'} */
      "intro"
    ),
    t0: 0,
    shotsFired: 0
  };
  window.__game = game;
  function runScript(canvas4) {
    game.t0 = performance.now();
    installEndcardTap(canvas4);
    on("player_fire", () => {
      game.shotsFired += 1;
    });
    on("cut_to_interior", (payload) => {
      if (game.phase === "freeplay" && state.hp_self_pct < 30) {
        state.hp_self_pct = 30;
      }
    });
  }
  function drawScriptOverlay(ctx3, t) {
    if (!game.t0) return;
    const elapsed = performance.now() - game.t0;
    _updatePhase(elapsed);
    _paintOverlay(ctx3, t, elapsed);
  }
  function _updatePhase(elapsed) {
    switch (game.phase) {
      case "intro":
        if (elapsed > PHASE_INTRO_END) game.phase = "tutorial";
        break;
      case "tutorial":
        if (game.shotsFired >= 2 || elapsed > PHASE_TUTORIAL_MAX) {
          game.phase = "freeplay";
          hideHand();
        }
        break;
      case "freeplay":
        if (elapsed > PHASE_FREEPLAY_END || state.hp_enemy_pct <= 5) {
          game.phase = "forcewin";
          state.hp_enemy_pct = 0;
        }
        break;
      case "forcewin":
        if (elapsed > PHASE_FORCEWIN_END) {
          game.phase = "endcard";
          try {
            window.Voodoo?.playable?.win();
          } catch {
          }
        }
        break;
      case "endcard": {
        const fade = Math.max(0, elapsed - PHASE_FORCEWIN_END) / ENDCARD_FADE_MS;
        setEndcardOpacity(Math.min(1, fade));
        break;
      }
    }
  }
  function _paintOverlay(ctx3, t, elapsed) {
    const W3 = ctx3.canvas.width, H3 = ctx3.canvas.height;
    if (game.phase === "tutorial" && getState() === "INTERIOR_AIM") {
      const f = getActiveFloor();
      if (f !== null) {
        const a = getFloorAnchor(f);
        const handX = a.x, handY = a.y - 40;
        const cycleMs = 2200;
        const c = elapsed % cycleMs / cycleMs;
        if (c < 0.18) {
          showHandOn({ x: handX, y: handY });
        } else if (c < 0.92) {
          const p = (c - 0.18) / 0.74;
          showHandDrag({ x: handX, y: handY }, { x: handX - 160, y: handY + 160 }, p);
          drawDottedTrajectory(ctx3, { x: a.x, y: a.y - 40 }, { x: 160 * p, y: -160 * p });
        } else {
          hideHand();
        }
      }
      drawHandCursor(ctx3, t);
      return;
    }
    if (game.phase === "forcewin") {
      const since = elapsed - PHASE_FREEPLAY_END;
      const alpha = since < 700 ? since / 700 * 0.85 : Math.max(0, 0.85 - (since - 700) / 3500 * 0.85);
      ctx3.save();
      ctx3.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx3.fillRect(0, 0, W3, H3);
      ctx3.restore();
      return;
    }
    if (game.phase === "endcard") {
      drawEndcard(ctx3, t);
      return;
    }
  }
  function _devForcePhase(phase) {
    game.phase = phase;
    const PHASE_T0_MS = {
      intro: 0,
      tutorial: PHASE_INTRO_END + 100,
      freeplay: PHASE_TUTORIAL_MAX + 100,
      forcewin: PHASE_FREEPLAY_END + 100,
      endcard: PHASE_FORCEWIN_END + 100
    };
    game.t0 = performance.now() - (PHASE_T0_MS[phase] ?? 0);
    if (phase === "endcard") setEndcardOpacity(1);
    if (phase === "forcewin") state.hp_enemy_pct = 0;
  }
  window.__forcePhase = _devForcePhase;
  window.__simulateFire = (angle_deg = 55, power = 0.95) => {
    const unit_id = getActiveUnitId();
    if (!unit_id) return false;
    emit("player_fire", { unit_id, angle_deg, power });
    return true;
  };

  // scene_exterior/raven.js
  function drawRaven(ctx3, x, y, t, opts = {}) {
    const size = opts.size ?? 60;
    const mirror = !!opts.mirror;
    const flapSpeed = opts.flapSpeed ?? 5;
    const s = size / 60;
    const phase = Math.sin(t * 2 * Math.PI * flapSpeed);
    ctx3.save();
    ctx3.translate(x, y);
    if (mirror) ctx3.scale(-1, 1);
    ctx3.scale(s, s);
    const black = "#0d0d10";
    const sheen = "#23232b";
    const beak = "#0a0a0c";
    ctx3.fillStyle = black;
    ctx3.beginPath();
    ctx3.moveTo(-18, -2);
    ctx3.lineTo(-26, -6);
    ctx3.lineTo(-28, 0);
    ctx3.lineTo(-26, 5);
    ctx3.lineTo(-18, 4);
    ctx3.closePath();
    ctx3.fill();
    ctx3.beginPath();
    ctx3.ellipse(-4, 2, 16, 9, 0, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.beginPath();
    ctx3.arc(11, -3, 7, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.fillStyle = beak;
    ctx3.beginPath();
    ctx3.moveTo(17, -3);
    ctx3.lineTo(24, -2);
    ctx3.lineTo(17, 0);
    ctx3.closePath();
    ctx3.fill();
    ctx3.fillStyle = "#fff";
    ctx3.beginPath();
    ctx3.arc(13, -5, 1.2, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.fillStyle = sheen;
    drawWing(ctx3, phase * 0.85, true);
    ctx3.fillStyle = black;
    drawWing(ctx3, phase, false);
    ctx3.strokeStyle = "#000";
    ctx3.lineWidth = 0.6;
    ctx3.strokeStyle = sheen;
    ctx3.lineWidth = 1;
    ctx3.beginPath();
    ctx3.moveTo(-12, 6);
    ctx3.quadraticCurveTo(-2, 9, 8, 5);
    ctx3.stroke();
    ctx3.restore();
  }
  function drawWing(ctx3, phase, far) {
    const angle = phase * (75 * Math.PI / 180);
    ctx3.save();
    ctx3.translate(far ? 0 : -1, far ? -4 : -6);
    ctx3.rotate(-angle);
    const len = far ? 16 : 24;
    const chord = far ? 8 : 12;
    ctx3.beginPath();
    ctx3.moveTo(0, 0);
    ctx3.quadraticCurveTo(-len * 0.5, -chord * 0.4, -len, -chord * 0.1);
    ctx3.lineTo(-len * 0.85, chord * 0.55);
    ctx3.lineTo(-len * 0.7, chord * 0.25);
    ctx3.lineTo(-len * 0.55, chord * 0.85);
    ctx3.lineTo(-len * 0.42, chord * 0.4);
    ctx3.lineTo(-len * 0.28, chord * 1);
    ctx3.lineTo(-len * 0.15, chord * 0.45);
    ctx3.lineTo(-len * 0.02, chord * 0.7);
    ctx3.closePath();
    ctx3.fill();
    ctx3.restore();
  }

  // scene_exterior/raven_flock.js
  function drawRavenFlock(ctx3, elapsedMs, params2) {
    const {
      from,
      to,
      durMs,
      sinAmp = 40,
      sinHalfCycles = 3,
      spreadPx = 60,
      ravenSize = 60,
      flapSpeed = 5
    } = params2;
    const u = Math.max(0, Math.min(1, elapsedMs / durMs));
    const done = elapsedMs >= durMs;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const mirror = dx < 0;
    const half = spreadPx / 2;
    const dir = mirror ? -1 : 1;
    const baseX = from.x + dx * u;
    const baseY = from.y + dy * u;
    const wave = Math.sin(u * Math.PI * sinHalfCycles);
    const offset = wave * sinAmp;
    const tSec = elapsedMs / 1e3;
    const ax = baseX + dir * half;
    const ay = baseY + offset;
    const bx = baseX - dir * half;
    const by = baseY - offset;
    drawRaven(ctx3, ax, ay, tSec, { size: ravenSize, mirror, flapSpeed });
    drawRaven(ctx3, bx, by, tSec, { size: ravenSize, mirror, flapSpeed });
    return {
      a: { x: ax, y: ay, done },
      b: { x: bx, y: by, done }
    };
  }

  // scene_exterior/projectile_sprites.js
  try {
    getImage("ROCKET");
    getImage("BOMB");
  } catch (_) {
  }
  var SHOT_BY_UNIT = {
    // 4-shot burst of small Projectile_1 missiles. Stagger 110 ms so they read
    // as a "rafale" without collapsing into one blob.
    skeleton: {
      count: 4,
      staggerMs: 110,
      assetKey: "ROCKET",
      kind: "rocket_p1",
      size: 30,
      durMs: 1500,
      peakLift: 360
    },
    // Single Projectile_2 bomb, slower and chunkier. Heavy peakLift + slightly
    // slower than rocket so the flashy trail reads.
    cyclop: {
      count: 1,
      staggerMs: 0,
      assetKey: "BOMB",
      kind: "bomb_p2",
      size: 44,
      durMs: 1700,
      peakLift: 420
    },
    // Goblin keeps the current procedural red ball (kind:'rocket', no sprite
    // → falls back to the existing _drawRocketSprite procedural branch).
    orc: {
      count: 1,
      staggerMs: 0,
      assetKey: null,
      kind: "rocket",
      size: 36,
      durMs: 1500,
      peakLift: 380
    }
  };
  function planForUnit(unit_id) {
    return SHOT_BY_UNIT[
      /** @type {'skeleton'|'cyclop'|'orc'} */
      unit_id
    ] ?? SHOT_BY_UNIT.orc;
  }
  function drawProjectileP1(ctx3, x, y, ang, size = 30) {
    if (!isImageReady("ROCKET")) {
      getImage("ROCKET");
      ctx3.save();
      ctx3.translate(x, y);
      ctx3.rotate(ang);
      ctx3.fillStyle = "#bcbcc4";
      ctx3.fillRect(-size / 2, -size / 4, size, size / 2);
      ctx3.fillStyle = "#c93030";
      ctx3.fillRect(-size / 6, -size / 4, size / 3, size / 2);
      ctx3.restore();
      return;
    }
    ctx3.save();
    ctx3.translate(x, y);
    ctx3.rotate(ang);
    ctx3.drawImage(getImage("ROCKET"), -size / 2, -size / 2, size, size);
    ctx3.restore();
  }
  function drawProjectileP2(ctx3, x, y, ang, size = 44) {
    if (!isImageReady("BOMB")) {
      getImage("BOMB");
      ctx3.save();
      ctx3.translate(x, y);
      ctx3.rotate(ang);
      ctx3.fillStyle = "#3a3a22";
      ctx3.beginPath();
      ctx3.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.fillStyle = "#c14a2a";
      ctx3.fillRect(size / 4, -size / 6, size / 4, size / 3);
      ctx3.restore();
      return;
    }
    ctx3.save();
    ctx3.translate(x, y);
    ctx3.rotate(ang);
    ctx3.drawImage(getImage("BOMB"), -size / 2, -size / 2, size, size);
    ctx3.restore();
  }

  // scene_exterior/index.js
  var W2 = 540;
  var H2 = 960;
  var HORIZON_Y = 600;
  var BASE_Y = 720;
  var BASE_H = 56;
  var TREAD_Y = BASE_Y + BASE_H - 10;
  var TREAD_H = 30;
  var CASTLE_W = 340;
  var CASTLE_H = 440;
  var CASTLE_X = (W2 - CASTLE_W) / 2;
  var CASTLE_TOP_Y = BASE_Y - CASTLE_H + 12;
  var MUZZLE_OFFSET = { x: CASTLE_W * 0.2, y: 110 };
  var muzzlePos = () => ({ x: CASTLE_X + MUZZLE_OFFSET.x, y: CASTLE_TOP_Y + MUZZLE_OFFSET.y });
  var view = "OURS";
  var dmg = {
    OURS: (
      /** @type {DamageZone[]} */
      []
    ),
    ENEMY: (
      /** @type {DamageZone[]} */
      []
    )
  };
  function _makeDamageZone(x, y, r) {
    const poly = (
      /** @type {[number,number][]} */
      []
    );
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + Math.random() * 0.35;
      const rr = r * (0.65 + Math.random() * 0.55);
      poly.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    const innerRim = (
      /** @type {[number,number][]} */
      []
    );
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + Math.random() * 0.4;
      const rr = r * (0.55 + Math.random() * 0.18);
      innerRim.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    const cracks = (
      /** @type {[number,number][]} */
      []
    );
    const nC = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < nC; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = r * (1.05 + Math.random() * 0.6);
      cracks.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    const innerChunks = (
      /** @type {{x:number,y:number,w:number,h:number,rot:number,shade:number,lit:boolean}[]} */
      []
    );
    const nChunks = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < nChunks; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = r * (0.15 + Math.random() * 0.42);
      innerChunks.push({
        x: x + Math.cos(a) * rr,
        y: y + Math.sin(a) * rr,
        w: 3 + Math.random() * 5,
        h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        shade: Math.random(),
        lit: Math.random() < 0.35
      });
    }
    return { x, y, r, poly, cracks, innerRim, innerChunks };
  }
  var tiltAngle = 0;
  var tiltUntil = 0;
  var enemyRecoil = (
    /** @type {{t0:number,dur:number,peak:number}|null} */
    null
  );
  var _treadScrollOffset = 0;
  var shakeStart = 0;
  var shakeDur = 0;
  var shakeIntensity = 0;
  function triggerShake(intensity, durMs) {
    shakeStart = performance.now();
    shakeDur = durMs;
    shakeIntensity = intensity;
  }
  var floats = [];
  var projectiles = [];
  var particles = [];
  function _spawnExplosion(x, y, opts) {
    const t = performance.now();
    const heavy = opts && opts.heavy;
    particles.push({
      kind: "flash",
      x,
      y,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      t0: t,
      life: 140,
      size: 90,
      color: "#FFF7C8",
      rot: 0,
      rotSpeed: 0,
      sizeGrow: 1.6
    });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.random() * 0.5;
      particles.push({
        kind: "flash",
        x: x + Math.cos(a) * 8,
        y: y + Math.sin(a) * 8,
        vx: Math.cos(a) * 60,
        vy: Math.sin(a) * 60,
        ax: 0,
        ay: 0,
        t0: t,
        life: 280 + Math.random() * 120,
        size: 38 + Math.random() * 22,
        color: i % 2 ? "#FF8030" : "#E03B12",
        rot: 0,
        rotSpeed: 0,
        sizeGrow: 1.2
      });
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 320 + Math.random() * 220;
      particles.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        ax: 0,
        ay: 280,
        t0: t,
        life: 320 + Math.random() * 180,
        size: 3 + Math.random() * 2,
        color: "#FFE07A",
        rot: 0,
        rotSpeed: 0,
        sizeGrow: 0
      });
    }
    const nDebris = heavy ? 22 : 16;
    for (let i = 0; i < nDebris; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const sp = 180 + Math.random() * 260;
      particles.push({
        kind: "debris",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        ax: 0,
        ay: 720,
        t0: t,
        life: 1100 + Math.random() * 700,
        size: 5 + Math.random() * 8,
        color: ["#7C7368", "#5C5048", "#9C8C7C", "#3F3530"][i % 4],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 14,
        sizeGrow: 0
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({
        kind: "smoke",
        x: x + Math.cos(a) * 12,
        y: y + Math.sin(a) * 12,
        vx: Math.cos(a) * 20,
        vy: -30 - Math.random() * 30,
        ax: 0,
        ay: -10,
        t0: t + i * 30,
        life: 1600 + Math.random() * 900,
        size: 22 + Math.random() * 16,
        color: "rgba(60,55,50,1)",
        rot: 0,
        rotSpeed: 0,
        sizeGrow: 1.8
      });
    }
  }
  var step = "idle";
  var stepT0 = 0;
  var transitioning = false;
  var transitionT0 = 0;
  var transitionEndAction = (
    /** @type {(()=>void)|null} */
    null
  );
  var transitionEndFired = false;
  var TRANSITION_DUR = 1300;
  var viewTransition = (
    /** @type {null|{fromView:'OURS'|'ENEMY',toView:'OURS'|'ENEMY',t0:number,dur:number,dir:1|-1}} */
    null
  );
  var pendingPlayerDmg = 0;
  var pendingEnemyDmg = 0;
  var pendingPlayerImpact = (
    /** @type {{x:number,y:number}|null} */
    null
  );
  var pendingEnemyImpact = (
    /** @type {{x:number,y:number}|null} */
    null
  );
  var pendingKills = (
    /** @type {string[]} */
    []
  );
  var visible = false;
  var rafId = 0;
  var canvas = null;
  var ctx = null;
  function mount(c) {
    canvas = c;
    ctx = c.getContext("2d");
    subscribe((s) => {
      visible = s === "EXTERIOR_OBSERVE" || s === "EXTERIOR_RESOLVE" || s === "INTRO_INCOMING" || s === "END_VICTORY" || s === "END_DEFEAT";
      if (s === "EXTERIOR_OBSERVE") {
        view = "OURS";
      }
      if (s === "INTRO_INCOMING") {
        view = "ENEMY";
        _startIncoming();
      }
      if (s === "END_VICTORY") {
        view = "ENEMY";
      }
      if (s === "END_DEFEAT") {
        view = "OURS";
      }
      if (visible && !rafId) loop();
    });
    on("player_fire", startPlayerShot);
  }
  function _startIncoming() {
    view = "ENEMY";
    step = "intro_dwell";
    stepT0 = performance.now();
    const target = {
      x: CASTLE_X + CASTLE_W * (0.45 + Math.random() * 0.4),
      y: CASTLE_TOP_Y + 40 + Math.random() * 200
    };
    pendingPlayerImpact = target;
  }
  function _startIntroPanAndFlock() {
    const now = performance.now();
    const target = pendingPlayerImpact || {
      x: CASTLE_X + CASTLE_W * 0.55,
      y: CASTLE_TOP_Y + 120
    };
    const dmgVal = 33;
    viewTransition = { fromView: "ENEMY", toView: "OURS", t0: now, dur: 1300, dir: -1 };
    const flock = {
      kind: "flock",
      from: { x: W2 + 120, y: 220 + Math.random() * 200 },
      to: target,
      t0: now,
      dur: 1500,
      peakLift: 0,
      sinAmp: 30 + Math.random() * 50,
      sinFreq: 0,
      sinPhase: 0,
      onLand: () => _impactOurs(target, dmgVal)
    };
    projectiles.push(flock);
    step = "incoming";
    stepT0 = now;
  }
  function _impactOurs(at, d) {
    dmg.OURS.push(_makeDamageZone(at.x, at.y, 60 + Math.random() * 18));
    state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
    floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: "#FFE54A" });
    _spawnExplosion(at.x, at.y, { heavy: true });
    triggerShake(20, 520);
    tiltAngle = -0.08;
    tiltUntil = performance.now() + 700;
    if (step === "incoming") {
      setTimeout(() => {
        step = "idle";
        _startExitTransition(() => ready_for_player_input());
      }, 400);
    }
  }
  function startPlayerShot(payload) {
    view = "OURS";
    tiltAngle = -0.07;
    tiltUntil = performance.now() + 600;
    step = "fire";
    stepT0 = performance.now();
    const dmgVal = 14 + Math.floor(Math.random() * 6);
    pendingEnemyDmg = dmgVal;
    pendingEnemyImpact = {
      x: CASTLE_X + CASTLE_W * (0.3 + Math.random() * 0.4),
      y: CASTLE_TOP_Y + 70 + Math.random() * 160
    };
    const t = performance.now();
    const m = muzzlePos();
    const plan = planForUnit(payload?.unit_id);
    const baseTarget = { x: pendingEnemyImpact.x + W2, y: pendingEnemyImpact.y };
    for (let i = 0; i < plan.count; i++) {
      const jitter = plan.count > 1 ? { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 60 } : { x: 0, y: 0 };
      const target = { x: baseTarget.x + jitter.x, y: baseTarget.y + jitter.y };
      const isLast = i === plan.count - 1;
      const proj = {
        kind: plan.kind,
        worldSpace: true,
        from: m,
        to: target,
        t0: t + 250 + i * plan.staggerMs,
        dur: plan.durMs,
        peakLift: plan.peakLift + (plan.count > 1 ? Math.random() * 80 - 40 : 0),
        // Only the final projectile triggers the HP/damage impact ; earlier
        // burst projectiles trigger a light visual splash via _spawnExplosion
        // so the rafale reads on screen but doesn't multiply damage.
        onLand: isLast ? () => _impactEnemy(pendingEnemyImpact, pendingEnemyDmg) : () => {
          _spawnExplosion(target.x - W2, target.y, { heavy: false });
        },
        // optional: store sprite size for renderer
        _spriteSize: plan.size
      };
      projectiles.push(proj);
    }
    viewTransition = { fromView: "OURS", toView: "ENEMY", t0: t + 250, dur: 1300, dir: 1 };
  }
  function _tick(now) {
    if (tiltUntil > 0) {
      const total = 600;
      const remain = tiltUntil - now;
      if (remain <= 0) {
        tiltAngle = 0;
        tiltUntil = 0;
      } else if (remain < total * 0.6) tiltAngle *= 0.86;
    }
    if (step === "intro_dwell" && now - stepT0 > 1500) {
      _startIntroPanAndFlock();
    }
    if (step === "enemy_dwell" && now - stepT0 > 1500) {
      _startEnemyRiposte();
    }
    if (step === "pan_back_to_ours" && !viewTransition) {
      _spawnEnemyRiposteFlock();
    }
    if (step === "ours_dwell" && now - stepT0 > 1500) {
      step = "idle";
      emit("cut_to_interior", {
        hp_self_after: state.hp_self_pct,
        hp_enemy_after: state.hp_enemy_pct,
        units_destroyed_ids: pendingKills
      });
    }
  }
  function _startEnemyRiposte() {
    const now = performance.now();
    step = "pan_back_to_ours";
    stepT0 = now;
    viewTransition = {
      fromView: "ENEMY",
      toView: "OURS",
      t0: now,
      dur: 950,
      dir: -1
    };
  }
  function _spawnEnemyRiposteFlock() {
    const target = {
      x: CASTLE_X + CASTLE_W * (0.45 + Math.random() * 0.4),
      y: CASTLE_TOP_Y + 40 + Math.random() * 200
    };
    const dmgVal = 14 + Math.floor(Math.random() * 6);
    const t = performance.now();
    const flock = {
      kind: "flock",
      from: { x: W2 + 80 + Math.random() * 120, y: 220 + Math.random() * 200 },
      to: target,
      t0: t + 150,
      dur: 1700 + Math.random() * 600,
      peakLift: 0,
      sinAmp: 30 + Math.random() * 50,
      sinFreq: 0,
      sinPhase: 0,
      onLand: () => _routeOursImpact(target, dmgVal)
    };
    projectiles.push(flock);
    step = "cut_to_ours";
    stepT0 = performance.now();
  }
  function _impactEnemy(at, d) {
    dmg.ENEMY.push(_makeDamageZone(at.x, at.y, 60 + Math.random() * 18));
    state.hp_enemy_pct = Math.max(0, state.hp_enemy_pct - d);
    floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: "#FFE54A" });
    _spawnExplosion(at.x, at.y, { heavy: true });
    triggerShake(18, 480);
    tiltAngle = 0.09;
    tiltUntil = performance.now() + 700;
    enemyRecoil = { t0: performance.now(), dur: 680, peak: 42 };
    step = "enemy_dwell";
    stepT0 = performance.now();
  }
  function _startExitTransition(endAction) {
    transitioning = true;
    transitionT0 = performance.now();
    transitionEndAction = endAction;
    transitionEndFired = false;
  }
  function _impactOursDuringResolve(at, d) {
    dmg.OURS.push(_makeDamageZone(at.x, at.y, 50 + Math.random() * 14));
    state.hp_self_pct = Math.max(30, state.hp_self_pct - d);
    floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: "#FFE54A" });
    _spawnExplosion(at.x, at.y, { heavy: false });
    triggerShake(11, 380);
    tiltAngle = -0.06;
    tiltUntil = performance.now() + 500;
    step = "ours_dwell";
    stepT0 = performance.now();
  }
  function _routeOursImpact(at, d) {
    if (step === "cut_to_ours") {
      _impactOursDuringResolve(at, d);
    } else {
      dmg.OURS.push(_makeDamageZone(at.x, at.y, 55));
      state.hp_self_pct = Math.max(0, state.hp_self_pct - d);
      floats.push({ x: at.x, y: at.y - 24, t0: performance.now(), text: `-${d}`, color: "#FFE54A" });
      _spawnExplosion(at.x, at.y, { heavy: true });
      triggerShake(20, 520);
      if (step === "incoming") {
        setTimeout(() => {
          step = "idle";
          _startExitTransition(() => ready_for_player_input());
        }, 400);
      }
    }
  }
  function loop() {
    if (!visible) {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(loop);
    if (!ctx || !canvas) return;
    const now = performance.now();
    _tick(now);
    let sx = 0, sy = 0;
    const sElapsed = now - shakeStart;
    if (sElapsed < shakeDur) {
      const k = 1 - sElapsed / shakeDur;
      const decay = k * k;
      sx = (Math.random() * 2 - 1) * shakeIntensity * decay;
      sy = (Math.random() * 2 - 1) * shakeIntensity * decay;
    }
    let zoomScale = 1;
    let irisProgress = 0;
    let radialSpeedAlpha = 0;
    if (transitioning) {
      const tn = Math.min(1, (now - transitionT0) / TRANSITION_DUR);
      const easedZoom = Math.pow(tn, 2.6);
      zoomScale = 1 + easedZoom * 4;
      const irisRaw = Math.max(0, (tn - 0.4) / 0.6);
      irisProgress = irisRaw * irisRaw * irisRaw;
      if (tn > 0.4 && tn < 0.92) {
        const k = (tn - 0.4) / 0.52;
        radialSpeedAlpha = Math.sin(k * Math.PI) * 0.35;
      }
    }
    let panOffset = 0;
    let panProgress = 0;
    if (viewTransition) {
      const tn = Math.min(1, (now - viewTransition.t0) / viewTransition.dur);
      panProgress = tn;
      const eased = tn < 0.5 ? 4 * tn * tn * tn : 1 - Math.pow(-2 * tn + 2, 3) / 2;
      panOffset = eased * W2 * viewTransition.dir;
      if (tn >= 1) {
        view = viewTransition.toView;
        const onComplete = viewTransition.onComplete;
        viewTransition = null;
        panOffset = 0;
        if (onComplete) onComplete();
      }
    }
    ctx.save();
    ctx.translate(sx, sy);
    if (zoomScale !== 1) {
      const cx = W2 / 2, cy = BASE_Y - 40;
      ctx.translate(cx, cy);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -cy);
    }
    const bgPanFar = -panOffset * 0.18;
    const bgPanMid = -panOffset * 0.42;
    const bgPanNear = -panOffset * 0.7;
    ctx.save();
    ctx.translate(bgPanFar, 0);
    _drawSky(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(bgPanFar, 0);
    _drawHillsFar(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(bgPanMid, 0);
    _drawForestNear(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(bgPanNear, 0);
    _drawGround(ctx);
    ctx.restore();
    if (viewTransition) {
      const dxFrom = -panOffset;
      const dxTo = (viewTransition.dir > 0 ? W2 : -W2) - panOffset;
      _drawCastleSlot(ctx, viewTransition.fromView, dxFrom);
      _drawCastleSlot(ctx, viewTransition.toView, dxTo);
      if (panProgress > 0.15 && panProgress < 0.85) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        const streaks = 6;
        for (let s = 0; s < streaks; s++) {
          const sy0 = s / streaks * H2;
          ctx.fillRect(0, sy0 + 8, W2, 4);
        }
        ctx.restore();
      }
    } else {
      _drawCastleSlot(ctx, view, 0);
    }
    const viewOffset = (view === "ENEMY" ? W2 : 0) + panOffset;
    _drawProjectiles(ctx, now, viewOffset);
    _drawParticles(ctx, now);
    _drawFloats(ctx, now);
    ctx.restore();
    if (radialSpeedAlpha > 0) {
      const cx = W2 / 2, cy = BASE_Y - 40;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = `rgba(255,250,235,${radialSpeedAlpha})`;
      ctx.lineWidth = 2.5;
      const N = 26;
      const innerR = 80;
      const outerR = Math.hypot(W2, H2);
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2 + now / 600;
        const c = Math.cos(a), s = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(c * innerR, s * innerR);
        ctx.lineTo(c * outerR, s * outerR);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (irisProgress > 0) {
      const cx = W2 / 2, cy = BASE_Y - 40;
      const maxR = Math.hypot(Math.max(cx, W2 - cx), Math.max(cy, H2 - cy));
      const r = maxR * (1 - irisProgress);
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.rect(0, 0, W2, H2);
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();
    }
    drawTopHud(ctx);
    drawScriptOverlay(ctx, now / 1e3);
    if (transitioning && !transitionEndFired) {
      const tn = (now - transitionT0) / TRANSITION_DUR;
      if (tn >= 0.92) {
        transitionEndFired = true;
        const endAction = transitionEndAction;
        transitionEndAction = null;
        if (endAction) endAction();
      }
    }
    if (transitioning && now - transitionT0 >= TRANSITION_DUR) {
      transitioning = false;
    }
  }
  function _computeEnemyRecoil(now) {
    if (!enemyRecoil) return { dx: 0 };
    const t = now - enemyRecoil.t0;
    if (t >= enemyRecoil.dur) {
      enemyRecoil = null;
      return { dx: 0 };
    }
    const peak = enemyRecoil.peak;
    const tOut = 220;
    let dx;
    if (t < tOut) {
      const k = t / tOut;
      dx = peak * (1 - Math.pow(1 - k, 3));
    } else {
      const k = (t - tOut) / (enemyRecoil.dur - tOut);
      dx = peak * (1 - k) * (1 - k);
    }
    return { dx };
  }
  function _drawCastleSlot(ctx3, viewMode, dx) {
    ctx3.save();
    let dxExtra = 0;
    if (viewMode === "ENEMY") {
      dxExtra = _computeEnemyRecoil(performance.now()).dx;
      _treadScrollOffset = dxExtra;
    } else {
      _treadScrollOffset = 0;
    }
    ctx3.translate(dx + dxExtra, 0);
    _drawCastleWithBase(ctx3, viewMode);
    _drawDamageMasks(ctx3, viewMode === "OURS" ? dmg.OURS : dmg.ENEMY);
    ctx3.restore();
    _treadScrollOffset = 0;
  }
  var BG_X0 = -W2;
  var BG_W = 3 * W2;
  function drawSky(ctx3) {
    return _drawSky(ctx3);
  }
  function _drawSky(ctx3) {
    const g = ctx3.createLinearGradient(0, 0, 0, HORIZON_Y);
    g.addColorStop(0, "#A8C9B5");
    g.addColorStop(0.55, "#BCD4B7");
    g.addColorStop(1, "#C9D9A8");
    ctx3.fillStyle = g;
    ctx3.fillRect(BG_X0, 0, BG_W, HORIZON_Y);
  }
  function _drawHillsFar(ctx3) {
    const layers = [
      { color: "#7FA38E", amp: 22, period: 320, dy: -34 },
      { color: "#5C8775", amp: 28, period: 240, dy: -10 },
      { color: "#3F6555", amp: 18, period: 180, dy: 20 }
    ];
    for (const L of layers) {
      ctx3.fillStyle = L.color;
      ctx3.beginPath();
      ctx3.moveTo(BG_X0, HORIZON_Y + 80);
      for (let x = BG_X0; x <= BG_X0 + BG_W; x += 6) {
        const y = HORIZON_Y + L.dy - L.amp * Math.sin(x / L.period * Math.PI * 2);
        ctx3.lineTo(x, y);
      }
      ctx3.lineTo(BG_X0 + BG_W, HORIZON_Y + 80);
      ctx3.closePath();
      ctx3.fill();
    }
  }
  function _drawForestNear(ctx3) {
    ctx3.fillStyle = "#2C5443";
    const N = 42;
    for (let i = 0; i < N; i++) {
      const cx = BG_X0 + i / N * BG_W + i * 31 % 28;
      const cy = HORIZON_Y + 22 + i * 17 % 14;
      const r = 22 + i * 7 % 12;
      ctx3.beginPath();
      ctx3.arc(cx, cy, r, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.arc(cx + r * 0.7, cy + 4, r * 0.7, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.arc(cx - r * 0.7, cy + 6, r * 0.65, 0, Math.PI * 2);
      ctx3.fill();
    }
  }
  function _drawGround(ctx3) {
    ctx3.fillStyle = "#7CA055";
    ctx3.beginPath();
    ctx3.moveTo(BG_X0, H2);
    ctx3.lineTo(BG_X0, HORIZON_Y + 90);
    for (let x = BG_X0; x <= BG_X0 + BG_W; x += 8) {
      const y = HORIZON_Y + 90 - 6 * Math.sin(x * 0.025);
      ctx3.lineTo(x, y);
    }
    ctx3.lineTo(BG_X0 + BG_W, H2);
    ctx3.closePath();
    ctx3.fill();
    ctx3.fillStyle = "#5C7A3C";
    ctx3.fillRect(BG_X0, HORIZON_Y + 100, BG_W, 6);
    const dy = HORIZON_Y + 106;
    ctx3.fillStyle = "#3B1A1A";
    ctx3.fillRect(BG_X0, dy, BG_W, H2 - dy);
    ctx3.fillStyle = "rgba(155,40,40,0.32)";
    for (let i = 0; i < 54; i++) {
      const x = BG_X0 + i * 41 % BG_W;
      ctx3.fillRect(x, dy, 2, 90);
    }
  }
  function _drawCastleWithBase(ctx3, viewMode) {
    const cx = W2 / 2;
    const cy = BASE_Y + BASE_H / 2;
    ctx3.save();
    const isActive = (viewMode || view) === view;
    if (isActive && tiltAngle !== 0) {
      ctx3.translate(cx, cy);
      ctx3.rotate(tiltAngle);
      ctx3.translate(-cx, -cy);
    }
    _drawCastle(ctx3, viewMode);
    _drawBase(ctx3);
    _drawTreads(ctx3);
    ctx3.restore();
  }
  function _drawCastle(ctx3, viewMode) {
    const v = viewMode || view;
    const asset = v === "OURS" ? "BLUE_CASTLE" : "RED_CASTLE";
    if (isImageReady(asset)) {
      ctx3.drawImage(getImage(asset), CASTLE_X, CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
    } else {
      getImage(asset);
      ctx3.fillStyle = v === "OURS" ? "#3D6FA8" : "#9B2E29";
      ctx3.fillRect(CASTLE_X, CASTLE_TOP_Y, CASTLE_W, CASTLE_H);
    }
  }
  function _drawBase(ctx3) {
    const x = CASTLE_X - 8;
    const w = CASTLE_W + 16;
    ctx3.fillStyle = "#8B5E3C";
    ctx3.fillRect(x, BASE_Y, w, BASE_H);
    ctx3.fillStyle = "#A07040";
    ctx3.fillRect(x, BASE_Y, w, 8);
    ctx3.fillStyle = "#502E12";
    ctx3.fillRect(x, BASE_Y + BASE_H - 10, w, 10);
    ctx3.fillStyle = "#3B1A12";
    for (let g = 0; g < 2; g++) {
      const gx = x + 50 + g * (w - 130);
      const gw = 36, gh = BASE_H - 18;
      ctx3.beginPath();
      ctx3.moveTo(gx, BASE_Y + BASE_H - 10);
      ctx3.lineTo(gx, BASE_Y + 14 + gh / 2);
      ctx3.arc(gx + gw / 2, BASE_Y + 14 + gh / 2, gw / 2, Math.PI, 0, false);
      ctx3.lineTo(gx + gw, BASE_Y + BASE_H - 10);
      ctx3.closePath();
      ctx3.fill();
    }
    ctx3.strokeStyle = "#1A1A1A";
    ctx3.lineWidth = 3;
    ctx3.strokeRect(x, BASE_Y, w, BASE_H);
  }
  function _drawTreads(ctx3) {
    const xs = [W2 / 2 - 110, W2 / 2 + 110];
    for (const cx of xs) {
      const tw = 150;
      const x = cx - tw / 2;
      ctx3.fillStyle = "#1F1F1F";
      ctx3.fillRect(x, TREAD_Y, tw, TREAD_H);
      ctx3.save();
      ctx3.beginPath();
      ctx3.rect(x, TREAD_Y, tw, TREAD_H);
      ctx3.clip();
      ctx3.fillStyle = "#3A3A3A";
      const off = _treadScrollOffset * 1.6;
      const startI = Math.floor(off / 14) * 14 - 14;
      for (let i = startI; i < tw + 14; i += 14) {
        ctx3.fillRect(x + i + 2 - off, TREAD_Y + 5, 10, TREAD_H - 10);
      }
      ctx3.restore();
      ctx3.fillStyle = "#7C7368";
      for (const wx of [x + 18, x + tw - 18, x + tw / 2]) {
        ctx3.beginPath();
        ctx3.arc(wx, TREAD_Y + TREAD_H / 2, 9, 0, Math.PI * 2);
        ctx3.fill();
      }
      ctx3.strokeStyle = "#1A1A1A";
      ctx3.lineWidth = 2;
      ctx3.strokeRect(x, TREAD_Y, tw, TREAD_H);
    }
  }
  var HOLE_DEEP = "#0A0A0C";
  var HOLE_MID = "#1F1A18";
  var HOLE_OUTER = "#3A3530";
  var STONE_FRAG_DARK = "#5C5450";
  var STONE_FRAG_MID = "#7C7368";
  var STONE_FRAG_LIT = "#9A8E7E";
  var STONE_FRAG_HI = "#B8AC9A";
  function _polyPath(ctx3, pts) {
    ctx3.beginPath();
    ctx3.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
    ctx3.closePath();
  }
  function _drawDamageMasks(ctx3, zones) {
    if (!zones.length) return;
    ctx3.save();
    for (const z of zones) {
      ctx3.fillStyle = HOLE_OUTER;
      _polyPath(ctx3, z.poly);
      ctx3.fill();
      ctx3.fillStyle = HOLE_MID;
      _polyPath(ctx3, z.innerRim);
      ctx3.fill();
      const grad = ctx3.createRadialGradient(
        z.x,
        z.y,
        Math.max(2, z.r * 0.05),
        z.x,
        z.y,
        z.r * 0.7
      );
      grad.addColorStop(0, HOLE_DEEP);
      grad.addColorStop(0.55, HOLE_MID);
      grad.addColorStop(1, "rgba(31,26,24,0)");
      ctx3.fillStyle = grad;
      _polyPath(ctx3, z.innerRim);
      ctx3.fill();
      ctx3.lineJoin = "miter";
      ctx3.lineWidth = 2;
      ctx3.strokeStyle = "#15110F";
      _polyPath(ctx3, z.poly);
      ctx3.stroke();
      ctx3.strokeStyle = "#1A1614";
      ctx3.lineWidth = 2;
      ctx3.lineCap = "round";
      for (const [cx, cy] of z.cracks) {
        ctx3.beginPath();
        ctx3.moveTo(z.x, z.y);
        const mx = (z.x + cx) / 2 + (cy - z.y) * 0.08;
        const my = (z.y + cy) / 2 - (cx - z.x) * 0.08;
        ctx3.lineTo(mx, my);
        ctx3.lineTo(cx, cy);
        ctx3.stroke();
      }
      for (const c of z.innerChunks) {
        ctx3.save();
        ctx3.translate(c.x, c.y);
        ctx3.rotate(c.rot);
        ctx3.fillStyle = c.shade < 0.33 ? STONE_FRAG_DARK : c.shade < 0.75 ? STONE_FRAG_MID : STONE_FRAG_LIT;
        ctx3.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        if (c.lit) {
          ctx3.fillStyle = STONE_FRAG_HI;
          ctx3.fillRect(-c.w / 2, -c.h / 2, c.w, 1);
        }
        ctx3.restore();
      }
      for (let k = 0; k < 6; k++) {
        const a = Math.PI * 2 * (k / 6) + z.x % 1;
        const rr = z.r * 1.05 + k * 5 % 14;
        const px = z.x + Math.cos(a) * rr;
        const py = z.y + Math.sin(a) * rr;
        ctx3.fillStyle = k % 2 ? STONE_FRAG_MID : STONE_FRAG_DARK;
        ctx3.fillRect(px, py, 5 + k % 3 * 2, 4 + k * 3 % 3);
      }
    }
    ctx3.restore();
  }
  function _drawProjectiles(ctx3, now, viewOffset = 0) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (now < p.t0) continue;
      const t = (now - p.t0) / p.dur;
      const dx_screen = p.worldSpace ? -viewOffset : 0;
      if (t >= 1) {
        try {
          if (p.kind === "bomb" && p === projectiles[i]) {
            if (step === "cut_to_ours" || step === "incoming") {
              _routeOursImpact(p.to, step === "incoming" ? 33 : pendingPlayerDmg);
            } else {
              p.onLand();
            }
          } else {
            p.onLand();
          }
        } catch (e) {
          console.error(e);
        }
        projectiles.splice(i, 1);
        continue;
      }
      const pos = _arc(p.from, p.to, t, p.peakLift);
      const ang = _arcAngle(p.from, p.to, t, p.peakLift);
      if (p.kind === "flock") {
        drawRavenFlock(ctx3, now - p.t0, {
          from: p.from,
          to: p.to,
          durMs: p.dur,
          sinAmp: p.sinAmp ?? 50,
          sinHalfCycles: 3,
          spreadPx: 70,
          ravenSize: 60,
          flapSpeed: 5
        });
      } else if (p.kind === "rocket") _drawRocketSprite(ctx3, pos.x + dx_screen, pos.y, ang, 36);
      else if (p.kind === "rocket_p1") drawProjectileP1(ctx3, pos.x + dx_screen, pos.y, ang, p._spriteSize ?? 30);
      else if (p.kind === "bomb_p2") drawProjectileP2(ctx3, pos.x + dx_screen, pos.y, ang, p._spriteSize ?? 44);
      else if (p.kind === "bomb") _drawBombSprite(ctx3, pos.x + dx_screen, pos.y, ang);
    }
  }
  function _arc(a, b, t, peakLift) {
    const mx = (a.x + b.x) / 2;
    const my = Math.min(a.y, b.y) - peakLift;
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * mx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * my + t * t * b.y
    };
  }
  function _arcAngle(a, b, t, peakLift) {
    const eps = 0.02;
    const t1 = Math.max(0, t - eps), t2 = Math.min(1, t + eps);
    const p1 = _arc(a, b, t1, peakLift), p2 = _arc(a, b, t2, peakLift);
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }
  function _drawRocketSprite(ctx3, x, y, ang, size) {
    if (isImageReady("ROCKET")) {
      ctx3.save();
      ctx3.translate(x, y);
      ctx3.rotate(ang);
      ctx3.drawImage(getImage("ROCKET"), -size / 2, -size / 2, size, size);
      ctx3.restore();
    } else {
      getImage("ROCKET");
      ctx3.fillStyle = "#C44";
      ctx3.beginPath();
      ctx3.arc(x, y, 8, 0, Math.PI * 2);
      ctx3.fill();
    }
    for (let k = 1; k < 8; k++) {
      const tx = x - Math.cos(ang) * k * 7;
      const ty = y - Math.sin(ang) * k * 7;
      const alpha = 0.55 * (1 - k / 8);
      ctx3.fillStyle = `rgba(255,${100 + k * 12},40,${alpha})`;
      ctx3.beginPath();
      ctx3.arc(tx, ty, 5 + k * 0.5, 0, Math.PI * 2);
      ctx3.fill();
    }
  }
  function _drawBombSprite(ctx3, x, y, ang) {
    const size = 64;
    if (isImageReady("BOMB")) {
      ctx3.save();
      ctx3.translate(x, y);
      ctx3.rotate(ang + Math.PI);
      ctx3.drawImage(getImage("BOMB"), -size / 2, -size / 2, size, size);
      ctx3.restore();
    } else {
      getImage("BOMB");
      ctx3.fillStyle = "#222";
      ctx3.beginPath();
      ctx3.arc(x, y, 10, 0, Math.PI * 2);
      ctx3.fill();
    }
    ctx3.fillStyle = "rgba(60,60,60,0.45)";
    for (let k = 1; k < 7; k++) {
      ctx3.beginPath();
      ctx3.arc(x - Math.cos(ang) * k * 8, y - Math.sin(ang) * k * 8, 5 + k * 0.7, 0, Math.PI * 2);
      ctx3.fill();
    }
  }
  function _drawParticles(ctx3, now) {
    ctx3.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const dt = (now - p.t0) / 1e3;
      if (dt < 0) continue;
      if (dt * 1e3 >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const px = p.x + p.vx * dt + 0.5 * p.ax * dt * dt;
      const py = p.y + p.vy * dt + 0.5 * p.ay * dt * dt;
      const age = dt * 1e3 / p.life;
      const fade = 1 - age;
      if (p.kind === "flash") {
        const r = p.size * (1 + p.sizeGrow * age);
        ctx3.globalAlpha = fade * fade;
        const grad = ctx3.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.6, p.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx3.fillStyle = grad;
        ctx3.beginPath();
        ctx3.arc(px, py, r, 0, Math.PI * 2);
        ctx3.fill();
      } else if (p.kind === "spark") {
        ctx3.globalAlpha = fade;
        ctx3.fillStyle = p.color;
        const ang = Math.atan2(p.vy + p.ay * dt, p.vx);
        const len = 8 + p.size;
        ctx3.save();
        ctx3.translate(px, py);
        ctx3.rotate(ang);
        ctx3.fillRect(-len, -p.size / 2, len, p.size);
        ctx3.restore();
      } else if (p.kind === "debris") {
        ctx3.globalAlpha = Math.min(1, fade * 1.4);
        ctx3.fillStyle = p.color;
        const rot = p.rot + p.rotSpeed * dt;
        ctx3.save();
        ctx3.translate(px, py);
        ctx3.rotate(rot);
        const s = p.size;
        ctx3.fillRect(-s / 2, -s / 2, s, s * 0.7);
        ctx3.fillStyle = "rgba(0,0,0,0.35)";
        ctx3.fillRect(-s / 2, s * 0.2, s, s * 0.15);
        ctx3.restore();
      } else if (p.kind === "smoke") {
        const r = p.size * (1 + p.sizeGrow * age);
        const a = (age < 0.15 ? age / 0.15 : 1) * fade * 0.55;
        ctx3.globalAlpha = a;
        const grad = ctx3.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, "rgba(80,75,70,1)");
        grad.addColorStop(0.7, "rgba(50,46,42,0.7)");
        grad.addColorStop(1, "rgba(40,36,32,0)");
        ctx3.fillStyle = grad;
        ctx3.beginPath();
        ctx3.arc(px, py, r, 0, Math.PI * 2);
        ctx3.fill();
      }
    }
    ctx3.restore();
    ctx3.globalAlpha = 1;
  }
  var FLOAT_LIFE_MS = 900;
  function _drawFloats(ctx3, now) {
    ctx3.save();
    ctx3.font = "bold 30px sans-serif";
    ctx3.textAlign = "center";
    ctx3.textBaseline = "middle";
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      const age = (now - f.t0) / FLOAT_LIFE_MS;
      if (age >= 1) {
        floats.splice(i, 1);
        continue;
      }
      const lift = age * 50;
      const alpha = 1 - age * age;
      ctx3.globalAlpha = alpha;
      ctx3.lineWidth = 5;
      ctx3.strokeStyle = "#000";
      ctx3.fillStyle = f.color || "#FFE54A";
      ctx3.strokeText(f.text, f.x, f.y - lift);
      ctx3.fillText(f.text, f.x, f.y - lift);
    }
    ctx3.restore();
  }
  function _setView(v) {
    view = v;
  }
  window.__setView = _setView;

  // scene_interior/index.js
  var canvas2 = null;
  var ctx2 = null;
  var visible2 = false;
  var rafId2 = 0;
  var currentTilt = 0;
  var entranceT0 = 0;
  var ENTRANCE_DUR = 700;
  var TILT_EASE = 0.06;
  function _drawInteriorHorizonBand(ctx3, W3) {
    const HORIZON = 158;
    const layers = [
      { color: "#7FA38E", amp: 8, period: 220, dy: -38 },
      { color: "#5C8775", amp: 12, period: 160, dy: -22 },
      { color: "#3F6555", amp: 9, period: 110, dy: -8 }
    ];
    for (const L of layers) {
      ctx3.fillStyle = L.color;
      ctx3.beginPath();
      ctx3.moveTo(0, HORIZON);
      for (let x = 0; x <= W3; x += 4) {
        const y = HORIZON + L.dy - L.amp * Math.sin(x / L.period * Math.PI * 2);
        ctx3.lineTo(x, y);
      }
      ctx3.lineTo(W3, HORIZON);
      ctx3.closePath();
      ctx3.fill();
    }
    ctx3.fillStyle = "#2C5443";
    const N = 18;
    for (let i = 0; i < N; i++) {
      const cx = i / N * W3 + i * 31 % 24;
      const cy = HORIZON - 4 + i * 17 % 6;
      const r = 9 + i * 7 % 5;
      ctx3.beginPath();
      ctx3.arc(cx, cy, r, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.arc(cx + r * 0.7, cy + 2, r * 0.7, 0, Math.PI * 2);
      ctx3.fill();
    }
  }
  function targetTiltFor(hp_pct) {
    if (hp_pct >= 95) return 0;
    if (hp_pct >= 65) return 4;
    if (hp_pct >= 35) return 9;
    if (hp_pct >= 18) return 14;
    return 18;
  }
  function damageLevelFor(hp_pct) {
    if (hp_pct >= 70) return 0;
    if (hp_pct >= 50) return 1;
    if (hp_pct >= 30) return 2;
    return 3;
  }
  function mount2(c) {
    canvas2 = c;
    ctx2 = c.getContext("2d");
    installAim(c);
    subscribe((s) => {
      const wasVisible = visible2;
      visible2 = s === "INTERIOR_AIM";
      if (visible2 && !wasVisible) entranceT0 = performance.now();
      if (visible2 && !rafId2) loop2();
    });
  }
  function loop2() {
    if (!visible2) {
      rafId2 = 0;
      return;
    }
    rafId2 = requestAnimationFrame(loop2);
    if (!ctx2 || !canvas2) return;
    const t = performance.now() / 1e3;
    const targetTilt = targetTiltFor(state.hp_self_pct);
    currentTilt += (targetTilt - currentTilt) * TILT_EASE;
    const damageLevel = damageLevelFor(state.hp_self_pct);
    drawSky(ctx2);
    _drawInteriorHorizonBand(ctx2, canvas2.width);
    ctx2.fillStyle = "rgba(15,20,30,0.16)";
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    const eAge = (performance.now() - entranceT0) / ENTRANCE_DUR;
    const eOn = entranceT0 > 0 && eAge < 1;
    let eDimAlpha = 0;
    if (eOn) {
      const k = 1 - Math.min(1, Math.max(0, eAge));
      const easeOut = 1 - Math.pow(k, 3);
      const scale = 1 + (1 - easeOut) * 0.2;
      const cx = canvas2.width / 2, cy = canvas2.height * 0.62;
      ctx2.save();
      ctx2.translate(cx, cy);
      ctx2.scale(scale, scale);
      ctx2.translate(-cx, -cy);
      eDimAlpha = (1 - easeOut) * 0.45;
    }
    drawCastleSection(ctx2, { tilt_deg: currentTilt, damage_level: damageLevel });
    drawUnits(ctx2, t);
    drawRipStones(ctx2);
    const activeFloor = getActiveFloor();
    if (activeFloor !== null) drawArrow(ctx2, t, activeFloor);
    drawAimOverlay(ctx2);
    drawHudCards(ctx2, getActiveUnitId());
    if (eOn) {
      ctx2.restore();
      if (eDimAlpha > 0) {
        ctx2.fillStyle = `rgba(0,0,0,${eDimAlpha})`;
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
      }
      const irisK = Math.min(1, eAge / 0.45);
      if (irisK < 1) {
        const cx = canvas2.width / 2, cy = canvas2.height * 0.62;
        const maxR = Math.hypot(
          Math.max(cx, canvas2.width - cx),
          Math.max(cy, canvas2.height - cy)
        );
        const r = maxR * irisK;
        ctx2.save();
        ctx2.fillStyle = "#000";
        ctx2.beginPath();
        ctx2.rect(0, 0, canvas2.width, canvas2.height);
        ctx2.moveTo(cx + r, cy);
        ctx2.arc(cx, cy, r, 0, Math.PI * 2, true);
        ctx2.fill("evenodd");
        ctx2.restore();
      }
    }
    drawTopHud(ctx2);
    drawScriptOverlay(ctx2, t);
  }

  // playable/entry.js
  var canvas3 = (
    /** @type {HTMLCanvasElement} */
    document.getElementById("g")
  );
  mount2(canvas3);
  mount(canvas3);
  var params = new URLSearchParams(location.search);
  var mode = params.get("mode") || (location.pathname.includes("/dist/") ? "prod" : "dev");
  if (mode === "prod") {
    const devbar = document.getElementById("devbar");
    if (devbar) devbar.style.display = "none";
    start();
    runScript(canvas3);
  } else {
    start();
    const $ = (id) => document.getElementById(id);
    document.querySelectorAll("#devbar button[data-state]").forEach((btn) => {
      btn.addEventListener("click", () => _devForceState(
        /** @type {any} */
        btn.dataset.state
      ));
    });
    document.querySelectorAll("#devbar button[data-hp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.hp_self_pct = +/** @type {any} */
        btn.dataset.hp;
      });
    });
    $("btn-next-turn")?.addEventListener("click", () => {
      emit("cut_to_interior", {
        hp_self_after: state.hp_self_pct,
        hp_enemy_after: state.hp_enemy_pct,
        units_destroyed_ids: []
      });
    });
    $("btn-kill-active")?.addEventListener("click", () => {
      const id = getActiveUnitId();
      if (id) killUnit(id);
    });
    _devForceState("INTERIOR_AIM");
  }
})();

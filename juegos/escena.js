/* ============================================================================
 * escena.js — render del seguidor calidad GEMELO, reutilizable por los juegos
 * ----------------------------------------------------------------------------
 * Porta la escena del Gemelo Digital (../index.html): seguidor detail:'full'
 * (módulos, correas+abarcones, slew, motor, TCU, cable de motor, dampers),
 * césped procedural, sol real con sombras que se alargan y cielo dinámico que
 * cambia con la elevación solar. Un día se reproduce en bucle para que las
 * sombras se muevan (efecto "render de verdad" para ferias).
 *
 * API:
 *   var ESC = Escena.create(THREE, mountEl, {
 *     layout:'single'|'field'|'none', detail:'full', autoDay:true,
 *     daySeconds:70, hour:11, autoOrbit:true });
 *   ESC.frame(now, dt)          // llamar cada requestAnimationFrame
 *   ESC.trackers   // [{spin, slew, xs, zc}]   ESC.scene/camera/renderer/sun
 *   ESC.materials  // materiales del seguidor (glass ya con textura de células)
 *   ESC.setHour(h) ESC.angleDeg()  ESC.resize()
 * ==========================================================================*/
(function (root) {
  'use strict';
  var E = {};
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---- física solar (espejo del gemelo) ---- */
  var AXIS_MAX = 55, GCR = 2.382 / 6.0;
  var LOC = { lat: 42.81, lon: -1.58, tz: 1, dst: true }, LAT = LOC.lat * D2R, LON = LOC.lon, dayN = 172, btOn = true;
  function declOf(N) { return 23.45 * Math.sin(2 * Math.PI * (284 + (N || 1)) / 365) * D2R; }
  function tzOffset(N) { return LOC.tz + ((LOC.dst && N >= 86 && N <= 303) ? 1 : 0); }
  function solarShift(N) { var LSTM = 15 * tzOffset(N), B = 2 * Math.PI / 365 * ((N || 1) - 81); var EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); return (4 * (LON - LSTM) + EoT) / 60; }
  function solarPos(h) {
    var DECL = declOf(dayN), hs = h + solarShift(dayN), w = (hs - 12) * 15 * D2R;
    var sinEl = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(w);
    var elv = Math.asin(clamp(sinEl, -1, 1));
    var caz = (sinEl * Math.sin(LAT) - Math.sin(DECL)) / Math.max(1e-6, (Math.cos(elv) * Math.cos(LAT)));
    var az = Math.acos(clamp(caz, -1, 1)); if (w < 0) az = -az;
    return { el: elv, az: az };
  }
  function trackAngle(h) {
    var P = solarPos(h); if (P.el <= 0.0001) return -5;
    var sx = Math.cos(P.el) * Math.sin(P.az), sz = Math.sin(P.el);
    var Rtrue = Math.atan2(sx, sz), temp = Math.min(1, (1 / GCR) * Math.cos(Rtrue));
    var Rbt = Rtrue - Math.sign(Rtrue) * Math.acos(temp), Rsel = btOn ? Rbt : Rtrue;
    return clamp(Rsel * R2D, -AXIS_MAX, AXIS_MAX);
  }

  /* ---- texturas ---- */
  var THREE;
  function grassTex() {
    var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d');
    x.fillStyle = '#3c6b2c'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 5200; i++) { var gx = Math.random() * 256, gy = Math.random() * 256, l = 2 + Math.random() * 7, dx = (Math.random() - 0.5) * 3; x.strokeStyle = 'hsl(' + (92 + Math.random() * 34) + ',' + (40 + Math.random() * 25) + '%,' + (20 + Math.random() * 34) + '%)'; x.lineWidth = 0.8 + Math.random() * 1.1; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + dx, gy - l); x.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function grassBladeTex() {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'); x.clearRect(0, 0, 64, 64); x.lineCap = 'round';
    for (var i = 0; i < 9; i++) { var bx = 6 + Math.random() * 52, hh = 26 + Math.random() * 36, w = 1.6 + Math.random() * 2.2; x.strokeStyle = 'hsl(' + (92 + Math.random() * 30) + ',' + (55 + Math.random() * 20) + '%,' + (26 + Math.random() * 22) + '%)'; x.lineWidth = w; x.beginPath(); x.moveTo(bx, 64); x.quadraticCurveTo(bx + (Math.random() - 0.5) * 16, 64 - hh * 0.6, bx + (Math.random() - 0.5) * 24, 64 - hh); x.stroke(); }
    return new THREE.CanvasTexture(c);
  }
  function panelTex() {
    var W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
    x.fillStyle = '#0a1019'; x.fillRect(0, 0, W, H); var nx = 6, ny = 12, cw = W / nx, ch = H / ny, gap = 1.4;
    for (var iy = 0; iy < ny; iy++) for (var ix = 0; ix < nx; ix++) {
      var L = 7.5 + Math.random() * 3.5, g = x.createLinearGradient(ix * cw, iy * ch, ix * cw + cw, iy * ch + ch);
      g.addColorStop(0, 'hsl(214,48%,' + (L + 2).toFixed(1) + '%)'); g.addColorStop(1, 'hsl(214,48%,' + L.toFixed(1) + '%)');
      x.fillStyle = g; x.fillRect(ix * cw + gap, iy * ch + gap, cw - 2 * gap, ch - 2 * gap);
      x.strokeStyle = 'rgba(150,175,200,.30)'; x.lineWidth = 0.8;
      for (var b = 1; b <= 3; b++) { var bx = ix * cw + cw * b / 4; x.beginPath(); x.moveTo(bx, iy * ch + gap); x.lineTo(bx, iy * ch + ch - gap); x.stroke(); }
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }

  /* ---- órbita (ratón/touch) ---- */
  function orbit(dom, camera, target, r0, rmin, rmax) {
    var st = { theta: 0.92, phi: 0.95, radius: r0 }, ptr = {}, mode = null, lastMid = null, lastDist = 0;
    function clampR(v) { return Math.max(rmin, Math.min(rmax, v)); }
    function apply() { var sp = Math.sin(st.phi), cp = Math.cos(st.phi); camera.position.set(target.x + st.radius * sp * Math.sin(st.theta), target.y + st.radius * cp, target.z + st.radius * sp * Math.cos(st.theta)); camera.lookAt(target); }
    function ids() { return Object.keys(ptr); }
    function mid() { var k = ids(), a = ptr[k[0]], b = ptr[k[1]]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    function dist() { var k = ids(), a = ptr[k[0]], b = ptr[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    dom.style.touchAction = 'none';
    dom.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    dom.addEventListener('pointerdown', function (e) { ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; try { dom.setPointerCapture(e.pointerId); } catch (_) {} var n = ids().length; if (n === 1) { mode = 'rotate'; if (E._onDown) E._onDown(e); } else if (n === 2) { mode = 'multi'; lastMid = mid(); lastDist = dist(); } });
    dom.addEventListener('pointermove', function (e) { var prev = ptr[e.pointerId]; if (!prev) return; ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; if (mode === 'multi' && ids().length >= 2) { var m = mid(), d = dist(); if (lastDist > 0 && d > 0) st.radius = clampR(st.radius * lastDist / d); lastMid = m; lastDist = d; apply(); } else if (mode === 'rotate') { st.theta -= (e.clientX - prev.x) * 0.006; st.phi = Math.max(0.12, Math.min(1.45, st.phi - (e.clientY - prev.y) * 0.006)); apply(); E._dragged = (E._dragged || 0) + Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y); } });
    function up(e) { delete ptr[e.pointerId]; try { dom.releasePointerCapture(e.pointerId); } catch (_) {} if (ids().length < 2) { lastMid = null; lastDist = 0; mode = ids().length === 1 ? 'rotate' : null; } if (E._onUp) E._onUp(e); }
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', function (e) { e.preventDefault(); st.radius = clampR(st.radius * (1 + Math.sign(e.deltaY) * 0.1)); apply(); }, { passive: false });
    apply();
    return { st: st, apply: apply, zoom: function (f) { st.radius = clampR(st.radius * f); apply(); } };
  }

  /* ---- construir un seguidor completo (porta buildTracker del gemelo) ---- */
  function buildOne(scene, SG, xs, zc, west, detail) {
    var dampers = [], motorCables = [], steel = SG.steel, silver = SG.silver, dark2 = SG.jbox;
    var piersX = []; for (var px = -30; px <= 30; px += 6) piersX.push(px);
    for (var pi = 0; pi < piersX.length; pi++) {
      var pxv = piersX[pi] + xs;
      var col = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.0, 0.13), steel); col.position.set(pxv, 1.0, zc); col.castShadow = true; scene.add(col);
      var ped = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.30), silver); ped.position.set(pxv, 1.94, zc); ped.castShadow = true; scene.add(ped);
      var brg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 18), silver); brg.rotation.z = Math.PI / 2; brg.position.set(pxv, 2.0, zc); brg.castShadow = true; scene.add(brg);
    }
    var beam = Seguidor.buildBeam(THREE, { west: west, materials: SG, detail: detail || 'full', skip: { soporte: 1, bracket: 1, antena: 1, antenatip: 1 } });
    var g = new THREE.Group(); g.position.set(xs, 2, zc); g.add(beam.spin); scene.add(g);
    var slew = new THREE.Group(); slew.position.set(xs, 2, zc); slew.add(beam.static); scene.add(slew);
    beam.dampers.forEach(function (d) {
      var pbx = d.b[0], Bp = new THREE.Vector3(xs + d.a[0], 0.40, zc + d.a[2]);
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 14), dark2); body.castShadow = true; scene.add(body);
      var rodd = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10), silver); scene.add(rodd);
      var eB = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10), steel); eB.position.copy(Bp); scene.add(eB);
      var eT = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10), steel); eT.position.set(pbx, d.b[1], d.b[2]); g.add(eT);
      dampers.push({ px: pbx + xs, zc: zc, dy0: d.b[1], dz0: d.b[2], B: Bp, body: body, rod: rodd });
    });
    if (west) {
      var _cabM = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.62, metalness: 0.15 });
      var _cnM = new THREE.MeshStandardMaterial({ color: 0x2f6fb3, roughness: 0.5, metalness: 0.45 });
      var _glM = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.4 });
      var _brM = new THREE.MeshStandardMaterial({ color: 0x1c2025, roughness: 0.78, metalness: 0.05 });
      var _cb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), _cnM); _cb.position.set(0, 0.04, -0.60); _cb.castShadow = true; slew.add(_cb);
      var _gl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 10), _glM); _gl.position.set(0, 0.075, -0.60); slew.add(_gl);
      slew.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.085, -0.60), new THREE.Vector3(0, 0.15, -0.50), new THREE.Vector3(0, 0.16, -0.42)]), 16, 0.008, 7, false), _cabM));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.18, 0.085, 0), new THREE.Vector3(0.42, 0.092, 0.02), new THREE.Vector3(0.72, 0.092, 0.02), new THREE.Vector3(0.98, 0.05, 0.035), new THREE.Vector3(1.18, -0.04, 0.045), new THREE.Vector3(1.235, -0.11, 0.045)]), 44, 0.008, 8, false), _cabM));
      [0.32, 0.6, 0.88].forEach(function (_bx) { var _br = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.006, 8, 16), _brM); _br.rotation.y = Math.PI / 2; _br.position.set(_bx, 0, 0); g.add(_br); });
      var _flex = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), _cabM); scene.add(_flex);
      motorCables.push({ Ax: xs, Ay: 2.16, Az: zc - 0.42, Bx: 0.18, By: 0.085, Bz: 0, xs: xs, zc: zc, mesh: _flex });
    }
    return { spin: g, slew: slew, xs: xs, zc: zc, dampers: dampers, motorCables: motorCables };
  }

  /* ---- crear escena completa ---- */
  E.create = function (THREE_, mount, opts) {
    THREE = THREE_; opts = opts || {};
    var layout = opts.layout || 'single', detail = opts.detail || 'full';
    if (opts.loc) { LOC = opts.loc; LAT = LOC.lat * D2R; LON = LOC.lon; }
    dayN = opts.dayN || 172; if (opts.btOn === false) btOn = false;
    var ESC = { autoDay: opts.autoDay !== false, daySeconds: opts.daySeconds || 70, autoOrbit: !!opts.autoOrbit, hour: opts.hour != null ? opts.hour : 11, _ang: 0, trackers: [] };

    var sc = new THREE.Scene(); sc.background = new THREE.Color(0x0c141d); sc.fog = new THREE.Fog(0x0c141d, layout === 'field' ? 140 : 90, layout === 'field' ? 360 : 240);
    var cam = new THREE.PerspectiveCamera(46, 1, 0.1, 600);
    var rnd = new THREE.WebGLRenderer({ antialias: true }); rnd.setPixelRatio(Math.min(devicePixelRatio, 2));
    rnd.shadowMap.enabled = true; rnd.shadowMap.type = THREE.PCFSoftShadowMap; mount.appendChild(rnd.domElement);
    sc.add(new THREE.AmbientLight(0x4a5e72, 0.7));
    var sun = new THREE.DirectionalLight(0xfff2d8, 1.0); sc.add(sun); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var hw = layout === 'field' ? 75 : 42, shc = sun.shadow.camera; shc.left = -hw; shc.right = hw; shc.top = hw; shc.bottom = -hw; shc.near = 1; shc.far = 260; shc.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sc.add(sun.target);

    // suelo + césped
    var gtex = grassTex(); gtex.repeat.set(90, 90);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshStandardMaterial({ map: gtex, color: 0xc2d0b2, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    (function () {
      var p1 = new THREE.PlaneGeometry(0.5, 0.42); p1.translate(0, 0.21, 0); var p2 = p1.clone(); p2.rotateY(Math.PI / 2);
      var pos = new Float32Array(p1.attributes.position.count * 3 + p2.attributes.position.count * 3);
      pos.set(p1.attributes.position.array, 0); pos.set(p2.attributes.position.array, p1.attributes.position.array.length);
      var uvA = new Float32Array(p1.attributes.uv.count * 2 + p2.attributes.uv.count * 2);
      uvA.set(p1.attributes.uv.array, 0); uvA.set(p2.attributes.uv.array, p1.attributes.uv.array.length);
      var idxOff = p1.attributes.position.count, i1 = p1.index.array, i2 = p2.index.array, idx = [], a;
      for (a = 0; a < i1.length; a++) idx.push(i1[a]); for (a = 0; a < i2.length; a++) idx.push(i2[a] + idxOff);
      var tuft = new THREE.BufferGeometry(); tuft.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tuft.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); tuft.setIndex(idx); tuft.computeVertexNormals();
      var gm = new THREE.MeshLambertMaterial({ map: grassBladeTex(), transparent: true, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xffffff });
      var N = 4200, inst = new THREE.InstancedMesh(tuft, gm, N), dm = new THREE.Object3D();
      for (var i = 0; i < N; i++) { dm.position.set((Math.random() - 0.5) * 120, 0, (Math.random() - 0.5) * 90); dm.rotation.set(0, Math.random() * Math.PI, 0); var gs = 0.7 + Math.random() * 0.8; dm.scale.set(gs, gs + Math.random() * 0.5, gs); dm.updateMatrix(); inst.setMatrixAt(i, dm.matrix); if (inst.setColorAt) inst.setColorAt(i, new THREE.Color().setHSL(0.26 + Math.random() * 0.06, 0.6, 0.34 + Math.random() * 0.14)); }
      sc.add(inst);
    })();

    // materiales del seguidor (células FV en el vidrio)
    var SG = Seguidor.materials(THREE); var ptex = panelTex();
    SG.glass.map = ptex; SG.glass.emissiveMap = ptex; SG.glass.emissive = new THREE.Color(0x2b333d); SG.glass.emissiveIntensity = 0.30; SG.glass.needsUpdate = true;
    ESC.materials = SG; ESC.panelTex = function () { return ptex; };

    // trackers
    var TR = [];
    if (layout === 'field') TR = [{ z: -3, xs: 0, w: true }, { z: 3, xs: 0, w: false }, { z: 9, xs: 6, w: true }, { z: 15, xs: 6, w: false }, { z: -9, xs: 6, w: true }, { z: -15, xs: 6, w: false }];
    else if (layout === 'single') TR = [{ z: 0, xs: 0, w: true }];
    for (var ti = 0; ti < TR.length; ti++) ESC.trackers.push(buildOne(sc, SG, TR[ti].xs, TR[ti].z, TR[ti].w, detail));

    // colores de cielo
    var SKY_N = new THREE.Color(0x0a1422), SKY_DUSK = new THREE.Color(0x8a5236), SKY_DAY = new THREE.Color(0x4f78a6);
    var target = new THREE.Vector3(0, layout === 'field' ? 2.4 : 2.4, 0);
    var ob = orbit(rnd.domElement, cam, target, layout === 'field' ? 64 : 26, layout === 'field' ? 18 : 9, 240);
    ESC.scene = sc; ESC.camera = cam; ESC.renderer = rnd; ESC.sun = sun; ESC.orbit = ob; ESC.target = target;

    ESC.angleDeg = function () { return ESC._ang; };
    ESC.setHour = function (h) { ESC.hour = h; };

    ESC.frame = function (now, dt) {
      if (ESC.autoDay) { ESC.hour += dt * (24 / ESC.daySeconds); if (ESC.hour >= 24) ESC.hour -= 24; if (ESC.hour < 0) ESC.hour += 24; }
      var ang = trackAngle(ESC.hour); ESC._ang = ang; var ar = ang * D2R, _c = Math.cos(ar), _sn = Math.sin(ar);
      var up = new THREE.Vector3(0, 1, 0);
      for (var t = 0; t < ESC.trackers.length; t++) {
        var T = ESC.trackers[t]; T.spin.rotation.x = ar;
        var di; for (di = 0; di < T.dampers.length; di++) { var Dp = T.dampers[di]; var _T = new THREE.Vector3(Dp.px, 2 + Dp.dy0 * _c - Dp.dz0 * _sn, Dp.zc + Dp.dy0 * _sn + Dp.dz0 * _c); var _dir = _T.clone().sub(Dp.B), _len = _dir.length(), _mid = Dp.B.clone().lerp(_T, 0.5); var _q = new THREE.Quaternion().setFromUnitVectors(up, _dir.clone().normalize()); Dp.body.position.copy(_mid); Dp.body.quaternion.copy(_q); Dp.body.scale.y = _len * 0.62; Dp.rod.position.copy(_mid); Dp.rod.quaternion.copy(_q); Dp.rod.scale.y = _len; }
        var mi; for (mi = 0; mi < T.motorCables.length; mi++) { var M = T.motorCables[mi]; var _Bw = new THREE.Vector3(M.xs + M.Bx, 2 + M.By * _c - M.Bz * _sn, M.zc + M.By * _sn + M.Bz * _c); var _Aw = new THREE.Vector3(M.Ax, M.Ay, M.Az), _dd = _Bw.clone().sub(_Aw), _ll = _dd.length() || 1e-4; M.mesh.position.copy(_Aw).lerp(_Bw, 0.5); M.mesh.quaternion.setFromUnitVectors(up, _dd.normalize()); M.mesh.scale.y = _ll; }
      }
      // sol + cielo (porta el bucle del gemelo)
      var P = solarPos(ESC.hour), es = Math.max(P.el, 0.04), ce = Math.cos(es), sunR = 90;
      sun.position.set(Math.cos(P.az) * ce * sunR, Math.sin(es) * sunR, Math.sin(P.az) * ce * sunR);
      sun.target.position.set(0, 2, 0); sun.target.updateMatrixWorld();
      sun.intensity = (P.el > 0) ? 0.45 + Math.sin(P.el) * 0.7 : 0.05;
      var eRaw = Math.sin(P.el), sky;
      if (eRaw <= 0) sky = SKY_N.clone().lerp(SKY_DUSK, Math.max(0, 1 + eRaw / 0.15));
      else sky = SKY_DUSK.clone().lerp(SKY_DAY, Math.min(1, eRaw / 0.45));
      sc.background.copy(sky); if (sc.fog) sc.fog.color.copy(sky);
      sun.color.setHex(eRaw > 0 && eRaw < 0.30 ? 0xffd2a0 : 0xfff2d8);
      if (ESC.autoOrbit && !ESC._dragged) { ob.st.theta += dt * 0.12; ob.apply(); }
      ESC._dragged = 0;
      rnd.render(sc, cam);
    };
    ESC.resize = function () { var w = mount.clientWidth || innerWidth, h = mount.clientHeight || innerHeight; if (w < 2 || h < 2) return; rnd.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    ESC.resize();
    return ESC;
  };

  root.Escena = E;
})(typeof window !== 'undefined' ? window : this);

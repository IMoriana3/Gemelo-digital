/* ============================================================================
 * Ensambla el Tracker — montaje por orden correcto (render completo del gemelo)
 * ----------------------------------------------------------------------------
 * Usa escena.js (césped + sombras + cielo) y monta el seguidor detail:'full'
 * pieza a pieza en el orden real. Las cajas de conexión van CON los módulos.
 * ==========================================================================*/
(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var THREE = window.THREE;

  var STEPS = [
    { label: 'Hincas y soporte', icon: '⛏️', desc: 'Cimentación: postes hincados, silla y rodamiento del eje.' },
    { label: 'Accionamiento (slew + motor)', icon: '⚙️', desc: 'Corona slew, reductora y motor en el centro de la viga.' },
    { label: 'Tubo de torsión', icon: '➖', desc: 'La viga que gira (dos medias-vigas) sobre el slew.' },
    { label: 'Correas y abarcones', icon: '🔩', desc: 'Correas omega y abarcones (U-bolt) que abrazan la viga.' },
    { label: 'Módulos y cajas de conexión', icon: '🟦', desc: 'Los módulos FV sobre las correas; cada uno con sus cajas de conexión.' },
    { label: 'Cableado / string', icon: '🔌', desc: 'Interconexión del string (cable leapfrog, salto de rana).' },
    { label: 'TCU', icon: '📟', desc: 'Unidad de control colgada de la viga, con sus chapas y abarcones.' }
  ];
  var STEP_OF = {
    soporte: 0, bracket: 0,
    corona: 1, reductora: 1, cuello: 1, motor: 1, tapa: 1, motorcable: 1,
    tube: 2, tubecap: 2,
    correa: 3, abarcon: 3,
    frame: 4, glass: 4, jbox: 4,
    cablepos: 5, cableneg: 5,
    tcu: 6, tcuchapa: 6, tcuabarcon: 6
  };

  var ESC, master, stepGroups = [], anims = [];

  function build() {
    ESC = Escena.create(THREE, el('cv'), { layout: 'none', autoDay: false, autoOrbit: true, hour: 11 });
    master = new THREE.Group(); master.position.set(0, 2, 0); ESC.scene.add(master);
    var i; for (i = 0; i < STEPS.length; i++) { var g = new THREE.Group(); g.visible = false; stepGroups.push(g); master.add(g); }
    // postes en el paso de hincas
    var steel = ESC.materials.steel, silver = ESC.materials.silver;
    for (var px = -30; px <= 30; px += 6) {
      var col = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.0, 0.13), steel); col.position.set(px, -1.0, 0); col.castShadow = true; stepGroups[0].add(col);
      var brg = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 16), silver); brg.rotation.z = Math.PI / 2; brg.position.set(px, 0, 0); brg.castShadow = true; stepGroups[0].add(brg);
    }
    // piezas del seguidor agrupadas por paso
    Seguidor.parts(THREE, { size: 'largo', detail: 'full' }).forEach(function (p) {
      var si = STEP_OF[p.key]; if (si == null) return;
      var mesh = new THREE.Mesh(p.geom(THREE), ESC.materials[p.mat]); mesh.applyMatrix4(p.m); mesh.castShadow = !!p.cast; mesh.receiveShadow = true;
      stepGroups[si].add(mesh);
    });
  }

  var G = null;
  function start() {
    for (var i = 0; i < stepGroups.length; i++) { stepGroups[i].visible = false; stepGroups[i].position.y = 0; }
    anims = []; G = { idx: 0, errors: 0, t0: performance.now(), running: true };
    el('start').classList.remove('show'); el('end').classList.remove('show'); el('hud').classList.add('show'); el('qbox').classList.add('show');
    renderChecklist(); ask();
  }
  function ask() {
    if (G.idx >= STEPS.length) return finish();
    el('qPrompt').textContent = '¿Qué se monta ahora? (paso ' + (G.idx + 1) + '/' + STEPS.length + ')';
    var pool = [], i; for (i = G.idx + 1; i < STEPS.length; i++) pool.push(i); for (i = G.idx - 1; i >= 0 && pool.length < 2; i--) pool.push(i);
    shuffle(pool); var opts = [G.idx]; if (pool[0] != null) opts.push(pool[0]); if (pool[1] != null) opts.push(pool[1]);
    while (opts.length < 3 && opts.length < STEPS.length) { var r = (Math.random() * STEPS.length) | 0; if (opts.indexOf(r) < 0) opts.push(r); }
    shuffle(opts);
    el('opts').innerHTML = opts.map(function (si) { return '<button class="opt" data-s="' + si + '"><span class="oi">' + STEPS[si].icon + '</span>' + STEPS[si].label + '</button>'; }).join('');
    Array.prototype.forEach.call(el('opts').querySelectorAll('.opt'), function (b) { b.onclick = function () { pick(parseInt(b.getAttribute('data-s'), 10), b); }; });
  }
  function pick(si, btn) {
    if (!G.running) return;
    if (si === G.idx) { revealStep(G.idx); G.idx++; toast('✅ ' + STEPS[si].label, 'ok'); renderChecklist(); setTimeout(ask, 380); }
    else { G.errors++; btn.classList.add('bad'); setTimeout(function () { btn.classList.remove('bad'); }, 500); toast('❌ Ese no es el siguiente. Pista: ' + STEPS[G.idx].desc, 'warn', 3400); renderChecklist(); }
  }
  function revealStep(i) { var g = stepGroups[i]; g.visible = true; g.position.y = 5; anims.push({ g: g, t: 0 }); }
  function renderChecklist() {
    var h = '', i; for (i = 0; i < STEPS.length; i++) { var done = i < G.idx; h += '<div class="ck' + (done ? ' done' : '') + '"><span class="cki">' + (done ? '✓' : STEPS[i].icon) + '</span>' + (done ? STEPS[i].label : '— ¿?') + '</div>'; }
    el('checklist').innerHTML = h; el('hStep').textContent = G.idx + '/' + STEPS.length; el('hErr').textContent = G.errors;
  }
  function finish() {
    G.running = false; el('qbox').classList.remove('show');
    var secs = (performance.now() - G.t0) / 1000, score = Math.max(0, Math.round(10000 - secs * 60 - G.errors * 600));
    el('endStats').innerHTML = '<div class="big">' + score + '</div><div class="muted" style="text-align:center">puntos</div>' +
      '<div class="grid2"><div class="kpi"><div class="kl">Tiempo</div><div class="kv">' + fmtT(secs) + '</div></div><div class="kpi"><div class="kl">Errores</div><div class="kv">' + G.errors + '</div></div></div>' +
      '<div class="muted" style="text-align:center;margin-top:6px">Seguidor montado ✔</div>';
    el('end').classList.add('show');
  }
  function fmtT(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return (m ? m + 'm ' : '') + r + 's'; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var tT = null; function toast(m, k, ms) { var t = el('toast'); t.textContent = m; t.className = 'toast show ' + (k || 'info'); clearTimeout(tT); tT = setTimeout(function () { t.className = 'toast'; }, ms || 2200); }

  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    for (var i = anims.length - 1; i >= 0; i--) { var a = anims[i]; a.t += dt; var f = Math.min(1, a.t / 0.5); a.g.position.y = 5 * (1 - f) * (1 - f); if (f >= 1) { a.g.position.y = 0; anims.splice(i, 1); } }
    if (ESC) ESC.frame(now, dt);
  }
  function init() { build(); requestAnimationFrame(loop); addEventListener('resize', function () { ESC.resize(); }); el('btnStart').onclick = start; el('btnAgain').onclick = start; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

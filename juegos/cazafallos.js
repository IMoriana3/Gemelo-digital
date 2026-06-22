/* ============================================================================
 * Caza-fallos — inspección de seguidor (render completo del gemelo)
 * ----------------------------------------------------------------------------
 * Usa escena.js (seguidor detail:'full' + césped + sombras + cielo). Cada ronda
 * da un síntoma y el jugador toca el componente averiado. Los puntos de
 * inspección van ANCLADOS a las piezas reales (giran con el seguidor).
 * ==========================================================================*/
(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var THREE = window.THREE;

  /* puntos en coordenadas LOCALES del seguidor (hijos del grupo que bascula / del slew) */
  var HOTSPOTS = [
    { key: 'modulo', on: 'spin', pos: [14, 0.25, 0] },
    { key: 'correa', on: 'spin', pos: [-8, 0.16, 0] },
    { key: 'cableado', on: 'spin', pos: [9, 0.05, 0.1] },
    { key: 'tcu', on: 'spin', pos: [1.4, -0.18, 0] },
    { key: 'amortiguador', on: 'spin', pos: [-20, -0.2, 0.3] },
    { key: 'motor', on: 'slew', pos: [0, -0.04, -0.55] }
  ];
  var DEFECTS = {
    modulo: { label: 'Módulo / string', sym: 'Una rama produce mucho menos de lo normal y se aprecia una zona más oscura en los paneles.', exp: 'Módulo o string dañado (microgrietas / punto caliente).' },
    correa: { label: 'Correa / abarcón', sym: 'Con viento, un tramo de módulos vibra y se oye un golpeteo metálico.', exp: 'Correa u abarcón flojo: revisar el par de apriete.' },
    cableado: { label: 'Cajas y cableado', sym: 'Falta por completo la producción de un string entero.', exp: 'Conector/caja de conexión suelto o cable dañado.' },
    tcu: { label: 'TCU / comunicaciones', sym: 'El seguidor ha desaparecido del SCADA: no envía telemetría.', exp: 'Fallo de la TCU o de las comunicaciones.' },
    amortiguador: { label: 'Amortiguador', sym: 'Con rachas de viento la viga oscila demasiado y no se estabiliza.', exp: 'Amortiguador roto: riesgo estructural; corrígelo antes del viento.' },
    motor: { label: 'Accionamiento (motor)', sym: 'El seguidor no acompaña al sol y el motor calienta y consume de más.', exp: 'Sobrecorriente o avería en el accionamiento (slew / motor).' }
  };
  var ROUNDS = 8, RTIME = 18;

  var ESC, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitboxes = [], dots = {};

  function ringTex() {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    x.clearRect(0, 0, 64, 64); x.strokeStyle = '#fff'; x.lineWidth = 7; x.beginPath(); x.arc(32, 32, 22, 0, 6.2832); x.stroke();
    x.globalAlpha = 0.3; x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 18, 0, 6.2832); x.fill(); return new THREE.CanvasTexture(c);
  }

  function build() {
    ESC = Escena.create(THREE, el('cv'), { layout: 'single', detail: 'full', autoDay: false, autoOrbit: false, hour: 9.5 });
    var T = ESC.trackers[0], RING = ringTex();
    HOTSPOTS.forEach(function (hs) {
      var parent = hs.on === 'slew' ? T.slew : T.spin;
      var hb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 2.2), new THREE.MeshBasicMaterial({ visible: false }));
      hb.position.set(hs.pos[0], hs.pos[1], hs.pos[2]); hb.userData.key = hs.key; parent.add(hb); hitboxes.push(hb);
      var d = new THREE.Sprite(new THREE.SpriteMaterial({ map: RING, color: 0x36d399, transparent: true, depthTest: false, depthWrite: false }));
      d.scale.set(2.2, 2.2, 1); d.position.set(hs.pos[0], hs.pos[1], hs.pos[2]); d.userData.p = Math.random() * 6.28; d.visible = false; parent.add(d); dots[hs.key] = d;
    });
    // detección de toque (además de la órbita de escena.js)
    var dom = ESC.renderer.domElement, down = null;
    dom.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    dom.addEventListener('pointerup', function (e) {
      if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 10 && performance.now() - down.t < 450) tap(e.clientX, e.clientY);
      down = null;
    });
  }
  function tap(cx, cy) {
    if (!G || !G.running || G.answered) return;
    var r = ESC.renderer.domElement.getBoundingClientRect();
    ndc.x = ((cx - r.left) / r.width) * 2 - 1; ndc.y = -((cy - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, ESC.camera);
    var hit = ray.intersectObjects(hitboxes, false);
    if (hit.length) evaluate(hit[0].object.userData.key);
  }

  var G = null;
  function start() {
    G = { idx: 0, score: 0, ok: 0, running: true, answered: false, defect: null, endAt: 0 };
    el('start').classList.remove('show'); el('end').classList.remove('show'); el('hud').classList.add('show'); el('panel').classList.add('show');
    newRound();
  }
  function newRound() {
    G.answered = false;
    var keys = HOTSPOTS.map(function (h) { return h.key; });
    G.defect = keys[(Math.random() * keys.length) | 0];
    el('rNum').textContent = (G.idx + 1) + ' / ' + ROUNDS; el('rScore').textContent = G.score;
    el('sym').textContent = DEFECTS[G.defect].sym;
    el('reveal').className = 'reveal'; el('reveal').innerHTML = ''; el('btnNext').style.visibility = 'hidden';
    HOTSPOTS.forEach(function (h) { var d = dots[h.key]; d.visible = true; d.material.color.setHex(0x36d399); d.material.opacity = 1; });
    G.endAt = performance.now() + RTIME * 1000;
  }
  function evaluate(key) {
    if (G.answered) return; G.answered = true;
    var left = Math.max(0, G.endAt - performance.now()), frac = left / (RTIME * 1000);
    var correct = key === G.defect, pts = correct ? Math.round(500 + 500 * frac) : 0; G.score += pts; if (correct) G.ok++;
    HOTSPOTS.forEach(function (h) { var d = dots[h.key]; if (h.key === G.defect) d.material.color.setHex(0x37b87c); else if (h.key === key) d.material.color.setHex(0xe2574c); else d.material.opacity = 0.22; });
    var d2 = DEFECTS[G.defect], msg = correct ? ('✅ ¡Correcto! +' + pts) : (key == null ? '⏱ Tiempo agotado' : '❌ No era ahí');
    el('reveal').className = 'reveal show ' + (correct ? 'ok' : 'bad');
    el('reveal').innerHTML = '<b>' + msg + ' · ' + d2.label + '</b><div class="exp">' + d2.exp + '</div>';
    el('rScore').textContent = G.score; el('btnNext').style.visibility = 'visible';
    el('btnNext').textContent = (G.idx + 1 >= ROUNDS) ? '🏁 Ver resultado' : '➡ Siguiente';
  }
  function next() { G.idx++; if (G.idx >= ROUNDS) end(); else newRound(); }
  function end() {
    G.running = false; el('panel').classList.remove('show');
    HOTSPOTS.forEach(function (h) { dots[h.key].visible = false; });
    el('endStats').innerHTML = '<div class="big">' + G.score + '</div><div class="muted" style="text-align:center">puntos</div><div class="muted" style="text-align:center;margin-top:8px">Aciertos: <b style="color:var(--tx)">' + G.ok + ' / ' + ROUNDS + '</b></div>';
    el('end').classList.add('show');
  }

  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (G && G.running && !G.answered) { var lf = Math.max(0, G.endAt - now) / (RTIME * 1000); el('timerBar').style.width = (lf * 100) + '%'; el('timerBar').style.background = lf < 0.25 ? 'var(--danger)' : (lf < 0.5 ? 'var(--sun)' : 'var(--accent)'); if (now >= G.endAt) evaluate(null); }
    var k; for (k in dots) { var d = dots[k]; if (d.visible) { d.userData.p += dt * 4; d.scale.setScalar(2.2 + Math.sin(d.userData.p) * 0.45); } }
    if (ESC) ESC.frame(now, dt);
  }
  function init() { build(); requestAnimationFrame(loop); addEventListener('resize', function () { ESC.resize(); }); el('btnStart').onclick = start; el('btnNext').onclick = next; el('btnAgain').onclick = start; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

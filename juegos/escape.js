/* ============================================================================
 * Escape Room Solar — acertijos encadenados (juego interno Factiun)
 * ----------------------------------------------------------------------------
 * Sala de escape digital: resuelve cada acertijo de temática FV/seguidores para
 * conseguir un fragmento de código; reúne los 4 y abre la puerta. Contrarreloj,
 * con pistas (penalizan tiempo). 100% autónomo (sin dependencias).
 * ==========================================================================*/
(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  function norm(s) { return (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }

  var ROOMS = [
    { place: 'Sala de control', icon: '🖥️', type: 'text',
      narr: 'La puerta se ha bloqueado tras de ti. La pantalla del SCADA pide un PIN para reactivar el control.',
      q: 'Un seguidor a 1 eje gira desde −55° (este) hasta +55° (oeste). ¿Cuántos grados recorre de tope a tope?',
      acc: ['110', '110°', '110 grados'], hint: 'Suma el recorrido de un lado y del otro: 55 + 55.', frag: '3' },
    { place: 'Sala de inversores', icon: '🔌', type: 'choice',
      narr: 'Un armario eléctrico parpadea. Pulsa la opción correcta o saltará la protección.',
      q: '¿Qué hace el inversor de la planta?',
      opts: ['Convierte la corriente continua de los módulos en alterna', 'Almacena la energía en baterías', 'Orienta los seguidores', 'Mide la irradiancia'], ci: 0,
      hint: 'Los módulos generan en corriente continua (CC)…', frag: '9' },
    { place: 'Campo de seguidores', icon: '🔆', type: 'text',
      narr: 'Amanece y las filas proyectan sombras unas sobre otras. El candado pide la técnica que lo evita.',
      q: 'Al amanecer/atardecer, para que una fila no dé sombra a la de al lado, el seguidor aplica el…',
      acc: ['backtracking', 'back tracking', 'retroseguimiento'], hint: 'Término inglés: "seguir hacia atrás".', frag: '1' },
    { place: 'Almacén de repuestos', icon: '📦', type: 'text',
      narr: 'Una caja tiene la etiqueta con las letras desordenadas. Descífrala para sacar la llave.',
      q: 'Anagrama del componente que mueve el eje: «R O T M O»',
      acc: ['motor'], hint: 'Va en el slew drive; gira la viga de torsión.', frag: '7' }
  ];
  var FINAL = ROOMS.map(function (r) { return r.frag; }).join('');   // "3917"

  var G = null, tRaf = 0;

  function start() {
    G = { idx: 0, t0: performance.now(), hints: 0, frags: [], running: true };
    el('start').classList.remove('show'); el('end').classList.remove('show'); el('room').classList.add('show');
    tick(); showRoom();
  }
  function tick() {
    if (!G || !G.running) return;
    var s = (performance.now() - G.t0) / 1000 + G.hints * 30;
    el('eTime').textContent = fmtT(s);
    tRaf = requestAnimationFrame(tick);
  }
  function fmtT(s) { s = Math.floor(s); var m = Math.floor(s / 60); return (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60); }

  function showRoom() {
    if (G.idx >= ROOMS.length) return showDoor();
    var r = ROOMS[G.idx];
    el('rIcon').textContent = r.icon;
    el('rPlace').textContent = r.place;
    el('rStep').textContent = 'Acertijo ' + (G.idx + 1) + ' / ' + ROOMS.length;
    el('rNarr').textContent = r.narr;
    el('rQ').textContent = r.q;
    el('feedback').className = 'feedback'; el('feedback').textContent = '';
    var ans = el('answer');
    if (r.type === 'choice') {
      var h = '<div class="opts">';
      r.opts.forEach(function (o, i) { h += '<button class="opt" data-i="' + i + '">' + o + '</button>'; });
      ans.innerHTML = h + '</div>';
      Array.prototype.forEach.call(ans.querySelectorAll('.opt'), function (b) { b.onclick = function () { checkChoice(parseInt(b.getAttribute('data-i'), 10), b); }; });
      el('btnCheck').style.display = 'none';
    } else {
      ans.innerHTML = '<input type="text" id="inp" autocomplete="off" placeholder="Tu respuesta…">';
      el('inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') checkText(); });
      el('btnCheck').style.display = '';
      setTimeout(function () { var i = el('inp'); if (i) i.focus(); }, 50);
    }
    renderFrags();
  }
  function solved(r) {
    G.frags.push(r.frag); G.idx++;
    el('feedback').className = 'feedback ok'; el('feedback').innerHTML = '🔓 ¡Correcto! Fragmento obtenido: <b>' + r.frag + '</b>';
    renderFrags();
    setTimeout(showRoom, 1100);
  }
  function fail() { el('feedback').className = 'feedback bad'; el('feedback').textContent = '❌ No es correcto. Prueba otra vez o pide una pista.'; }
  function checkText() {
    var r = ROOMS[G.idx], v = norm(el('inp') && el('inp').value);
    if (!v) return;
    if (r.acc.map(norm).indexOf(v) >= 0) solved(r); else fail();
  }
  function checkChoice(i, btn) {
    var r = ROOMS[G.idx];
    if (i === r.ci) solved(r);
    else { btn.classList.add('bad'); setTimeout(function () { btn.classList.remove('bad'); }, 500); fail(); }
  }
  function hint() {
    var r = ROOMS[G.idx]; G.hints++;
    el('feedback').className = 'feedback hint'; el('feedback').innerHTML = '💡 ' + r.hint + ' <span class="pen">(+30 s)</span>';
  }
  function renderFrags() {
    var h = '';
    for (var i = 0; i < ROOMS.length; i++) h += '<span class="frag' + (i < G.frags.length ? ' on' : '') + '">' + (i < G.frags.length ? G.frags[i] : '?') + '</span>';
    el('frags').innerHTML = h;
  }

  function showDoor() {
    el('rIcon').textContent = '🚪';
    el('rPlace').textContent = 'Puerta de salida';
    el('rStep').textContent = 'Código final';
    el('rNarr').textContent = 'Has reunido los 4 fragmentos. Introduce el código completo en el teclado de la puerta para escapar.';
    el('rQ').textContent = 'Código de 4 dígitos:';
    el('answer').innerHTML = '<input type="text" id="inp" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="● ● ● ●" style="text-align:center;letter-spacing:.5em;font-family:var(--mono)">';
    el('inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') checkDoor(); });
    el('btnCheck').style.display = ''; el('btnCheck').textContent = '🔓 Abrir';
    el('feedback').className = 'feedback'; el('feedback').textContent = '';
    setTimeout(function () { el('inp').focus(); }, 50);
  }
  function checkDoor() {
    var v = (el('inp').value || '').replace(/\D/g, '');
    if (v === FINAL) escape(); else { el('feedback').className = 'feedback bad'; el('feedback').textContent = '❌ Código incorrecto. Revisa los fragmentos.'; }
  }
  function escape() {
    G.running = false; cancelAnimationFrame(tRaf);
    var s = (performance.now() - G.t0) / 1000 + G.hints * 30;
    var best = 0; try { best = parseFloat(localStorage.getItem('escapeSolarBest') || '0'); } catch (_) {}
    var isBest = !best || s < best; if (isBest) { try { localStorage.setItem('escapeSolarBest', String(s)); } catch (_) {} }
    el('room').classList.remove('show');
    el('endStats').innerHTML = '<div class="big">' + fmtT(s) + '</div><div class="muted" style="text-align:center">tiempo total' + (G.hints ? ' (incluye ' + G.hints + ' pista' + (G.hints > 1 ? 's' : '') + ')' : '') + '</div>' +
      (isBest ? '<div class="muted" style="text-align:center;color:var(--accent);margin-top:6px">🏆 ¡Nuevo récord!</div>' : (best ? '<div class="muted" style="text-align:center;margin-top:6px">Mejor marca: ' + fmtT(best) + '</div>' : ''));
    el('end').classList.add('show');
  }

  function init() {
    el('btnStart').onclick = start;
    el('btnCheck').onclick = function () { if (G.idx >= ROOMS.length) checkDoor(); else checkText(); };
    el('btnHint').onclick = hint;
    el('btnAgain').onclick = start;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

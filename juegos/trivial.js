/* ============================================================================
 * Trivial Solar — quiz por equipos (juego interno Factiun)
 * ----------------------------------------------------------------------------
 * Concurso tipo Kahoot para jugar en pantalla/proyector: varios equipos por
 * turnos, preguntas con temporizador, puntos por acierto + bonus de rapidez,
 * y ranking final. Banco de preguntas curado (FV, seguidores, PRL, O&M,
 * sostenibilidad, mercado).
 *
 * HOOK SolarGPT: si defines SOLARGPT_URL, el juego pedirá preguntas generadas
 * automáticamente (POST {n, cats} -> [{q,a:[4],c,cat,exp}]). Si falla o está
 * vacío, usa el banco local. Así queda listo para enchufar cuando tengáis el
 * endpoint, sin tocar el resto.
 * ==========================================================================*/
(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var SOLARGPT_URL = '';   // p.ej. 'https://solargpt.../trivia'  (POST {n,cats})

  /* ---------- categorías ---------- */
  var CATS = {
    fv:  { label: 'Fotovoltaica', icon: '⚡' },
    seg: { label: 'Seguidores', icon: '🔆' },
    prl: { label: 'Seguridad / PRL', icon: '🦺' },
    ope: { label: 'Operación & SCADA', icon: '📟' },
    sos: { label: 'Sostenibilidad', icon: '🌱' },
    mer: { label: 'Mercado', icon: '📈' }
  };

  /* ---------- banco de preguntas (curado, ampliable) ---------- */
  var BANK = [
    { cat: 'fv', q: '¿Qué significan las siglas FV?', a: ['Fotovoltaica', 'Flujo variable', 'Fuerza vertical', 'Fase voltaica'], c: 0, exp: 'FV = fotovoltaica: conversión directa de la luz solar en electricidad.' },
    { cat: 'fv', q: '¿En qué unidad se expresa la potencia pico de un módulo?', a: ['Wp (vatio pico)', 'kWh', 'Ah', 'Hz'], c: 0, exp: 'El Wp es la potencia en condiciones estándar de ensayo (STC).' },
    { cat: 'fv', q: '¿Qué hace el inversor de una planta FV?', a: ['Convierte corriente continua en alterna', 'Almacena energía', 'Sube la tensión sin convertir', 'Mide la irradiancia'], c: 0, exp: 'Los módulos dan corriente continua (CC) y el inversor la convierte en alterna (CA).' },
    { cat: 'fv', q: 'Un módulo BIFACIAL se caracteriza por…', a: ['Captar luz por sus dos caras', 'Tener siempre el doble de potencia', 'Funcionar de noche', 'No necesitar inversor'], c: 0, exp: 'Aprovecha también la luz reflejada por el suelo (albedo) en su cara trasera.' },
    { cat: 'fv', q: '¿Para qué sirve el MPPT de un inversor?', a: ['Seguir el punto de máxima potencia', 'Limpiar los módulos', 'Orientar los seguidores', 'Cargar baterías de 12 V'], c: 0, exp: 'MPPT (Maximum Power Point Tracking) extrae la máxima potencia del campo FV.' },
    { cat: 'fv', q: 'La irradiancia solar se mide en…', a: ['W/m²', 'kWh', '°C', 'm/s'], c: 0, exp: 'Es la potencia de la radiación solar por unidad de superficie.' },
    { cat: 'fv', q: 'Si sube la temperatura de la célula, su tensión…', a: ['Baja', 'Sube', 'No cambia', 'Se duplica'], c: 0, exp: 'A más temperatura, menor tensión y algo menos de rendimiento.' },
    { cat: 'fv', q: 'El "efecto albedo" en módulos bifaciales es…', a: ['Luz reflejada por el suelo que aprovecha la cara trasera', 'Una avería del vidrio', 'El calor del módulo', 'La sombra entre filas'], c: 0, exp: 'Suelos claros (grava, hormigón, nieve) aumentan la ganancia bifacial.' },

    { cat: 'seg', q: 'Un seguidor a un eje horizontal sigue al sol…', a: ['De este a oeste', 'De norte a sur', 'Solo en vertical', 'No se mueve'], c: 0, exp: 'Gira sobre un eje N-S acompañando al sol de este a oeste.' },
    { cat: 'seg', q: '¿Para qué sirve el "backtracking"?', a: ['Evitar sombras entre filas al amanecer/atardecer', 'Ir más rápido', 'Limpiar paneles', 'Cargar la batería'], c: 0, exp: 'Reduce el ángulo a primera/última hora para que una fila no dé sombra a la siguiente.' },
    { cat: 'seg', q: 'El GCR (Ground Cover Ratio) relaciona…', a: ['Superficie de módulos con superficie de terreno', 'Tensión con corriente', 'Potencia con energía', 'Viento con nieve'], c: 0, exp: 'Un GCR alto (filas juntas) implica más sombras y más necesidad de backtracking.' },
    { cat: 'seg', q: 'Ante viento muy fuerte, los seguidores se llevan a…', a: ['Una posición de seguridad (stow)', 'Máxima velocidad de giro', 'Apuntar siempre al sol', 'Una posición aleatoria'], c: 0, exp: 'La posición de defensa reduce la carga del viento sobre la estructura.' },
    { cat: 'seg', q: 'El rango de giro de un seguidor a 1 eje suele rondar…', a: ['±50–60°', '±5°', '±90°', '0–180°'], c: 0, exp: 'Los topes mecánicos típicos están en torno a ±55°.' },
    { cat: 'seg', q: 'Frente a una estructura fija, un seguidor solar…', a: ['Produce más energía', 'Produce menos', 'Produce igual', 'No necesita mantenimiento'], c: 0, exp: 'Al seguir al sol capta más irradiancia a lo largo del día.' },
    { cat: 'seg', q: 'El accionamiento que gira el eje del seguidor se llama…', a: ['Slew drive (corona + reductora)', 'Inversor', 'Piranómetro', 'String box'], c: 0, exp: 'Un slew drive con su motor mueve el tubo de torsión del seguidor.' },

    { cat: 'prl', q: 'Un string FV expuesto a la luz solar…', a: ['Genera tensión aunque parezca "apagado"', 'Está siempre sin tensión', 'Solo tiene tensión de noche', 'No es peligroso'], c: 0, exp: 'Mientras hay luz hay tensión: riesgo eléctrico permanente en CC.' },
    { cat: 'prl', q: 'EPI imprescindible para trabajos en altura/cubierta:', a: ['Arnés anticaídas', 'Gafas de sol', 'Guantes de jardín', 'Casco de bici'], c: 0, exp: 'La protección contra caídas en altura es obligatoria.' },
    { cat: 'prl', q: 'Una particularidad peligrosa de la CC frente a la CA es…', a: ['El arco eléctrico no tiene "paso por cero"', 'Que no hay tensión', 'Que no calienta', 'Que no hay corriente'], c: 0, exp: 'El arco en corriente continua es más difícil de extinguir; cuidado al manipular.' },
    { cat: 'prl', q: 'Ante un módulo roto en campo, lo correcto es…', a: ['Señalizar, no tocar y avisar a O&M', 'Tirarlo a la basura', 'Pisarlo para comprobarlo', 'Tocar los bornes'], c: 0, exp: 'Hay riesgo eléctrico y de corte; lo gestiona personal autorizado.' },

    { cat: 'ope', q: '¿Para qué sirve un SCADA?', a: ['Supervisar y controlar la planta a distancia', 'Lavar los módulos', 'Facturar a los clientes', 'Diseñar la planta'], c: 0, exp: 'Adquiere datos y permite operar y monitorizar la planta remotamente.' },
    { cat: 'ope', q: 'La "disponibilidad" de una planta es…', a: ['El % de tiempo que está operativa', 'La potencia pico', 'El precio de venta', 'La temperatura media'], c: 0, exp: 'Mide cuánto tiempo la planta puede producir sin estar parada.' },
    { cat: 'ope', q: 'El Performance Ratio (PR) compara…', a: ['Producción real frente a la teórica', 'Tensión con corriente', 'Viento con nieve', 'Coste con ingreso'], c: 0, exp: 'Indica la calidad del rendimiento descontando pérdidas.' },
    { cat: 'ope', q: 'Una alarma de "sobrecorriente de motor" apunta a…', a: ['El accionamiento del seguidor', 'El inversor', 'La red eléctrica', 'El piranómetro'], c: 0, exp: 'El motor del seguidor fuerza; si no se atiende puede bloquear el eje.' },
    { cat: 'ope', q: 'El "soiling" son pérdidas por…', a: ['Suciedad/polvo sobre los módulos', 'Exceso de sol', 'Viento', 'Frío'], c: 0, exp: 'Polvo, polen o nieve reducen la irradiancia que llega a la célula.' },
    { cat: 'ope', q: 'La curva de producción diaria tiene forma de…', a: ['Campana, con máximo al mediodía solar', 'Línea plana', 'Escalera', 'V'], c: 0, exp: 'Sigue la elevación del sol: pico al mediodía solar.' },

    { cat: 'sos', q: 'La energía solar fotovoltaica es…', a: ['Renovable', 'Fósil', 'Nuclear', 'No eléctrica'], c: 0, exp: 'Se basa en un recurso inagotable a escala humana: el sol.' },
    { cat: 'sos', q: '"Autoconsumo" significa…', a: ['Consumir la energía que tú mismo produces', 'Vender toda la energía', 'No tener contador', 'Comprar energía verde'], c: 0, exp: 'Se consume in situ la generación propia, con o sin excedentes.' },
    { cat: 'sos', q: 'Producir con solar en vez de con fósiles…', a: ['Reduce las emisiones de CO₂', 'Aumenta el CO₂', 'No afecta al CO₂', 'Genera residuos nucleares'], c: 0, exp: 'Desplaza generación fósil y evita emisiones.' },

    { cat: 'mer', q: 'El precio de la electricidad suele ser más alto…', a: ['En las horas punta (tarde-noche)', 'De madrugada', 'Siempre igual', 'Al mediodía solar'], c: 0, exp: 'La alta demanda y la poca solar al atardecer disparan el precio.' },
    { cat: 'mer', q: 'Si a mediodía hay mucha solar, el precio tiende a…', a: ['Bajar', 'Subir', 'Triplicarse', 'Desaparecer'], c: 0, exp: 'El exceso de oferta solar abarata el "valle" del mediodía (curva de pato).' },
    { cat: 'mer', q: 'Un PPA es…', a: ['Un contrato de compraventa de energía a largo plazo', 'Un tipo de panel', 'Una herramienta de limpieza', 'Una alarma'], c: 0, exp: 'Power Purchase Agreement: fija condiciones de venta de la energía.' },
    { cat: 'mer', q: 'Cumplir el "contrato de producción" del día implica…', a: ['Entregar la energía comprometida', 'Pintar los módulos', 'Apagar la planta', 'Subir el precio'], c: 0, exp: 'No cumplirlo puede acarrear penalizaciones.' }
  ];

  /* ---------- estado ---------- */
  var G = null, nTeams = 2, selCats = Object.keys(CATS).slice();

  function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  /* ---------- setup UI ---------- */
  function renderTeams() {
    var h = '';
    for (var i = 0; i < nTeams; i++) h += '<input type="text" id="team' + i + '" maxlength="18" placeholder="Equipo ' + (i + 1) + '" value="Equipo ' + (i + 1) + '">';
    el('teams').innerHTML = h;
    el('teamN').textContent = nTeams;
  }
  function renderCats() {
    var h = '';
    Object.keys(CATS).forEach(function (k) {
      h += '<button class="cat' + (selCats.indexOf(k) >= 0 ? ' on' : '') + '" data-k="' + k + '">' + CATS[k].icon + ' ' + CATS[k].label + '</button>';
    });
    el('catBox').innerHTML = h;
    Array.prototype.forEach.call(el('catBox').querySelectorAll('.cat'), function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k'), i = selCats.indexOf(k);
        if (i >= 0) { if (selCats.length > 1) selCats.splice(i, 1); } else selCats.push(k);
        renderCats();
      };
    });
  }

  /* ---------- carga de preguntas (banco o SolarGPT) ---------- */
  function fetchSolarGPT(n, cats) {
    return fetch(SOLARGPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n: n, cats: cats }) })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (arr) { if (!Array.isArray(arr) || !arr.length) throw 0; return arr.filter(function (q) { return q && q.q && q.a && q.a.length >= 2; }); });
  }
  function localQuestions(n, cats) {
    var pool = BANK.filter(function (q) { return cats.indexOf(q.cat) >= 0; });
    shuffle(pool);
    return pool.slice(0, Math.min(n, pool.length));
  }
  function prepare(list) {
    return list.map(function (q) {
      var opts = q.a.map(function (t, i) { return { t: t, ok: i === q.c }; });
      shuffle(opts);
      return { q: q.q, cat: q.cat, exp: q.exp || '', opts: opts, ci: opts.map(function (o) { return o.ok; }).indexOf(true) };
    });
  }

  /* ---------- partida ---------- */
  function start() {
    var teams = [];
    for (var i = 0; i < nTeams; i++) { var v = (el('team' + i).value || '').trim() || ('Equipo ' + (i + 1)); teams.push({ name: v, score: 0, ok: 0 }); }
    var count = parseInt(el('qcount').value, 10), time = parseInt(el('qtime').value, 10);
    el('btnStart').disabled = true; el('btnStart').textContent = 'Preparando…';
    var go = function (list) {
      var qs = prepare(list);
      if (!qs.length) { el('btnStart').disabled = false; el('btnStart').textContent = '▶ Empezar'; alert('No hay preguntas para esas categorías.'); return; }
      G = { teams: teams, qs: qs, idx: 0, time: time, answered: false, raf: 0, endAt: 0 };
      el('setup').classList.remove('show'); el('game').classList.add('show');
      el('btnStart').disabled = false; el('btnStart').textContent = '▶ Empezar';
      showQuestion();
    };
    if (SOLARGPT_URL) fetchSolarGPT(count, selCats).then(go).catch(function () { go(localQuestions(count, selCats)); });
    else go(localQuestions(count, selCats));
  }

  function showQuestion() {
    G.answered = false;
    var q = G.qs[G.idx], team = G.teams[G.idx % G.teams.length];
    el('gCat').textContent = CATS[q.cat].icon + ' ' + CATS[q.cat].label;
    el('gNum').textContent = (G.idx + 1) + ' / ' + G.qs.length;
    el('gTeam').textContent = 'Turno: ' + team.name;
    el('qText').textContent = q.q;
    var letters = ['A', 'B', 'C', 'D'];
    var h = '';
    for (var i = 0; i < q.opts.length; i++) h += '<button class="opt" data-i="' + i + '"><span class="ol">' + letters[i] + '</span>' + q.opts[i].t + '</button>';
    el('opts').innerHTML = h;
    Array.prototype.forEach.call(el('opts').querySelectorAll('.opt'), function (b) { b.onclick = function () { answer(parseInt(b.getAttribute('data-i'), 10)); }; });
    el('reveal').className = 'reveal'; el('reveal').innerHTML = '';
    el('btnNext').style.visibility = 'hidden';
    el('scores').innerHTML = scoreboard();
    // temporizador
    G.endAt = performance.now() + G.time * 1000;
    cancelAnimationFrame(G.raf); tick();
  }
  function tick() {
    var left = Math.max(0, G.endAt - performance.now()), frac = left / (G.time * 1000);
    el('timerBar').style.width = (frac * 100) + '%';
    el('timerBar').style.background = frac < 0.25 ? 'var(--danger)' : (frac < 0.5 ? 'var(--sun)' : 'var(--accent)');
    if (left <= 0) { if (!G.answered) answer(-1); return; }
    G.raf = requestAnimationFrame(tick);
  }
  function answer(i) {
    if (G.answered) return; G.answered = true; cancelAnimationFrame(G.raf);
    var q = G.qs[G.idx], team = G.teams[G.idx % G.teams.length];
    var left = Math.max(0, G.endAt - performance.now()), frac = left / (G.time * 1000);
    var correct = (i === q.ci);
    var pts = correct ? Math.round(500 + 500 * frac) : 0;
    team.score += pts; if (correct) team.ok++;
    Array.prototype.forEach.call(el('opts').querySelectorAll('.opt'), function (b) {
      var bi = parseInt(b.getAttribute('data-i'), 10);
      if (bi === q.ci) b.classList.add('ok');
      else if (bi === i) b.classList.add('bad');
      b.disabled = true;
    });
    var msg = correct ? ('✅ ¡Correcto! +' + pts + ' pts') : (i < 0 ? '⏱ Se acabó el tiempo' : '❌ Incorrecto');
    el('reveal').className = 'reveal show ' + (correct ? 'ok' : 'bad');
    el('reveal').innerHTML = '<b>' + msg + '</b><div class="exp">' + q.exp + '</div>';
    el('scores').innerHTML = scoreboard();
    el('btnNext').style.visibility = 'visible';
    el('btnNext').textContent = (G.idx + 1 >= G.qs.length) ? '🏁 Ver resultado' : '➡ Siguiente';
  }
  function next() { G.idx++; if (G.idx >= G.qs.length) end(); else showQuestion(); }
  function scoreboard() {
    var t = G.teams.slice().sort(function (a, b) { return b.score - a.score; });
    return t.map(function (x) { return '<span class="sc"><b>' + escapeHtml(x.name) + '</b> ' + x.score + '</span>'; }).join('');
  }
  function end() {
    el('game').classList.remove('show'); el('end').classList.add('show');
    var t = G.teams.slice().sort(function (a, b) { return b.score - a.score; });
    var medals = ['🥇', '🥈', '🥉'];
    var h = '<table class="rank"><tr><th>#</th><th>Equipo</th><th>Aciertos</th><th>Puntos</th></tr>';
    for (var i = 0; i < t.length; i++) h += '<tr' + (i === 0 ? ' class="me"' : '') + '><td>' + (medals[i] || (i + 1)) + '</td><td>' + escapeHtml(t[i].name) + '</td><td>' + t[i].ok + '/' + G.qs.length + '</td><td><b>' + t[i].score + '</b></td></tr>';
    h += '</table>';
    el('endRank').innerHTML = h;
    el('endWin').textContent = '🏆 ' + t[0].name;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }

  /* ---------- init ---------- */
  function init() {
    renderTeams(); renderCats();
    el('teamPlus').onclick = function () { if (nTeams < 6) { nTeams++; renderTeams(); } };
    el('teamMinus').onclick = function () { if (nTeams > 1) { nTeams--; renderTeams(); } };
    el('btnStart').onclick = start;
    el('btnNext').onclick = next;
    el('btnAgain').onclick = function () { el('end').classList.remove('show'); el('setup').classList.add('show'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

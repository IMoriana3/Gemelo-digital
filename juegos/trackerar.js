/* ============================================================================
 * Tracker AR — render completo del gemelo + Realidad Aumentada (WebXR)
 * ----------------------------------------------------------------------------
 * Hero: campo de seguidores detail:'full' con césped, sombras y el sol cruzando
 * el cielo (escena.js). Botón "Ver en RA": en Android/Chrome (HTTPS) coloca un
 * seguidor a escala en tu espacio con WebXR hit-test. En el resto, visor 3D.
 * ==========================================================================*/
(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var THREE = window.THREE;
  var ESC, renderer, arScene, arCam, arModel, reticle, hitSrc = null, placed = false, last = 0;

  function build() {
    ESC = Escena.create(THREE, el('cv'), { layout: 'field', detail: 'full', autoDay: true, daySeconds: 85, autoOrbit: true, hour: 7.5 });
    renderer = ESC.renderer;
    // escena AR aparte (solo el seguidor a escala)
    arScene = new THREE.Scene();
    arScene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.0));
    var dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(1, 3, 1); arScene.add(dl);
    arCam = new THREE.PerspectiveCamera(60, 1, 0.01, 40);
    var grp = Seguidor.buildGroup(THREE, { detail: 'full', size: 'largo', materials: ESC.materials });
    arModel = new THREE.Group(); arModel.add(grp.spin); arModel.add(grp.static); arModel.scale.setScalar(0.04); arModel.visible = false; arScene.add(arModel);
    reticle = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x36d399 }));
    reticle.matrixAutoUpdate = false; reticle.visible = false; arScene.add(reticle);

    // ¿AR disponible?
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-ar').then(function (ok) {
        el('arbtn').style.display = ok ? '' : 'none';
        if (!ok) el('arnote').textContent = 'RA no disponible aquí. Ábrelo en un móvil Android (Chrome) y publicado por HTTPS para colocarlo en tu espacio. Mientras, gíralo en 3D.';
      });
    } else { el('arbtn').style.display = 'none'; el('arnote').textContent = 'Este navegador no soporta WebXR. Disfruta el visor 3D; la RA va en Android/Chrome (HTTPS).'; }

    el('arbtn').onclick = startAR;
    el('arexit').onclick = function () { var s = renderer.xr.getSession && renderer.xr.getSession(); if (s) s.end(); };
    renderer.setAnimationLoop(render);
  }

  function startAR() {
    if (!navigator.xr) return;
    renderer.xr.enabled = true;
    navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: el('aroverlay') } })
      .then(function (session) {
        renderer.xr.setReferenceSpaceType('local');
        renderer.xr.setSession(session);
        placed = false; arModel.visible = false; reticle.visible = false;
        el('aroverlay').classList.add('show'); el('arhint').textContent = 'Mueve el móvil para detectar el suelo y toca para colocar el seguidor.';
        session.requestReferenceSpace('viewer').then(function (vs) { session.requestHitTestSource({ space: vs }).then(function (src) { hitSrc = src; }); });
        session.addEventListener('select', function () { if (reticle.visible && !placed) { arModel.position.setFromMatrixPosition(reticle.matrix); arModel.visible = true; placed = true; reticle.visible = false; el('arhint').textContent = '✔ Colocado. Acércate y rodéalo. Pulsa Salir para terminar.'; } });
        session.addEventListener('end', function () { hitSrc = null; renderer.xr.enabled = false; el('aroverlay').classList.remove('show'); });
      })
      .catch(function () { el('arnote').textContent = 'No se pudo iniciar la RA en este dispositivo.'; });
  }

  function render(now, frame) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (renderer.xr.isPresenting) {
      if (frame && hitSrc) {
        var ref = renderer.xr.getReferenceSpace(), hits = frame.getHitTestResults(hitSrc);
        if (hits.length) { var pose = hits[0].getPose(ref); reticle.visible = !placed; reticle.matrix.fromArray(pose.transform.matrix); } else reticle.visible = false;
      }
      renderer.render(arScene, arCam);
    } else {
      ESC.frame(now, dt);
    }
  }
  function init() { build(); addEventListener('resize', function () { ESC.resize(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

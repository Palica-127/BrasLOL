/* Mapa 3D da partida ao vivo (Summoner's Rift estilizado). Usa three.js (lib/three.min.js, r128, local). SEM regra de jogo: só desenha o estado
   que o index.html entrega a cada quadro (posições, vida, estruturas, monstros). O chão é a mesma imagem do mapa 2D, então rotas e rio batem.
   Coordenadas: x em 0..134.88 e y em 0..100 (as mesmas do SVG do mapa 2D); y cresce para baixo (norte = topo).
   API: LV3D.mount(el, textureUrl) · LV3D.frame(state) · LV3D.unmount() · LV3D.ok() */
(function (g) {
  'use strict';
  var W = 134.88, H = 100, S = null;
  var TEAM = { b: 0x4d8dff, r: 0xff5c8a };

  function ok() { return !!g.THREE; }
  function X(x) { return x - W / 2; }
  function Z(y) { return y - H / 2; }

  function mat(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); }

  function nameSprite(txt, color) {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    var c = cv.getContext('2d'); c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(txt, 128, 32); c.fillStyle = color || '#fff'; c.fillText(txt, 128, 32);
    var t = new THREE.CanvasTexture(cv), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.scale.set(8, 2, 1); s.renderOrder = 10; s.userData.cv = cv; s.userData.t = t; s.userData.txt = txt; return s;
  }
  function redrawSprite(s, txt, color) {
    if (s.userData.txt === txt) return; s.userData.txt = txt;
    var c = s.userData.cv.getContext('2d'); c.clearRect(0, 0, 256, 64); c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(txt, 128, 32); c.fillStyle = color || '#fff'; c.fillText(txt, 128, 32); s.userData.t.needsUpdate = true;
  }
  /* barra de vida: fundo + preenchimento virados para a câmera */
  function bar(width, color) {
    var gp = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.7), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, depthTest: false }));
    var fg = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.2, 0.5), new THREE.MeshBasicMaterial({ color: color, depthTest: false }));
    fg.geometry.translate((width - 0.2) / 2, 0, 0); fg.position.set(-(width - 0.2) / 2, 0, 0.01); bg.renderOrder = 11; fg.renderOrder = 12;
    gp.add(bg); gp.add(fg); gp.userData.fg = fg; gp.userData.w = width; return gp;
  }
  function setBar(b, f, color) { b.userData.fg.scale.x = Math.max(0.001, Math.min(1, f)); if (color != null) b.userData.fg.material.color.setHex(color); }

  function mkChamp(p) {
    var gp = new THREE.Group(), col = TEAM[p.team] || 0xffffff;
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.2, 14), mat(col)); body.position.y = 1.1;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), mat(0xf2f2f2)); head.position.y = 2.8;
    var ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.9, 24), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    gp.add(body); gp.add(head); gp.add(ring);
    var hb = bar(5, 0x58e08a); hb.position.y = 5.2; gp.add(hb);
    var nm = nameSprite(p.name || '', '#fff'); nm.position.y = 6.4; gp.add(nm);
    gp.userData = { body: body, head: head, hb: hb, nm: nm, ring: ring }; gp.scale.setScalar(0.85); return gp;
  }
  function mkStruct(s) {
    var gp = new THREE.Group(), col = TEAM[s.team] || 0xffffff, m;
    if (s.kind === 't') {                        /* torre */
      m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.1, 5.5, 10), mat(0x8c8f99)); m.position.y = 2.75; gp.add(m);
      var top = new THREE.Mesh(new THREE.ConeGeometry(2, 2.4, 10), mat(col)); top.position.y = 6.7; gp.add(top);
      var orb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: col })); orb.position.y = 8.4; gp.add(orb);
    } else if (s.kind === 'i') {                 /* inibidor */
      m = new THREE.Mesh(new THREE.OctahedronGeometry(2.1), mat(col, { emissive: col, emissiveIntensity: 0.35 })); m.position.y = 3; gp.add(m);
      var bs = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1, 8), mat(0x555a66)); bs.position.y = 0.5; gp.add(bs);
    } else {                                      /* nexus */
      m = new THREE.Mesh(new THREE.OctahedronGeometry(3.6), mat(col, { emissive: col, emissiveIntensity: 0.5 })); m.position.y = 5; gp.add(m);
      var bs2 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5, 1.6, 10), mat(0x555a66)); bs2.position.y = 0.8; gp.add(bs2);
    }
    gp.userData = { main: m }; gp.scale.setScalar(0.72); return gp;
  }
  function mkMon(m) {
    var gp = new THREE.Group(), epic = !!m.epic;
    var body = new THREE.Mesh(epic ? new THREE.DodecahedronGeometry(2.6) : new THREE.SphereGeometry(1.1, 10, 8), mat(epic ? 0xd8a23a : 0x6fa86f)); body.position.y = epic ? 2.6 : 1.1; gp.add(body);
    var hb = bar(epic ? 6 : 3.6, epic ? 0xf3b94d : 0x6fd16f); hb.position.y = epic ? 6.2 : 3.4; gp.add(hb);
    gp.userData = { body: body, hb: hb, epic: epic }; return gp;
  }

  function mount(el, texUrl) {
    if (!ok() || S) return !!S;
    var cv = document.createElement('canvas'); cv.className = 'lv3dcv'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;border-radius:10px;touch-action:none;cursor:grab';
    el.appendChild(cv);
    var r;
    try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); } catch (e) { el.removeChild(cv); return false; }
    r.setPixelRatio(Math.min(2, g.devicePixelRatio || 1));
    var sc = new THREE.Scene(); sc.background = new THREE.Color(0x0b1220);
    var cam = new THREE.PerspectiveCamera(42, 1, 1, 600);
    sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a3a2a, 0.85));
    var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-40, 90, 60); sc.add(sun);
    /* chão: a mesma arte do mapa 2D */
    var tex = new THREE.TextureLoader().load(texUrl); tex.anisotropy = 8;
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex })); ground.rotation.x = -Math.PI / 2; sc.add(ground);
    var base = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 3, H + 6), mat(0x16202e)); base.position.y = -1.6; sc.add(base);
    S = { el: el, cv: cv, r: r, sc: sc, cam: cam, objs: {}, bars: [], pits: {}, az: 0.0, pol: 0.95, dist: 134, tx: 0, tz: 4, drag: null, w: 0, h: 0 };
    /* controles: arrastar gira, Shift/botão direito move, roda aproxima; duplo clique restaura */
    cv.addEventListener('pointerdown', function (e) { S.drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey || e.button === 2 }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', function (e) {
      if (!S.drag) return; var dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.x = e.clientX; S.drag.y = e.clientY;
      if (S.drag.pan) { var k = S.dist / 700; S.tx -= (dx * Math.cos(S.az) + dy * Math.sin(S.az)) * k; S.tz -= (-dx * Math.sin(S.az) + dy * Math.cos(S.az)) * k; }
      else { S.az -= dx * 0.006; S.pol = Math.max(0.25, Math.min(1.35, S.pol - dy * 0.005)); }
    });
    function up() { S.drag = null; cv.style.cursor = 'grab'; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); S.dist = Math.max(28, Math.min(190, S.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    cv.addEventListener('dblclick', function () { S.az = 0; S.pol = 0.95; S.dist = 134; S.tx = 0; S.tz = 4; });
    return true;
  }
  function size() {
    var w = S.el.clientWidth || 800, h = S.el.clientHeight || 500;
    if (w !== S.w || h !== S.h) { S.w = w; S.h = h; S.r.setSize(w, h, false); S.cam.aspect = w / h; S.cam.updateProjectionMatrix(); }
  }
  /* sincroniza um conjunto de objetos por id */
  function sync(list, make, upd, seen) {
    list.forEach(function (it) {
      var o = S.objs[it.id]; if (!o) { o = make(it); S.objs[it.id] = o; S.sc.add(o); }
      seen[it.id] = 1; upd(o, it);
    });
  }
  function frame(st) {
    if (!S) return; size();
    var seen = {}, q = S.cam.quaternion;
    sync(st.structs || [], mkStruct, function (o, s) { o.position.set(X(s.x), 0, Z(s.y)); o.visible = !!s.alive; }, seen);
    sync(st.players || [], mkChamp, function (o, p) {
      o.position.set(X(p.x), 0, Z(p.y)); o.visible = true; var u = o.userData;
      u.body.material.opacity = p.dead ? 0.25 : 1; u.body.material.transparent = !!p.dead; u.head.visible = !p.dead; u.hb.visible = !p.dead;
      u.ring.scale.setScalar(p.me ? 1.35 : 1); setBar(u.hb, p.hp, p.hp < 0.3 ? 0xe0584a : 0x58e08a); u.hb.quaternion.copy(q);
      redrawSprite(u.nm, (p.name || '') + (p.lv ? ' · ' + p.lv : ''), p.me ? '#ffe27a' : '#ffffff');
    }, seen);
    sync((st.mons || []).map(function (m, i) { m.id = 'm' + (m.epic ? 'e' + m.k : '') + Math.round(m.x * 10) + '_' + Math.round(m.y * 10); return m; }), mkMon, function (o, m) {
      o.position.set(X(m.x), 0, Z(m.y)); o.visible = true; setBar(o.userData.hb, m.hp); o.userData.hb.quaternion.copy(q);
    }, seen);
    /* barras de vida de torres (a da frente de cada rota) */
    var bl = st.bars || [];
    while (S.bars.length < bl.length) { var b = bar(6, 0x58e08a); b.position.y = 9.6; S.sc.add(b); S.bars.push(b); }
    S.bars.forEach(function (b, i) {
      var d = bl[i]; if (!d) { b.visible = false; return; } b.visible = true; b.position.set(X(d.x), 7.6, Z(d.y)); b.quaternion.copy(q); setBar(b, d.f, d.c === 'b' ? 0x4d8dff : 0xff5c8a);
    });
    /* poços de Dragão/Barão */
    (st.pits || []).forEach(function (p) {
      var o = S.pits[p.id]; if (!o) { o = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.4, 20), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.0 })); o.position.set(X(p.x), 0.25, Z(p.y)); S.sc.add(o); S.pits[p.id] = o; }
      o.material.opacity = p.up ? 0.45 : 0.0;
    });
    Object.keys(S.objs).forEach(function (k) { if (!seen[k]) { var o = S.objs[k]; S.sc.remove(o); delete S.objs[k]; } });
    /* câmera orbital */
    var sp = Math.sin(S.pol), cp = Math.cos(S.pol);
    S.cam.position.set(S.tx + S.dist * sp * Math.sin(S.az), S.dist * cp, S.tz + S.dist * sp * Math.cos(S.az));
    S.cam.lookAt(S.tx, 0, S.tz); S.r.render(S.sc, S.cam);
  }
  function unmount() {
    if (!S) return; try { S.r.dispose(); } catch (e) { /* ok */ } if (S.cv.parentNode) S.cv.parentNode.removeChild(S.cv); S = null;
  }
  g.LV3D = { mount: mount, frame: frame, unmount: unmount, ok: ok, mounted: function () { return !!S; } };
})(typeof window !== 'undefined' ? window : this);

/* =========================================================
   player.js — 3D TPS 코어 (PUBG 스타일)
   CONFIG / Input / Inventory / AudioSys / GameCore(3D월드) / Player(3D)
   ========================================================= */

window.CONFIG = window.CONFIG || {
  player: { maxHp: 100, speed: 6.2, runMult: 1.6, radius: 0.6, wrongPenalty: 20, healTime: 1.2 },
  medkit: { heal: 40, useTime: 1.2, maxBase: 2 },
  reward: { boost: 0.30, medkit: 0.22, supplyGun: 0.18, armor: 0.30 },
  weapons: {
    basic:  { name: "기본 소총",  damage: 25, magSize: 12, reserve: 90,  rpm: 320, reload: 1.4, color: "#9aa4ad", auto: true,  spread: 0.035, recoil: 1.0 },
    boost:  { name: "강화 소총",  damage: 35, magSize: 15, reserve: 105, rpm: 380, reload: 1.2, color: "#ffd166", auto: true,  spread: 0.030, recoil: 0.9 },
    supply: { name: "보급 저격총", damage: 90, magSize: 8,  reserve: 40,  rpm: 45,  reload: 2.0, color: "#ef476f", auto: false, spread: 0.004, recoil: 2.2 }
  },
  helmetRed: [0, 0.30, 0.40, 0.55],
  vestRed:   [0, 0.25, 0.35, 0.50],
  bagMedMax: [2, 3, 4, 6],
  enemies: { normalHp: 60, bossHp: 1000, damage: 10, speed: 3.6, bossSpeed: 2.8, attackRange: 2.2, attackCd: 1.1, chargeDmg: 30, chargeDist: 26, chargeSpeed: 22, chargeCd: 7, chargeWarn: 2.0 },
  stage: { normalCount: 10 },
  world: { size: 240, half: 118 }
};

/* ---------------- Input (포인터락 TPS) ---------------- */
window.Input = window.Input || {
  keys: new Set(), pressed: new Set(),
  mouse: { dx: 0, dy: 0, down: false, clicked: false, rdown: false, rclicked: false },
  locked: false,
  init(canvas) {
    if (this._inited) return; this._inited = true;
    addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      if (k === "tab") e.preventDefault();
    });
    addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    addEventListener("blur", () => { this.keys.clear(); this.mouse.down = false; });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener("mousemove", e => {
      if (this.locked) { this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0; }
    });
    canvas.addEventListener("click", () => {
      if (GameCore && (GameCore.state === "play" || GameCore.state === "tutorial") && !this.locked) {
        try { canvas.requestPointerLock(); } catch (_) {}
      }
    });
    addEventListener("mousedown", e => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
      if (e.button === 2) { this.mouse.rdown = true; this.mouse.rclicked = true; }
    });
    addEventListener("mouseup", e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rdown = false;
    });
    addEventListener("contextmenu", e => e.preventDefault());
    addEventListener("wheel", e => {
      if (!GameCore) return;
      const tutOk = GameCore.state === "tutorial" && GameCore.tutAllowSwitch;
      if (GameCore.state === "play" || tutOk) {
        if (e.deltaY > 0) Inventory.nextWeapon(1);
        else if (e.deltaY < 0) Inventory.nextWeapon(-1);
      }
    });
  },
  down(k) { return this.keys.has(k.toLowerCase()); },
  consume(k) { k = k.toLowerCase(); if (this.pressed.has(k)) { this.pressed.delete(k); return true; } return false; },
  consumeClick() { if (this.mouse.clicked) { this.mouse.clicked = false; return true; } return false; },
  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0; this.mouse.dy = 0;
    this.mouse.clicked = false; this.mouse.rclicked = false;
  }
};

/* ---------------- Inventory (PUBG식 장비) ---------------- */
window.Inventory = window.Inventory || {
  weapons: [], active: 0, medkits: 1,
  helmet: 0, vest: 0, bag: 0,
  attachments: { scope: false, muzzle: false, grip: false, extmag: false },
  boostLevel: 0,
  reset() {
    this.weapons = [this.makeGun("basic")]; this.active = 0;
    this.medkits = 1; this.helmet = 0; this.vest = 0; this.bag = 0;
    this.attachments = { scope: false, muzzle: false, grip: false, extmag: false };
    this.boostLevel = 0;
  },
  makeGun(id) {
    const c = CONFIG.weapons[id];
    return { id, mag: this.magSizeOf(id), reserve: c.reserve, att: { scope: false, muzzle: false, grip: false, extmag: false } };
  },
  magSizeOf(id) {
    const base = CONFIG.weapons[id].magSize;
    const ext = this.attachments.extmag ? 1.5 : 1;
    return Math.round(base * ext);
  },
  current() { return this.weapons[this.active]; },
  nextWeapon(d) {
    if (this.weapons.length < 2) return;
    this.active = (this.active + d + this.weapons.length) % this.weapons.length;
    if (window.AudioSys) AudioSys.reload();
  },
  medMax() { return CONFIG.bagMedMax[this.bag] || 2; },
  addGun(id) {
    if (this.weapons.length < 2) { this.weapons.push(this.makeGun(id)); this.active = this.weapons.length - 1; return "new"; }
    // 슬롯이 차면 현재 총 업그레이드
    const cur = this.weapons[this.active];
    const order = { basic: 0, boost: 1, supply: 2 };
    if ((order[id] || 0) > (order[cur.id] || 0)) {
      const att = cur.att;
      this.weapons[this.active] = this.makeGun(id);
      this.weapons[this.active].att = att;
      return "upgrade";
    }
    // 탄약만 보충
    cur.reserve = Math.min(cur.reserve + 40, 200);
    return "ammo";
  },
  addMedkit() {
    if (this.medkits < this.medMax()) { this.medkits++; return true; }
    return false;
  },
  applyBoost() {
    this.boostLevel++;
    const g = this.weapons[this.active];
    if (g && g.id === "basic") { const att = g.att, mag = g.mag, res = g.reserve; const ng = this.makeGun("boost"); ng.att = att; ng.mag = Math.min(mag + 3, ng.mag); ng.reserve = res; this.weapons[this.active] = ng; }
  },
  equipHelmet(lv) { if (lv > this.helmet) { this.helmet = lv; return true; } return false; },
  equipVest(lv) { if (lv > this.vest) { this.vest = lv; return true; } return false; },
  equipBag(lv) { if (lv > this.bag) { this.bag = lv; return true; } return false; },
  attachPart(part) {
    if (this.attachments[part]) return false;
    this.attachments[part] = true;
    const cur = this.current();
    if (cur) cur.att[part] = true;
    if (part === "extmag" && cur) {
      const c = CONFIG.weapons[cur.id];
      cur.mag = Math.min(cur.mag + Math.round(c.magSize * 0.5), this.magSizeOf(cur.id));
    }
    return true;
  },
  damageReduction() {
    const h = (CONFIG.helmetRed[this.helmet] || 0);
    const v = (CONFIG.vestRed[this.vest] || 0);
    return Math.min(0.7, h * 0.5 + v * 0.5);
  }
};

/* ---------------- Audio ---------------- */
window.AudioSys = window.AudioSys || {
  ctx: null,
  init() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === "suspended") this.ctx.resume(); } catch (_) {} },
  tone(freq, d, vol, type) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || "sine"; o.frequency.value = freq; g.gain.value = vol || 0.03;
      o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + d);
    } catch (_) {}
  },
  noise(d, vol, low) {
    if (!this.ctx) return;
    try {
      const n = Math.floor(this.ctx.sampleRate * d);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = low || 1200;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.12;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start();
    } catch (_) {}
  },
  shoot(kind) {
    if (kind === "supply") { this.noise(0.22, 0.22, 700); this.tone(70, 0.18, 0.06, "sawtooth"); }
    else { this.noise(0.09, 0.13, 1800); this.tone(140, 0.05, 0.04, "square"); }
  },
  reload() { this.tone(240, 0.06); setTimeout(() => this.tone(360, 0.06), 90); },
  correct() { this.tone(660, 0.1); setTimeout(() => this.tone(880, 0.14), 110); },
  wrong() { this.tone(140, 0.2, 0.05, "sawtooth"); },
  heal() { this.tone(520, 0.15); setTimeout(() => this.tone(700, 0.12), 130); },
  reward() { this.tone(880, 0.12); setTimeout(() => this.tone(1170, 0.16), 120); },
  hit() { this.noise(0.06, 0.1, 2500); },
  pickup() { this.tone(500, 0.07); setTimeout(() => this.tone(750, 0.08), 70); }
};

/* ---------------- GameCore 3D ---------------- */
window.GameCore = window.GameCore || {
  canvas: null, renderer: null, scene: null, camera: null, sun: null,
  state: "menu", hp: 100, kills: 0, totalEnemies: 10, enemy: null,
  score: 0, correctCount: 0, wrongCount: 0, rewardsTaken: [],
  last: 0, raf: 0, shake: 0,
  colliders: [], loots: [], particles: [], smokes: [], tracers: [], dmgNums: [],
  supplyCrate: null, zone: null, playTime: 0, zoneTick: 0,
  tmpV: null, tutorial: null, horde: [], wave: 1, reinfT: 20, lastHitAt: 0,

  init() {
    this.canvas = document.getElementById("game3d");
    Input.init(this.canvas);
    addEventListener("resize", () => this.resize());
    this.initThree();
    this.buildWorld();
    this.resize();
    Inventory.reset();
    if (window.Player) Player.reset(this);
    if (window.QuestionSys) QuestionSys.reset();
    this.state = "menu";
    if (window.UI) UI.init();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
  },

  initThree() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    // 배그풍 색감: sRGB + 영화 톤매핑
    try {
      r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.15;
    } catch (_) {}
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5e0);
    this.scene.fog = new THREE.Fog(0xc3d3e2, 70, 240);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);
    this.camera.position.set(0, 4, 10);
    this.tmpV = new THREE.Vector3();
    // 그라데이션 하늘 돔 (수평선 웜톤 → 천정 딥블루)
    try {
      const sc = document.createElement("canvas"); sc.width = 2; sc.height = 256;
      const sg = sc.getContext("2d");
      const gr = sg.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0.0, "#2f5f9e");
      gr.addColorStop(0.45, "#7fb0dd");
      gr.addColorStop(0.62, "#cfdde9");
      gr.addColorStop(0.68, "#e8e4d2");
      gr.addColorStop(0.72, "#6a7f56");
      gr.addColorStop(1.0, "#4d5c3d");
      sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256);
      const st = new THREE.CanvasTexture(sc);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(420, 24, 16),
        new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false })
      );
      dome.renderOrder = -10;
      this.scene.add(dome);
    } catch (_) {}
    const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x5a6b45, 0.75);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xffedd0, 1.35);
    this.sun.position.set(55, 62, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -80; this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80; this.sun.shadow.camera.bottom = -80;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    // 구름
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(
        new THREE.SphereGeometry(6 + Math.random() * 8, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false })
      );
      c.position.set((Math.random() - 0.5) * 300, 55 + Math.random() * 20, (Math.random() - 0.5) * 300);
      c.scale.y = 0.35;
      this.scene.add(c);
    }
  },

  grassTexture() {
    const cv = document.createElement("canvas"); cv.width = cv.height = 512;
    const g = cv.getContext("2d");
    g.fillStyle = "#77875a"; g.fillRect(0, 0, 512, 512);
    // 큰 얼룩 (잔디 결)
    for (let i = 0; i < 90; i++) {
      g.fillStyle = ["#6b7d4f", "#82936a", "#707f52", "#8b9a6b"][i % 4];
      g.globalAlpha = 0.28;
      const r = 14 + Math.random() * 42;
      g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, r, r * (0.5 + Math.random() * 0.6), Math.random() * 3, 0, 7); g.fill();
    }
    // 흙 패치
    for (let i = 0; i < 26; i++) {
      g.fillStyle = "#8a7f63";
      g.globalAlpha = 0.16;
      const r = 6 + Math.random() * 18;
      g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 512, r, r * 0.7, Math.random() * 3, 0, 7); g.fill();
    }
    // 잔디 결 스펙클
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = ["#5f7046", "#93a471", "#6d7f50", "#a3b184"][i % 4];
      g.globalAlpha = 0.5;
      g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 2 + Math.random() * 5);
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(cv);
    try { t.encoding = THREE.sRGBEncoding; } catch (_) {}
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(28, 28);
    t.anisotropy = 4;
    return t;
  },

  buildWorld() {
    const S = CONFIG.world.size;
    // 땅
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(S, S),
      new THREE.MeshLambertMaterial({ map: this.grassTexture() })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
    // 외곽 언덕
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x5d7343 });
    for (let i = 0; i < 8; i++) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(18 + Math.random() * 14, 10 + Math.random() * 10, 7), hillMat);
      const a = (i / 8) * Math.PI * 2;
      h.position.set(Math.cos(a) * 150, -2, Math.sin(a) * 150);
      this.scene.add(h);
    }
    // 도로 (십자)
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x8a7f66 });
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(10, S), roadMat);
    r1.rotation.x = -Math.PI / 2; r1.position.y = 0.02; this.scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(S, 10), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.y = 0.02; this.scene.add(r2);

    this.colliders = [];
    // 마을 건물들
    this.makeHouse(-22, -18, 12, 9, 5, 0.2);
    this.makeHouse(20, -25, 10, 8, 4.5, -0.15);
    this.makeHouse(-28, 22, 11, 8, 5, 0.1);
    this.makeHouse(25, 20, 13, 9, 5.5, -0.3);
    this.makeHouse(0, -45, 9, 7, 4, 0);
    this.makeHouse(-3, 48, 10, 8, 4.5, 0.35);
    this.makeWaterTower(45, -8);
    // 나무 / 바위 / 차 / 크레이트
    for (let i = 0; i < 55; i++) this.makeTree((Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220);
    for (let i = 0; i < 22; i++) this.makeRock((Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220);
    for (let i = 0; i < 5; i++) this.makeCar((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, Math.random() * 3);
    for (let i = 0; i < 10; i++) this.makeCrate((Math.random() - 0.5) * 140, (Math.random() - 0.5) * 140);
    // 짚더미
    for (let i = 0; i < 12; i++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.6, 10),
        new THREE.MeshLambertMaterial({ color: 0xc9a94e }));
      h.position.set((Math.random() - 0.5) * 180, 0.8, (Math.random() - 0.5) * 180);
      h.castShadow = true; this.scene.add(h);
    }
    // 안전구역 링 (흰색=현재) + 다음 구역 링 (파랑=타겟) + 배그식 파란 자기장 벽
    const zg = new THREE.RingGeometry(1, 1.06, 96);
    this.zoneRing = new THREE.Mesh(zg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    this.zoneRing.rotation.x = -Math.PI / 2; this.zoneRing.position.y = 0.06;
    this.scene.add(this.zoneRing);
    const tg = new THREE.RingGeometry(1, 1.03, 96);
    this.zoneTargetRing = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    this.zoneTargetRing.rotation.x = -Math.PI / 2; this.zoneTargetRing.position.y = 0.07;
    this.scene.add(this.zoneTargetRing);
    const wg = new THREE.CylinderGeometry(1, 1, 26, 96, 1, true);
    this.zoneWall = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0x2f80ed, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.zoneWall.position.y = 13;
    this.zoneWall.renderOrder = 5;
    this.scene.add(this.zoneWall);
    this.zone = { x: 0, z: 0, radius: 110, target: 110 };
    this.updateZoneRing();
  },

  boxCollider(x, z, hw, hd) { this.colliders.push({ x, z, hw, hd }); },
  circleCollider(x, z, r) { this.colliders.push({ x, z, cr: r }); },

  collide(x, z, r) {
    const H = CONFIG.world.half;
    x = Math.max(-H, Math.min(H, x)); z = Math.max(-H, Math.min(H, z));
    for (const c of this.colliders) {
      if (c.cr) {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.cr + r;
        if (d < min && d > 0.001) { x = c.x + dx / d * min; z = c.z + dz / d * min; }
      } else {
        const dx = x - c.x, dz = z - c.z;
        const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
        if (px > 0 && pz > 0) {
          if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hw + r);
          else z = c.z + Math.sign(dz || 1) * (c.hd + r);
        }
      }
    }
    return { x, z };
  },

  makeHouse(x, z, w, d, h, rot) {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd9c9a8 });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 2.6, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a4a38 }));
    roof.position.y = h + 1.3; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x2b3644 });
    for (let i = -1; i <= 1; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1), winMat);
      win.position.set(i * (w / 3.4), 2.4, d / 2 + 0.02); g.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x4a3423 }));
    door.position.set(0, 1.2, d / 2 + 0.02); g.add(door);
    g.position.set(x, 0, z); g.rotation.y = rot || 0;
    this.scene.add(g);
    // 충돌: 회전 무시 근사
    this.boxCollider(x, z, w / 2, d / 2);
    return g;
  },

  makeWaterTower(x, z) {
    const g = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
    for (const [lx, lz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), legMat);
      leg.position.set(lx, 6, lz); leg.castShadow = true; g.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 5, 12),
      new THREE.MeshLambertMaterial({ color: 0x7a8b99 }));
    tank.position.y = 14; tank.castShadow = true; g.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 12),
      new THREE.MeshLambertMaterial({ color: 0x94413a }));
    cap.position.y = 17.4; g.add(cap);
    g.position.set(x, 0, z); this.scene.add(g);
    this.circleCollider(x, z, 3);
  },

  makeTree(x, z) {
    if (Math.abs(x) < 8 && Math.abs(z) < 8) return;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x5d4630 }));
    trunk.position.y = 1.2; trunk.castShadow = true; g.add(trunk);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random(), 4 + Math.random() * 2, 7),
      new THREE.MeshLambertMaterial({ color: [0x4d6b35, 0x5a7a3c, 0x43602f][Math.floor(Math.random() * 3)] }));
    leaf.position.y = 4.4; leaf.castShadow = true; g.add(leaf);
    g.position.set(x, 0, z); this.scene.add(g);
    this.circleCollider(x, z, 0.6);
  },

  makeRock(x, z) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.4, 0),
      new THREE.MeshLambertMaterial({ color: 0x8d8d89 }));
    r.position.set(x, 0.5, z); r.castShadow = true; this.scene.add(r);
    this.circleCollider(x, z, 1.2);
  },

  makeCar(x, z, rot) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 1.9),
      new THREE.MeshLambertMaterial({ color: [0xb0563a, 0x4a7ab0, 0x9a9a4a][Math.floor(Math.random() * 3)] }));
    body.position.y = 0.8; body.castShadow = true; g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.7),
      new THREE.MeshLambertMaterial({ color: 0x2c343c }));
    top.position.set(-0.2, 1.6, 0); g.add(top);
    const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
    const wm = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    for (const [wx, wz] of [[-1.4, 0.95], [1.4, 0.95], [-1.4, -0.95], [1.4, -0.95]]) {
      const w = new THREE.Mesh(wg, wm); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
    }
    g.position.set(x, 0, z); g.rotation.y = rot; this.scene.add(g);
    this.boxCollider(x, z, 2.2, 1.2);
  },

  makeCrate(x, z) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x6e5a36 }));
    c.position.set(x, 0.8, z); c.castShadow = true; this.scene.add(c);
    this.boxCollider(x, z, 0.9, 0.9);
  },

  /* ---------- 파티클/트레이서 ---------- */
  spawnParticle(pos, color, n, spd, life, size, up) {
    for (let i = 0; i < (n || 8); i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(size || 0.12, size || 0.12, size || 0.12),
        new THREE.MeshBasicMaterial({ color }));
      m.position.copy(pos);
      const p = {
        mesh: m,
        vx: (Math.random() - 0.5) * (spd || 5), vy: Math.random() * (up || 4),
        vz: (Math.random() - 0.5) * (spd || 5), life: (life || 0.6) * (0.6 + Math.random() * 0.7), age: 0
      };
      this.scene.add(m); this.particles.push(p);
    }
  },
  spawnTracer(a, b, color) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color || 0xffe082, transparent: true, opacity: 0.95 }));
    this.scene.add(l);
    this.tracers.push({ mesh: l, age: 0, life: 0.09 });
  },
  spawnSmoke(pos, color, big) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(big ? 1.4 : 0.9, 8, 6),
      new THREE.MeshBasicMaterial({ color: color || 0xd23c2e, transparent: true, opacity: 0.75 }));
    s.position.copy(pos);
    this.scene.add(s);
    this.smokes.push({ mesh: s, age: 0, life: 2.2, vy: 2.4 + Math.random() });
  },
  addShake(v) { this.shake = Math.min(1.2, this.shake + v); },

  worldToScreen(v3) {
    const v = this.tmpV.copy(v3).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, behind: v.z > 1 };
  },

  /* ---------- 게임 흐름 ---------- */
  start() {
    AudioSys.init();
    // 오래된 DOM 정리
    ["start-screen", "end-screen"].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    this.clearTutorial();
    if (window.QuestionSys) QuestionSys.hide();
    if (window.RewardSys) RewardSys.hide();
    Inventory.reset();
    Player.reset(this);
    if (window.Weapon) { Weapon.cool = 0; Weapon.reloading = 0; }
    if (window.UI) UI.hideReload();
    if (window.QuestionSys) QuestionSys.reset();
    if (window.RewardSys) RewardSys.reset();
    this.clearField();
    this.kills = 0; this.score = 0; this.correctCount = 0; this.wrongCount = 0;
    this.rewardsTaken = []; this.playTime = 0;
    this._bossSpawned = false; this._bossDead = false; this._pendingBoss = false;
    this.bossLevel = 1;
    this.wave = 1; this.horde = []; this._waveCleared = false; this.reinfT = 22;
    this.totalEnemies = CONFIG.stage.normalCount;
    this.zone = { x: 0, z: 0, radius: 110, target: 110 };
    this.updateZoneRing();
    this.state = "play";
    try { this.canvas.requestPointerLock(); } catch (_) {}
    this.spawnLootField();
    this.spawnHorde();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
  },

  clearField() {
    for (const z of (this.horde || [])) { try { if (z && z._tele) this.scene.remove(z._tele); } catch (_) {} }
    for (const l of this.loots) this.scene.remove(l.group);
    this.loots = [];
    if (this.supplyCrate) { this.scene.remove(this.supplyCrate); this.supplyCrate = null; }
    for (const z of (this.horde || [])) if (z.group) this.scene.remove(z.group);
    this.horde = []; this.enemy = null;
    for (const p of this.particles) this.scene.remove(p.mesh);
    for (const t of this.tracers) this.scene.remove(t.mesh);
    this.particles = []; this.tracers = [];
  },

  spawnLootField() {
    const kinds = ["helmet2", "vest2", "medkit", "ammo", "ammo", "ammo", "ammo", "ammo", "scope", "grip", "helmet1", "bag1", "muzzle", "extmag"];
    for (let i = 0; i < 24; i++) {
      // 초기 자기장(반경 110) 안쪽에 분산
      const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 88;
      const x = Math.max(-105, Math.min(105, Math.cos(a) * d));
      const z = Math.max(-105, Math.min(105, Math.sin(a) * d));
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      this.spawnGroundLoot(k, x, z);
    }
    // 시작 지점 주변에 탄약 확정 드롭 (바로 주울 수 있게)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.spawnGroundLoot("ammo", Player.x + Math.cos(a) * (5 + Math.random() * 4), Player.z + Math.sin(a) * (5 + Math.random() * 4));
    }
  },

  lootLabel(kind) {
    return { helmet1: "헬멧(Lv.1)", helmet2: "헬멧(Lv.2)", helmet3: "헬멧(Lv.3)", vest1: "방어구(Lv.1)", vest2: "방어구(Lv.2)", vest3: "방어구(Lv.3)", bag1: "가방(Lv.1)", bag2: "가방(Lv.2)", medkit: "구급상자", ammo: "탄약", scope: "조준경", muzzle: "총구 장착물", grip: "손잡이", extmag: "탄창", supply: "보급 무기" }[kind] || kind;
  },

  spawnGroundLoot(kind, x, z) {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 20),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.55 }));
    pad.position.y = 0.05; g.add(pad);
    let core;
    const mat = c => new THREE.MeshLambertMaterial({ color: c });
    if (kind.startsWith("helmet")) {
      const lv = +kind.slice(-1);
      core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
        mat(lv === 3 ? 0x2b2f36 : lv === 2 ? 0x3c4652 : 0x6b7a5e));
      core.position.y = 0.55;
    } else if (kind === "medkit") {
      core = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), mat(0xa83a32));
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      cross.position.set(0, 0, 0.21); core.add(cross); core.position.y = 0.5;
    } else if (kind === "ammo") {
      core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), mat(0x4a6b3a));
      core.position.y = 0.45;
    } else if (kind === "scope") {
      core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), mat(0x222222));
      core.rotation.z = Math.PI / 2; core.position.y = 0.5;
    } else {
      core = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.3), mat(0x8a7a4a));
      core.position.y = 0.5;
    }
    core.castShadow = true; g.add(core);
    // 빛기둥
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.2, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 1.7; g.add(beam);
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.loots.push({ kind, group: g, core, x, z, bob: Math.random() * 6 });
  },

  nearestLoot(maxD) {
    let best = null, bd = maxD || 3;
    for (const l of this.loots) {
      const d = Math.hypot(Player.x - l.x, Player.z - l.z);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  },

  takeLoot(l) {
    const i = this.loots.indexOf(l);
    if (i >= 0) this.loots.splice(i, 1);
    this.scene.remove(l.group);
    AudioSys.pickup();
    const k = l.kind;
    if (k.startsWith("helmet")) {
      const lv = +k.slice(-1);
      if (Inventory.equipHelmet(lv)) { UI.toast(`🪖 헬멧(Lv.${lv}) 장착! 머리 피해 -${Math.round(CONFIG.helmetRed[lv] * 100)}%`); Player.refreshGear(this); }
      else UI.toast("더 좋은 헬멧을 이미 착용 중");
    } else if (k.startsWith("vest")) {
      const lv = +k.slice(-1);
      if (Inventory.equipVest(lv)) { UI.toast(`🦺 방어구(Lv.${lv}) 장착!`); Player.refreshGear(this); }
      else UI.toast("더 좋은 방어구를 이미 착용 중");
    } else if (k.startsWith("bag")) {
      const lv = +k.slice(-1);
      if (Inventory.equipBag(lv)) UI.toast(`🎒 가방(Lv.${lv}) 장착! 구급상자 최대 ${Inventory.medMax()}개`);
      else UI.toast("더 좋은 가방을 이미 착용 중");
    } else if (k === "medkit") {
      if (Inventory.addMedkit()) UI.toast("✚ 구급상자 +1"); else UI.toast("구급상자가 가득 찼습니다");
    } else if (k === "ammo") {
      const w = Inventory.current(); if (w) { w.reserve = Math.min(w.reserve + 30, 240); UI.toast("🔸 탄약 +30"); }
    } else if (["scope", "muzzle", "grip", "extmag"].includes(k)) {
      const map = { scope: "scope", muzzle: "muzzle", grip: "grip", extmag: "extmag" };
      const name = { scope: "조준경", muzzle: "총구(소음기)", grip: "손잡이", extmag: "대용량 탄창" }[k];
      if (Inventory.attachPart(map[k])) { UI.toast(`🔧 ${name} 장착!`); if (window.Weapon) Weapon.refreshAtt(this); }
      else UI.toast(`${name}은(는) 이미 장착됨`);
    } else if (k === "supply") {
      const r = Inventory.addGun("supply");
      UI.toast(r === "ammo" ? "보급 탄약 획득!" : "🔫 보급 저격총 획득! (2번/휠로 교체)");
    }
    if (this.state === "tutorial" && this.tutorial && this.tutorial.active) {
      const st = this.tutorial.steps[this.tutorial.step];
      if (st && st.id === "pickup") this.tutorial.pickupDone = true;
    }
    this.rewardsTaken.push(k);
  },

  /* 시간 + 웨이브에 따른 좀비 스탯 (쉬움 — 천천히 약하게 / 보스는 레벨제로 강화) */
  zombieStats(kind) {
    const t = this.playTime, wv = this.wave || 1;
    const hpM = (1 + (wv - 1) * 0.15) * (1 + t / 300);
    const dmgM = Math.min(2.5, (1 + (wv - 1) * 0.12) * (1 + t / 300));
    const spdB = Math.min(2.5, (wv - 1) * 0.3 + t * 0.008);
    const atkCd = Math.max(0.7, CONFIG.enemies.attackCd - (wv - 1) * 0.04);
    if (kind === "boss") {
      const bl = this.bossLevel || 1;
      const hp = Math.round(1000 * (1 + (bl - 1) * 0.3) * (1 + (wv - 1) * 0.03));
      const dmg = CONFIG.enemies.damage * 1.6 * dmgM * (1 + (bl - 1) * 0.2);
      return { hp, dmg, speed: CONFIG.enemies.bossSpeed + spdB * 0.8, atkCd: 1.0, scl: 1.45 };
    }
    if (kind === "runner") return { hp: Math.round(35 * hpM), dmg: 7 * dmgM, speed: 6.0 + spdB * 0.7, atkCd: 0.8, scl: 0.62 };
    return { hp: Math.round(CONFIG.enemies.normalHp * hpM), dmg: 20 * dmgM, speed: CONFIG.enemies.speed + spdB, atkCd, scl: 1.0 };
  },

  hordeAlive() { return (this.horde || []).filter(z => !z.dead).length; },

  /* 작고 빠른 대시 좀비 출현 확률 (3웨이브부터, 낮은 확률) */
  rollRunner() {
    return this.wave >= 3 && Math.random() < Math.min(0.25, 0.08 + this.wave * 0.02 + this.playTime / 800);
  },

  spawnOneZombie(x, z, type) {
    const kind = type || "normal";
    const st = this.zombieStats(kind);
    const e = {
      x, z, hp: st.hp, maxHp: st.hp,
      r: kind === "boss" ? 1.0 : kind === "runner" ? 0.55 : 0.8,
      boss: kind === "boss", runner: kind === "runner", scl: st.scl,
      speed: st.speed, dmg: st.dmg, atkCd: st.atkCd,
      hitT: Math.random() * 0.5, dead: false, walkT: Math.random() * 5, flash: 0, lunge: 0,
      stuckT: 0, detourT: 0, detourDir: 1,
      yaw: Math.atan2(Player.x - x, Player.z - z), stagger: 0,
      chargeState: "chase", chargeT: 0, chargeCd: 3, chargeDx: 0, chargeDz: 1, chargeHitDone: false, _tele: null,
      summonCd: 5, laserState: "idle", laserT: 0, laserCd: 4, laserDx: 0, laserDz: 1, laserHitCd: 0, _laserTele: null, _beam: null
    };
    e.group = window.Enemy ? Enemy.buildMesh(e) : null;
    if (e.group) { e.group.position.set(x, 0, z); this.scene.add(e.group); }
    this.horde.push(e);
    return e;
  },

  // (x,z)가 장애물과 겹치지 않는지 — 스폰 위치 검증용
  isFree(x, z, r) {
    const H = CONFIG.world.half;
    if (Math.abs(x) > H - 1 || Math.abs(z) > H - 1) return false;
    for (const c of this.colliders) {
      if (c.cr) {
        if (Math.hypot(x - c.x, z - c.z) < c.cr + r + 0.4) return false;
      } else {
        if (Math.abs(x - c.x) < c.hw + r + 0.4 && Math.abs(z - c.z) < c.hd + r + 0.4) return false;
      }
    }
    return true;
  },

  ringPos(dist) {
    const d0 = dist || (26 + Math.random() * 14);
    let fx = 0, fz = 0;
    for (let t = 0; t < 8; t++) {
      const a = Math.random() * Math.PI * 2, d = dist || (26 + Math.random() * 14);
      const x = Math.max(-105, Math.min(105, Player.x + Math.cos(a) * d));
      const z = Math.max(-105, Math.min(105, Player.z + Math.sin(a) * d));
      if (this.isFree(x, z, 1.0)) return { x, z };
      fx = x; fz = z;
    }
    // 빈자리를 못 찾으면 가장 가까운 후보를 강제로 밀어냄
    const c = this.collide(fx, fz, 1.0);
    void d0;
    return { x: c.x, z: c.z };
  },

  spawnHorde() {
    this._waveCleared = false;
    this.reinfT = Math.max(10, 24 - this.wave - this.playTime / 50);
    const n = Math.min(2 + (this.wave - 1), 6);
    for (let i = 0; i < n; i++) { const p = this.ringPos(); this.spawnOneZombie(p.x, p.z, this.rollRunner() ? "runner" : "normal"); }
    if (this.wave >= 4) { const p = this.ringPos(); this.spawnOneZombie(p.x, p.z, "runner"); }
    const total = this.hordeAlive();
    if (window.UI) UI.banner("🧟 WAVE " + this.wave, "좀비 " + total + "마리가 몰려옵니다!", 1500);
    if (this.wave >= 3 && window.UI) setTimeout(() => UI.toast("☠ 시간이 지날수록 좀비가 강해집니다!"), 1600);
  },

  spawnBossWave() {
    this._bossSpawned = true;
    this._bossDead = false;
    this._waveCleared = false;
    this.reinfT = 20;
    const bl = this.bossLevel || 1;
    const pb = this.ringPos(30);
    this.spawnOneZombie(pb.x, pb.z, "boss");
    { const p = this.ringPos(); this.spawnOneZombie(p.x, p.z, "normal"); }
    const tip = bl === 2 ? "강화 좀비를 계속 소환합니다!"
      : bl >= 3 ? "빨간 선 예고 후 레이저 발사! 맞으면 HP -25"
      : "빨간 범위 예고 후 돌진! 맞으면 HP -" + (CONFIG.enemies.chargeDmg || 30);
    if (window.UI) UI.banner("☠ 거대 좀비 LV." + bl + " (" + bl + "/3)", tip, 2200);
  },

  /* 장애물 우회 이동: 직진이 막히면 각도를 틀어 돌아감 */
  moveZombie(e, dx, dz, d, dt) {
    // 피격 경직 중에는 45% 속도로 비틀거림
    if (e.stagger > 0) e.stagger -= dt;
    const step = e.speed * (e.stagger > 0 ? 0.45 : 1) * dt;
    if (step <= 0.0001 || d <= 0.001) return;
    const bx = dx / d, bz = dz / d;
    if (e.detourT > 0) e.detourT -= dt;
    // 우회 중이면 우회 방향을 우선 시도
    const s = e.detourDir || 1;
    const angs = e.detourT > 0
      ? [0.9 * s, 0.45 * s, 1.5 * s, 0, -0.45 * s, -0.9 * s, 2.2 * s, -2.2 * s]
      : [0, 0.45, -0.45, 0.9, -0.9, 1.5, -1.5, 2.2, -2.2];
    let best = null, bestDist = Infinity, bestMoved = 0;
    for (let k = 0; k < angs.length; k++) {
      const a = angs[k], ca = Math.cos(a), sa = Math.sin(a);
      const rx = bx * ca - bz * sa, rz = bx * sa + bz * ca;
      const nx = e.x + rx * step, nz = e.z + rz * step;
      const c = this.collide(nx, nz, e.r * 0.6);
      const moved = Math.hypot(c.x - e.x, c.z - e.z);
      if (moved < step * 0.25) continue; // 거의 막힌 방향은 제외
      const nd = Math.hypot(Player.x - c.x, Player.z - c.z);
      // 직진 가중치: 돌아가는 각도가 클수록 패널티
      const score = nd + Math.abs(a) * 1.2;
      if (score < bestDist) { bestDist = score; best = c; bestMoved = moved; }
      if (a === 0 && nd < d) break; // 직진이 잘 되면 바로 사용
    }
    if (best) {
      e.x = best.x; e.z = best.z;
      e.stuckT = Math.max(0, (e.stuckT || 0) - dt * 2);
      // 우회 성공 후에는 우회 타이머 서서히 해제 (detourT는 위에서 감소)
    } else {
      // 모든 방향이 막힘 → 제자리에서 stuck 누적, 일정 시간 후 우회 방향 전환
      e.stuckT = (e.stuckT || 0) + dt;
      if (e.stuckT > 0.5) {
        e.stuckT = 0;
        e.detourT = 0.9;
        e.detourDir = (e.detourDir || 1) > 0 ? -1 : 1;
        if (Math.random() < 0.35) e.detourDir = Math.random() < 0.5 ? -1 : 1;
      } else {
        // 살짝이라도 움직여 보기 (최소 이동)
        const c = this.collide(e.x + bx * step * 0.3, e.z + bz * step * 0.3, e.r * 0.6);
        e.x = c.x; e.z = c.z;
      }
    }
  },

  /* 보스 돌진: 2초간 빨간 범위로 예고 → 돌진 (맞으면 30) */
  startBossTelegraph(e) {
    this.clearBossTelegraph(e);
    try {
      const dist = CONFIG.enemies.chargeDist || 16;
      const geo = new THREE.PlaneGeometry(2.6, dist);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = Math.atan2(e.chargeDx, e.chargeDz);
      m.position.set(e.x + e.chargeDx * dist / 2, 0.09, e.z + e.chargeDz * dist / 2);
      m.renderOrder = 4;
      this.scene.add(m);
      e._tele = m;
    } catch (_) { e._tele = null; }
  },

  clearBossTelegraph(e) {
    try { if (e && e._tele) this.scene.remove(e._tele); } catch (_) {}
    if (e) e._tele = null;
    this.clearBossLaserTele(e);
    this.clearBossBeam(e);
  },

  clearAllTelegraphs() {
    for (const z of (this.horde || [])) this.clearBossTelegraph(z);
  },

  // 보스 종류별 공격 배분: 1=돌진 / 2=강화좀비 소환 / 3=레이저빔
  updateBoss(e, dt, d, dx, dz) {
    const bl = this.bossLevel || 1;
    if (bl === 2) return this.updateBossSummon(e, dt, d, dx, dz);
    if (bl >= 3) return this.updateBossLaser(e, dt, d, dx, dz);
    return this.updateBossCharge(e, dt, d, dx, dz);
  },

  // 2번 보스: 주기적으로 강화 좀비 2마리 소환 (이동/공격은 그대로)
  updateBossSummon(e, dt, d, dx, dz) {
    e.summonCd = (e.summonCd == null ? 5 : e.summonCd) - dt;
    if (e.summonCd <= 0) {
      e.summonCd = 9;
      if (this.hordeAlive() < 8) {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, rr = 4 + Math.random() * 3;
          let x = e.x + Math.cos(a) * rr, z = e.z + Math.sin(a) * rr;
          x = Math.max(-105, Math.min(105, x)); z = Math.max(-105, Math.min(105, z));
          const m = this.spawnOneZombie(x, z, i === 0 ? "runner" : "normal");
          m.hp = Math.round(m.hp * 1.6); m.maxHp = m.hp;
          m.dmg = Math.round(m.dmg * 1.5); m.speed += 1.0; m.elite = true;
          try { this.spawnParticle(new THREE.Vector3(x, 1.2, z), 0xff2222, 10, 5, 0.7, 0.15, 5); } catch (_) {}
        }
        if (window.UI) UI.toast("☠ 보스가 강화 좀비 2마리를 소환!");
        if (window.AudioSys) AudioSys.noise(0.25, 0.18, 600);
      }
    }
    return false;
  },

  startBossLaserTele(e) {
    this.clearBossBeam(e);
    try {
      const dist = 30;
      const geo = new THREE.PlaneGeometry(1.4, dist);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = Math.atan2(e.laserDx, e.laserDz);
      m.position.set(e.x + e.laserDx * dist / 2, 0.1, e.z + e.laserDz * dist / 2);
      m.renderOrder = 4;
      this.scene.add(m);
      e._laserTele = m;
    } catch (_) { e._laserTele = null; }
  },

  startBossBeam(e) {
    try {
      const dist = 30;
      const geo = new THREE.PlaneGeometry(0.9, dist);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, fog: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = Math.atan2(e.laserDx, e.laserDz);
      m.position.set(e.x + e.laserDx * dist / 2, 1.4, e.z + e.laserDz * dist / 2);
      m.renderOrder = 6;
      this.scene.add(m);
      e._beam = m;
      try { this.spawnParticle(new THREE.Vector3(e.x, 1.6, e.z), 0xff6600, 12, 5, 0.5, 0.15, 4); } catch (_) {}
    } catch (_) { e._beam = null; }
  },

  clearBossLaserTele(e) {
    try { if (e && e._laserTele) this.scene.remove(e._laserTele); } catch (_) {}
    if (e) e._laserTele = null;
  },

  clearBossBeam(e) {
    try { if (e && e._beam) this.scene.remove(e._beam); } catch (_) {}
    if (e) e._beam = null;
  },

  // 3번 보스: 1.5초 빨간 선 예고 → 1초 레이저 발사 (맞으면 HP -25)
  updateBossLaser(e, dt, d, dx, dz) {
    e.laserCd = Math.max(0, (e.laserCd || 0) - dt);
    e.laserHitCd = Math.max(0, (e.laserHitCd || 0) - dt);
    if (e.laserState === "aim") {
      e.laserT -= dt;
      if (e._laserTele) {
        try { e._laserTele.material.opacity = 0.32 + 0.2 * Math.sin(performance.now() / 100); } catch (_) {}
      }
      if (e.laserT <= 0) {
        e.laserState = "fire"; e.laserT = 1.0; e.laserHitCd = 0;
        this.clearBossLaserTele(e);
        this.startBossBeam(e);
        if (window.AudioSys) AudioSys.noise(0.3, 0.22, 900);
      }
      return true;
    }
    if (e.laserState === "fire") {
      e.laserT -= dt;
      const L = 30;
      const px = Player.x - e.x, pz = Player.z - e.z;
      const t = Math.max(0, Math.min(L, px * (e.laserDx || 0) + pz * (e.laserDz || 0)));
      const cx = e.x + (e.laserDx || 0) * t, cz = e.z + (e.laserDz || 0) * t;
      if (Math.hypot(Player.x - cx, Player.z - cz) < 1.7 && (e.laserHitCd || 0) <= 0) {
        e.laserHitCd = 1.0;
        Player.takeDamage(25, this, true);
        if (window.UI) UI.toast("🔥 레이저 적중! HP -25");
      }
      if (e.laserT <= 0) {
        this.clearBossBeam(e);
        e.laserState = "cool"; e.laserCd = 8;
      }
      return true;
    }
    if ((e.laserState === "idle" || e.laserState === "cool" || !e.laserState) && (e.laserCd || 0) <= 0) {
      if (d > 5 && d < 32) {
        const dd = d || 1;
        e.laserDx = dx / dd; e.laserDz = dz / dd;
        e.laserState = "aim"; e.laserT = 1.5;
        this.startBossLaserTele(e);
        if (window.UI) UI.toast("⚠ 보스가 레이저를 충전합니다! 빨간 선에서 벗어나세요");
        return true;
      }
      if (e.laserState === "cool") e.laserState = "idle";
    }
    return false;
  },

  // 1번 보스: 2초 빨간 범위 예고 → 돌진 (맞으면 HP -30)
  updateBossCharge(e, dt, d, dx, dz) {
    const cfg = CONFIG.enemies;
    e.chargeCd = Math.max(0, (e.chargeCd || 0) - dt);
    if (e.chargeState === "aim") {
      e.chargeT -= dt;
      if (e._tele) {
        try { e._tele.material.opacity = 0.35 + 0.2 * Math.sin(performance.now() / 120); } catch (_) {}
      }
      if (e.chargeT <= 0) {
        e.chargeState = "dash";
        e.chargeT = (cfg.chargeDist || 16) / (cfg.chargeSpeed || 22);
        e.chargeHitDone = false;
        this.clearBossTelegraph(e);
        if (window.UI) UI.toast("☠ 보스 돌진!");
        if (window.AudioSys) AudioSys.noise(0.25, 0.2, 500);
      }
      return true; // 조준 중에는 제자리 (빨간 범위에서 피할 시간)
    }
    if (e.chargeState === "dash") {
      const step = (cfg.chargeSpeed || 22) * dt;
      const nx = e.x + (e.chargeDx || 0) * step, nz = e.z + (e.chargeDz || 0) * step;
      const c = this.collide(nx, nz, e.r * 0.6);
      e.x = c.x; e.z = c.z;
      e.chargeT -= dt;
      const pd = Math.hypot(Player.x - e.x, Player.z - e.z);
      if (!e.chargeHitDone && pd < 2.4) {
        e.chargeHitDone = true;
        Player.takeDamage(cfg.chargeDmg || 30, this, true);
        if (window.UI) UI.toast("💥 보스 돌진 적중! HP -" + (cfg.chargeDmg || 30));
      }
      if (Math.random() < 0.6) {
        try { this.spawnParticle(new THREE.Vector3(e.x, 0.5, e.z), 0xff4444, 2, 3, 0.4, 0.14, 3); } catch (_) {}
      }
      if (e.chargeT <= 0) {
        e.chargeState = "cool";
        e.chargeCd = cfg.chargeCd || 7;
      }
      return true;
    }
    // 추적 중: 쿨다운이 끝나고 거리가 맞으면 돌진 예고 시작
    if ((e.chargeState === "chase" || e.chargeState === "cool") && (e.chargeCd || 0) <= 0) {
      if (d > 6 && d < 30) {
        const dd = d || 1;
        e.chargeDx = dx / dd; e.chargeDz = dz / dd;
        e.chargeState = "aim";
        e.chargeT = cfg.chargeWarn || 2.0;
        this.startBossTelegraph(e);
        if (window.UI) UI.toast("⚠ 보스가 돌진을 준비합니다! 빨간 범위에서 벗어나세요");
        return true;
      }
      if (e.chargeState === "cool") e.chargeState = "chase";
    }
    return false;
  },

  updateHorde(dt) {
    const pack = this.horde || [];
    // 좀비끼리 겹치지 않게 밀어내기
    for (let i = 0; i < pack.length; i++) {
      const a = pack[i];
      if (a.dead) continue;
      for (let j = i + 1; j < pack.length; j++) {
        const b = pack[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < 1.4 && d > 0.001) {
          const push = (1.4 - d) * 0.5, nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
        }
      }
    }
    for (const e of pack) {
      if (e.dead) continue;
      if (e.flash > 0) { e.flash -= dt; if (window.Enemy) Enemy.setFlash(e, e.flash > 0); }
      const dx = Player.x - e.x, dz = Player.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      e.walkT += dt * (5 + e.speed * 0.7);
      if (e.boss && this.updateBoss(e, dt, d, dx, dz)) {
        // 돌진 연출 중: 이동/공격은 updateBoss가 처리
      } else if (d > CONFIG.enemies.attackRange) {
        this.moveZombie(e, dx, dz, d, dt);
      } else {
        // 일정 거리 안에 들어오면 공격
        e.hitT -= dt;
        if (e.hitT <= 0) {
          e.hitT = e.atkCd || CONFIG.enemies.attackCd;
          e.lunge = 0.25;
          Player.takeDamage(e.dmg, this);
        }
      }
      if (e.lunge > 0) e.lunge -= dt;
      // 회전 관성: 몸통이 순간이동하듯 꺾이지 않고 점진 회전
      let wantYaw;
      if (e.boss && (e.chargeState === "dash" || e.chargeState === "aim")) wantYaw = Math.atan2(e.chargeDx, e.chargeDz);
      else if (e.boss && (e.laserState === "aim" || e.laserState === "fire")) wantYaw = Math.atan2(e.laserDx, e.laserDz);
      else wantYaw = Math.atan2(dx, dz);
      let dy = wantYaw - (e.yaw || 0);
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      e.yaw = (e.yaw || 0) + dy * Math.min(1, dt * 7);
      if (e.group) {
        const lungeF = e.lunge > 0 ? 0.5 : 0;
        e.group.position.set(e.x, Math.abs(Math.sin(e.walkT)) * 0.1 + lungeF * 0.3, e.z);
        e.group.rotation.y = e.yaw;
        e.group.rotation.z = Math.sin(e.walkT * 0.5) * 0.06;
        if (window.Enemy) Enemy.updateBar(e);
      }
    }
    // 플레이어-좀비 고체 충돌: 서로 통과하지 못하고 밀어냄
    if (!Player.dead) {
      for (const e of pack) {
        if (e.dead) continue;
        const px = Player.x - e.x, pz = Player.z - e.z;
        const pd = Math.hypot(px, pz), minD = CONFIG.player.radius + e.r * 0.7;
        if (pd < minD && pd > 0.001) {
          const nx = px / pd, nz = pz / pd, over = minD - pd;
          const ec = this.collide(e.x - nx * over * 0.7, e.z - nz * over * 0.7, e.r * 0.6);
          e.x = ec.x; e.z = ec.z;
          const pc = this.collide(Player.x + nx * over * 0.3, Player.z + nz * over * 0.3, CONFIG.player.radius);
          Player.x = pc.x; Player.z = pc.z;
        }
      }
    }
  },

  hitEnemy(e, dmg, head, dir) {
    if (!e || e.dead || this.state !== "play") return;
    e.hp -= dmg; e.flash = 0.09;
    // 피격 물리: 총알 방향으로 넉백 + 잠깐 경직 (보스는 85% 저항)
    if (e.hp > 0 && dir) {
      const kb = (e.boss ? 0.12 : e.runner ? 0.5 : 0.35) * (head ? 1.4 : 1);
      const dl = Math.hypot(dir.x || 0, dir.z || 0) || 1;
      const c = this.collide(e.x + (dir.x || 0) / dl * kb, e.z + (dir.z || 0) / dl * kb, e.r * 0.6);
      e.x = c.x; e.z = c.z;
      e.stagger = e.boss ? 0.1 : 0.25;
    }
    AudioSys.hit();
    const sp = new THREE.Vector3(e.x, head ? 2.2 : 1.4, e.z);
    this.spawnParticle(sp, 0xb03030, 7, 4, 0.5, 0.13, 4);
    if (window.UI) UI.hitmarker(head);
    if (window.UI) UI.spawnDmg(e.x, head ? 2.5 : 1.8, e.z, "-" + Math.round(dmg), head ? "#ffd166" : "#fff");
    if (e.hp <= 0) {
      e.dead = true; e.hp = 0;
      this.kills++; this.score += e.boss ? 500 : 100;
      if (e.boss) { this._bossDead = true; this.clearBossTelegraph(e); }
      this.addShake(0.5);
      this.spawnParticle(new THREE.Vector3(e.x, 1.2, e.z), 0x7a1f1f, 18, 6, 0.9, 0.16, 5);
      if (window.Enemy) Enemy.setDead(e);
      const left = this.hordeAlive();
      if (window.UI) UI.killBanner(left);
      setTimeout(() => { if (e.group) this.scene.remove(e.group); }, 600);
      if (left <= 0 && !this._waveCleared) {
        this._waveCleared = true;
        setTimeout(() => {
          if (this.state !== "play") return;
          this.state = "question";
          try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {}
          QuestionSys.show(this.wave, ok => this.afterQuestion(ok));
        }, 550);
      }
    }
  },

  afterQuestion(ok) {
    // 주의: 오답 데미지(-25)는 UI.question finish에서 이미 적용됨. 여기선 중복 적용 금지.
    if (Player.hp <= 0) { this.gameOver(); return; }
    if (ok) { this.correctCount++; } else { this.wrongCount++; }
    if (ok) {
      // 3종 중 1택 (고르는 동안 게임은 멈춰 있음)
      const three = RewardSys.rollThree();
      RewardSys.showChoices(three, rw => {
        RewardSys.grant(rw, this);
        this.rewardsTaken.push(rw.kind + (rw.part || "") + (rw.level || ""));
        this.next();
      });
    } else {
      this.next();
    }
  },

  // 웨이브 종료 보상: 자기장(타겟 구역) 안쪽 바닥에 탄약 드롭
  dropWaveAmmo(n) {
    const cx = this.zone.x, cz = this.zone.z;
    const safeR = Math.max(3, Math.min(this.zone.radius, this.zone.target) - 3);
    for (let i = 0; i < (n || 5); i++) {
      let x = cx, z = cz, ok = false;
      for (let t = 0; t < 8; t++) {
        const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * Math.max(1, safeR - 2);
        const tx = Math.max(-110, Math.min(110, cx + Math.cos(a) * d));
        const tz = Math.max(-110, Math.min(110, cz + Math.sin(a) * d));
        if (this.isFree(tx, tz, 0.6)) { x = tx; z = tz; ok = true; break; }
      }
      if (!ok) continue;
      this.spawnGroundLoot("ammo", x, z);
    }
    if (window.UI) UI.toast("🔸 자기장 안에 탄약이 떨어졌습니다!");
  },

  next() {
    // 보스 처치 → 3번 보스면 마지막 문제 후 게임 종료, 아니면 레벨업 + 계속
    if (this._bossSpawned && this._bossDead) {
      if ((this.bossLevel || 1) >= 3) {
        this.state = "bossQuestion";
        QuestionSys.show(this.wave, ok => {
          if (ok) { this.correctCount++; } else { this.wrongCount++; }
          this.clear();
        });
        return;
      }
      this.bossLevel = (this.bossLevel || 1) + 1;
      this._bossSpawned = false; this._bossDead = false;
      this.score += 500;
      if (window.UI) UI.banner("☠ 보스 처치! (" + (this.bossLevel - 1) + "/3)", "LV." + this.bossLevel + " 보스가 기다립니다 — 웨이브 계속!", 2000);
    }
    // 다음 웨이브 (구역 축소 + 난이도 상승 / 5·10·15웨이브에 1·2·3번 보스)
    this.wave = (this.wave || 1) + 1;
    this.zone.target = Math.max(16, this.zone.target * 0.88);
    this.state = "play";
    try { this.canvas.requestPointerLock(); } catch (_) {}
    const isBoss = this.wave % 5 === 0;
    this.dropWaveAmmo(isBoss ? 8 : 5);
    if (isBoss) this.spawnBossWave();
    else this.spawnHorde();
  },

  /* ---------- 배그식 기본 훈련 (튜토리얼) ---------- */
  tutSteps() {
    return [
      { id: "move", title: "이동하기", desc: "WASD 키를 눌러 앞·뒤·좌·우로 이동하세요.", hint: "W A S D", goal: 10, unit: "m" },
      { id: "look", title: "시점 조작", desc: "마우스를 움직여 주변을 둘러보세요. (화면 클릭 시 마우스 잠금)", hint: "MOUSE", goal: 900, unit: "" },
      { id: "run", title: "달리기", desc: "Shift를 누른 채 W키로 달리세요.", hint: "SHIFT + W", goal: 12, unit: "m" },
      { id: "shoot", title: "사격하기", desc: "전방 표적을 조준하고 마우스 클릭으로 5발 명중시키세요.", hint: "CLICK", goal: 5, unit: "발" },
      { id: "reload", title: "재장전하기", desc: "R키를 눌러 탄창을 갈아끼우세요.", hint: "R", goal: 1, unit: "" },
      { id: "switch", title: "무기 바꾸기", desc: "지급된 강화 소총으로 바꿔보세요. 2번 키나 마우스 휠을 사용합니다.", hint: "2 / 휠", goal: 1, unit: "" },
      { id: "aim", title: "정조준하기", desc: "마우스 우클릭을 눌러 정조준하세요. 2초간 유지하면 완료!", hint: "우클릭 2초", goal: 2, unit: "초" },
      { id: "pickup", title: "아이템 줍기", desc: "빛나는 아이템에 다가가 F키로 주우세요.", hint: "F", goal: 1, unit: "" },
      { id: "heal", title: "구급상자 사용", desc: "H키를 눌러 구급상자로 HP를 회복하세요.", hint: "H", goal: 1, unit: "" },
      { id: "quiz", title: "영어 문제 풀기", desc: "실전처럼 문제를 풀면 보급품이 나옵니다. 정답에 도전!", hint: "!", goal: 1, unit: "" }
    ];
  },

  startTutorial() {
    AudioSys.init();
    ["start-screen", "end-screen", "tut-complete"].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
    if (window.QuestionSys) QuestionSys.hide();
    if (window.RewardSys) RewardSys.hide();
    this.clearTutorial();
    this.clearField();
    Inventory.reset();
    Player.reset(this);
    if (window.Weapon) { Weapon.cool = 0; Weapon.reloading = 0; }
    if (window.Weapon) Weapon.attachGunMesh(this);
    this.kills = 0; this.score = 0; this.correctCount = 0; this.wrongCount = 0;
    this.rewardsTaken = []; this.playTime = 0;
    this._bossSpawned = false; this._bossDead = false; this._pendingBoss = false;
    this.totalEnemies = CONFIG.stage.normalCount;
    this.zone = { x: 0, z: 0, radius: 110, target: 110 };
    this.updateZoneRing();
    this.tutorial = {
      active: true, step: 0, steps: this.tutSteps(), targets: [], colBase: null,
      lookAcc: 0, sx: Player.x, sz: Player.z, runDist: 0, lx: Player.x, lz: Player.z,
      hits: 0, prog: 0, pickupDone: false, healStartHp: 100, healStartMed: 1,
      quizOpen: false, quizAsked: false, quizDone: false, aimT: 0, lockToastAt: 0
    };
    this.spawnTutTargets();
    this.state = "tutorial";
    try { this.canvas.requestPointerLock(); } catch (_) {}
    if (window.UI) { UI.hideTutorial(); UI.showTutorial(this); }
    this.enterTutStep();
    if (window.UI) UI.updateTutorial(this, true);
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop(this.last);
  },

  clearTutorial() {
    const old = this.tutorial;
    if (old && old.targets) {
      for (const tg of old.targets) { try { if (this.scene) this.scene.remove(tg.group); } catch (_) {} }
    }
    if (old && old.colBase != null && this.colliders && this.colliders.length > old.colBase) {
      this.colliders.splice(old.colBase);
    }
    this.tutorial = null;
    if (window.UI) UI.hideTutorial();
    const tc = document.getElementById("tut-complete");
    if (tc) tc.remove();
  },

  spawnTutTargets() {
    if (this.tutorial.colBase == null) this.tutorial.colBase = this.colliders.length;
    const fx = -Math.sin(Player.yaw), fz = -Math.cos(Player.yaw);
    const rx = -fz, rz = fx;
    [-4.5, 0, 4.5].forEach(off => {
      const x = Player.x + fx * 11 + rx * off, z = Player.z + fz * 11 + rz * off;
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 8),
        new THREE.MeshLambertMaterial({ color: 0x5a4632 }));
      pole.position.y = 0.55; pole.castShadow = true; g.add(pole);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.12),
        new THREE.MeshLambertMaterial({ color: 0xf3ead8 }));
      board.position.y = 1.9; board.castShadow = true; g.add(board);
      const rings = [[0.62, 0xd23c2e, 0.075], [0.44, 0xf3ead8, 0.085], [0.26, 0xd23c2e, 0.095]];
      for (const [r, c, zz] of rings) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24),
          new THREE.MeshBasicMaterial({ color: c }));
        m.position.set(0, 1.9, zz); g.add(m);
      }
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 20),
        new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.5 }));
      pad.position.y = 0.05; g.add(pad);
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(Player.x - x, Player.z - z);
      this.scene.add(g);
      this.circleCollider(x, z, 0.5);
      this.tutorial.targets.push({ x, z, group: g, board, hits: 0, flash: 0 });
    });
    if (window.UI) UI.toast("🎯 전방에 사격장이 준비됐습니다");
  },

  checkTutTargets(origin, dir) {
    const T = this.tutorial;
    if (!T || !T.active) return null;
    let best = null, bd = 90;
    for (const tg of T.targets) {
      const cx = tg.x - origin.x, cy = 1.9 - origin.y, cz = tg.z - origin.z;
      const t = cx * dir.x + cy * dir.y + cz * dir.z;
      if (t < 1 || t > 90) continue;
      const px = origin.x + dir.x * t - tg.x, py = origin.y + dir.y * t - 1.9, pz = origin.z + dir.z * t - tg.z;
      const d = Math.sqrt(px * px + py * py + pz * pz);
      if (d < 1.15 && t < bd) { bd = t; best = tg; }
    }
    return best ? { target: best, dist: bd } : null;
  },

  registerTutHit(tg, dist) {
    const T = this.tutorial;
    if (!T || !T.active) return;
    tg.hits++;
    tg.flash = 0.12;
    try { if (tg.board.material.emissive) tg.board.material.emissive.setHex(0x666666); } catch (_) {}
    T.hits++;
    AudioSys.hit();
    this.spawnParticle(new THREE.Vector3(tg.x, 1.9, tg.z), 0xffd166, 8, 4, 0.5, 0.12, 4);
    if (window.UI) { UI.hitmarker(false); UI.spawnDmg(tg.x, 2.6, tg.z, "명중! " + T.hits + "/5", "#ffd166"); }
  },

  enterTutStep() {
    const T = this.tutorial;
    if (!T || !T.active) return;
    const st = T.steps[T.step];
    if (!st) return;
    T.prog = 0;
    if (st.id === "move" || st.id === "run") { T.sx = Player.x; T.sz = Player.z; T.lx = Player.x; T.lz = Player.z; T.runDist = 0; }
    if (st.id === "look") T.lookAcc = 0;
    if (st.id === "shoot") { T.hits = 0; if (window.UI) UI.toast("🎯 전방 표적을 쏘세요! (헤드샷처럼 정중앙이 가장 좋음)"); }
    if (st.id === "reload") {
      const w = Inventory.current();
      if (w && w.mag >= Inventory.magSizeOf(w.id)) { w.mag -= 4; if (window.UI) UI.toast("탄창을 조금 비웠습니다 — R을 눌러보세요"); }
    }
    if (st.id === "switch") {
      if (Inventory.weapons.length < 2) {
        Inventory.addGun("boost");
        if (window.Weapon) Weapon.attachGunMesh(this);
      }
      Inventory.active = 0;
      if (window.UI) UI.toast("🔫 강화 소총 지급! 2번 키나 휠로 교체하세요");
    }
    if (st.id === "aim") {
      T.aimT = 0;
      if (window.UI) UI.toast("🎯 우클릭을 2초간 눌러 정조준하세요");
    }
    if (st.id === "pickup") {
      T.pickupDone = false;
      const fx = -Math.sin(Player.yaw), fz = -Math.cos(Player.yaw);
      this.spawnGroundLoot("helmet1", Player.x + fx * 4, Player.z + fz * 4);
      if (window.UI) UI.toast("✨ 빛나는 아이템으로 다가가 F키를 누르세요!");
    }
    if (st.id === "heal") {
      if (Inventory.medkits < 1) Inventory.medkits = 1;
      T.healStartHp = 60; Player.hp = 60; T.healStartMed = Inventory.medkits;
      if (window.UI) UI.toast("🩹 HP가 60이 되었습니다 — H키를 누르세요!");
    }
    if (st.id === "quiz") { T.quizAsked = true; T.quizOpen = true; T.quizDone = false; this.openTutQuiz(); }
  },

  openTutQuiz() {
    const q = {
      passage: "Tutorial — Tom likes playing soccer after school. He practices every day with his friends.",
      type: "내용 이해",
      q: "Tom이 좋아하는 것은 무엇인가?",
      choices: ["방과 후 친구들과 축구하기", "혼자 요리하기", "아침에 수영하기", "밤에 게임하기"],
      answer: 0,
      explanation: "Tom likes playing soccer — 방과 후 친구들과 축구를 좋아합니다.",
      level: "easy"
    };
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (_) {}
    if (window.UI) UI.question(q, ok => {
      const T = this.tutorial;
      if (ok) {
        const w = Inventory.current();
        if (!Inventory.addMedkit() && w) w.reserve = Math.min(w.reserve + 20, 240);
        if (window.UI) UI.toast("⭕ 정답! 보급품(구급상자) 획득");
      } else if (window.UI) UI.toast("괜찮아요! 해설을 읽고 다음으로 넘어갑니다");
      if (T) { T.quizOpen = false; T.quizDone = true; T.prog = 1; }
      try { this.canvas.requestPointerLock(); } catch (_) {}
    });
  },

  updateTutorial(dt) {
    const T = this.tutorial;
    if (!T || !T.active) return;
    T.lookAcc += Math.abs(Input.mouse.dx) + Math.abs(Input.mouse.dy);
    // 키보드 화살표 시점 회전도 인정 (1rad ≈ 마우스 400px)
    if (T._lastYaw == null) T._lastYaw = Player.yaw;
    T.lookAcc += Math.abs(Player.yaw - T._lastYaw) * 400;
    T._lastYaw = Player.yaw;
    for (const tg of T.targets) {
      if (tg.flash > 0) {
        tg.flash -= dt;
        if (tg.flash <= 0) { try { if (tg.board.material.emissive) tg.board.material.emissive.setHex(0x000000); } catch (_) {} }
      }
    }
    const st = T.steps[T.step];
    if (!st) return;
    // 단계별 행동 해금 — 배운 행동만 사용 가능
    const idx = id => T.steps.findIndex(s => s.id === id);
    const cur = T.step;
    this.tutAllowFire = cur >= idx("shoot");
    this.tutAllowReload = cur >= idx("reload");
    this.tutAllowSwitch = cur >= idx("switch");
    this.tutAllowAim = cur >= idx("aim");
    this.tutAllowPickup = cur >= idx("pickup");
    this.tutAllowHeal = cur >= idx("heal");
    let prog = 0, done = false;
    if (st.id === "move") {
      const moved = Math.hypot(Player.x - T.lx, Player.z - T.lz);
      T.lx = Player.x; T.lz = Player.z;
      T.runDist += moved;
      prog = Math.min(T.runDist, st.goal); done = T.runDist >= st.goal;
    } else if (st.id === "look") {
      prog = Math.min(T.lookAcc, st.goal); done = T.lookAcc >= st.goal;
    } else if (st.id === "run") {
      const moved = Math.hypot(Player.x - T.lx, Player.z - T.lz);
      T.lx = Player.x; T.lz = Player.z;
      if (Input.down("shift") && moved > 0.0005) T.runDist += moved;
      prog = Math.min(T.runDist, st.goal); done = T.runDist >= st.goal;
    } else if (st.id === "shoot") {
      prog = Math.min(T.hits, st.goal); done = T.hits >= st.goal;
    } else if (st.id === "reload") {
      prog = (window.Weapon && Weapon.reloading > 0) ? 1 : 0; done = prog >= 1;
    } else if (st.id === "switch") {
      prog = Inventory.active === 1 ? 1 : 0; done = Inventory.active === 1;
    } else if (st.id === "aim") {
      if (Input.mouse.rdown) T.aimT = (T.aimT || 0) + dt;
      prog = Math.min(T.aimT || 0, st.goal); done = (T.aimT || 0) >= st.goal;
    } else if (st.id === "pickup") {
      prog = T.pickupDone ? 1 : 0; done = !!T.pickupDone;
    } else if (st.id === "heal") {
      prog = Player.hp > T.healStartHp + 1 ? 1 : (Player.healT > 0 ? 0.5 : 0);
      done = Player.hp > T.healStartHp + 1;
    } else if (st.id === "quiz") {
      prog = T.quizDone ? 1 : 0.5; done = !!T.quizDone;
    }
    T.prog = prog;
    if (window.UI) UI.updateTutorial(this);
    if (done) this.advanceTutorial();
  },

  advanceTutorial() {
    const T = this.tutorial;
    if (!T || !T.active) return;
    const finished = T.steps[T.step];
    AudioSys.correct();
    if (window.UI) UI.banner("✓ 미션 완료", ((T.step + 1) + " / " + T.steps.length + " — " + (finished ? finished.title : "")), 1100);
    T.step++;
    if (T.step >= T.steps.length) { this.completeTutorial(); return; }
    this.enterTutStep();
    if (window.UI) UI.updateTutorial(this, true);
  },

  /* 잠긴 행동을 시도하면 안내 (도배 방지 쿨다운) */
  tutLockedToast(msg) {
    const T = this.tutorial;
    const now = performance.now();
    if (!T || now - (T.lockToastAt || 0) < 2500) return;
    T.lockToastAt = now;
    if (window.UI) UI.toast("🔒 " + msg);
  },

  completeTutorial() {
    const T = this.tutorial;
    if (T) T.active = false;
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (_) {}
    AudioSys.reward();
    try { localStorage.setItem("elb_tut_done", "1"); } catch (_) {}
    if (window.UI) { UI.hideTutorial(); UI.showTutorialComplete(this); }
  },

  /* 훈련 중단 → 메인 화면으로 나가기 (문제 모달이 열려 있어도 정리됨) */
  exitTutorial() {
    if (window.QuestionSys) QuestionSys.hide();
    if (window.UI) UI.hideQuestion();
    if (window.RewardSys) RewardSys.hide();
    this.clearTutorial();
    this.clearField();
    Inventory.reset();
    Player.reset(this);
    if (window.Weapon) Weapon.cool = 0, Weapon.reloading = 0;
    if (window.UI) UI.hideReload();
    if (window.Weapon) Weapon.attachGunMesh(this);
    this.state = "menu";
    try { if (document.exitPointerLock) document.exitPointerLock(); } catch (_) {}
    this.last = performance.now();
  },

  gameOver() {
    this.state = "gameover";
    try { this.clearAllTelegraphs(); } catch (_) {}
    try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {}
    QuestionSys.hide(); RewardSys.hide();
    if (window.UI) UI.showEnd(false, this);
  },
  clear() {
    this.state = "clear";
    try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {}
    QuestionSys.hide(); RewardSys.hide();
    this.score += Math.round(Player.hp) + this.correctCount * 50;
    if (window.UI) UI.showEnd(true, this);
  },

  updateZoneRing() {
    if (!this.zoneRing || !this.zone) return;
    this.zoneRing.scale.set(this.zone.radius, this.zone.radius, 1);
    this.zoneRing.position.set(this.zone.x, 0.06, this.zone.z);
    if (this.zoneTargetRing) {
      const tr = Math.max(0.1, this.zone.target);
      this.zoneTargetRing.scale.set(tr, tr, 1);
      this.zoneTargetRing.position.set(this.zone.x, 0.07, this.zone.z);
    }
    if (this.zoneWall) {
      const r = Math.max(0.1, this.zone.radius);
      this.zoneWall.scale.set(r, 1, r);
      this.zoneWall.position.set(this.zone.x, 13, this.zone.z);
      // 배그처럼 살짝 맥동
      try {
        const t = performance.now() / 1000;
        this.zoneWall.material.opacity = 0.24 + 0.07 * Math.sin(t * 2.2);
      } catch (_) {}
    }
  },

  resize() {
    if (!this.renderer) return;
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  },

  /* ---------- 메인 루프 ---------- */
  loop(t) {
    const dt = Math.min(0.033, (t - this.last) / 1000 || 0.016);
    this.last = t;
    if (this.state === "play" || this.state === "tutorial") {
      const isTut = this.state === "tutorial";
      this.playTime += dt;
      const frozen = isTut && this.tutorial && this.tutorial.quizOpen;
      // 아직 배우지 않은 정조준은 무효화
      if (isTut && !this.tutAllowAim) { Input.mouse.rdown = false; Input.mouse.rclicked = false; }
      if (!frozen) {
        Player.update(dt, this);
        if (window.Weapon) Weapon.update(dt, this);
      }
      if (!isTut) {
        this.updateHorde(dt);
        // 증원: 천천히 조금씩만 (쉬움)
        this.reinfT -= dt;
        const alive = this.hordeAlive();
        const cap = Math.min(7, 3 + (this.wave || 1));
        if (this.reinfT <= 0 && !this._waveCleared && alive > 0 && alive < cap) {
          const p = this.ringPos();
          this.spawnOneZombie(p.x, p.z, this.rollRunner() ? "runner" : "normal");
          if (window.UI) UI.toast("🧟 좀비가 더 몰려옵니다!");
          this.reinfT = Math.max(10, 22 - (this.wave || 1) - this.playTime / 50);
        }
        // 존 축소
        this.zone.radius += (this.zone.target - this.zone.radius) * Math.min(1, dt * 0.08);
        this.updateZoneRing();
        // 자기장 밖 아이템은 전부 제거
        for (let i = this.loots.length - 1; i >= 0; i--) {
          const l = this.loots[i];
          if (Math.hypot(l.x - this.zone.x, l.z - this.zone.z) > this.zone.radius) {
            this.scene.remove(l.group);
            this.loots.splice(i, 1);
          }
        }
        // 존 밖 데미지
        const dz = Math.hypot(Player.x - this.zone.x, Player.z - this.zone.z);
        if (dz > this.zone.radius) {
          this.zoneTick -= dt;
          if (this.zoneTick <= 0) {
            this.zoneTick = 1;
            Player.takeDamage(4, this, true);
            if (window.UI) UI.toast("⚠ 안전구역 밖입니다! 안으로 이동하세요");
          }
        }
      } else {
        this.updateTutorial(dt);
      }
      // R 재시작(죽었을 때만; 살아있을 땐 재장전)
      if (!isTut && Input.consume("r") && Player.hp <= 0) this.start();
      // H / F (튜토리얼은 배운 것만 허용)
      if (Input.consume("h")) {
        if (isTut && !this.tutAllowHeal) this.tutLockedToast("구급상자는 아직 사용할 수 없습니다");
        else Player.tryHeal(this);
      }
      if (Input.consume("f")) {
        const l = this.nearestLoot(3.2);
        if (isTut && !this.tutAllowPickup) { if (l) this.tutLockedToast("F 줍기는 아직 배울 차례가 아닙니다"); }
        else if (l) this.takeLoot(l);
      }
      if (!isTut) {
        if (Input.consume("tab") || Input.consume("i")) { if (window.UI) UI.toggleInventory(); }
        if (Input.consume("1")) { Inventory.active = 0; }
        if (Input.consume("2") && Inventory.weapons[1]) { Inventory.active = 1; }
      } else {
        if (Input.consume("1")) {
          if (this.tutAllowSwitch) Inventory.active = 0;
          else this.tutLockedToast("무기 교체는 아직 배울 차례가 아닙니다");
        }
        if (Input.consume("2")) {
          if (!this.tutAllowSwitch) this.tutLockedToast("무기 교체는 아직 배울 차례가 아닙니다");
          else if (Inventory.weapons[1]) Inventory.active = 1;
        }
      }
      // 보급상자 연기 지속
      if (this.supplyCrate && Math.random() < dt * 6) {
        const p = this.supplyCrate.position;
        this.spawnSmoke(new THREE.Vector3(p.x + (Math.random() - 0.5) * 1.5, 2.2, p.z + (Math.random() - 0.5) * 1.5), 0xd23c2e, false);
      }
    } else {
      if ((this.state === "gameover" || this.state === "clear") && Input.consume("r")) this.start();
    }
    // 파티클 업데이트 (항상)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.scene.remove(p.mesh); this.particles.splice(i, 1); continue; }
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      p.vy -= 9 * dt;
      if (p.mesh.position.y < 0.05) p.mesh.position.y = 0.05;
      p.mesh.material.transparent = true;
      p.mesh.material.opacity = 1 - p.age / p.life;
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.age += dt;
      if (tr.age >= tr.life) { this.scene.remove(tr.mesh); this.tracers.splice(i, 1); }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.age += dt;
      if (s.age >= s.life) { this.scene.remove(s.mesh); this.smokes.splice(i, 1); continue; }
      s.mesh.position.y += s.vy * dt;
      s.mesh.scale.multiplyScalar(1 + dt * 0.9);
      s.mesh.material.opacity = 0.75 * (1 - s.age / s.life);
    }
    // 룻 반짝임
    const tt = performance.now() / 1000;
    for (const l of this.loots) {
      l.core.rotation.y += dt * 1.6;
      l.core.position.y = 0.5 + Math.sin(tt * 2 + l.bob) * 0.1;
    }
    if (window.UI) UI.draw(this);
    // 카메라 셰이크
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.4;
    }
    this.renderer.render(this.scene, this.camera);
    Input.endFrame();
    this.raf = requestAnimationFrame(this.loop.bind(this));
  }
};

/* ---------------- Player 3D ---------------- */
window.Player = window.Player || {
  x: 0, z: 18, y: 0, yaw: Math.PI, pitch: -0.12,
  hp: 100, dead: false, healT: 0, hurtT: 0, walkT: 0, vx: 0, vz: 0, _sprintB: 0, _aimB: 0, _leanB: 0,
  group: null, parts: null,

  reset(game) {
    this.x = 0; this.z = 18; this.yaw = Math.PI; this.pitch = -0.12;
    this.hp = CONFIG.player.maxHp; this.dead = false; this.healT = 0; this.hurtT = 0; this.walkT = 0; this.vx = 0; this.vz = 0; this._sprintB = 0; this._aimB = 0; this._leanB = 0;
    if (this.group && game) game.scene.remove(this.group);
    if (game) this.buildMesh(game);
  },

  buildMesh(game) {
    const g = new THREE.Group();
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const skin = M(0xd9a37a), shirt = M(0x5c7a52), pants = M(0x3d4438);
    // 다리
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), pants);
    legL.position.set(-0.18, 0.4, 0); legL.castShadow = true; g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    // 몸통
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.42), shirt);
    torso.position.y = 1.22; torso.castShadow = true; g.add(torso);
    // 방탄복
    const vestM = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.6, 0.5), M(0x5a5142));
    vestM.position.y = 1.25; vestM.castShadow = true; g.add(vestM);
    // 팔
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), shirt);
    armL.position.set(-0.5, 1.25, 0.1); armL.castShadow = true; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), shirt);
    armR.position.set(0.5, 1.25, 0.25); armR.rotation.x = -1.1; g.add(armR);
    // 머리
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
    head.position.y = 1.95; head.castShadow = true; g.add(head);
    // 헬멧 (레벨별)
    const helm = new THREE.Group(); helm.position.y = 2.02;
    const mkHelm = lv => {
      helm.clear();
      if (lv <= 0) return;
      if (lv === 1) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0x6b7a5e));
        h.castShadow = true; helm.add(h);
      } else if (lv === 2) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), M(0x2f3843));
        h.castShadow = true; helm.add(h);
        const vis = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), M(0x14181d));
        vis.position.set(0, -0.02, 0.3); helm.add(vis);
      } else {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.75), M(0x1e2329));
        h.castShadow = true; helm.add(h);
        const cov = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.45), M(0x4a4438));
        cov.position.set(0, -0.1, -0.1); helm.add(cov);
      }
    };
    g.add(helm); mkHelm(Inventory.helmet);
    // 가방
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), M(0x6e5c38));
    pack.position.set(0, 1.3, -0.38); pack.castShadow = true; g.add(pack);
    // 총 (Weapon이 갱신)
    const gunAnchor = new THREE.Group();
    gunAnchor.position.set(0.35, 1.35, 0.5);
    g.add(gunAnchor);
    // 그림자용
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(this.x, 0, this.z);
    game.scene.add(g);
    this.group = g;
    this.parts = { legL, legR, torso, vest: vestM, armL, armR, head, helm, mkHelm, pack, gunAnchor };
    this.refreshGear(game);
    if (window.Weapon) Weapon.attachGunMesh(game);
  },

  refreshGear(game) {
    if (!this.parts) return;
    this.parts.mkHelm(Inventory.helmet);
    const vc = [0x5a5142, 0x6e6247, 0x4c5a48, 0x33302a][Inventory.vest] || 0x5a5142;
    this.parts.vest.material.color.setHex(vc);
    const s = [1, 1.1, 1.28, 1.5][Inventory.bag] || 1;
    this.parts.pack.scale.set(s, s, s);
    this.parts.pack.visible = true;
  },

  tryHeal(game) {
    if (this.healT > 0 || this.dead) return;
    if (this.hp >= CONFIG.player.maxHp) { if (window.UI) UI.toast("HP가 가득 찼습니다"); return; }
    if (Inventory.medkits <= 0) { if (window.UI) UI.toast("구급상자가 없습니다! 문제를 맞춰 획득하세요"); return; }
    this.healT = CONFIG.player.healTime;
    if (window.UI) UI.toast("✚ 구급상자 사용 중...");
  },

  takeDamage(amount, game, ignoreArmor) {
    if (this.dead) return;
    let dmg = amount;
    if (!ignoreArmor) {
      dmg = Math.max(1, Math.round(amount * (1 - Inventory.damageReduction())));
      // 헬멧 내구도 느낌: 큰 피해 시 토스트는 생략
    } else dmg = Math.round(amount);
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtT = 0.4;
    game.addShake(0.45);
    game.lastHitAt = performance.now();
    AudioSys.wrong();
    const f = document.getElementById("damage-flash");
    if (f) { f.style.opacity = 1; setTimeout(() => f.style.opacity = 0, 200); }
    if (window.UI) UI.spawnDmg(this.x, 2.4, this.z, "-" + dmg, "#ff7676");
    game.spawnParticle(new THREE.Vector3(this.x, 1.4, this.z), 0xaa2222, 6, 3, 0.5, 0.12, 3);
    if (this.hp <= 0) { this.dead = true; game.gameOver(); }
  },

  update(dt, game) {
    // 시점 회전 (마우스 + 키보드 화살표 좌우)
    const sens = (Input.mouse.rdown ? 0.0016 : 0.0023);
    this.yaw -= Input.mouse.dx * sens;
    this.pitch -= Input.mouse.dy * sens;
    if (Input.down("arrowleft")) this.yaw += 1.8 * dt;
    if (Input.down("arrowright")) this.yaw -= 1.8 * dt;
    // Q/E 기울이기 (배그식 피킹)
    let leanT = 0;
    if (Input.down("q")) leanT -= 1;
    if (Input.down("e")) leanT += 1;
    this._leanB += (leanT - this._leanB) * Math.min(1, dt * 10);
    this.pitch = Math.max(-1.05, Math.min(0.55, this.pitch));
    // 이동 (카메라 기준: ↑발사·←→시점이므로 화살표는 ↓후진만 사용)
    let f = 0, s = 0;
    if (Input.down("w")) f += 1;
    if (Input.down("s") || Input.down("arrowdown")) f -= 1;
    if (Input.down("a")) s -= 1;
    if (Input.down("d")) s += 1;
    const running = Input.down("shift");
    const sp = CONFIG.player.speed * (running ? CONFIG.player.runMult : 1) * (this.healT > 0 ? 0.5 : 1);
    // 관성: 목표 속도로 점진 가속/감속 (즉시 정지·출발 금지)
    let tvx = 0, tvz = 0;
    if (f || s) {
      const l = Math.hypot(f, s);
      // 카메라 forward = yaw 방향
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = -fz, rz = fx;
      tvx = (fx * f / l + rx * s / l) * sp; tvz = (fz * f / l + rz * s / l) * sp;
    }
    const k = Math.min(1, dt * ((f || s) ? 8 : 11)); // 가속 8/s, 제동 11/s
    this.vx += (tvx - this.vx) * k; this.vz += (tvz - this.vz) * k;
    const moved = Math.hypot(this.vx, this.vz) * dt;
    if (moved > 0.0001) {
      const c = game.collide(this.x + this.vx * dt, this.z + this.vz * dt, CONFIG.player.radius);
      // 벽에 부딪히면 해당 방향 속도는 0 (미끄러지듯 정지)
      if (Math.abs(c.x - (this.x + this.vx * dt)) > 0.001) this.vx = 0;
      if (Math.abs(c.z - (this.z + this.vz * dt)) > 0.001) this.vz = 0;
      this.x = c.x; this.z = c.z;
      this.walkT += dt * (running ? 13 : 9) * Math.min(1, Math.hypot(this.vx, this.vz) / sp);
    }
    if (this.hurtT > 0) this.hurtT -= dt;
    // 치료
    if (this.healT > 0) {
      this.healT -= dt;
      if (this.healT <= 0 && !this.dead) {
        if (Inventory.medkits > 0) {
          Inventory.medkits--;
          this.hp = Math.min(CONFIG.player.maxHp, this.hp + CONFIG.medkit.heal);
          AudioSys.heal();
          const hf = document.getElementById("heal-flash");
          if (hf) { hf.style.opacity = 1; setTimeout(() => hf.style.opacity = 0, 450); }
          if (window.UI) UI.toast(`✚ 구급상자 사용: HP +${CONFIG.medkit.heal}`);
        }
      }
    }
    // 메시 반영 (배그식 절차 모션: 스프린트 총내림·조준 총올림·재장전 기울임·발사 반동)
    if (this.group) {
      this.group.position.set(this.x, 0, this.z);
      this.group.rotation.y = this.yaw + Math.PI;
      const spdF = Math.min(1, Math.hypot(this.vx, this.vz) / CONFIG.player.speed);
      this._sprintB += (((running && f > 0) ? 1 : 0) - this._sprintB) * Math.min(1, dt * 6);
      this._aimB += ((Input.mouse.rdown ? 1 : 0) - this._aimB) * Math.min(1, dt * 10);
      const W = window.Weapon;
      const relP = (W && W.reloading > 0 && W.reloadTotal > 0) ? 1 - W.reloading / W.reloadTotal : -1;
      const dip = relP >= 0 ? Math.sin(relP * Math.PI) : 0; // 재장전 진행 곡선
      const kick = W ? Math.min(1, W.spreadBloom || 0) : 0;
      const B = this._sprintB * (1 - this._aimB), A = this._aimB;
      const sw = Math.sin(this.walkT) * 0.5 * spdF;
      if (this.parts) {
        const P = this.parts;
        P.legL.rotation.x = sw * (1 + this._sprintB * 0.35);
        P.legR.rotation.x = -sw * (1 + this._sprintB * 0.35);
        P.armL.rotation.x = -sw * 0.7 * (1 - A * 0.6);
        // 오른팔: 조준시 개머리판 밀착, 스프린트시 이완, 재장전시 탄창 조작, 발사시 반동
        P.armR.rotation.x = -1.1 - 0.15 * A + 0.55 * B - 0.35 * dip
          + (relP >= 0.3 && relP <= 0.7 ? Math.sin(relP * 42) * 0.09 : 0) - kick * 0.22;
        // 상체: 스프린트 전방 기울기 + 재장전 숙임
        P.torso.rotation.x = this._sprintB * 0.1 + dip * 0.26;
        P.torso.position.y = 1.22 + Math.abs(Math.sin(this.walkT)) * 0.035 * spdF - dip * 0.06;
        P.head.rotation.x = -this._sprintB * 0.06 + A * 0.05;
        // 총: 스프린트 내림 / 조준 올림 / 재장전 기울임 / 발사 뒤튐
        const ga = P.gunAnchor;
        if (ga) {
          ga.position.set(0.35 + 0.05 * B - 0.16 * A, 1.35 - 0.2 * B + 0.1 * A - 0.12 * dip, 0.5 - 0.05 * A + kick * 0.05);
          ga.rotation.x = 0.5 * B - 0.06 * A + 0.45 * dip;
          ga.rotation.z = 0.5 * dip + (relP >= 0.3 && relP <= 0.7 ? Math.sin(relP * 42) * 0.06 : 0);
        }
      }
      // 전신: 좌우 이동 + Q/E 기울이기
      this.group.rotation.z = -s * 0.055 * spdF - (this._leanB || 0) * 0.16;
    }
    this.updateCamera(game, dt);
  },

  aimPoint(game, dist) {
    const d = dist || 60;
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    return new THREE.Vector3(
      this.x - Math.sin(this.yaw) * cp * d,
      1.6 + sp2 * d,
      this.z - Math.cos(this.yaw) * cp * d
    );
  },

  updateCamera(game, dt) {
    const aiming = Input.mouse.rdown;
    const hasScope = Inventory.attachments.scope;
    const dist = aiming ? (hasScope ? 1.6 : 2.4) : 4.4;
    const wantFov = aiming ? (hasScope ? 22 : 38) : 60;
    game.camera.fov += (wantFov - game.camera.fov) * Math.min(1, dt * 10);
    game.camera.updateProjectionMatrix();
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    const cx = this.x + Math.sin(this.yaw) * cp * dist;
    const cz = this.z + Math.cos(this.yaw) * cp * dist;
    const cy = 2.1 - sp2 * dist;
    // 어깨 오프셋 + Q/E 기울이기 (카메라 측면 이동 + 화면 기울기)
    const lean = this._leanB || 0;
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const sh = 0.85 + lean * 0.6;
    game.camera.position.set(cx + rx * sh, Math.max(0.7, cy + 0.25) - Math.abs(lean) * 0.12, cz + rz * sh);
    const look = new THREE.Vector3(
      this.x - Math.sin(this.yaw) * 8 * cp + rx * sh,
      1.55 + sp2 * 8 - Math.abs(lean) * 0.1,
      this.z - Math.cos(this.yaw) * 8 * cp + rz * sh
    );
    game.camera.lookAt(look);
    if (Math.abs(lean) > 0.01) game.camera.rotateZ(-lean * 0.09);
    // 태양이 플레이어 따라오게 (그림자 범위 유지)
    if (game.sun) game.sun.position.set(this.x + 40, 70, this.z + 25);
    if (game.sun) game.sun.target.position.set(this.x, 0, this.z);
    if (game.sun && game.sun.target) game.sun.target.updateMatrixWorld();
  }
};

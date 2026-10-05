/* =========================================================
   ui.js — PUBG 스타일 HUD / 미니맵 / 인벤토리 / 문제·보상 모달
   ========================================================= */

const UI = {
  dmgPool: [], invOpen: false, invTab: "equip",
  _lastHud: "",

  init() {
    this.ensureStyle();
    this.ensureHUD();
    this.ensureMinimap();
  },

  ensureStyle() {
    if (document.getElementById("game-style")) return;
    const s = document.createElement("style");
    s.id = "game-style";
    s.textContent = `
    #hud{position:fixed;inset:0;pointer-events:none;color:#fff;z-index:10;font-size:14px}
    #topbar{position:absolute;top:0;left:0;right:0;display:flex;justify-content:center;gap:18px;align-items:flex-start;padding:10px 16px}
    #hpbox{background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 12px;min-width:230px}
    #hpbox .lab{font-weight:800;font-size:13px;display:flex;justify-content:space-between}
    #hpbar{height:12px;background:#3a3f45;border-radius:6px;overflow:hidden;margin-top:4px}
    #hpfill{height:100%;width:100%;background:linear-gradient(90deg,#3fe07a,#25b85c);transition:width .2s}
    #compass{background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:6px 14px;min-width:340px;text-align:center}
    #compass .deg{font-weight:900;font-size:15px;color:#ffd166}
    #compass .strip{font-size:12px;letter-spacing:6px;opacity:.9;white-space:nowrap}
    #compass .strip b{color:#ffd166}
    #killbox{background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 14px;text-align:center;font-weight:800}
    #killbox small{display:block;font-weight:400;opacity:.8;font-size:11px}
    #wbox{position:absolute;left:16px;bottom:16px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;min-width:250px}
    #wbox .wn{font-weight:800}
    #wbox .ammo{font-size:26px;font-weight:900}
    #wbox .ammo small{font-size:14px;opacity:.7}
    #wbox .sub{font-size:12px;opacity:.85;margin-top:2px}
    #wbox .hint{font-size:11px;opacity:.6;margin-top:6px}
    #minimap-wrap{position:absolute;right:16px;bottom:16px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:8px}
    #minimap{display:block;border-radius:8px}
    #minimap-legend{font-size:11px;opacity:.85;margin-top:4px;line-height:1.5}
    #cross{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:11;pointer-events:none}
    #cross .dot{width:4px;height:4px;background:#fff;border-radius:50%;margin:auto;box-shadow:0 0 4px #000}
    #cross .l{position:absolute;background:rgba(255,255,255,.9);box-shadow:0 0 3px #000}
    #hitm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(45deg);z-index:11;opacity:0;pointer-events:none}
    #hitm div{position:absolute;background:#ff5252;box-shadow:0 0 6px #000}
    #banner{position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:30;text-align:center;pointer-events:none}
    #banner .main{font-size:34px;font-weight:900;text-shadow:0 3px 12px #000}
    #banner .sub{font-size:14px;text-shadow:0 2px 8px #000;opacity:.9}
    #banner.kill .main{color:#ff5252;background:linear-gradient(90deg,transparent,rgba(180,0,0,.75),transparent);padding:4px 40px;border-radius:8px}
    #toast{position:fixed;bottom:170px;left:50%;transform:translateX(-50%);background:rgba(10,14,18,.85);border:1px solid rgba(255,255,255,.2);padding:9px 18px;border-radius:10px;color:#fff;z-index:40;font-size:14px;pointer-events:none;white-space:nowrap}
    #pickup{position:fixed;left:50%;bottom:31%;transform:translateX(-50%);z-index:12;background:rgba(0,0,0,.72);border:1px solid #ffd166;border-radius:10px;padding:8px 14px;display:none;pointer-events:none}
    #pickup .key{display:inline-block;background:#ffd166;color:#111;font-weight:900;border-radius:6px;padding:1px 9px;margin-right:8px}
    #castbar{position:fixed;left:50%;bottom:26%;transform:translateX(-50%);z-index:12;display:none;background:rgba(0,0,0,.7);border-radius:8px;padding:6px 12px;width:240px;text-align:center}
    #castbar .t{font-size:12px;margin-bottom:4px}
    #castbar .bar{height:8px;background:#333;border-radius:4px;overflow:hidden}
    #castbar .fill{height:100%;background:#45d483;width:0%}
    .modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(700px,92vw);max-height:88vh;overflow:auto;padding:24px 26px;background:linear-gradient(180deg,#232f3d,#161e28);border:1px solid #5a6b7d;border-radius:16px;color:#fff;box-shadow:0 24px 90px #000;z-index:50}
    .modal h2{margin:0 0 6px;font-size:20px}
    .modal .small{opacity:.75;font-size:13px}
    .passage{background:#0f1720;border:1px solid #3a4a5c;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.6;margin:10px 0;max-height:150px;overflow:auto}
    .choice{padding:11px 12px;margin:8px 0;background:#303b47;border:1px solid transparent;border-radius:9px;cursor:pointer;font-size:14px}
    .choice:hover{background:#3d4c5e}
    .choice.sel{outline:2px solid #ffd166;background:#3d4c5e}
    .choice.right{background:#276749;border-color:#4ade80}
    .choice.wrong{background:#7f3030;border-color:#ff7070}
    .modal button{margin-top:14px;padding:12px 22px;border:0;border-radius:10px;cursor:pointer;font-weight:800;font-size:15px;background:#2f80ed;color:#fff}
    .modal button:disabled{opacity:.4;cursor:default}
    #q-timer{color:#ff6b6b;font-weight:900}
    .start{position:fixed;inset:0;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 30%,rgba(30,50,80,.88),rgba(0,0,0,.9)),linear-gradient(180deg,#1b2a3d,#0c1117);color:#fff;z-index:100}
    .start .card{text-align:center;max-width:640px;padding:30px}
    .start h1{font-size:42px;margin:0 0 6px;text-shadow:0 4px 20px #000}
    .start h1 .y{color:#ffd166}
    .start p{opacity:.9;line-height:1.7}
    .start button{padding:15px 46px;font-size:19px;font-weight:900;border-radius:12px;border:0;cursor:pointer;background:#ffd166;color:#1a1a1a;margin-top:14px}
    .start .ctrl{display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px 18px;margin-top:12px;font-size:13px;line-height:1.9}
    kbd{background:#222;border:1px solid #555;border-bottom-width:3px;border-radius:6px;padding:1px 7px;font-family:inherit}
    #reward-panel{position:fixed;inset:0;z-index:60}
    #reward-panel .rw-back{position:absolute;inset:0;background:rgba(60,10,10,.45)}
    #reward-panel .rw-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(430px,90vw);background:linear-gradient(180deg,#2a3547,#141c26);border:1px solid #8a97a8;border-radius:16px;text-align:center;padding:22px;color:#fff;box-shadow:0 24px 90px #000}
    #reward-panel .rw-head{background:linear-gradient(90deg,transparent,#a31212,transparent);font-weight:900;font-size:19px;padding:6px;margin:-6px -0 8px}
    #reward-panel .rw-pedestal{position:relative;height:170px;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 80%,rgba(255,200,80,.35),transparent 65%)}
    #reward-panel .rw-item{font-size:64px;filter:drop-shadow(0 8px 18px rgba(255,200,80,.6));animation:bob 1.6s ease-in-out infinite}
    @keyframes bob{50%{transform:translateY(-10px)}}
    #reward-panel .rw-ped-base{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:150px;height:16px;background:linear-gradient(180deg,#ffe082,#a97c1e);border-radius:3px;box-shadow:0 0 30px #ffd166}
    #reward-panel .rw-name{font-weight:900;font-size:17px;margin-top:6px}
    #reward-panel .rw-desc{font-size:13px;opacity:.8;margin:6px 0 4px}
    #reward-panel button{background:#2f80ed;color:#fff;border:0;border-radius:10px;padding:12px 40px;font-weight:800;font-size:15px;cursor:pointer;margin-top:8px}
    #inv{position:fixed;right:16px;top:76px;width:330px;z-index:20;background:rgba(12,17,23,.92);border:1px solid rgba(255,255,255,.2);border-radius:14px;color:#fff;padding:12px;display:none}
    #inv .tabs{display:flex;gap:6px;margin-bottom:10px}
    #inv .tabs div{flex:1;text-align:center;font-size:12px;padding:7px 0;background:#26313e;border-radius:8px;cursor:pointer;pointer-events:auto}
    #inv .tabs div.on{background:#2f80ed;font-weight:800}
    #inv .row{display:flex;align-items:center;gap:10px;background:#1b2430;border-radius:10px;padding:8px 10px;margin:6px 0;font-size:13px}
    #inv .row .ic{font-size:22px;width:30px;text-align:center}
    #inv .row .lv{margin-left:auto;font-size:12px;color:#ffd166;font-weight:800}
    #inv .stat{margin:5px 0;font-size:12px}
    #inv .stat .bar{height:8px;background:#333;border-radius:4px;overflow:hidden;margin-top:3px;position:relative}
    #inv .stat .bar i{display:block;height:100%;background:#5a6b7d}
    #inv .stat .bar em{display:block;height:100%;background:#3fe07a;position:absolute;top:0;left:0}
    .dmgnum{position:fixed;z-index:9;pointer-events:none;font-weight:900;font-size:15px;text-shadow:0 2px 6px #000;transform:translate(-50%,-50%)}
    #end-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin:12px 0;font-size:14px}
    #end-loot{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
    #end-loot span{background:#2a3547;border-radius:8px;padding:5px 10px;font-size:13px}
    #tut-panel{position:fixed;left:16px;top:76px;width:300px;z-index:15;background:rgba(10,13,18,.9);border:1px solid rgba(255,209,102,.45);border-radius:12px;color:#fff;padding:12px 14px;pointer-events:none}
    #tut-panel .th{font-weight:900;font-size:15px;color:#ffd166;letter-spacing:1px;border-bottom:1px solid rgba(255,209,102,.35);padding-bottom:8px;margin-bottom:8px}
    #tut-panel .th small{display:block;color:#fff;opacity:.6;font-size:11px;letter-spacing:2px;font-weight:400}
    #tut-step{font-size:13px;background:#1b2430;border:1px solid #ffd166;border-radius:10px;padding:10px 12px;margin:8px 0}
    #tut-step .tt{font-weight:900;color:#ffd166;margin-bottom:4px}
    #tut-step .hint{margin-top:6px}
    #tut-step .bar{height:8px;background:#333;border-radius:4px;overflow:hidden;margin-top:6px}
    #tut-step .bar i{display:block;height:100%;background:#ffd166}
    #tut-done{font-size:12px;max-height:150px;overflow:hidden}
    #tut-done div{opacity:.85;padding:2px 0}
    #tut-skip,#tut-exit{pointer-events:auto;margin-top:8px;width:100%;padding:9px 0;border:0;border-radius:9px;background:#2a3547;color:#fff;font-weight:800;cursor:pointer;font-size:13px}
    #tut-skip:hover,#tut-exit:hover{background:#3a4a5f}
    #tut-panel .tlock{font-size:11px;opacity:.7;margin-top:6px}
    #tut-panel .tlock.ok{color:#7CFC98;opacity:.9}
    .tbtn2{margin-right:8px;background:#2a3547 !important;color:#fff !important;border:1px solid rgba(255,255,255,.3) !important}
    #tut-complete .card{text-align:center;max-width:560px}
    #tut-complete ul{text-align:left;line-height:2.1;font-size:14px;list-style:none;padding:0;display:inline-block}
    #reward-panel .rw-modal.wide{width:min(760px,94vw)}
    #reward-panel .rw-choices{display:flex;gap:12px;justify-content:center;margin-top:10px}
    #reward-panel .rw-card{flex:1;background:#1b2430;border:2px solid #4a5a6e;border-radius:12px;padding:16px 10px;cursor:pointer;transition:transform .12s,border-color .12s,box-shadow .12s}
    #reward-panel .rw-card:hover{transform:translateY(-4px);border-color:#ffd166;box-shadow:0 0 24px rgba(255,209,102,.45)}
    #reward-panel .rw-cicon{font-size:52px;filter:drop-shadow(0 6px 14px rgba(255,200,80,.5))}
    #reward-panel .rw-cname{font-weight:900;font-size:15px;margin:8px 0 4px}
    #reward-panel .rw-cdesc{font-size:12px;opacity:.8;line-height:1.5;min-height:54px}
    #reward-panel .rw-pick{margin-top:10px;background:#2f80ed;border-radius:8px;padding:8px 0;font-weight:800;font-size:13px}
    #reward-panel .rw-card:hover .rw-pick{background:#ffd166;color:#1a1a1a}
    `;
    document.head.appendChild(s);
  },

  ensureHUD() {
    if (document.getElementById("hud")) return;
    const h = document.createElement("div");
    h.id = "hud";
    h.innerHTML =
      '<div id="topbar">' +
        '<div id="hpbox"><div class="lab"><span>HP</span><span><span id="hpnum">100</span>/100</span></div>' +
        '<div id="hpbar"><div id="hpfill"></div></div>' +
        '<div id="armorline" style="font-size:11px;opacity:.85;margin-top:3px">🪖 - · 🦺 - · 🎒 -</div></div>' +
        '<div id="compass"><div class="deg"><span id="chead">0</span>°</div><div class="strip" id="cstrip"></div></div>' +
        '<div id="killbox"><span id="kills">🧟 WAVE 1</span><small id="score">점수 0 · 정답 0</small></div>' +
      '</div>' +
      '<div id="wbox"><div class="wn" id="wname">기본 소총</div>' +
        '<div class="ammo"><span id="mag">12</span><small> / <span id="reserve">90</span></small></div>' +
        '<div class="sub">💊 <span id="med">1</span> · 🔧부스트 <span id="boost">0</span> · <span id="slots">1번</span></div>' +
        '<div class="hint"><kbd>WASD</kbd> 이동 <kbd>Shift</kbd> 달리기 · 클릭 발사 · 우클릭 정조준<br><kbd>R</kbd> 재장전 <kbd>H</kbd> 구급상자 <kbd>F</kbd> 줍기 <kbd>Tab</kbd> 장비 <kbd>1/2/휠</kbd> 무기교체</div></div>' +
      '<div id="minimap-wrap"><canvas id="minimap" width="190" height="190"></canvas>' +
        '<div id="minimap-legend">▲ 플레이어 · <span style="color:#ff6b6b">●</span> 좀비 · <span style="color:#ffd166">●</span> 아이템<br>○ 흰 원 안으로 이동!</div></div>' +
      '<div id="cross"><div class="dot"></div></div>' +
      '<div id="hitm"><div style="left:-16px;top:-2px;width:12px;height:4px"></div><div style="left:4px;top:-2px;width:12px;height:4px"></div><div style="left:-2px;top:-16px;width:4px;height:12px"></div><div style="left:-2px;top:4px;width:4px;height:12px"></div></div>' +
      '<div id="banner" style="display:none"><div class="main"></div><div class="sub"></div></div>' +
      '<div id="pickup"><span class="key">F</span><span id="pickup-txt"></span></div>' +
      '<div id="castbar"><div class="t" id="cast-t">장전 중...</div><div class="bar"><div class="fill" id="cast-fill"></div></div></div>' +
      '<div id="inv"></div>';
    document.body.appendChild(h);
  },

  ensureMinimap() { this.mm = document.getElementById("minimap"); this.mctx = this.mm && this.mm.getContext("2d"); },

  /* ---------- 프레임 그리기 ---------- */
  draw(game) {
    if (!document.getElementById("hud")) return;
    // 시작 화면
    if (game.state === "menu" && !document.getElementById("start-screen")) this.showStart();
    if (game.state !== "menu") { const st = document.getElementById("start-screen"); if (st) st.remove(); }
    // 훈련 패널 (수료 후에는 표시하지 않음)
    if (game.state === "tutorial" && game.tutorial && game.tutorial.active) {
      if (!document.getElementById("tut-panel")) this.showTutorial(game);
      this.updateTutorial(game);
    }

    // HUD 숫자
    document.getElementById("hpnum").textContent = Math.ceil(Player.hp);
    document.getElementById("hpfill").style.width = Math.max(0, Player.hp) + "%";
    document.getElementById("hpfill").style.background = Player.hp > 50 ? "" : Player.hp > 25 ? "linear-gradient(90deg,#ffb020,#ff7a1a)" : "linear-gradient(90deg,#ff5252,#b91c1c)";
    const arm = `🪖 ${Inventory.helmet ? "Lv." + Inventory.helmet : "-"} · 🦺 ${Inventory.vest ? "Lv." + Inventory.vest : "-"} · 🎒 ${Inventory.bag ? "Lv." + Inventory.bag : "-"}`;
    document.getElementById("armorline").textContent = arm;
    const alive = game.hordeAlive ? game.hordeAlive() : 0;
    const bossUp = (game.horde || []).some(z => z.boss && !z.dead);
    let killTxt;
    if (game.state === "tutorial") killTxt = "🎓 훈련 중";
    else if (bossUp) killTxt = "☠ BOSS전";
    else killTxt = `🧟 WAVE ${game.wave || 1} · 남은 좀비 ${alive}`;
    document.getElementById("kills").textContent = killTxt;
    document.getElementById("score").textContent = `점수 ${game.score} · 정답 ${game.correctCount}`;
    const w = Inventory.current();
    if (w) {
      const c = CONFIG.weapons[w.id];
      document.getElementById("wname").textContent = c.name + (Inventory.attachments.scope ? " +🔭" : "") + (Inventory.attachments.muzzle ? " +🔇" : "") + (Inventory.attachments.grip ? " +✊" : "") + (Inventory.attachments.extmag ? " +🗞" : "");
      document.getElementById("mag").textContent = w.mag;
      document.getElementById("reserve").textContent = w.reserve;
      document.getElementById("slots").textContent = (Inventory.active + 1) + "번" + (Inventory.weapons[1] ? " (휠 교체가능)" : "");
    }
    document.getElementById("med").textContent = Inventory.medkits;
    document.getElementById("boost").textContent = Inventory.boostLevel;
    // 저HP 경고: 화면 테두리 붉게 점멸
    const df = document.getElementById("damage-flash");
    if (df && (game.state === "play" || game.state === "tutorial")) {
      const sinceHit = performance.now() - (game.lastHitAt || 0);
      if (Player.hp <= 30 && Player.hp > 0 && sinceHit > 350) {
        df.style.opacity = 0.3 + 0.2 * Math.sin(performance.now() / 180);
      }
    }

    // 나침반
    let deg = Math.round(((-Player.yaw * 180 / Math.PI) % 360 + 360) % 360);
    document.getElementById("chead").textContent = deg;
    const pts = [["N", 0], ["NE", 45], ["E", 90], ["SE", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]];
    let strip = "";
    for (let d = deg - 60; d <= deg + 60; d += 15) {
      const n = ((d % 360) + 360) % 360;
      const hit = pts.find(p => Math.abs(p[1] - n) < 8);
      if (Math.abs(n - deg) < 8) strip += "<b>▲</b> ";
      else if (hit) strip += `<b>${hit[0]}</b> `;
      else strip += `<span style="opacity:.5">${n}</span> `;
    }
    document.getElementById("cstrip").innerHTML = strip;

    // 크로스헤어 확산
    const bloom = (window.Weapon ? Weapon.spreadBloom : 0) + (Input.mouse.rdown ? -6 : 0);
    const gap = 8 + Math.min(26, Math.max(0, bloom * 12) + (Math.hypot(Player.x - (this._px || Player.x), Player.z - (this._pz || Player.z)) * 40 || 0));
    this._px = Player.x; this._pz = Player.z;
    const cross = document.getElementById("cross");
    const sc = Inventory.attachments.scope && Input.mouse.rdown;
    cross.innerHTML = sc
      ? '<div style="width:120px;height:120px;border:2px solid rgba(0,0,0,.8);border-radius:50%;position:absolute;left:-60px;top:-60px;box-shadow:0 0 0 2000px rgba(0,0,0,.55)"><div class="dot" style="position:absolute;left:58px;top:58px"></div><div style="position:absolute;left:59px;top:0;width:2px;height:120px;background:rgba(0,0,0,.7)"></div><div style="position:absolute;top:59px;left:0;width:120px;height:2px;background:rgba(0,0,0,.7)"></div></div>'
      : `<div class="dot"></div>
        <div class="l" style="left:-${gap + 8}px;top:-1px;width:8px;height:2px"></div>
        <div class="l" style="left:${gap}px;top:-1px;width:8px;height:2px"></div>
        <div class="l" style="left:-1px;top:-${gap + 8}px;width:2px;height:8px"></div>
        <div class="l" style="left:-1px;top:${gap}px;width:2px;height:8px"></div>`;
    cross.style.display = (game.state === "play" || game.state === "tutorial") ? "block" : "none";

    // 줍기 프롬프트
    const pk = document.getElementById("pickup");
    if (game.state === "play" || game.state === "tutorial") {
      const l = game.nearestLoot(3.2);
      if (l) { pk.style.display = "block"; document.getElementById("pickup-txt").textContent = game.lootLabel(l.kind) + "  줍기"; }
      else pk.style.display = "none";
    } else pk.style.display = "none";

    // 치료 캐스트바
    const cb = document.getElementById("castbar");
    if (Player.healT > 0) {
      cb.style.display = "block";
      document.getElementById("cast-t").textContent = "✚ 구급상자 사용 중...";
      document.getElementById("cast-fill").style.width = (100 * (1 - Player.healT / CONFIG.player.healTime)) + "%";
    } else if (window.Weapon && Weapon.reloading > 0) {
      // reloadCircle에서 처리
    } else cb.style.display = "none";

    this.drawMinimap(game);
    this.updateDmg(game);
    if (this.invOpen) this.renderInventory();
  },

  /* ---------- 미니맵 ---------- */
  drawMinimap(game) {
    const c = this.mctx;
    if (!c) return;
    const S = 190, W = CONFIG.world.size, k = S / W;
    c.clearRect(0, 0, S, S);
    c.fillStyle = "#5d7343"; c.fillRect(0, 0, S, S);
    c.fillStyle = "#8a7f66";
    c.fillRect(S / 2 - 5 * k * 2, 0, 10 * k * 2, S);
    c.fillRect(0, S / 2 - 5 * k * 2, S, 10 * k * 2);
    // 건물
    c.fillStyle = "#d9c9a8";
    for (const col of game.colliders) {
      if (col.hw) c.fillRect(S / 2 + col.x * k - 3, S / 2 + col.z * k - 3, 6, 6);
    }
    const dot = (x, z, col, r) => {
      c.fillStyle = col; c.beginPath();
      c.arc(S / 2 + x * k, S / 2 + z * k, r || 3, 0, 7); c.fill();
    };
    // 아이템
    for (const l of game.loots) dot(l.x, l.z, "#ffd166", 2);
    // 좀비
    for (const z of (game.horde || [])) {
      if (!z.dead) dot(z.x, z.z, z.boss ? "#ff2222" : z.runner ? "#ff8800" : "#ff5555", z.boss ? 6 : z.runner ? 3 : 4);
    }
    // 훈련 표적
    if (game.state === "tutorial" && game.tutorial && game.tutorial.targets) {
      for (const tg of game.tutorial.targets) dot(tg.x, tg.z, "#ff9f1a", 4);
    }
    // 안전구역
    c.strokeStyle = "#fff"; c.lineWidth = 1.5;
    c.beginPath(); c.arc(S / 2 + game.zone.x * k, S / 2 + game.zone.z * k, game.zone.radius * k, 0, 7); c.stroke();
    c.strokeStyle = "rgba(80,150,255,.9)";
    c.beginPath(); c.arc(S / 2 + game.zone.x * k, S / 2 + game.zone.z * k, game.zone.target * k, 0, 7); c.stroke();
    // 플레이어 화살표
    c.save();
    c.translate(S / 2 + Player.x * k, S / 2 + Player.z * k);
    c.rotate(-Player.yaw + Math.PI);
    c.fillStyle = "#ffd166";
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(-5, 5); c.closePath(); c.fill();
    c.restore();
  },

  /* ---------- 데미지 숫자 ---------- */
  spawnDmg(x, y, z, txt, color) {
    const d = document.createElement("div");
    d.className = "dmgnum";
    d.textContent = txt;
    d.style.color = color || "#fff";
    d._w = new (window.THREE ? THREE.Vector3 : Object)();
    if (window.THREE) d._w.set(x, y, z);
    d._age = 0;
    document.body.appendChild(d);
    this.dmgPool.push(d);
    setTimeout(() => { d.remove(); const i = this.dmgPool.indexOf(d); if (i >= 0) this.dmgPool.splice(i, 1); }, 950);
  },
  updateDmg(game) {
    for (const d of this.dmgPool) {
      if (!d._w || !d._w.project) continue;
      d._age += 0.016;
      const v = d._w.clone(); v.y += d._age * 1.2;
      const p = game.worldToScreen(v);
      d.style.left = p.x + "px"; d.style.top = p.y + "px";
      d.style.opacity = 1 - d._age;
      d.style.display = p.behind ? "none" : "block";
    }
  },
  addDmg(x, y, t) { this.toast(t); },

  /* ---------- 이펙트 ---------- */
  banner(main, sub, ms) {
    const b = document.getElementById("banner");
    if (!b) return;
    b.className = "";
    b.style.display = "block";
    b.querySelector(".main").textContent = main;
    b.querySelector(".sub").textContent = sub || "";
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.style.display = "none", ms || 1200);
  },
  killBanner(left) {
    const b = document.getElementById("banner");
    if (!b) return;
    b.className = "kill";
    b.style.display = "block";
    b.querySelector(".main").textContent = "🧟 좀비 처치!";
    b.querySelector(".sub").textContent = (left > 0) ? ("남은 좀비 " + left + "마리") : "영어 문제가 출제됩니다";
    clearTimeout(this._bt);
    this._bt = setTimeout(() => { b.style.display = "none"; b.className = ""; }, 1300);
    AudioSys.correct();
  },
  toast(msg) {
    let e = document.getElementById("toast");
    if (!e) { e = document.createElement("div"); e.id = "toast"; document.body.appendChild(e); }
    e.textContent = msg;
    e.style.display = "block";
    clearTimeout(this._tt);
    this._tt = setTimeout(() => e.style.display = "none", 1900);
  },
  hitmarker(head) {
    const h = document.getElementById("hitm");
    if (!h) return;
    h.style.opacity = 1;
    h.querySelectorAll("div").forEach(d => d.style.background = head ? "#ffd166" : "#ff5252");
    clearTimeout(this._ht);
    this._ht = setTimeout(() => h.style.opacity = 0, 120);
  },
  reloadCircle(left, total) {
    const cb = document.getElementById("castbar");
    cb.style.display = "block";
    document.getElementById("cast-t").textContent = "장전 중...";
    document.getElementById("cast-fill").style.width = (100 * (1 - left / total)) + "%";
  },
  hideReload() { const cb = document.getElementById("castbar"); if (cb && Player.healT <= 0) cb.style.display = "none"; },
  hide() { this.hideQuestion(); },

  /* ---------- 시작/종료 ---------- */
  showStart() {
    const d = document.createElement("div");
    d.id = "start-screen"; d.className = "start";
    d.innerHTML = `<div class="card">
      <h1>🎯 영어 학습 배틀 <span class="y">3D</span></h1>
      <p><b>BATTLEGROUNDS식 3인칭 슈터 + 영어 문제</b><br>
      좀비 무리를 전멸시킬 때마다 영어 문제가 출제됩니다.<br>
      정답 → 보급품(헬멧·방어구·부착물·보급총) / 오답 → HP -20</p>
      <div class="ctrl"><kbd>WASD</kbd> 이동 · <kbd>Shift</kbd> 달리기 · <kbd>마우스</kbd> 시점 · <kbd>클릭</kbd> 발사 · <kbd>우클릭</kbd> 정조준(조준경)<br>
      <kbd>R</kbd> 재장전 · <kbd>H</kbd> 구급상자 · <kbd>F</kbd> 줍기 · <kbd>Tab</kbd> 장비창 · <kbd>1/2/휠</kbd> 무기교체<br>
      💡 시작 후 화면을 클릭하면 마우스가 잠겨 시점이 돌아갑니다 (<kbd>Esc</kbd> 해제)</div><br>
      <button id="tut-btn" class="tbtn2">🎓 기본 훈련</button><button id="start-btn">전장에 투입!</button>
      <p id="tut-badge" class="small" style="opacity:.7;font-size:12px;margin-top:10px">흰색 안전구역 밖에서는 HP가 닳습니다 · 헤드샷 2배 데미지</p>
    </div>`;
    document.body.appendChild(d);
    let tutDone = false;
    try { tutDone = localStorage.getItem("elb_tut_done") === "1"; } catch (_) {}
    if (tutDone) {
      const b = d.querySelector("#tut-badge");
      if (b) b.textContent = "🎓 기본 훈련 수료! 바로 투입하거나 복습할 수 있습니다.";
    }
    d.querySelector("#start-btn").onclick = () => { d.remove(); GameCore.start(); };
    d.querySelector("#tut-btn").onclick = () => { d.remove(); GameCore.startTutorial(); };
  },

  showEnd(win, game) {
    let b = document.getElementById("end-screen");
    if (b) b.remove();
    b = document.createElement("div");
    b.id = "end-screen"; b.className = "start";
    const loot = game.rewardsTaken.slice(-8).map(l => `<span>${l}</span>`).join("") || "<span>없음</span>";
    b.innerHTML = `<div class="card">
      <h1 style="color:${win ? "#ffd166" : "#ff6b6b"}">${win ? "MISSION COMPLETE" : "GAME OVER"}</h1>
      <p>${win ? "학습 완료! 마지막 문제까지 맞혔습니다 🎉" : "전사했습니다... R키로 다시 도전!"}</p>
      <div id="end-stats">
        <div>처치한 좀비 수</div><div><b>${game.kills}마리</b></div>
        <div>도달 웨이브</div><div><b>WAVE ${game.wave || 1}</b></div>
        <div>맞힌 문제 수</div><div><b>${game.correctCount}</b></div>
        <div>틀린 문제 수</div><div><b>${game.wrongCount}</b></div>
        <div>최종 HP</div><div><b>${Math.ceil(Player.hp)} / 100</b></div>
        <div>점수</div><div><b>${game.score}</b></div>
        <div>장비</div><div><b>🪖Lv.${Inventory.helmet} 🦺Lv.${Inventory.vest} 🎒Lv.${Inventory.bag}</b></div>
      </div>
      <div class="small">획득한 보상</div>
      <div id="end-loot">${loot}</div>
      <button id="again">${win ? "메인 화면으로" : "다시 시작"}</button>
    </div>`;
    document.body.appendChild(b);
    b.querySelector("#again").onclick = () => { b.remove(); GameCore.start(); };
  },

  /* ---------- 배그식 기본 훈련 패널 ---------- */
  showTutorial() {
    this.hideTutorial();
    const p = document.createElement("div");
    p.id = "tut-panel";
    p.innerHTML = `<div class="th">🎓 기본 훈련<small>BASIC TRAINING</small></div>
      <div id="tut-done"></div><div id="tut-step"></div>
      <button id="tut-skip">전장으로 이동 »</button>
      <button id="tut-exit">✕ 그만두기 (메인으로)</button>`;
    document.body.appendChild(p);
    p.querySelector("#tut-skip").onclick = () => { GameCore.start(); };
    p.querySelector("#tut-exit").onclick = () => { GameCore.exitTutorial(); };
    this._tutKey = "";
  },
  hideTutorial() {
    const e = document.getElementById("tut-panel");
    if (e) e.remove();
    this._tutKey = "";
  },
  updateTutorial(game, force) {
    const p = document.getElementById("tut-panel");
    const T = game.tutorial;
    if (!p || !T || !T.active || !T.steps || !T.steps.length) return;
    const st = T.steps[Math.min(T.step, T.steps.length - 1)];
    const progTxt = st.goal > 1
      ? (st.unit === "m" ? (Math.round((T.prog || 0) * 10) / 10) + "/" + st.goal + st.unit : Math.floor(T.prog || 0) + "/" + st.goal + (st.unit || ""))
      : "";
    const key = T.step + "|" + progTxt + "|" + (T.quizOpen ? "q" : "");
    if (!force && key === this._tutKey) return;
    this._tutKey = key;
    let doneHtml = "";
    T.steps.forEach((s, i) => {
      if (i < T.step) doneHtml += `<div>✅ ${i + 1}. ${s.title}</div>`;
      else if (i > T.step) doneHtml += `<div style="opacity:.45">${i + 1}. ${s.title}</div>`;
    });
    const pct = st.goal > 0 ? Math.min(100, ((T.prog || 0) / st.goal) * 100) : 0;
    const locks = [];
    if (!game.tutAllowFire) locks.push("사격");
    if (!game.tutAllowReload) locks.push("재장전");
    if (!game.tutAllowSwitch) locks.push("무기교체");
    if (!game.tutAllowAim) locks.push("정조준");
    if (!game.tutAllowPickup) locks.push("줍기");
    if (!game.tutAllowHeal) locks.push("구급상자");
    p.querySelector("#tut-done").innerHTML = doneHtml;
    p.querySelector("#tut-step").innerHTML =
      `<div class="tt">▶ ${T.step + 1}. ${st.title} ${progTxt ? `<span style="float:right">${progTxt}</span>` : ""}</div>` +
      `<div>${st.desc}</div>` +
      `<div class="hint"><kbd>${st.hint}</kbd></div>` +
      (st.goal > 1 ? `<div class="bar"><i style="width:${pct}%"></i></div>` : "") +
      (locks.length ? `<div class="tlock">🔒 아직 잠김: ${locks.join(" · ")}</div>` : `<div class="tlock ok">🔓 모든 행동 해금!</div>`);
  },
  showTutorialComplete(game) {
    let old = document.getElementById("tut-complete");
    if (old) old.remove();
    const n = (game && game.tutorial && game.tutorial.steps && game.tutorial.steps.length) || 10;
    const d = document.createElement("div");
    d.id = "tut-complete"; d.className = "start";
    d.innerHTML = `<div class="card">
      <h1 style="color:#ffd166">🏆 훈련 완료!</h1>
      <p>기본 훈련 ${n}단계를 모두 수료했습니다.<br>이제 실전에서 배운 대로 싸워보세요!</p>
      <ul>
        <li>✅ 이동 · 시점 · 달리기</li>
        <li>✅ 사격 · 재장전 · 무기교체 · 정조준</li>
        <li>✅ 아이템 줍기 · 구급상자 · 영어 문제 풀이</li>
      </ul><br>
      <button id="tut-go">전장에 투입!</button>
      <p class="small" style="opacity:.65;font-size:12px;margin-top:10px">좀비 웨이브 전멸 → 영어 문제 → 보상 선택 → 거대 좀비 → MISSION CLEAR</p>
    </div>`;
    document.body.appendChild(d);
    d.querySelector("#tut-go").onclick = () => { d.remove(); GameCore.start(); };
  },

  /* ---------- 인벤토리 ---------- */
  toggleInventory() {
    this.invOpen = !this.invOpen;
    document.getElementById("inv").style.display = this.invOpen ? "block" : "none";
    if (this.invOpen) { try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {} }
    else { try { GameCore.canvas.requestPointerLock(); } catch (_) {} }
  },
  renderInventory() {
    const el = document.getElementById("inv");
    if (!el) return;
    const tabs = [["equip", "장비"], ["weapon", "무기"], ["att", "부착물"]];
    let h = '<div class="tabs">' + tabs.map(t => `<div data-t="${t[0]}" class="${this.invTab === t[0] ? "on" : ""}">${t[1]}</div>`).join("") + "</div>";
    const helmN = ["없음", "Lv.1", "Lv.2", "Lv.3"], att = Inventory.attachments;
    const attName = { scope: "조준경 🔭", muzzle: "소음기 🔇", grip: "손잡이 ✊", extmag: "대용량 탄창 🗞" };
    if (this.invTab === "equip") {
      h += `<div class="row"><div class="ic">🪖</div><div>헬멧<div class="small">머리피해 -${Math.round((CONFIG.helmetRed[Inventory.helmet] || 0) * 100)}%</div></div><div class="lv">${helmN[Inventory.helmet]}</div></div>`;
      h += `<div class="row"><div class="ic">🦺</div><div>방어구<div class="small">몸통피해 -${Math.round((CONFIG.vestRed[Inventory.vest] || 0) * 100)}%</div></div><div class="lv">${helmN[Inventory.vest]}</div></div>`;
      h += `<div class="row"><div class="ic">🎒</div><div>가방<div class="small">구급상자 최대 ${Inventory.medMax()}개</div></div><div class="lv">${helmN[Inventory.bag]}</div></div>`;
      h += `<div class="row"><div class="ic">✚</div><div>구급상자<div class="small">H키로 HP +${CONFIG.medkit.heal}</div></div><div class="lv">x${Inventory.medkits}</div></div>`;
      h += `<div class="small" style="opacity:.65;margin-top:6px">Lv.3 헬멧·방어구는 필드·보급품에서 획득. F키로 줍기.</div>`;
    } else if (this.invTab === "weapon") {
      Inventory.weapons.forEach((wg, i) => {
        const c = CONFIG.weapons[wg.id];
        h += `<div class="row" style="${i === Inventory.active ? "outline:2px solid #ffd166" : ""}"><div class="ic">🔫</div><div>${i + 1}. ${c.name}<div class="small">탄 ${wg.mag}/${wg.reserve} · 뎀 ${c.damage}</div></div><div class="lv">${i === Inventory.active ? "장착중" : ""}</div></div>`;
      });
      // 성능 바 (현재 총)
      const s = window.Weapon ? Weapon.stats() : CONFIG.weapons.basic;
      const bar = (label, v, max) => `<div class="stat">${label}<div class="bar"><em style="width:${Math.min(100, v / max * 100)}%"></em></div></div>`;
      h += bar("데미지", s.damage, 70) + bar("연사 (RPM)", s.rpm || 300, 400) + bar("탄창", Inventory.magSizeOf(Inventory.current().id), 24) + `<div class="small" style="opacity:.65">반동 ${s.recoil.toFixed(2)} · 탄퍼짐 ${s.spread.toFixed(3)}</div>`;
    } else {
      for (const p of ["scope", "muzzle", "grip", "extmag"]) {
        h += `<div class="row"><div class="ic">${att[p] ? "✅" : "⬜"}</div><div>${attName[p]}</div><div class="lv">${att[p] ? "장착됨" : "미보유"}</div></div>`;
      }
      h += `<div class="small" style="opacity:.65;margin-top:6px">정답 보상·필드 파밍으로 획득. 조준경은 우클릭 정조준 시 3배줌.</div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll(".tabs div").forEach(t => t.onclick = () => { this.invTab = t.dataset.t; this.renderInventory(); });
  },

  /* ---------- 문제 ---------- */
  question(q, submit) {
    this.hideQuestion();
    clearTimeout(this._qt);
    try { document.exitPointerLock && document.exitPointerLock(); } catch (_) {}
    const d = document.createElement("div");
    d.id = "question-panel";
    d.innerHTML = `<div class="modal"><h2>📖 영어 문제 <span style="float:right;font-size:14px">남은 시간 <span id="q-timer">${q.timeLimit || 30}</span>초</span></h2>
      <p class="small">[${q.type || "독해"}] 다음 지문을 읽고, 물음에 답하세요.</p>
      <div class="passage">${q.passage}</div>
      <p><b>Q. ${q.q}</b></p><div id="choices"></div><div id="result"></div>
      <button id="qsubmit" disabled>정답 제출</button></div>`;
    document.body.appendChild(d);
    let left = q.timeLimit || 30;
    const timerEl = d.querySelector("#q-timer");
    const tick = () => {
      left--;
      if (timerEl) timerEl.textContent = left;
      if (left <= 0) { finish(-1, true); return; }
      this._qt = setTimeout(tick, 1000);
    };
    this._qt = setTimeout(tick, 1000);
    const box = d.querySelector("#choices");
    let sel = -1;
    q.choices.forEach((c, i) => {
      const x = document.createElement("div");
      x.className = "choice";
      x.textContent = `${i + 1}. ${c}`;
      x.onclick = () => {
        sel = i;
        box.querySelectorAll(".choice").forEach(a => a.classList.remove("sel"));
        x.classList.add("sel");
        d.querySelector("#qsubmit").disabled = false;
      };
      box.appendChild(x);
    });
    let done = false;
    const finish = (s, timeout) => {
      if (done) return; done = true;
      clearTimeout(this._qt);
      const ok = s === q.answer;
      const kids = box.querySelectorAll(".choice");
      kids.forEach((el, i) => {
        el.style.pointerEvents = "none";
        if (i === q.answer) el.classList.add("right");
        else if (i === s) el.classList.add("wrong");
      });
      d.querySelector("#result").innerHTML = ok
        ? `<p>⭕ 정답! ${q.explanation || ""}</p>`
        : `<p>❌ ${timeout ? "시간 초과!" : "오답!"} HP -${CONFIG.player.wrongPenalty}<br>정답: ${q.choices[q.answer]}<br>${q.explanation || ""}</p>`;
      if (ok) AudioSys.correct();
      else { AudioSys.wrong(); try { Player.takeDamage(CONFIG.player.wrongPenalty, GameCore, true); } catch (_) {} }
      d.querySelector("#qsubmit").remove();
      const n = document.createElement("button");
      n.textContent = Player.hp <= 0 ? "결과 보기" : "계속";
      n.onclick = () => { this.hideQuestion(); submit(ok); };
      d.querySelector(".modal").appendChild(n);
      if (Player.hp <= 0) setTimeout(() => { try { n.onclick(); } catch (_) {} }, 1600);
    };
    d.querySelector("#qsubmit").onclick = () => finish(sel, false);
  },
  hideQuestion() {
    clearTimeout(this._qt);
    const e = document.getElementById("question-panel");
    if (e) e.remove();
  }
};
window.UI = UI;

/* =========================================================
   weapon.js — 3D 총기 / 탄환 / 적 메시 (PUBG 스타일 TPS)
   (GameCore는 player.js에 정의되어 있으므로 여기선 재정의 금지)
   ========================================================= */

const Weapon = {
  cool: 0, reloading: 0, reloadTotal: 1, flash: 0, flashLight: null, spreadBloom: 0,

  current() { return Inventory.current(); },

  stats() {
    const w = this.current();
    if (!w) return CONFIG.weapons.basic;
    const c = CONFIG.weapons[w.id];
    const att = (w.att || {});
    const gAtt = Inventory.attachments || {};
    const hasMuz = att.muzzle || gAtt.muzzle;
    const hasGrip = att.grip || gAtt.grip;
    const hasScope = att.scope || gAtt.scope;
    let recoil = c.recoil;
    if (hasMuz) recoil *= 0.7;
    if (hasGrip) recoil *= 0.72;
    let spread = c.spread * (1 + this.spreadBloom * 0.6);
    if (hasGrip) spread *= 0.8;
    if (hasScope && Input.mouse.rdown) spread *= 0.45;
    else if (Input.mouse.rdown) spread *= 0.7;
    let damage = c.damage;
    if (Inventory.boostLevel > 0 && w.id !== "supply") damage = Math.round(damage * 1.15);
    return { ...c, damage, recoil, spread };
  },

  attachGunMesh(game) {
    if (!Player.parts || !Player.parts.gunAnchor) return;
    const anchor = Player.parts.gunAnchor;
    while (anchor.children.length) anchor.remove(anchor.children[0]);
    const w = this.current();
    if (!w) return;
    const c = CONFIG.weapons[w.id];
    const att = w.att || {};
    const dark = new THREE.MeshLambertMaterial({ color: 0x23282e });
    const bodyM = new THREE.MeshLambertMaterial({ color: new THREE.Color(c.color) });
    const gun = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.85), dark);
    gun.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, 0.65); gun.add(barrel);
    if (att.muzzle || Inventory.attachments.muzzle) {
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8),
        new THREE.MeshLambertMaterial({ color: 0x111111 }));
      sup.rotation.x = Math.PI / 2; sup.position.set(0, 0.03, 0.95); gun.add(sup);
    }
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.12), dark);
    mag.position.set(0, -0.15, 0.1); mag.rotation.x = 0.25; gun.add(mag);
    if (att.grip || Inventory.attachments.grip) {
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.08), dark);
      grip.position.set(0, -0.14, 0.42); grip.rotation.x = 0.2; gun.add(grip);
    }
    if (att.scope || Inventory.attachments.scope) {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 10),
        new THREE.MeshLambertMaterial({ color: 0x0e0e0e }));
      sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.13, -0.05); gun.add(sc);
    } else {
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.06), dark);
      sight.position.set(0, 0.11, -0.05); gun.add(sight);
    }
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x4a3826 }));
    stock.position.set(0, -0.01, -0.55); gun.add(stock);
    gun.rotation.y = Math.PI;
    anchor.add(gun);
    this.gunMesh = gun;
    if (!this.flashLight) {
      this.flashLight = new THREE.PointLight(0xffc861, 0, 12);
      this.flashLight.position.set(Player.x, 1.6, Player.z);
      game.scene.add(this.flashLight);
    }
  },

  refreshAtt(game) { this.attachGunMesh(game); },

  muzzleWorld() {
    if (this.gunMesh) {
      const v = new THREE.Vector3();
      this.gunMesh.getWorldPosition(v);
      return v;
    }
    return new THREE.Vector3(Player.x, 1.5, Player.z);
  },

  update(dt, game) {
    if (this.cool > 0) this.cool -= dt;
    if (this.spreadBloom > 0) this.spreadBloom = Math.max(0, this.spreadBloom - dt * 3);
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flashLight) this.flashLight.intensity = Math.max(0, this.flash * 14);
    } else if (this.flashLight) this.flashLight.intensity = 0;

    const w = this.current();
    if (!w) return;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (window.UI) UI.reloadCircle(this.reloading, this.reloadTotal);
      if (this.reloading <= 0) {
        const c = CONFIG.weapons[w.id];
        const need = Inventory.magSizeOf(w.id) - w.mag;
        const take = Math.min(need, w.reserve);
        w.mag += take; w.reserve -= take;
        AudioSys.reload();
        if (window.UI) UI.hideReload();
      }
      return;
    }
    const reloadLocked = game.state === "tutorial" && !game.tutAllowReload;
    if (!reloadLocked && Input.consume("r") && Player.hp > 0) { this.reload(); return; }
    else if (reloadLocked) Input.consume("r");
    if ((game.state !== "play" && game.state !== "tutorial") || Player.hp <= 0) return;
    const s = this.stats();
    const modalOpen = document.getElementById("question-panel") || document.getElementById("reward-panel") || document.getElementById("tut-complete");
    const wantFire = s.auto ? Input.mouse.down : Input.consumeClick();
    if (modalOpen) return;
    if (game.state === "tutorial" && !game.tutAllowFire) {
      if (wantFire && game.tutLockedToast) game.tutLockedToast("아직 사격 미션이 아닙니다");
      return;
    }
    if (wantFire && this.cool <= 0) this.fire(game);
  },

  reload() {
    const w = this.current();
    if (!w || this.reloading > 0) return;
    const c = CONFIG.weapons[w.id];
    const max = Inventory.magSizeOf(w.id);
    if (w.mag >= max || w.reserve <= 0) return;
    const hasFast = Inventory.attachments.extmag;
    this.reloadTotal = c.reload * (hasFast ? 0.85 : 1);
    this.reloading = this.reloadTotal;
    AudioSys.reload();
  },

  fire(game) {
    const w = this.current();
    const s = this.stats();
    if (w.mag <= 0) {
      AudioSys.tone(180, 0.05);
      this.reload();
      if (window.UI) UI.toast("탄약 없음! 재장전 중… (R)");
      return;
    }
    w.mag--;
    this.cool = 60 / s.rpm;
    this.spreadBloom = Math.min(1.4, this.spreadBloom + s.recoil * 0.28);
    // 1) 크로스헤어 광선 = 카메라 정면(화면 중앙) + 스프레드
    const camDir = new THREE.Vector3();
    game.camera.getWorldDirection(camDir);
    camDir.x += (Math.random() - 0.5) * s.spread * 2;
    camDir.y += (Math.random() - 0.5) * s.spread * 2;
    camDir.z += (Math.random() - 0.5) * s.spread * 2;
    camDir.normalize();
    const camPos = game.camera.position.clone();
    // 2) 크로스헤어가 가리키는 지점 탐색 (적 > 훈련표적 > 땅 > 최대사거리)
    const foes = game.horde || [];
    let hitE = null, hitHead = false, hitTut = null, hitDist = 90;
    if (game.state === "play") {
      for (const e of foes) {
        if (!e || e.dead) continue;
        const sc = e.scl || 1, bodyY = 1.3 * sc, headY = 1.95 * sc;
        const toB = new THREE.Vector3(e.x - camPos.x, bodyY - camPos.y, e.z - camPos.z);
        const tB = toB.dot(camDir);
        if (tB <= 0 || tB >= hitDist) continue;
        const qx = camPos.x + camDir.x * tB - e.x, qy = camPos.y + camDir.y * tB - bodyY, qz = camPos.z + camDir.z * tB - e.z;
        const dBody = Math.sqrt(qx * qx + qy * qy + qz * qz);
        const hx = camPos.x + camDir.x * tB - e.x, hy = camPos.y + camDir.y * tB - headY, hz = camPos.z + camDir.z * tB - e.z;
        const dHead = Math.sqrt(hx * hx + hy * hy + hz * hz);
        const bossMul = e.boss ? 1.5 : 1;
        if (dHead < 0.42 * bossMul) { hitE = e; hitHead = true; hitDist = tB; }
        else if (dBody < (e.r + 0.55) * bossMul) { hitE = e; hitDist = tB; }
      }
    }
    if (!hitE && game.state === "tutorial" && game.checkTutTargets) {
      const r = game.checkTutTargets(camPos, camDir);
      if (r) { hitTut = r.target; hitDist = Math.min(hitDist, r.dist); }
    }
    if (!hitE && !hitTut && camDir.y < -0.005) {
      const t = (camPos.y - 0.05) / -camDir.y;
      if (t > 0) hitDist = Math.min(hitDist, t);
    }
    const aimPoint = camPos.clone().add(camDir.clone().multiplyScalar(hitDist));
    // 3) 총구에서 조준점으로 발사 (탄착점 = 크로스헤어)
    const origin = this.muzzleWorld();
    const end = aimPoint.clone();
    game.spawnTracer(origin.clone(), end.clone(), w.id === "supply" ? 0xff9db0 : 0xffe082);
    game.spawnParticle(origin.clone(), 0xffc861, 3, 2, 0.18, 0.09, 2);
    if (this.flashLight) {
      this.flashLight.position.copy(origin);
      const small = (w.att && w.att.muzzle) || Inventory.attachments.muzzle;
      this.flashLight.intensity = small ? 0.7 : 2.2;
    }
    this.flash = 0.06;
    AudioSys.shoot(w.id);
    // 반동: 에임 상승 + 화면 흔들림
    const aiming = Input.mouse.rdown;
    const kick = 0.011 * s.recoil + (w.id === "supply" ? 0.02 : 0);
    Player.pitch = Math.max(-1.05, Player.pitch - kick * (aiming ? 0.65 : 1));
    Player.yaw += (Math.random() - 0.5) * 0.009 * s.recoil;
    game.addShake(0.30 * s.recoil + (w.id === "supply" ? 0.55 : 0));
    if (hitE) {
      let dmg = s.damage * (hitHead ? 2 : 1);
      // 거리 감쇠 (저격총 제외)
      if (w.id !== "supply") dmg *= Math.max(0.6, 1 - hitDist / 160);
      game.hitEnemy(hitE, Math.round(dmg), hitHead, camDir);
    } else if (hitTut && game.registerTutHit) {
      game.registerTutHit(hitTut, hitDist);
    } else {
      // 땅/벽 먼지
      if (end.y < 0.3) game.spawnParticle(end, 0x9a8f76, 4, 2.5, 0.4, 0.1, 2.5);
    }
    if (w.mag <= 0) this.reload();
  }
};

/* ---------------- Enemy 3D ---------------- */
const Enemy = {
  buildMesh(e) {
    const g = new THREE.Group();
    const s = e.boss ? 1.45 : e.runner ? 0.62 : 1.0;
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    // 좀비: 창백한 녹색 피부 + 너덜너덜한 옷 + 핏자국 (대시는 붉은 기운)
    const skin = M(e.boss ? 0x6a7a52 : e.runner ? 0x9b5a4a : 0x8aa864);
    const pants = M(0x2e2a30);
    const shirt = M(e.boss ? 0x4a2a3a : 0x4a4438);
    const bloodM = M(0x6e1414);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.8 * s, 0.3 * s), pants);
    legL.position.set(-0.18 * s, 0.4 * s, 0); legL.rotation.z = 0.06; g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.8 * s, 0.3 * s), pants);
    legR.position.set(0.18 * s, 0.4 * s, 0.06); legR.rotation.x = -0.12; g.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.74 * s, 0.85 * s, 0.44 * s), shirt);
    torso.position.y = 1.22 * s; torso.rotation.x = e.runner ? 0.3 : 0.12; g.add(torso);
    // 가슴 핏자국
    const stain = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.45 * s, 0.02), bloodM);
    stain.position.set(-0.1 * s, 1.3 * s, 0.23 * s); g.add(stain);
    // 앞으로 쭉 뻗은 팔 (좀비 포즈)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.24 * s, 0.75 * s), skin);
    armL.position.set(-0.32 * s, 1.45 * s, 0.45 * s); armL.rotation.x = -0.15; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.24 * s, 0.75 * s), skin);
    armR.position.set(0.32 * s, 1.35 * s, 0.45 * s); armR.rotation.x = -0.1; g.add(armR);
    // 손톱
    const clawM = M(0x3a3a2a);
    for (const cx of [-0.32, 0.32]) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.18 * s, 5), clawM);
      claw.position.set(cx * s, (cx < 0 ? 1.45 : 1.35) * s, 0.9 * s);
      claw.rotation.x = Math.PI / 2; g.add(claw);
    }
    // 기울어진 머리 + 입 + 빛나는 눈
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 12, 10), skin);
    head.position.set(0.05 * s, 1.95 * s, 0.05); head.rotation.z = 0.18; g.add(head);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.08 * s, 0.05), M(0x1a0a0a));
    mouth.position.set(0.05 * s, 1.86 * s, 0.3 * s); g.add(mouth);
    const eyeM = new THREE.MeshBasicMaterial({ color: e.boss ? 0xff3300 : e.runner ? 0xffaa00 : 0xe8ff70 });
    for (const ex of [-0.09, 0.12]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 6, 6), eyeM);
      eye.position.set(ex * s, 2.0 * s, 0.24 * s); g.add(eye);
    }
    if (e.boss) {
      // 보스: 등에 난 뼈 가시 + 몸통 종기
      for (const bx of [-0.25, 0, 0.25]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.45 * s, 6), M(0xd8d0c0));
        spike.position.set(bx * s, 1.7 * s, -0.3 * s); spike.rotation.x = -0.7; g.add(spike);
      }
      for (const [ox, oy] of [[-0.2, 1.1], [0.22, 1.35]]) {
        const boil = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), M(0x7a9b3a));
        boil.position.set(ox * s, oy * s, 0.22 * s); g.add(boil);
      }
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // HP 바 스프라이트
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 20;
    const tex = new THREE.CanvasTexture(cv);
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    bar.scale.set(1.9 * s, 0.3 * s, 1);
    bar.position.y = 2.65 * s;
    g.add(bar);
    e._barCanvas = cv; e._barTex = tex; e._bar = bar;
    e._mats = [];
    g.traverse(o => { if (o.isMesh && !o.isSprite && o.material && o.material.color) e._mats.push({ m: o.material, c: o.material.color.getHex() }); });
    this.updateBar(e);
    return g;
  },

  updateBar(e) {
    if (!e._barCanvas) return;
    const g = e._barCanvas.getContext("2d");
    g.clearRect(0, 0, 128, 20);
    g.fillStyle = "rgba(0,0,0,.65)"; g.fillRect(0, 4, 128, 12);
    const r = Math.max(0, e.hp / e.maxHp);
    g.fillStyle = r > 0.5 ? "#4ade80" : r > 0.25 ? "#ffd166" : "#ef4444";
    g.fillRect(2, 6, 124 * r, 8);
    g.fillStyle = "#fff"; g.font = "bold 11px sans-serif"; g.textAlign = "center";
    g.fillText(e.boss ? "보스 좀비" : e.runner ? "대시 좀비" : "좀비", 64, 14);
    e._barTex.needsUpdate = true;
  },

  setFlash(e, on) {
    if (!e._mats) return;
    for (const o of e._mats) o.m.color.setHex(on ? 0xffffff : o.c);
  },

  setDead(e) {
    if (!e.group) return;
    // 쓰러짐 연출
    e.group.rotation.x = -Math.PI / 2;
    e.group.position.y = 0.4;
    if (e._bar) e._bar.visible = false;
  }
};

addEventListener("load", () => {
  try { GameCore.init(); } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML("beforeend",
      '<div style="position:fixed;left:12px;bottom:12px;background:#7f1d1d;color:#fff;padding:10px 14px;border-radius:10px;z-index:9999">초기화 오류: ' + err.message + "</div>");
  }
});
window.Weapon = Weapon;
window.Enemy = Enemy;

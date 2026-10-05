/* =========================================================
   reward.js — PUBG식 보급품 / 부착물 보상 (3D)
   이미지 명세: 헬멧·방어구·가방 Lv.1~3 / 구급상자 / 탄약
   5.56·7.62·9mm / 조준경·총구·손잡이·탄창 / 보급무기
   ========================================================= */

const RewardSys = {
  current: null,

  reset() { this.current = null; this.hide(); },

  /* 정답 보상 룰렛 */
  roll() {
    const r = Math.random();
    // 이미 최고 장비면 다른 보상 우선
    const needHelm = Inventory.helmet < 3;
    const needVest = Inventory.vest < 3;
    const needBag = Inventory.bag < 3;
    const needAtt = !(Inventory.attachments.scope && Inventory.attachments.muzzle && Inventory.attachments.grip && Inventory.attachments.extmag);
    if (r < 0.16) return { kind: "boost" };
    if (r < 0.28) return { kind: "medkit" };
    if (r < 0.40) return { kind: "supply" };
    if (r < 0.58 && (needHelm || needVest || needBag)) {
      const opts = [];
      if (needHelm) opts.push("helmet");
      if (needVest) opts.push("vest");
      if (needBag) opts.push("bag");
      const k = opts[Math.floor(Math.random() * opts.length)];
      const lv = Math.min(3, (Inventory[k === "helmet" ? "helmet" : k === "vest" ? "vest" : "bag"] || 0) + (Math.random() < 0.35 ? 2 : 1));
      return { kind: k, level: Math.max(1, lv) };
    }
    if (r < 0.82 && needAtt) {
      const cands = ["scope", "muzzle", "grip", "extmag"].filter(p => !Inventory.attachments[p]);
      const part = cands.length ? cands[Math.floor(Math.random() * cands.length)] : "ammo";
      if (part === "ammo") return { kind: "ammo", qty: 40 };
      return { kind: "attach", part };
    }
    if (r < 0.90) return { kind: "ammo", qty: 40 };
    return { kind: "medkit" };
  },

  meta(rw) {
    const L = rw.level ? ` Lv.${rw.level}` : "";
    switch (rw.kind) {
      case "boost": return { icon: "🔧", name: "총기 부스트", desc: "현재 총 공격력 +15% (강화 소총으로 업그레이드)", cls: "gold" };
      case "medkit": return { icon: "✚", name: "구급상자", desc: `HP +${CONFIG.medkit.heal} 회복 (H키로 사용, 최대 ${Inventory.medMax()}개)`, cls: "red" };
      case "supply": return { icon: "🔫", name: "보급 저격총", desc: "헤드샷 2배 · 고데미지 단발 저격총 (2번/휠 교체)", cls: "pink" };
      case "helmet": return { icon: "🪖", name: `군용 헬멧${L}`, desc: `머리 피해 감소 ${(CONFIG.helmetRed[rw.level] * 100) | 0}% · 3D 외형 변경`, cls: "dark" };
      case "vest": return { icon: "🦺", name: `방탄복${L}`, desc: `몸통 피해 감소 ${(CONFIG.vestRed[rw.level] * 100) | 0}%`, cls: "dark" };
      case "bag": return { icon: "🎒", name: `배낭${L}`, desc: `구급상자 최대 ${CONFIG.bagMedMax[rw.level]}개 휴대`, cls: "dark" };
      case "ammo": return { icon: "🔸", name: `탄약 +${rw.qty || 30}`, desc: "현재 무기 예비 탄약 보충 (5.56mm / 7.62mm 공용)", cls: "green" };
      case "attach": {
        const m = { scope: ["🔭", "조준경", "우클릭 조준 시 3배줌 + 탄퍼짐 -55%"], muzzle: ["🔇", "소음기", "반동 -30% + 머즐플래시 감소"], grip: ["✊", "수직 손잡이", "반동 -28% + 탄퍼짐 -20%"], extmag: ["🗞", "대용량 탄창", "탄창 +50% + 재장전 -15%"] }[rw.part];
        return { icon: m[0], name: m[1], desc: m[2], cls: "gold" };
      }
      default: return { icon: "🎁", name: "보상", desc: "", cls: "gold" };
    }
  },

  /* 정답 시 3종 중 1택 (서로 다른 보상 3개) */
  rollThree() {
    const out = [], seen = new Set();
    let guard = 0;
    while (out.length < 3 && guard++ < 80) {
      const rw = this.roll();
      const key = rw.kind + ":" + (rw.part || "") + ":" + (rw.level || "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(rw);
    }
    const fb = [{ kind: "ammo", qty: 40 }, { kind: "medkit" }, { kind: "boost" }];
    let fi = 0;
    while (out.length < 3) out.push(fb[fi++ % fb.length]);
    return out;
  },

  /* 3택 보상 선택 모달 (게임은 멈춘 상태) */
  showChoices(list, onPick) {
    this.hide();
    this.current = list;
    const box = document.createElement("div");
    box.id = "reward-panel";
    let cards = "";
    list.forEach((rw, i) => {
      const m = this.meta(rw);
      cards += '<div class="rw-card" data-i="' + i + '">' +
        '<div class="rw-cicon">' + m.icon + '</div>' +
        '<div class="rw-cname">' + m.name + '</div>' +
        '<div class="rw-cdesc">' + m.desc + '</div>' +
        '<div class="rw-pick">선택하기</div></div>';
    });
    box.innerHTML =
      '<div class="rw-back"></div>' +
      '<div class="rw-modal wide">' +
        '<div class="rw-head">🎁 보상 선택! (3개 중 1개)</div>' +
        '<div class="rw-choices">' + cards + '</div>' +
      '</div>';
    document.body.appendChild(box);
    AudioSys.reward();
    box.querySelectorAll(".rw-card").forEach(c => {
      c.onclick = () => { const rw = list[+c.dataset.i]; this.hide(); onPick(rw); };
    });
  },

  show(reward, onTake) {
    this.hide();
    this.current = reward;
    const meta = this.meta(reward);
    const box = document.createElement("div");
    box.id = "reward-panel";
    box.innerHTML =
      '<div class="rw-back"></div>' +
      '<div class="rw-modal">' +
        '<div class="rw-head">💀 보급품 획득!</div>' +
        '<div class="rw-pedestal"><div class="rw-glow"></div>' +
          '<div class="rw-item ' + meta.cls + '">' + meta.icon + '</div>' +
          '<div class="rw-ped-base"></div></div>' +
        '<div class="rw-name">' + meta.name + ' (x1)</div>' +
        '<div class="rw-desc">' + meta.desc + '</div>' +
        '<button id="rw-ok">확인</button>' +
      '</div>';
    document.body.appendChild(box);
    AudioSys.reward();
    box.querySelector("#rw-ok").onclick = () => { this.hide(); onTake(reward); };
  },

  grant(reward, game) {
    if (reward.kind === "boost") {
      Inventory.applyBoost();
      if (window.Weapon) Weapon.attachGunMesh(game);
      UI.toast("🔧 총기 부스트 획득! 공격력 UP");
    } else if (reward.kind === "medkit") {
      if (!Inventory.addMedkit()) {
        const w = Inventory.current();
        if (w) w.reserve = Math.min(w.reserve + 20, 240);
        UI.toast("구급상자 가득 참 → 탄약 +20으로 전환");
      } else UI.toast("✚ 구급상자 획득! (H키로 사용)");
    } else if (reward.kind === "supply") {
      const r = Inventory.addGun("supply");
      if (window.Weapon) Weapon.attachGunMesh(game);
      UI.toast(r === "ammo" ? "탄약 보충!" : "🔫 보급 저격총 획득! (2번/휠로 교체)");
    } else if (reward.kind === "helmet") {
      if (Inventory.equipHelmet(reward.level)) { Player.refreshGear(game); UI.toast(`🪖 헬멧 Lv.${reward.level} 장착!`); }
      else UI.toast("이미 더 좋은 헬멧 착용 중 → 탄약으로 전환");
    } else if (reward.kind === "vest") {
      if (Inventory.equipVest(reward.level)) { Player.refreshGear(game); UI.toast(`🦺 방어구 Lv.${reward.level} 장착!`); }
      else UI.toast("이미 더 좋은 방어구 착용 중");
    } else if (reward.kind === "bag") {
      if (Inventory.equipBag(reward.level)) UI.toast(`🎒 가방 Lv.${reward.level} 장착!`);
      else UI.toast("이미 더 좋은 가방 착용 중");
    } else if (reward.kind === "ammo") {
      const w = Inventory.current();
      if (w) w.reserve = Math.min(w.reserve + (reward.qty || 30), 240);
      UI.toast(`🔸 탄약 +${reward.qty || 30}`);
    } else if (reward.kind === "attach") {
      if (Inventory.attachPart(reward.part)) {
        if (window.Weapon) Weapon.attachGunMesh(game);
        UI.toast("🔧 부착물 장착! (I키로 성능 확인)");
      } else UI.toast("이미 장착된 부착물 → 탄약으로 전환");
    }
  },

  hide() { const e = document.getElementById("reward-panel"); if (e) e.remove(); }
};
window.RewardSys = RewardSys;

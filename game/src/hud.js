// HUD + minimap + MAP/STATS meta screen. All HUD text is DOM (crisp at any size);
// the minimap and the city map are 2D canvases drawn from the same world data.
import { DISTRICTS, PROGRESS_TRACKS, CAREER_STATS, MISSION_RATINGS, CREW, WEAPONS } from './config.js';

function el(id) { return document.getElementById(id); }
function stars(n, max = 5) {
  let s = '';
  for (let i = 0; i < max; i++) s += `<span class="star ${i < n ? 'on' : ''}">★</span>`;
  return s;
}

export class HUD {
  constructor() {
    this.minimap = el('minimap');
    this.mm = this.minimap.getContext('2d');
    this.mapCanvas = el('meta-map');
    this.mc = this.mapCanvas.getContext('2d');
    this.dialogueTimer = 0;
    this.sticky = false; // shot mode: dialogue/toast stay up (frozen frame, no auto-hide)
    this.buildMetaStatic();
  }

  // ---- per-frame HUD update; `s` is the live game state snapshot ----
  update(s) {
    el('mission-title').textContent = `MISSION ${s.mission.id} "${s.mission.name}"`;
    el('mission-stage').textContent = `STAGE ${s.stageIdx + 1}/${s.mission.stages.length}`;
    el('mission-stage-bar').style.width = `${((s.stageIdx + 1) / s.mission.stages.length) * 100}%`;
    el('mission-next').textContent = `NEXT: ${s.stageText}`;
    el('mission-timer').textContent = s.missionTimer;
    el('wanted-stars').innerHTML = stars(s.wanted);
    el('wanted-label').textContent = `WANTED ${s.wanted} — ${s.wantedLabel}`;
    el('cash').textContent = `$${s.cash.toLocaleString('en-US')}`;
    el('rank-bar').style.width = `${Math.min(100, s.rankPct)}%`;
    el('rank-label').textContent = `RANK ${s.rank}  •  RP ${s.rp}`;
    el('clock').textContent = s.clock;
    el('speed').textContent = s.inCar ? `${Math.round(Math.abs(s.speedKmh))}` : '—';
    el('speed-unit').textContent = s.inCar ? 'KM/H' : 'ON FOOT';
    el('vehicle-name').textContent = s.inCar ? s.vehicleName : 'ON FOOT — NO VEHICLE';
    el('vehicle-cond').textContent = s.inCar ? `${Math.round(s.condition)}% ${s.condition < 70 ? 'DENTED' : 'CLEAN'}` : '—';
    el('cond-bar').style.width = `${s.inCar ? s.condition : 0}%`;
    el('health-bar').style.width = `${s.health}%`;
    el('armor-bar').style.width = `${s.armor}%`;
    el('radio-line').textContent = `♪ ${s.radio}`;
    el('air-tag').style.display = s.wanted >= 4 ? 'block' : 'none';
    // Police panel: named units + role + live distance.
    const pp = el('police-list');
    pp.innerHTML = s.units.map((u) => `<div class="unit"><span class="uname">${u.name}</span><span class="urole">${u.role}</span><span class="udist">${u.dist}m</span></div>`).join('')
      || '<div class="unit"><span class="uname">NO UNITS</span><span class="urole">PATROL</span><span class="udist">—</span></div>';
    el('police-count').textContent = `${s.units.length} UNITS`;
    // Weapon slots with ammo.
    el('weapon-slots').innerHTML = s.weapons.map((w, i) =>
      `<div class="wslot ${i === s.currentWeapon ? 'active' : ''}"><span class="wname">${w.name}</span><span class="wammo">${w.ammo === Infinity ? '∞' : w.ammo + ' / ' + w.reserve}</span></div>`).join('');
    // Crew chips with countdowns.
    el('crew-chips').innerHTML = s.crew.map((c) =>
      `<div class="crew"><span class="cinit">${c.initials}</span><span class="cname">${c.name}</span><span class="cabil">${c.ability}</span></div>`).join('');
    this.drawMinimap(s);
  }

  drawMinimap(s) {
    const g = this.mm, W = 220, H = 220;
    const toMap = (x, z) => [((x + 260) / 520) * W, ((z + 260) / 520) * H];
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0d1b26'; g.fillRect(0, 0, W, H);
    // Ocean (south) + beach
    g.fillStyle = '#1e7fa8'; g.fillRect(0, H * 0.62, W, H * 0.38);
    g.fillStyle = '#e8cf9e'; g.fillRect(0, H * 0.58, W, H * 0.04);
    // Roads
    g.strokeStyle = '#3a3f47'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, H * 0.58); g.lineTo(W, H * 0.58); g.stroke(); // boulevard
    g.beginPath(); g.moveTo(0, H * 0.40); g.lineTo(W, H * 0.40); g.stroke(); // sunset strip
    g.strokeStyle = '#2c313a'; g.lineWidth = 5;
    for (const x of [0.3, 0.62]) { g.beginPath(); g.moveTo(W * x, 0); g.lineTo(W * x, H * 0.6); g.stroke(); }
    // Districts (labels skip when they would collide with an earlier one)
    g.font = '700 8px Arial'; g.textAlign = 'center';
    const placed = [];
    for (const d of DISTRICTS) {
      const [mx, my] = toMap(d.x, d.z);
      g.fillStyle = d.color; g.globalAlpha = 0.9;
      g.fillRect(mx - 3, my - 3, 6, 6);
      g.globalAlpha = 1; g.fillStyle = '#e8f2f8';
      if (!placed.some(([px, py]) => Math.abs(px - mx) < 34 && Math.abs(py - my) < 12)) {
        g.fillText(d.name, mx, my - 6);
        placed.push([mx, my]);
      }
    }
    // Mission marker (pulsing diamond)
    const [px, py] = toMap(s.marker.x, s.marker.z);
    const pulse = 6 + Math.sin(performance.now() / 280) * 2;
    g.fillStyle = '#ffd23d';
    g.beginPath(); g.moveTo(px, py - pulse); g.lineTo(px + pulse, py); g.lineTo(px, py + pulse); g.lineTo(px - pulse, py); g.closePath(); g.fill();
    // Police blips
    g.fillStyle = '#ff3b30';
    for (const u of s.units) { const [ux, uy] = toMap(u.x, u.z); g.beginPath(); g.arc(ux, uy, 3.5, 0, 7); g.fill(); }
    // Player arrow
    const [hx, hy] = toMap(s.playerX, s.playerZ);
    g.save(); g.translate(hx, hy); g.rotate(-s.heading);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -5); g.lineTo(-6, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  dialogue(speaker, text, ms = 5200) {
    el('dlg-speaker').textContent = speaker;
    el('dlg-text').textContent = text;
    this.lastDlg = { speaker, text, ms };
    el('dialogue').style.display = 'flex';
    clearTimeout(this.dialogueTimer);
    if (!this.sticky) this.dialogueTimer = setTimeout(() => { el('dialogue').style.display = 'none'; }, ms);
  }
  toast(text, ms = 2600) {
    const t = el('toast');
    t.textContent = text; t.style.display = 'block';
    this.lastToast = { text, ms };
    clearTimeout(this.toastTimer);
    if (!this.sticky) this.toastTimer = setTimeout(() => { t.style.display = 'none'; }, ms);
  }
  // Re-show the last dialogue + toast with fresh timers (first frame can be slow
  // under software rendering; timers started before it would already have fired).
  reshow() {
    if (this.lastDlg) this.dialogue(this.lastDlg.speaker, this.lastDlg.text, this.lastDlg.ms);
    if (this.lastToast) this.toast(this.lastToast.text, this.lastToast.ms);
  }

  // ---- MAP/STATS meta screen (real in-game screen, toggled with M) ----
  buildMetaStatic() {
    // Completion ring 66.1%
    const ring = el('ring-fg');
    const C = 2 * Math.PI * 54;
    ring.style.strokeDasharray = `${C * 0.661} ${C}`;
    el('ring-pct').textContent = '66.1%';
    // Progress tracks
    el('tracks').innerHTML = PROGRESS_TRACKS.map((t) => {
      const pct = Math.round((t.done / t.total) * 100);
      return `<div class="track"><span class="tlabel">${t.label}</span><div class="tbar"><div class="tfill" style="width:${pct}%"></div></div><span class="tnum">${t.done}/${t.total}</span></div>`;
    }).join('');
    // Mission ratings
    el('ratings').innerHTML = MISSION_RATINGS.map((r, i) =>
      `<div class="rating"><span class="rname">M${i + 1}</span><span class="rgrade ${r === 'S' ? 'gold' : ''}">${r}</span></div>`).join('');
    // Career stats
    const cs = CAREER_STATS;
    el('career').innerHTML = [
      ['CARS STOLEN', cs.carsStolen], ['COPS ESCAPED', cs.copsEscaped], ['HIGHEST WANTED', cs.highestWanted + ' ★'],
      ['DISTANCE DRIVEN', cs.distanceDrivenKm + ' KM'], ['PEOPLE TAKEN OUT', cs.peopleTakenOut],
      ['LONGEST JUMP', cs.longestJumpM + ' M'], ['HEADSHOTS', cs.headshots], ['PLAYTIME', cs.playtimeH + ' H'],
    ].map(([k, v]) => `<div class="stat"><span class="skey">${k}</span><span class="sval">${v}</span></div>`).join('');
    // Workshop + gear
    el('workshop').innerHTML = [
      ['ENGINE TUNE LV3', '$4,200', 'OWNED'], ['NITRO BOOST', '$2,800', 'OWNED'],
      ['ARMOUR PLATING', '$3,600', 'OWNED'], ['CHROME TRIM', '$1,150', 'LOCKED'],
      ['NEON UNDERGLOW', '$900', 'OWNED'], ['TURBO KIT', '$6,500', 'LOCKED'],
    ].map(([n, p, st]) => `<div class="shop"><span class="shname">${n}</span><span class="shprice">${p}</span><span class="shstate ${st === 'OWNED' ? 'owned' : ''}">${st}</span></div>`).join('');
    el('gear').innerHTML = WEAPONS.map((w) =>
      `<div class="gear"><span class="gname">${w.name}</span><span class="gstat">DMG ${w.damage} • RNG ${w.range}M</span></div>`).join('');
    this.drawMetaMap();
  }
  drawMetaMap() {
    const g = this.mc, W = this.mapCanvas.width, H = this.mapCanvas.height;
    const toMap = (x, z) => [((x + 260) / 520) * W, ((z + 260) / 520) * H];
    g.fillStyle = '#0e2233'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1e7fa8'; g.fillRect(0, H * 0.62, W, H * 0.38);
    g.fillStyle = '#e8cf9e'; g.fillRect(0, H * 0.58, W, H * 0.04);
    g.strokeStyle = '#4a5566'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, H * 0.58); g.lineTo(W, H * 0.58); g.stroke();
    g.beginPath(); g.moveTo(0, H * 0.40); g.lineTo(W, H * 0.40); g.stroke();
    g.strokeStyle = '#39424f'; g.lineWidth = 4;
    for (const x of [0.3, 0.62]) { g.beginPath(); g.moveTo(W * x, 0); g.lineTo(W * x, H * 0.6); g.stroke(); }
    g.beginPath(); g.moveTo(0, H * 0.48); g.lineTo(W, H * 0.48); g.stroke();
    // District zones (labels skip when they would collide with an earlier one)
    const placed = [];
    for (const d of DISTRICTS) {
      const [mx, my] = toMap(d.x, d.z);
      g.fillStyle = d.color; g.globalAlpha = 0.35;
      g.beginPath(); g.arc(mx, my, 26, 0, 7); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = d.color; g.beginPath(); g.arc(mx, my, 5, 0, 7); g.fill();
      if (!placed.some(([px, py]) => Math.abs(px - mx) < 52 && Math.abs(py - my) < 26)) {
        g.fillStyle = '#ffffff'; g.font = '700 11px Arial'; g.textAlign = 'center';
        g.fillText(d.name, mx, my - 32);
        g.font = '400 9px Arial'; g.fillStyle = '#bfe3f7';
        g.fillText(`FRIENDLY ${d.friendly}%`, mx, my + 42);
        placed.push([mx, my]);
      }
    }
    // Route: Vice Point -> Sunset Strip -> Coral Bay
    g.strokeStyle = '#ffd23d'; g.lineWidth = 3; g.setLineDash([8, 6]);
    g.beginPath();
    const route = [[60, -100], [0, -60], [0, 40], [24, 46]];
    route.forEach(([x, z], i) => { const [mx, my] = toMap(x, z); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
    g.stroke(); g.setLineDash([]);
    // Player + mission markers
    const [hx, hy] = toMap(0, 40);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 6, 0, 7); g.fill();
    const [mx2, my2] = toMap(24, 46);
    g.fillStyle = '#ffd23d'; g.beginPath(); g.moveTo(mx2, my2 - 9); g.lineTo(mx2 + 9, my2); g.lineTo(mx2, my2 + 9); g.lineTo(mx2 - 9, my2); g.closePath(); g.fill();
  }
  updateSaves(slots) {
    el('saves').innerHTML = slots.map((s, i) => s
      ? `<div class="save filled"><span class="svname">SAVE SLOT ${i + 1} — FILLED</span><span class="svdet">${s.missionName} • $${s.cash.toLocaleString('en-US')} • ${s.completion}%</span><span class="svtime">${s.savedAt}</span></div>`
      : `<div class="save empty"><span class="svname">SAVE SLOT ${i + 1} — EMPTY</span><span class="svdet">No save yet</span><span class="svtime">—</span></div>`).join('');
  }
  showMeta(show) { el('meta-screen').style.display = show ? 'flex' : 'none'; }
}

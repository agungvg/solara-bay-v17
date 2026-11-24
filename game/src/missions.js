// Mission system: 8 story missions, each a list of staged objectives with payouts.
// Stage completion is checked against authored volumes (marker radius, distance).
// Autopilot drives mission 1 end-to-end for the headless playtest.
import { MISSIONS } from './config.js';
import { dist2d } from './rng.js';

export const MISSION_MARKERS = {
  1: { x: 24, z: 46 },   // Coral Bay drop-off (boulevard)
  2: { x: -40, z: -18 }, // Old Town market
  3: { x: 0, z: -60 },   // Sunset Strip roadblock
  4: { x: 30, z: 66 },   // Marina pier
  5: { x: 10, z: -30 },  // Neon Row start line
  6: { x: 60, z: 40 },   // Beachfront chase end
  7: { x: 110, z: 45 },  // The Docks swap
  8: { x: 60, z: -100 }, // Vice Point rally
};

export class MissionSystem {
  constructor() {
    this.missions = MISSIONS;
    this.activeId = 1;
    this.stageIdx = 0;
    this.completed = new Set();
    this.cash = 0;
    this.state = 'active'; // active | complete | failed
    this.stageTimer = 0;
    this.events = [];
  }
  active() { return this.missions[this.activeId - 1]; }
  stage() { const st = this.active().stages; return st[Math.min(this.stageIdx, st.length - 1)]; }
  stageText() { return this.state === 'complete' ? `${this.active().stages.length}/${this.active().stages.length}` : `${this.stageIdx + 1}/${this.active().stages.length}`; }
  nextLine() { return this.state === 'complete' ? 'MISSION COMPLETE' : this.stage().text.toUpperCase(); }
  marker() { return MISSION_MARKERS[this.activeId]; }
  start(id) {
    this.activeId = id; this.stageIdx = 0; this.state = 'active'; this.stageTimer = 0;
    this.events.push({ type: 'start', mission: id });
    return this.active();
  }
  advance(reason) {
    this.stageIdx += 1;
    this.events.push({ type: 'stage', mission: this.activeId, stage: this.stageIdx, reason });
    if (this.stageIdx >= this.active().stages.length) this.complete();
  }
  complete() {
    const m = this.active();
    this.state = 'complete';
    this.cash += m.cash;
    this.completed.add(m.id);
    this.events.push({ type: 'complete', mission: m.id, payout: m.cash, cash: this.cash });
  }
  fail(reason) {
    this.state = 'failed';
    this.events.push({ type: 'fail', mission: this.activeId, reason });
  }
  // Called every fixed tick with the live game state; returns true on stage change.
  update(dt, ctx) {
    if (this.state !== 'active') return false;
    const s = this.stage();
    this.stageTimer += dt;
    const m = MISSION_MARKERS[this.activeId];
    switch (s.kind) {
      case 'steal':
        if (ctx.inCar) { this.advance('stole a car'); return true; }
        break;
      case 'drive': case 'goto': case 'park': {
        const d = dist2d(ctx.playerX, ctx.playerZ, m.x, m.z);
        if (d < (s.kind === 'park' ? 5 : 8)) { this.advance('reached marker'); return true; }
        break;
      }
      case 'collect':
        if (ctx.collected) { this.advance('collected'); return true; }
        break;
      case 'combat':
        if (ctx.enemiesDown >= 1) { this.advance('lookout down'); return true; }
        break;
      case 'chase': case 'race': case 'wreck':
        if (this.stageTimer > 6 && ctx.progress >= 1) { this.advance('objective done'); return true; }
        break;
      case 'escape':
        if (ctx.wanted === 0 || this.stageTimer > 10) { this.advance('clear'); return true; }
        break;
      default: break;
    }
    return false;
  }
  // Autopilot for the playtest: returns the input the game should apply this tick.
  autopilot(ctx) {
    const m = MISSION_MARKERS[this.activeId];
    const s = this.stage();
    const input = { throttle: false, brake: false, left: false, right: false, enter: false };
    if (this.state !== 'active') return input;
    if (s.kind === 'steal' && !ctx.inCar) { input.enter = true; return input; }
    // Steer toward the marker.
    const dx = m.x - ctx.playerX, dz = m.z - ctx.playerZ;
    const targetHeading = Math.atan2(-dz, dx);
    let dh = targetHeading - ctx.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    input.throttle = true;
    if (dh > 0.12) input.left = true;
    else if (dh < -0.12) input.right = true;
    const d = Math.hypot(dx, dz);
    if (d < 10) input.throttle = false;
    if (d < 4) input.brake = true;
    return input;
  }
}

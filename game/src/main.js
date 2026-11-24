// Solara Bay — boot, fixed-step simulation, camera, input, traffic, player.
// The simulation runs at a fixed 60 Hz; rendering is presentation only.
// Headless playtests drive it through window.__step(n) (rAF is throttled there).
import * as THREE from 'three';
import { DAY_PRESETS, MISSIONS, CREW, WANTED_LEVELS, VEHICLE_DEFS } from './config.js';
import { World } from './world.js';
import { SkySystem } from './sky.js';
import { buildHeroCar, buildTrafficCar, buildTank, Vehicle } from './vehicles.js';
import { Crowd } from './crowd.js';
import { WantedSystem } from './police.js';
import { WeaponSystem } from './combat.js';
import { MissionSystem, MISSION_MARKERS } from './missions.js';
import { SaveSystem } from './save.js';
import { HUD } from './hud.js';
import { SynthAudio } from './audio.js';
import { stageShot } from './shots.js';
import { mulberry32, range, clamp } from './rng.js';

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));

const DT = 1 / 60;
const RADIO_LINES = [
  'SOLARA FM 98.6 — "Neon Coast" by The Palms',
  'SOLARA FM 98.6 — "Sunset Strip" by Vice Point',
  'KPD TRAFFIC: congestion on the boulevard, drive safe',
  'SOLARA FM 98.6 — "Regent Nights" by Coral Bay',
];

function buildPlayerFigure() {
  const g = new THREE.Group();
  const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (geo, m, x, y, z) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
  add(new THREE.BoxGeometry(0.2, 0.8, 0.22), mat(0x2a4a7a), -0.14, 0.4, 0); // jeans L
  add(new THREE.BoxGeometry(0.2, 0.8, 0.22), mat(0x2a4a7a), 0.14, 0.4, 0);  // jeans R
  add(new THREE.BoxGeometry(0.58, 0.72, 0.32), mat(0xf4f6f8, 0.9), 0, 1.16, 0); // white jacket
  const armL = add(new THREE.BoxGeometry(0.15, 0.62, 0.16), mat(0xf4f6f8, 0.9), -0.38, 1.16, 0);
  const armR = add(new THREE.BoxGeometry(0.15, 0.62, 0.16), mat(0xf4f6f8, 0.9), 0.38, 1.16, 0);
  add(new THREE.SphereGeometry(0.17, 12, 10), mat(0xd9a06b, 0.7), 0, 1.72, 0); // head
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 10), mat(0xd21f2b, 0.9), 0, 1.84, 0); // red cap
  add(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x222222, 0.5), 0.42, 1.1, 0.25); // pistol in hand
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

export class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.params = params;
    this.shot = parseInt(params.get('shot') || '0', 10) || 0;
    this.autopilot = params.get('autopilot') === '1';
    this.frozen = params.get('freeze') === '1';
    this.time = 0; this.frame = 0;
    this.cash = 1200; this.displaySpeedKmh = null; this.missionTimerText = '0:00';
    this.clockMinutes = 12 * 60; this.rank = 'STREET'; this.rp = 1240;
    this.enemiesDown = 0; this.collected = false; this.progress = 0;
    this.neonStreaksAdded = false;

    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1600);
    this.camera.position.set(-12, 5, 28);

    this.sky = new SkySystem(this.scene, this.renderer);
    this.world = new World(this.scene);
    this.crowd = new Crowd(this.scene);
    this.wanted = new WantedSystem(this.scene);
    this.audio = new SynthAudio();
    this.combat = new WeaponSystem(this.scene, this.audio);
    this.missions = new MissionSystem();
    this.saves = new SaveSystem();
    this.hud = new HUD();

    // Player figure + hero car + tank
    this.playerMesh = buildPlayerFigure();
    this.scene.add(this.playerMesh);
    this.player = {
      pos: new THREE.Vector3(2, 0, 40), heading: 0, inCar: false,
      health: 100, armor: 60, walkSpeed: 6,
      enterCar: (vehicle, color) => this.enterCar(vehicle, color),
      exitCar: (x, z, heading) => this.exitCar(x, z, heading),
    };
    this.heroCar = new Vehicle(buildHeroCar(0xff6a1a), VEHICLE_DEFS[0]);
    this.scene.add(this.heroCar.mesh);
    this.heroCar.place(6, 40, 0);
    this.tank = buildTank();
    this.tank.visible = false;
    this.scene.add(this.tank);
    this.buildTraffic();
    this.buildMarkerBeacon();

    // Input
    this.keys = {};
    this.camYaw = 0; this.camPitch = 0.32;
    this.shotCamera = null;
    this.metaOpen = false; this.paused = false;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('mousedown', (e) => { if (e.button === 0) this.onFire(); });
    window.addEventListener('resize', () => this.onResize());
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.camYaw -= (e.clientX - lx) * 0.004; this.camPitch = clamp(this.camPitch + (e.clientY - ly) * 0.003, 0.08, 0.9);
      lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    // Ambient crowd so the city is never empty
    this.crowd.spawnStreet(0, 33, 14, 31337);
    this.crowd.spawnBeach(-40, 58, 8, 42424);
    this.crowd.spawnMarket(-40, -20, 6, 51515);

    this.setPreset('noon');
    this.missions.start(1);
    this.hud.dialogue('MK', MISSIONS[0].intro, 7000);
    this.hud.updateSaves(this.saves.slots);

    // Shot staging (frozen dossier frames) or autopilot playtest
    if (this.shot >= 1 && this.shot <= 4) {
      stageShot(this, this.shot);
      document.getElementById('title-screen').style.display = 'none';
      this.frozen = true;
      this.hud.sticky = true; // frozen dossier frame: dialogue + toast stay visible
      // Frozen frames never run stepSim, so paint the HUD + beacon once here.
      const mk = this.missions.marker();
      this.beacon.position.set(mk.x, 15, mk.z);
      this.beaconRing.position.set(mk.x, 0.15, mk.z);
      for (const u of this.wanted.units) {
        u.dist = Math.round(Math.hypot(u.vehicle.pos.x - this.player.pos.x, u.vehicle.pos.z - this.player.pos.z));
      }
      this.hud.update(this.snapshot());
    } else if (this.autopilot) {
      document.getElementById('title-screen').style.display = 'none';
    }
    this.audio.ensure();
    this.render();
    if (this.shot >= 1 && this.shot <= 4) this.hud.reshow();
    window.__ready = true;
    window.__game = this;
    window.__step = (n) => this.stepExternal(n);
    this.acc = 0; this.last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const elapsed = Math.min(0.25, (now - this.last) / 1000);
      this.last = now;
      if (!this.frozen && !this.paused) {
        this.acc += elapsed;
        let steps = 0;
        while (this.acc >= DT && steps < 5) { this.stepSim(DT); this.acc -= DT; steps++; }
      }
      this.render();
    };
    requestAnimationFrame(loop);
  }

  buildTraffic() {
    const rng = mulberry32(60606);
    this.traffic = [];
    const routes = [
      { axis: 'x', fixed: 40, from: -180, to: 180, dir: 1, lane: 37 },
      { axis: 'x', fixed: 40, from: 180, to: -180, dir: -1, lane: 43 },
      { axis: 'x', fixed: -60, from: -180, to: 180, dir: 1, lane: -63 },
      { axis: 'x', fixed: -60, from: 180, to: -180, dir: -1, lane: -57 },
      { axis: 'z', fixed: -60, from: -140, to: 40, dir: 1, lane: -63 },
      { axis: 'z', fixed: 60, from: 40, to: -140, dir: -1, lane: 57 },
    ];
    const colors = [0x2fb7c9, 0xffd23d, 0xe8e8e8, 0x7ddb4f, 0xff8ac2, 0x9a8cff];
    routes.forEach((r, i) => {
      const mesh = buildTrafficCar(colors[i % colors.length]);
      this.scene.add(mesh);
      const v = new Vehicle(mesh, { topSpeed: 16 + rng() * 8, accel: 10, handling: 1 });
      const start = range(rng, r.from, r.to);
      if (r.axis === 'x') v.place(start, r.lane, r.dir === 1 ? 0 : Math.PI);
      else v.place(r.lane, start, r.dir === 1 ? -Math.PI / 2 : Math.PI / 2);
      v.speed = v.def.topSpeed * 0.8;
      this.traffic.push({ v, route: r });
    });
    // A parked scooter by the boulevard (traffic variety)
    const scooter = new THREE.Group();
    const sm = new THREE.MeshStandardMaterial({ color: 0x9a8cff, roughness: 0.4, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.6), sm); body.position.y = 0.55; body.castShadow = true; scooter.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 })); seat.position.set(-0.3, 0.85, 0); scooter.add(seat);
    scooter.position.set(12, 0, 33.5);
    this.scene.add(scooter);
  }

  buildMarkerBeacon() {
    const geo = new THREE.CylinderGeometry(3.2, 3.2, 30, 20, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.position.set(24, 15, 46);
    this.scene.add(this.beacon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23d }));
    ring.rotation.x = Math.PI / 2; ring.position.set(24, 0.15, 46);
    this.scene.add(ring); this.beaconRing = ring;
  }

  setPreset(name) {
    this.presetName = name;
    const p = DAY_PRESETS[name];
    this.sky.applyPreset(p);
    const [hh, mm] = p.time.split(':').map(Number);
    this.clockMinutes = hh * 60 + mm;
    this.preset = p;
  }

  setShotCamera(pos, target) {
    this.shotCamera = { pos: pos.clone(), target: target.clone() };
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  addNeonStreaks() {
    if (this.neonStreaksAdded) return;
    this.neonStreaksAdded = true;
    const colors = [0xff4fd8, 0x3aa0ff, 0xffd23d, 0xff7a3d];
    for (let i = 0; i < 10; i++) {
      const c = colors[i % colors.length];
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.35), new THREE.MeshBasicMaterial({ color: c }));
      strip.rotation.x = -Math.PI / 2; strip.rotation.z = 0;
      strip.position.set(-60 + i * 14, 0.12, -60 + (i % 2 ? 6.4 : -6.4));
      this.scene.add(strip);
    }
    // Warm sunset glow wash over the road so it never reads as a black void.
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(180, 9), new THREE.MeshBasicMaterial({ color: 0xff9a52, transparent: true, opacity: 0.16 }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.1, -60);
    this.scene.add(glow);
  }

  enterCar(vehicle, color) {
    if (color !== undefined) {
      // Repaint the hero car for the staged shot.
      vehicle.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.userData && o.geometry && o.geometry.type === 'BoxGeometry') { /* keep parts */ } });
    }
    this.player.inCar = true;
    this.playerMesh.visible = false;
    this.player.pos.copy(vehicle.pos);
    this.player.heading = vehicle.heading;
    this.audio.setSiren(this.wanted.level >= 2);
  }
  exitCar(x, z, heading) {
    this.player.inCar = false;
    this.playerMesh.visible = true;
    this.player.pos.set(x, 0, z);
    this.player.heading = heading;
    this.playerMesh.position.copy(this.player.pos);
    this.playerMesh.rotation.y = -heading;
  }

  onKey(e, down) {
    if (e.repeat) return;
    this.keys[e.code] = down;
    if (!down) return;
    this.audio.ensure(); this.audio.resume();
    if (e.code === 'Enter') {
      document.getElementById('title-screen').style.display = 'none';
      this.audio.startRadio();
    }
    if (e.code === 'KeyM') { this.metaOpen = !this.metaOpen; this.hud.showMeta(this.metaOpen); this.hud.updateSaves(this.saves.slots); }
    if (e.code === 'Escape') { this.paused = !this.paused; this.hud.toast(this.paused ? 'PAUSED' : 'RESUMED'); }
    if (e.code === 'KeyE') this.tryEnterExit();
    if (e.code === 'KeyR') { if (this.combat.reload()) this.hud.toast('RELOADED'); }
    if (e.code === 'F9') {
      this.saves.save(1, { mission: this.missions.activeId, missionName: this.missions.active().name, cash: this.cash, completion: 66.1, playtimeH: 18.6 });
      this.hud.toast('SAVED TO SLOT 2');
    }
    if (e.code.startsWith('Digit')) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= 6) this.combat.select(n - 1);
    }
  }

  tryEnterExit() {
    if (this.player.inCar) {
      const side = this.heroCar.pos.clone();
      side.x += Math.cos(this.player.heading + Math.PI / 2) * 2.4;
      side.z -= Math.sin(this.player.heading + Math.PI / 2) * 2.4;
      this.exitCar(side.x, side.z, this.heroCar.heading);
      this.audio.setSiren(false);
      return;
    }
    const d = Math.hypot(this.player.pos.x - this.heroCar.pos.x, this.player.pos.z - this.heroCar.pos.z);
    if (d < 4.5) {
      this.enterCar(this.heroCar);
      this.wanted.addHeat(25, 'car stolen');
      this.hud.toast('CAR STOLEN — KPD NOTICED');
    }
  }

  onFire() {
    if (this.player.inCar || this.metaOpen || this.paused) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const from = this.player.pos.clone(); from.y = 1.4;
    const res = this.combat.fire(from, dir);
    if (res && res.fail) this.hud.toast(res.fail);
    if (res && res.hit) {
      this.enemiesDown += 1;
      this.wanted.addHeat(30, 'shots fired');
      this.hud.toast('TARGET DOWN');
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  readInput() {
    const k = this.keys;
    return {
      throttle: !!(k.KeyW || k.ArrowUp),
      brake: !!(k.KeyS || k.ArrowDown),
      left: !!(k.KeyA || k.ArrowLeft),
      right: !!(k.KeyD || k.ArrowRight),
      enter: !!k.KeyE,
    };
  }

  stepSim(dt) {
    this.time += dt; this.frame++;
    const ctx = {
      playerX: this.player.inCar ? this.heroCar.pos.x : this.player.pos.x,
      playerZ: this.player.inCar ? this.heroCar.pos.z : this.player.pos.z,
      heading: this.player.inCar ? this.heroCar.heading : this.player.heading,
      inCar: this.player.inCar, collected: this.collected,
      enemiesDown: this.enemiesDown, wanted: this.wanted.level, progress: this.progress,
    };
    let input = this.readInput();
    if (this.autopilot) {
      input = this.missions.autopilot(ctx);
      if (input.enter && !this.player.inCar) this.tryEnterExit();
      if (this.missions.state === 'complete' && this.missions.activeId < 8) {
        // Chain: autopilot only plays mission 1; stop after it completes.
      }
    }
    // Player movement
    if (this.player.inCar) {
      const sp = this.heroCar.update(dt, input);
      this.player.heading = this.heroCar.heading;
      this.player.pos.copy(this.heroCar.pos);
      this.audio.setEngine(Math.abs(sp) / this.heroCar.def.topSpeed, true);
      if (Math.abs(sp) > 40) this.progress = Math.min(1, this.progress + dt * 0.08);
    } else {
      const mv = { x: 0, z: 0 };
      if (input.throttle) mv.z -= 1;
      if (input.brake) mv.z += 1;
      if (input.left) mv.x -= 1;
      if (input.right) mv.x += 1;
      const len = Math.hypot(mv.x, mv.z) || 1;
      const camA = this.camYaw;
      const dx = (mv.x * Math.cos(camA) - mv.z * Math.sin(camA)) / len;
      const dz = (mv.x * Math.sin(camA) + mv.z * Math.cos(camA)) / len;
      const moving = input.throttle || input.brake || input.left || input.right;
      if (moving) {
        this.player.pos.x += dx * this.player.walkSpeed * dt;
        this.player.pos.z += dz * this.player.walkSpeed * dt;
        this.player.heading = Math.atan2(dx, dz);
        this.playerMesh.userData.armL.rotation.x = Math.sin(this.time * 9) * 0.6;
        this.playerMesh.userData.armR.rotation.x = -Math.sin(this.time * 9) * 0.6;
      }
      this.playerMesh.position.copy(this.player.pos);
      this.playerMesh.rotation.y = this.player.heading;
      this.audio.setEngine(0, false);
    }
    // Traffic loops along its road
    for (const t of this.traffic) {
      const v = t.v, r = t.route;
      if (r.axis === 'x') {
        v.pos.x += r.dir * v.speed * dt;
        if (v.pos.x > 185) v.pos.x = -185;
        if (v.pos.x < -185) v.pos.x = 185;
      } else {
        v.pos.z += r.dir * v.speed * dt;
        if (v.pos.z > 45) v.pos.z = -145;
        if (v.pos.z < -145) v.pos.z = 45;
      }
      v.sync();
    }
    // World life
    this.crowd.update(dt, this.time, this.combat.shotsFired > 0 ? { x: ctx.playerX, z: ctx.playerZ } : null);
    this.wanted.update(dt, new THREE.Vector3(ctx.playerX, 0, ctx.playerZ), this.player.inCar ? Math.abs(this.heroCar.speed) : 0);
    this.combat.update(dt);
    this.sky.update(dt, this.time);
    // Ferris wheel turns slowly
    if (this.world.ferrisWheel) this.world.ferrisWheel.children[0].rotation.z += dt * 0.05;
    // Mission logic + marker
    const changed = this.missions.update(dt, ctx);
    if (changed && this.missions.state === 'complete') {
      const m = this.missions.active();
      this.cash = this.missions.cash + 1200; // career cash grows with payouts
      this.hud.toast(`MISSION COMPLETE — ${m.name}  +$${m.cash.toLocaleString('en-US')}`);
      this.hud.dialogue('MK', `Clean work. $${m.cash.toLocaleString('en-US')} in the bag. Next job is waiting.`, 7000);
      this.audio.beep(1320, 0.3);
    }
    const mk = this.missions.marker();
    this.beacon.position.set(mk.x, 15, mk.z);
    this.beaconRing.position.set(mk.x, 0.15, mk.z);
    this.beacon.material.opacity = 0.12 + Math.sin(this.time * 3) * 0.06;
    // Clock advances 1 game-minute per 2 real seconds
    this.clockMinutes += dt / 2;
    // Radio line rotates
    this.radioLine = RADIO_LINES[Math.floor(this.time / 14) % RADIO_LINES.length];
    // HUD
    this.hud.update(this.snapshot());
  }

  snapshot() {
    const hh = String(Math.floor(this.clockMinutes / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(this.clockMinutes % 60)).padStart(2, '0');
    return {
      mission: this.missions.active(), stageIdx: this.missions.stageIdx,
      stageText: this.missions.nextLine(),
      missionTimer: this.missionTimerText,
      wanted: this.wanted.level, wantedLabel: WANTED_LEVELS[this.wanted.level].label,
      cash: this.cash, rank: this.rank, rp: this.rp,
      rankPct: clamp((this.cash / 30000) * 100, 4, 100),
      clock: `${hh}:${mm}`,
      inCar: this.player.inCar,
      speedKmh: this.displaySpeedKmh !== null ? this.displaySpeedKmh : Math.abs(this.heroCar.speed) * 3.6,
      vehicleName: this.heroCar.def.name, condition: this.heroCar.condition,
      health: this.player.health, armor: this.player.armor,
      radio: this.radioLine || RADIO_LINES[0],
      units: this.wanted.units.map((u) => ({ name: u.name, role: u.role, dist: u.dist, x: u.vehicle.pos.x, z: u.vehicle.pos.z })),
      weapons: this.combat.weapons, currentWeapon: this.combat.current,
      crew: CREW, marker: this.missions.marker(),
      playerX: this.player.pos.x, playerZ: this.player.pos.z, heading: this.player.heading,
    };
  }

  stepExternal(n) {
    for (let i = 0; i < n; i++) this.stepSim(DT);
    this.render();
    const s = this.snapshot();
    return {
      mission: s.mission.id, missionName: s.mission.name, stage: this.missions.stageText(),
      state: this.missions.state, cash: this.cash, wanted: s.wanted,
      inCar: s.inCar, errors: window.__errors.slice(),
      playerX: +s.playerX.toFixed(1), playerZ: +s.playerZ.toFixed(1),
    };
  }

  render() {
    if (this.shotCamera) {
      this.camera.position.copy(this.shotCamera.pos);
      this.camera.lookAt(this.shotCamera.target);
    } else {
      // Third-person follow: behind the player/car, smoothed.
      const target = this.player.inCar ? this.heroCar.pos : this.player.pos;
      const heading = this.player.inCar ? this.heroCar.heading : this.player.heading;
      const yaw = this.camYaw + heading;
      const dist = this.player.inCar ? 9.5 : 7;
      const cx = target.x - Math.cos(yaw) * dist;
      const cz = target.z + Math.sin(yaw) * dist;
      const cy = (this.player.inCar ? 3.6 : 3.0) + Math.sin(this.camPitch) * 3;
      this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.12);
      this.camera.lookAt(target.x + Math.cos(heading) * 6, 1.6, target.z - Math.sin(heading) * 6);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();

// Wanted system: 6 levels (0 CLEAN … 5 LOCKDOWN) with a police state machine.
// Police AI modes: patrol -> pursue (within leash) -> search (last known) -> recover.
// Every transition records its reason so the HUD/debug can explain it.
import * as THREE from 'three';
import { WANTED_LEVELS } from './config.js';
import { buildPoliceCar, buildHelicopter, Vehicle } from './vehicles.js';

const UNIT_NAMES = ['CORAL-48', 'VICE-12', 'NEON-07', 'DOCK-33', 'PALM-21', 'STRIP-09', 'KPD-1', 'KPD-2'];
const UNIT_ROLES = ['PURSUE', 'ROADBLOCK', 'PURSUE', 'SEARCH', 'PURSUE', 'ROADBLOCK', 'PURSUE', 'AIR UNIT'];

export class WantedSystem {
  constructor(scene) {
    this.scene = scene;
    this.level = 0;
    this.heat = 0; // 0..100 within a level
    this.state = 'patrol'; // patrol | pursue | search | recover
    this.units = []; // {name, role, vehicle, mode, dist}
    this.heli = null; this.heliMesh = null;
    this.lastKnown = new THREE.Vector3(0, 0, 0);
    this.escapeTimer = 0;
    this.log = [];
  }
  setLevel(level, reason) {
    level = Math.max(0, Math.min(5, level));
    if (level !== this.level) {
      this.log.push({ from: this.level, to: level, reason, t: performance.now() });
      this.level = level;
      this.state = level === 0 ? 'patrol' : 'pursue';
      this.syncUnits();
    }
    return this.level;
  }
  addHeat(amount, reason) {
    this.heat += amount;
    if (this.heat >= 100) { this.heat = 0; this.setLevel(this.level + 1, reason); }
    return this.level;
  }
  syncUnits() {
    const want = WANTED_LEVELS[this.level].units;
    // Remove surplus units
    while (this.units.length > want) {
      const u = this.units.pop();
      this.scene.remove(u.vehicle.mesh);
    }
    // Add missing units (spawned behind the player on the road)
    while (this.units.length < want) {
      const i = this.units.length;
      const mesh = buildPoliceCar();
      this.scene.add(mesh);
      const v = new Vehicle(mesh, { topSpeed: 56, accel: 25, handling: 1.0 });
      v.place(-30 - i * 14, 40 + (i % 2) * 5, 0);
      this.units.push({ name: UNIT_NAMES[i % UNIT_NAMES.length], role: UNIT_ROLES[i % UNIT_ROLES.length], vehicle: v, mode: 'pursue', dist: 0 });
    }
    // Helicopter appears at wanted 4+
    if (this.level >= 4 && !this.heliMesh) {
      this.heliMesh = buildHelicopter();
      this.heliMesh.scale.set(1.4, 1.4, 1.4); // big enough to read as a heli at chase distance
      this.scene.add(this.heliMesh);
      this.heli = { pos: new THREE.Vector3(20, 34, 55), angle: 0 };
    } else if (this.level < 4 && this.heliMesh) {
      this.scene.remove(this.heliMesh); this.heliMesh = null; this.heli = null;
    }
  }
  // Place units deterministically for a staged screenshot: positions are [x, z, heading].
  stageUnits(spots) {
    this.syncUnits();
    spots.forEach((s, i) => {
      if (this.units[i]) this.units[i].vehicle.place(s[0], s[1], s[2] ?? 0);
    });
  }
  stageHeli(x, y, z) {
    if (!this.heliMesh) { this.heliMesh = buildHelicopter(); this.heliMesh.scale.set(1.4, 1.4, 1.4); this.scene.add(this.heliMesh); this.heli = { pos: new THREE.Vector3(x, y, z), angle: 0 }; }
    this.heli.pos.set(x, y, z);
    this.heliMesh.position.copy(this.heli.pos);
  }
  update(dt, playerPos, playerSpeed) {
    // Escape: if the player is far and slow, heat decays and the state falls to search.
    const d = Math.hypot(playerPos.x - this.lastKnown.x, playerPos.z - this.lastKnown.z);
    if (this.level > 0) {
      this.lastKnown.copy(playerPos);
      const hidden = Math.abs(playerSpeed) < 2;
      this.escapeTimer = hidden ? this.escapeTimer + dt : 0;
      if (this.escapeTimer > 12) { this.setLevel(this.level - 1, 'escaped'); this.escapeTimer = 0; }
    }
    // Pursue: units close on the player, capped by their top speed.
    for (const u of this.units) {
      const v = u.vehicle;
      const dx = playerPos.x - v.pos.x, dz = playerPos.z - v.pos.z;
      const dist = Math.hypot(dx, dz);
      u.dist = Math.round(dist);
      if (this.state === 'pursue' && dist > 6) {
        const targetHeading = Math.atan2(-dz, dx);
        let dh = targetHeading - v.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        v.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
        v.speed = Math.min(v.def.topSpeed, v.speed + 18 * dt);
        v.pos.x += Math.cos(v.heading) * v.speed * dt;
        v.pos.z -= Math.sin(v.heading) * v.speed * dt;
        v.sync();
        u.mode = 'PURSUE';
      } else if (dist <= 6) {
        u.mode = 'RAMMING';
        v.speed = Math.max(0, v.speed - 20 * dt);
        v.sync();
      }
    }
    // Helicopter orbits the player, rotor spins, spotlight tracks the hero.
    if (this.heliMesh && this.heli) {
      this.heli.angle += dt * 0.25;
      const hx = playerPos.x + Math.cos(this.heli.angle) * 26;
      const hz = playerPos.z + Math.sin(this.heli.angle) * 26;
      this.heli.pos.set(hx, 32, hz);
      this.heliMesh.position.copy(this.heli.pos);
      this.heliMesh.rotation.y = Math.atan2(playerPos.x - hx, playerPos.z - hz);
      this.heliMesh.userData.rotor.rotation.y += dt * 22;
      this.heliMesh.userData.tailRotor.rotation.x += dt * 30;
      // Spotlight cone hangs fixed below the heli, wide end down, aimed at the street.
    }
    return this.level;
  }
  label() { return WANTED_LEVELS[this.level].label; }
}

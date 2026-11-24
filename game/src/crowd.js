// Crowd: dense, varied pedestrians — different heights, shirts, skins, hats.
// Each ped is a small articulated figure (no faces — initials/names live in the HUD).
import * as THREE from 'three';
import { mulberry32, range, pick } from './rng.js';

const SHIRTS = [0xe84a3d, 0x3aa0ff, 0xffd23d, 0x7ddb4f, 0xff8ac2, 0x9a8cff, 0xf4f6f8, 0x222831, 0xff7a3d, 0x2fb7c9];
const PANTS = [0x2a2e33, 0x3a4a6b, 0x6b5a3a, 0x444444, 0x7a3a4a];
const SKINS = [0xf2c9a0, 0xd9a06b, 0x8a5a33, 0xf7d7b5, 0xc98d5a];
const HATS = [null, 'cap', 'cap', 'brim', 'beanie'];

export class Pedestrian {
  constructor(scene, rng, x, z) {
    this.group = new THREE.Group();
    const h = range(rng, 1.55, 1.95); // varied heights
    const skin = pick(rng, SKINS), shirt = pick(rng, SHIRTS), pants = pick(rng, PANTS);
    const s = h / 1.75; // scale figure to height
    const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75 * s, 0.18), mat(pants));
      leg.position.set(side * 0.12, 0.38 * s, 0); leg.castShadow = true; this.group.add(leg);
    }
    // Torso — shirt colour sells variety at a glance
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68 * s, 0.28), mat(shirt, 0.9));
    torso.position.y = 1.1 * s; torso.castShadow = true; this.group.add(torso);
    // Arms
    this.armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.6 * s, 0.14), mat(shirt));
    this.armL.position.set(-0.34, 1.12 * s, 0); this.armL.castShadow = true; this.group.add(this.armL);
    this.armR = this.armL.clone(); this.armR.position.x = 0.34; this.group.add(this.armR);
    // Head (round) + hat variety
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 12, 10), mat(skin, 0.7));
    head.position.y = 1.62 * s; head.castShadow = true; this.group.add(head);
    const hat = pick(rng, HATS);
    if (hat === 'cap') {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.08, 10), mat(pick(rng, SHIRTS), 0.9));
      cap.position.y = 1.74 * s; this.group.add(cap);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.16), mat(0x222222));
      brim.position.set(0, 1.71 * s, 0.2 * s); this.group.add(brim);
    } else if (hat === 'brim') {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.04, 12), mat(0xd8c9a0, 0.9));
      br.position.y = 1.76 * s; this.group.add(br);
    } else if (hat === 'beanie') {
      const bn = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 10, 6, 0, Math.PI * 2, 0, 1.2), mat(pick(rng, SHIRTS), 0.95));
      bn.position.y = 1.66 * s; this.group.add(bn);
    }
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rng() * Math.PI * 2;
    scene.add(this.group);
    this.home = { x, z };
    this.phase = rng() * Math.PI * 2;
    this.walkSpeed = range(rng, 0.6, 1.4);
    this.state = 'wander'; // wander | flee | down
    this.height = h;
  }
  update(dt, t, threat) {
    if (this.state === 'down') return;
    // Gentle wander around home; flee when a threat (gunfire) is near.
    const g = this.group;
    if (threat && Math.hypot(g.position.x - threat.x, g.position.z - threat.z) < 14) {
      this.state = 'flee';
    }
    if (this.state === 'flee') {
      const dx = g.position.x - (threat ? threat.x : 0), dz = g.position.z - (threat ? threat.z : 0);
      const d = Math.hypot(dx, dz) || 1;
      g.position.x += (dx / d) * 2.4 * dt; g.position.z += (dz / d) * 2.4 * dt;
      g.rotation.y = Math.atan2(dx, dz);
    } else {
      const wx = this.home.x + Math.sin(t * 0.3 + this.phase) * 3.5;
      const wz = this.home.z + Math.cos(t * 0.23 + this.phase * 1.7) * 2.5;
      const dx = wx - g.position.x, dz = wz - g.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        g.position.x += (dx / d) * this.walkSpeed * dt;
        g.position.z += (dz / d) * this.walkSpeed * dt;
        g.rotation.y = Math.atan2(dx, dz);
      }
    }
    // Walk swing
    const swing = Math.sin(t * 6 + this.phase) * 0.5;
    this.armL.rotation.x = swing; this.armR.rotation.x = -swing;
  }
  knockDown() {
    this.state = 'down';
    this.group.rotation.x = -Math.PI / 2; // lying flat, unmistakably downed
    this.group.position.y = 0.25;
  }
}

export class Crowd {
  constructor(scene) {
    this.peds = [];
    this.scene = scene;
  }
  spawnMarket(cx, cz, count, seed = 777) {
    const rng = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const x = cx + range(rng, -20, 20), z = cz + range(rng, -14, 14);
      this.peds.push(new Pedestrian(this.scene, rng, x, z));
    }
    return this.peds;
  }
  spawnStreet(cx, cz, count, seed = 888) {
    const rng = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const x = cx + range(rng, -60, 60), z = cz + range(rng, -4, 4);
      this.peds.push(new Pedestrian(this.scene, rng, x, z));
    }
    return this.peds;
  }
  spawnBeach(cx, cz, count, seed = 999) {
    const rng = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const x = cx + range(rng, -70, 70), z = cz + range(rng, -3, 5);
      this.peds.push(new Pedestrian(this.scene, rng, x, z));
    }
    return this.peds;
  }
  update(dt, t, threat) {
    for (const p of this.peds) p.update(dt, t, threat);
  }
  count() { return this.peds.length; }
}

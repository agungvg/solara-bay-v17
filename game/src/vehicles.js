// Vehicles: rounded hero cars (silhouette first), KPD police cars with legible
// POLICE decals, traffic, the KPD tank, and the air-unit helicopter.
// Arcade handling: acceleration, steering, brake — one free-roaming player car.
import * as THREE from 'three';
import { policeDecalTexture } from './textures.js';

function std(color, rough = 0.35, metal = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function part(geo, material, x, y, z, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}

// Rounded hero car: low wide body, arched roof, bulging fenders, big wheels.
// Built facing +X so heading 0 = east down the boulevard.
export function buildHeroCar(color = 0xff6a1a) {
  const g = new THREE.Group();
  const paint = std(color, 0.25, 0.6);
  const dark = std(0x14181f, 0.15, 0.4);
  // Lower body — long rounded mass
  const body = part(new THREE.BoxGeometry(4.6, 0.62, 2.0), paint, 0, 0.55, 0, g);
  body.scale.set(1, 1, 1);
  // Nose taper: sloped hood wedge
  const hood = part(new THREE.BoxGeometry(1.1, 0.34, 1.9), paint, 2.0, 0.78, 0, g);
  hood.rotation.z = -0.18;
  // Rounded cabin: half-cylinder greenhouse (the tumblehome arch that reads "rounded")
  const cabin = part(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 20, 1, false, 0, Math.PI), dark, -0.35, 0.86, 0, g);
  cabin.rotation.z = Math.PI / 2; cabin.rotation.y = Math.PI / 2;
  cabin.scale.set(1, 1, 1.05);
  const roof = part(new THREE.BoxGeometry(1.9, 0.22, 1.6), paint, -0.35, 1.62, 0, g);
  roof.rotation.z = 0;
  // Fender bulges over each wheel (spheres squashed — the rounded read)
  for (const [wx, wz] of [[1.55, 0.95], [1.55, -0.95], [-1.55, 0.95], [-1.55, -0.95]]) {
    const f = part(new THREE.SphereGeometry(0.52, 12, 8), paint, wx, 0.62, wz, g);
    f.scale.set(1.15, 0.62, 0.75);
  }
  // Wheels with rims
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 10);
  for (const [wx, wz] of [[1.55, 0.98], [1.55, -0.98], [-1.55, 0.98], [-1.55, -0.98]]) {
    const w = part(wheelGeo, std(0x0c0c0e, 0.9, 0.1), wx, 0.42, wz, g);
    w.rotation.x = Math.PI / 2;
    const r = part(rimGeo, std(0xd8dde2, 0.25, 0.9), wx, 0.42, wz, g);
    r.rotation.x = Math.PI / 2;
  }
  // Headlights + taillights + grille + spoiler
  part(new THREE.BoxGeometry(0.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), 2.32, 0.72, 0.62, g);
  part(new THREE.BoxGeometry(0.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), 2.32, 0.72, -0.62, g);
  part(new THREE.BoxGeometry(0.08, 0.18, 1.5), new THREE.MeshBasicMaterial({ color: 0xff2233 }), -2.32, 0.72, 0, g);
  part(new THREE.BoxGeometry(0.7, 0.08, 0.3), dark, 2.28, 0.5, 0, g);
  // Sloped rear windshield + trunk deck — the rear 3/4 read (no flat slab back).
  const rearGlass = part(new THREE.BoxGeometry(0.06, 0.85, 1.5), dark, -1.28, 1.18, 0, g);
  rearGlass.rotation.z = 0.55;
  const trunk = part(new THREE.BoxGeometry(0.95, 0.1, 1.7), paint, -1.75, 0.92, 0, g);
  trunk.rotation.z = 0.08;
  const wing = part(new THREE.BoxGeometry(0.5, 0.06, 1.9), paint, -2.05, 1.12, 0, g);
  wing.rotation.z = 0.12;
  g.userData.length = 4.8;
  return g;
}

export function buildPoliceCar() {
  const g = buildHeroCar(0x111418);
  const decal = policeDecalTexture();
  // POLICE on both flanks — big white letters on black, legible at a glance.
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75), new THREE.MeshBasicMaterial({ map: decal }));
    p.position.set(0.1, 0.62, s * 1.02); p.rotation.y = s > 0 ? 0 : Math.PI;
    g.add(p);
  }
  // POLICE on the roof, readable from the chase camera above/behind.
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.2), new THREE.MeshBasicMaterial({ map: decal }));
  roof.rotation.x = -Math.PI / 2; roof.rotation.z = Math.PI / 2;
  roof.position.set(-0.3, 1.76, 0); g.add(roof);
  // POLICE on the rear — the chase camera looks at the cars ahead from behind.
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: decal }));
  rear.position.set(-2.36, 0.78, 0); rear.rotation.y = -Math.PI / 2;
  g.add(rear);
  // Light bar: red + blue flashers
  part(new THREE.BoxGeometry(0.5, 0.16, 1.5), new THREE.MeshBasicMaterial({ color: 0xff2233 }), -0.35, 1.82, 0.4, g);
  part(new THREE.BoxGeometry(0.5, 0.16, 1.5), new THREE.MeshBasicMaterial({ color: 0x2266ff }), -0.35, 1.82, -0.4, g);
  // White doors
  part(new THREE.BoxGeometry(1.7, 0.5, 0.06), std(0xf4f6f8, 0.4, 0.3), -0.2, 0.6, 1.01, g);
  part(new THREE.BoxGeometry(1.7, 0.5, 0.06), std(0xf4f6f8, 0.4, 0.3), -0.2, 0.6, -1.01, g);
  return g;
}

export function buildTrafficCar(color) {
  const g = buildHeroCar(color);
  return g;
}

export function buildTank() {
  const g = new THREE.Group();
  const olive = std(0x4a5230, 0.8, 0.2);
  part(new THREE.BoxGeometry(5.2, 1.0, 2.8), olive, 0, 0.7, 0, g);
  part(new THREE.BoxGeometry(2.6, 0.8, 2.0), olive, -0.3, 1.55, 0, g);
  const barrel = part(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 10), std(0x2a2e22, 0.6, 0.4), 2.6, 1.6, 0, g);
  barrel.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const track = part(new THREE.BoxGeometry(5.4, 0.7, 0.7), std(0x1c1e18, 0.9, 0.1), 0, 0.35, s * 1.25, g);
    track.castShadow = true;
  }
  // KPD star decal on the turret side
  const star = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xffd23d }));
  star.position.set(-0.3, 1.6, 1.06); g.add(star);
  g.userData.length = 5.6;
  return g;
}

export function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = std(0xdfe6ec, 0.4, 0.4); // light KPD airframe — reads against the sky
  // Rounded fuselage (capsule-ish: sphere scaled + cylinder)
  const fus = part(new THREE.SphereGeometry(1.6, 16, 12), bodyMat, 0, 0, 0, g);
  fus.scale.set(1.5, 1, 1);
  const glass = part(new THREE.SphereGeometry(1.1, 12, 8), std(0x9fd8ef, 0.1, 0.8), 1.9, 0.2, 0, g);
  glass.scale.set(1, 0.8, 0.9);
  const tail = part(new THREE.CylinderGeometry(0.28, 0.5, 4.6, 8), bodyMat, -3.4, 0.3, 0, g);
  tail.rotation.z = Math.PI / 2 - 0.12;
  const fin = part(new THREE.BoxGeometry(0.9, 1.6, 0.18), bodyMat, -5.4, 0.9, 0, g);
  // Main rotor (spins) + tail rotor
  const rotor = new THREE.Group(); rotor.position.y = 1.5;
  for (const a of [0, Math.PI / 2]) {
    const blade = part(new THREE.BoxGeometry(7.5, 0.08, 0.5), std(0x222222, 0.5, 0.4), 0, 0, 0, rotor);
    blade.rotation.y = a;
  }
  g.add(rotor); g.userData.rotor = rotor;
  const tailRotor = new THREE.Group(); tailRotor.position.set(-5.5, 0.7, 0.35);
  for (const a of [0, Math.PI / 2]) {
    const b = part(new THREE.BoxGeometry(0.12, 1.8, 0.3), std(0x222222, 0.5, 0.4), 0, 0, 0, tailRotor);
    b.rotation.z = a;
  }
  g.add(tailRotor); g.userData.tailRotor = tailRotor;
  // Skids
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(3.4, 0.1, 0.14), std(0x333333, 0.5, 0.6), 0.3, -1.5, s * 0.9, g);
  // POLICE belly decal + searchlight cone (translucent, points at the hero)
  const decal = policeDecalTexture();
  const belly = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: decal }));
  belly.rotation.x = Math.PI / 2; belly.position.set(0, -1.35, 0); g.add(belly);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 16, 20, 1, true), coneMat);
  cone.position.set(2, -9, 0); cone.rotation.z = Math.PI; // apex up at the heli, wide end down
  g.add(cone); g.userData.spotCone = cone;
  // Spotlight lamp
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  lamp.position.set(1.6, -1.4, 0); g.add(lamp);
  return g;
}

// Arcade vehicle: position, heading, speed; steering scales with speed.
export class Vehicle {
  constructor(mesh, def) {
    this.mesh = mesh; this.def = def;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.heading = 0; this.speed = 0; this.steer = 0;
    this.condition = 100; // 100 = clean, lower = dented
  }
  place(x, z, heading) {
    this.pos.set(x, 0, z); this.heading = heading; this.sync();
  }
  sync() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading; // model faces +X at heading 0
  }
  update(dt, input) {
    const accel = input.throttle ? this.def.accel : 0;
    const brake = input.brake ? 34 : 0;
    this.speed += (accel - brake) * dt;
    if (!input.throttle) this.speed -= Math.sign(this.speed) * 8 * dt;
    if (Math.abs(this.speed) < 0.2 && !input.throttle) this.speed = 0;
    this.speed = Math.max(-12, Math.min(this.def.topSpeed, this.speed));
    const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const turnRate = this.steer * this.def.handling * 1.9 * Math.min(1, Math.abs(this.speed) / 14);
    this.heading += turnRate * dt * Math.sign(this.speed || 1);
    this.pos.x += Math.cos(this.heading) * this.speed * dt;
    this.pos.z -= Math.sin(this.heading) * this.speed * dt;
    this.sync();
    return this.speed;
  }
  damage(amount) { this.condition = Math.max(0, this.condition - amount); }
}

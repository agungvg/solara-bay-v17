// Combat: 6 weapons with ammo, tracers, hit feedback and enemy AI.
// Hits use authored volumes (distance + facing), never mesh raycasts for gameplay.
import * as THREE from 'three';
import { WEAPONS } from './config.js';

export class WeaponSystem {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio;
    this.weapons = WEAPONS.map((w) => ({ ...w, ammo: w.ammo, reserve: w.reserve }));
    this.current = 1; // P9 PISTOL
    this.cooldown = 0;
    this.tracers = [];
    this.enemies = []; // {pos, health, mesh, down}
    this.shotsFired = 0; this.hits = 0;
  }
  currentWeapon() { return this.weapons[this.current]; }
  select(i) {
    if (i >= 0 && i < this.weapons.length) { this.current = i; return true; }
    return false;
  }
  cycle(dir = 1) { this.current = (this.current + dir + this.weapons.length) % this.weapons.length; }
  canFire() { return this.cooldown <= 0 && this.currentWeapon().ammo !== 0; }
  fire(from, dir) {
    const w = this.currentWeapon();
    if (this.cooldown > 0) return null;
    if (w.ammo === 0) return { fail: 'NO AMMO — press R to reload' };
    this.cooldown = w.rate;
    if (w.ammo !== Infinity) w.ammo -= 1;
    this.shotsFired += 1;
    this.audio.gunshot();
    // Tracer: bright line from muzzle toward the shot direction.
    const end = from.clone().addScaledVector(dir, w.range);
    const geo = new THREE.BufferGeometry().setFromPoints([from, end]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
    // Hit test against enemies inside the authored cone.
    let hit = null;
    for (const e of this.enemies) {
      if (e.down) continue;
      const to = e.pos.clone().sub(from);
      const d = to.length();
      if (d > w.range) continue;
      const ang = to.normalize().angleTo(dir);
      if (ang < 0.12 + (w.id === 'shotgun' ? 0.16 : 0)) {
        e.health -= w.damage;
        this.hits += 1;
        hit = e;
        if (e.health <= 0) { e.down = true; if (e.onDown) e.onDown(e); }
        break;
      }
    }
    return { hit: !!hit, enemy: hit };
  }
  reload() {
    const w = this.currentWeapon();
    if (w.ammo === Infinity || w.reserve === 0) return false;
    const need = (w.id === 'pistol' ? 12 : w.id === 'smg' ? 32 : w.id === 'shotgun' ? 8 : w.id === 'rifle' ? 30 : 5) - w.ammo;
    const take = Math.min(need, w.reserve);
    w.ammo += take; w.reserve -= take;
    return true;
  }
  addEnemy(pos, mesh, health = 100, onDown = null) {
    const e = { pos, health, mesh, down: false, onDown };
    this.enemies.push(e);
    return e;
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.9;
      if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); this.tracers.splice(i, 1); }
    }
  }
  accuracy() { return this.shotsFired ? Math.round((this.hits / this.shotsFired) * 100) : 0; }
}

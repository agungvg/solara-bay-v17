// Sky system: gradient dome shader + one sun + Tier-2 billboard clouds.
// One time-of-day parameter drives dome, fog, light and cloud tint together.
// Rule: fog colour === horizon colour, always.
import * as THREE from 'three';
import { mulberry32, range } from './rng.js';

export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.clouds = [];
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.near = 1; c.far = 320;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbbddff, 0x554433, 0.9);
    scene.add(this.hemi);

    // Gradient dome: zenith -> mid -> horizon + sun glow disc.
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x2f7fe0) },
      midColor: { value: new THREE.Color(0x7ec3f2) },
      botColor: { value: new THREE.Color(0xbfe3f7) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xfff6d8) },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 topColor, midColor, botColor, sunColor; uniform vec3 sunDir; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, -0.08, 1.0);
          vec3 col = h > 0.45 ? mix(midColor, topColor, (h-0.45)/0.55) : mix(botColor, midColor, h/0.45);
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 220.0) * 1.4 + pow(s, 10.0) * 0.28);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 18), skyMat);
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    scene.fog = new THREE.Fog(0xbfe3f7, 140, 620);
    this.buildClouds();
  }

  buildClouds() {
    // Tier-2 billboard clouds: flattened sphere clusters on two drift layers.
    // Big fluffy white puffs by day; pink-tinted undersides at sunset (tint set by preset).
    const rng = mulberry32(90210);
    const puffGeo = new THREE.SphereGeometry(1, 12, 8);
    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? 9 : 7;
      for (let i = 0; i < count; i++) {
        const group = new THREE.Group();
        const puffs = 4 + Math.floor(rng() * 3);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true, transparent: true, opacity: layer === 0 ? 0.92 : 0.75 });
        for (let p = 0; p < puffs; p++) {
          const m = new THREE.Mesh(puffGeo, mat);
          m.position.set(range(rng, -14, 14), range(rng, -1.5, 2.5), range(rng, -6, 6));
          m.scale.set(range(rng, 7, 13), range(rng, 3, 5.5), range(rng, 6, 9));
          group.add(m);
        }
        group.position.set(range(rng, -380, 380), layer === 0 ? range(rng, 95, 130) : range(rng, 140, 185), range(rng, -380, 380));
        group.userData.speed = layer === 0 ? 1.6 : 0.9;
        group.userData.mat = mat;
        this.clouds.push(group);
        this.scene.add(group);
      }
    }
  }

  applyPreset(p) {
    const elev = p.sunElev * Math.PI / 180, azim = p.sunAzim * Math.PI / 180;
    this.sunDir.set(Math.cos(elev) * Math.sin(azim), Math.sin(elev), Math.cos(elev) * Math.cos(azim)).normalize();
    this.sun.position.copy(this.sunDir).multiplyScalar(180);
    this.sun.target.position.set(0, 0, 0);
    this.sun.color.setHex(p.sunColor); this.sun.intensity = p.sunI;
    this.hemi.intensity = p.hemiI;
    this.skyUniforms.topColor.value.setHex(p.zenith);
    this.skyUniforms.midColor.value.setHex(p.mid);
    this.skyUniforms.botColor.value.setHex(p.horizon);
    this.skyUniforms.sunDir.value.copy(this.sunDir);
    this.skyUniforms.sunColor.value.setHex(p.sunColor);
    this.scene.fog.color.setHex(p.fog);
    this.scene.background = null;
    this.renderer.toneMappingExposure = p.exposure;
    for (const g of this.clouds) g.userData.mat.color.setHex(p.cloudTint);
    this.preset = p;
  }

  update(dt, t) {
    // Slow drift with wrap-around; never regenerate.
    for (const g of this.clouds) {
      g.position.x += g.userData.speed * dt;
      if (g.position.x > 420) g.position.x = -420;
    }
    this.dome.position.set(0, 0, 0);
  }
}

// World builder: the city of Solara Bay — beachfront boulevard, ocean + marina,
// Ferris wheel pier, Old Town market, 8 districts of buildings, palms, neon.
// All geometry is procedural; textures are canvas-drawn (see textures.js).
import * as THREE from 'three';
import { mulberry32, range, pick } from './rng.js';
import { DISTRICTS, WORLD_SEED } from './config.js';
import { roadTexture, buildingTexture, sandTexture, waterTexture, signTexture, neonSignTexture, plazaTexture } from './textures.js';

const PALETTE = ['#e8e8e8', '#f2c94c', '#e88a5a', '#7ec3f2', '#ff9a8a', '#c9b8ff', '#8fd6a0'];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(WORLD_SEED);
    this.colliders = [];
    this.yacht = null; this.ferrisWheel = null; this.marketStalls = [];
    this.fruitSign = null; this.heliPad = new THREE.Vector3(0, 0, 0);
    this.buildGround(); this.buildOcean(); this.buildRoads();
    this.buildBuildings(); this.buildPalms(); this.buildMarket();
    this.buildMarina(); this.buildFerrisWheel(); this.buildProps();
  }

  mat(color, rough = 0.85, metal = 0.0) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  }
  box(w, h, d, color, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || this.mat(color, opts.rough ?? 0.85, opts.metal ?? 0));
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    (opts.parent || this.scene).add(m);
    return m;
  }

  buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), this.mat(0x4a5d3a, 1));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -40);
    ground.receiveShadow = true; this.scene.add(ground);
    // City slab (asphalt-grey base under the blocks)
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(380, 300), this.mat(0x55585e, 1));
    slab.rotation.x = -Math.PI / 2; slab.position.set(0, 0, -30);
    slab.receiveShadow = true; this.scene.add(slab);
    // Beach sand strip along the boulevard
    const sandTex = sandTexture(); sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(10, 2);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(380, 26), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 56); sand.receiveShadow = true;
    this.scene.add(sand);
  }

  buildOcean() {
    const tex = waterTexture(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 6);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(560, 260), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.15 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, 200); sea.receiveShadow = true;
    this.scene.add(sea);
    // Foam edge where waves meet the sand
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(380, 2.5), this.mat(0xf4fbff, 0.4));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.05, 69.5); this.scene.add(foam);
  }

  buildRoads() {
    const tex = roadTexture(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const road = (w, l, x, z, ry = 0) => {
      const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(l / 16)));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.06, z); m.receiveShadow = true;
      this.scene.add(m);
    };
    road(14, 380, 0, 40);        // beachfront boulevard (east-west along the sand)
    road(12, 300, 0, -60);       // sunset strip highway
    road(10, 260, -60, -30);     // north-south avenue, west
    road(10, 260, 60, -30);      // north-south avenue, east
    road(10, 200, 0, -30, 0);    // central cross street (rotated below)
    // central cross street needs a 90-degree turn: rebuild as a long slab
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(200, 10), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    cross.rotation.x = -Math.PI / 2; cross.position.set(0, 0.06, -30); cross.receiveShadow = true;
    this.scene.add(cross);
    // Sidewalks along the boulevard
    this.box(380, 0.3, 3, 0xb8b0a0, 0, 0.15, 46.5, { cast: false });
    this.box(380, 0.3, 3, 0xb8b0a0, 0, 0.15, 33.5, { cast: false });
  }

  buildBuildings() {
    const rng = this.rng;
    // District blocks: grid of towers with varied heights, colours and lit windows.
    for (const d of DISTRICTS) {
      const count = d.id === 'vice-point' ? 7 : 5;
      for (let i = 0; i < count; i++) {
        const w = range(rng, 10, 18), dep = range(rng, 10, 16);
        const h = d.id === 'vice-point' ? range(rng, 34, 68) : range(rng, 12, 34);
        const x = d.x + range(rng, -28, 28), z = d.z + range(rng, -22, 22);
        if (Math.abs(z - 40) < 12 || Math.abs(z + 60) < 9) continue; // keep roads clear
        if (z > 48) continue; // keep the beach + sand clear so the ocean reads
        const tex = buildingTexture(pick(rng, PALETTE), rng() < 0.5);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
        m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true;
        this.scene.add(m);
        this.colliders.push({ x, z, r: Math.max(w, dep) * 0.7 });
        // Roof plant / antenna on tall towers
        if (h > 40) this.box(1.2, 8, 1.2, 0x888888, x + w / 4, h + 4, z, { cast: false });
      }
    }
    // Downtown skyline silhouettes far north (depth + scale cue) — textured so
    // their shadowed sides never read as flat black slabs.
    for (let i = 0; i < 10; i++) {
      const h = range(rng, 50, 95);
      const tex = buildingTexture(pick(rng, ['#7a8ba8', '#8a7aa8', '#6a8a9a']), true);
      const m = new THREE.Mesh(new THREE.BoxGeometry(range(rng, 12, 20), h, range(rng, 12, 20)),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      m.position.set(-160 + i * 36 + range(rng, -6, 6), h / 2, -150 - range(rng, 0, 30));
      m.castShadow = false; this.scene.add(m);
    }
    // Neon signs on Neon Row facades
    const signs = [['CLUB NEON', '#ff4fd8', -8, 14, -24], ['ARCADE', '#3aa0ff', 18, 12, -24], ['HOTEL SOL', '#ffd23d', 34, 16, -36]];
    for (const [word, color, x, y, z] of signs) {
      const tex = neonSignTexture(word, color);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: tex }));
      s.position.set(x, y, z); this.scene.add(s);
    }
  }

  buildPalms() {
    const rng = this.rng;
    const trunkMat = this.mat(0x8a6a44, 1);
    const leafMat = this.mat(0x3fae5a, 0.9, 0);
    for (let i = 0; i < 46; i++) {
      const along = -180 + i * 8 + range(rng, -2, 2);
      const z = pick(rng, [31.5, 48.5]);
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 7), trunkMat);
      trunk.position.y = 3.5; trunk.rotation.z = range(rng, -0.08, 0.08); trunk.castShadow = true;
      g.add(trunk);
      for (let f = 0; f < 6; f++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), leafMat);
        leaf.position.set(Math.cos(f * 1.05) * 1.6, 7.2, Math.sin(f * 1.05) * 1.6);
        leaf.rotation.z = Math.cos(f * 1.05) * 1.1; leaf.rotation.x = -Math.sin(f * 1.05) * 1.1;
        leaf.castShadow = true; g.add(leaf);
      }
      g.position.set(along, 0, z);
      this.scene.add(g);
    }
  }

  buildMarket() {
    // Old Town fruit market: a plaza of stalls with striped awnings.
    const rng = mulberry32(4242);
    const plaza = { x: -40, z: -20 };
    const plazaTex = plazaTexture(); plazaTex.wrapS = plazaTex.wrapT = THREE.RepeatWrapping; plazaTex.repeat.set(6, 5);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(52, 40), new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(plaza.x, 0.08, plaza.z); ground.receiveShadow = true;
    this.scene.add(ground);
    const stallColors = ['#e84a3d', '#f2c94c', '#2fae5a', '#ff8a3d', '#3aa0ff'];
    for (let i = 0; i < 9; i++) {
      const sx = plaza.x - 18 + (i % 3) * 18 + range(rng, -2, 2);
      const sz = plaza.z - 12 + Math.floor(i / 3) * 13 + range(rng, -2, 2);
      const col = stallColors[i % stallColors.length];
      const g = new THREE.Group();
      this.box(5, 0.4, 3, 0x6a4a2a, 0, 1.0, 0, { parent: g });
      // striped awning
      const awn = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.15, 3.6), this.mat(col, 0.9));
      awn.position.y = 2.6; awn.rotation.x = 0.12; awn.castShadow = true; g.add(awn);
      this.box(0.18, 2.6, 0.18, 0x444444, -2.5, 1.3, -1.5, { parent: g, cast: false });
      this.box(0.18, 2.6, 0.18, 0x444444, 2.5, 1.3, -1.5, { parent: g, cast: false });
      // fruit crates: coloured spheres in a row
      for (let f = 0; f < 5; f++) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), this.mat(pick(rng, [0xff5a3d, 0xffd23d, 0x7ddb4f, 0xff8ac2]), 0.6));
        fruit.position.set(-1.8 + f * 0.9, 1.4, 0); fruit.castShadow = true; g.add(fruit);
      }
      g.position.set(sx, 0, sz); g.rotation.y = range(rng, -0.15, 0.15);
      this.scene.add(g);
      this.marketStalls.push(g);
    }
    // The FRUIT sign: huge, legible, one word, on the central stall facing the plaza.
    const tex = signTexture('FRUIT', { w: 1024, h: 320, bg: '#1d7a3a', fg: '#ffffff', sub: 'FRESH • MARKET • OLD TOWN', font: 170 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 4), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(plaza.x, 5.2, plaza.z - 6);
    sign.rotation.y = 0; // faces +z, toward the camera side of the plaza
    this.scene.add(sign);
    this.fruitSign = sign;
    // Two tall sign poles so the sign reads from the street too
    this.box(0.3, 5.2, 0.3, 0x333333, plaza.x - 6, 2.6, plaza.z - 6, { cast: false });
    this.box(0.3, 5.2, 0.3, 0x333333, plaza.x + 6, 2.6, plaza.z - 6, { cast: false });
  }

  buildMarina() {
    // Wooden pier + moored boats + the BIG yacht (hull fully visible, starboard side to the boulevard).
    const pier = this.box(60, 0.8, 6, 0x7a5a34, 30, 0.4, 68, { cast: false });
    pier.receiveShadow = true;
    for (let i = 0; i < 8; i++) this.box(0.4, 1.1, 0.4, 0x5a4028, 2 + i * 8, 0.5, 71.5, { cast: false });
    // The yacht: 16 m hull, white with a blue stripe, cabin, mast, radar — BIG and prominent.
    const y = new THREE.Group();
    const hullMat = this.mat(0xf4f6f8, 0.35, 0.25);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 4.6), hullMat);
    hull.position.y = 1.1; hull.castShadow = true; y.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.5, 4), hullMat);
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 1.9);
    bow.position.set(10, 1.1, 0); bow.castShadow = true; y.add(bow);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(16.1, 0.5, 4.7), this.mat(0x1e6fd8, 0.4, 0.3));
    stripe.position.y = 1.7; y.add(stripe);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 3.6), this.mat(0xffffff, 0.3, 0.2));
    cabin.position.set(-1, 3.3, 0); cabin.castShadow = true; y.add(cabin);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.9, 3.7), this.mat(0x182838, 0.15, 0.6));
    windows.position.set(-1, 3.5, 0); y.add(windows);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), this.mat(0xd8d8d8, 0.4, 0.5));
    mast.position.set(3.5, 7.5, 0); mast.castShadow = true; y.add(mast);
    const radar = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), this.mat(0xffffff, 0.3));
    radar.position.set(3.5, 12.2, 0); y.add(radar);
    // Sun deck + loungers
    this.box(4, 0.3, 3.4, 0xd8c9a0, -5.5, 2.4, 0, { parent: y, cast: false });
    y.position.set(38, -0.3, 96);
    y.rotation.y = -0.35; // starboard side angled toward the boulevard camera
    this.scene.add(y);
    this.yacht = y;
    // Two smaller boats for scale
    for (const [bx, bz, s] of [[8, 88, 0.6], [62, 84, 0.5]]) {
      const b = new THREE.Group();
      const bh = new THREE.Mesh(new THREE.BoxGeometry(9 * s, 1.4 * s, 3 * s), this.mat(0xe8e8e8, 0.4));
      bh.position.y = 0.7 * s; bh.castShadow = true; b.add(bh);
      const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6 * s, 6), this.mat(0xcccccc, 0.4));
      bm.position.y = 4 * s; b.add(bm);
      b.position.set(bx, -0.2, bz); b.rotation.y = 0.4;
      this.scene.add(b);
    }
  }

  buildFerrisWheel() {
    // The Solara Wheel: 36 m diameter, fully visible from the boulevard.
    const g = new THREE.Group();
    const rimMat = this.mat(0xff5a8a, 0.4, 0.4);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(18, 0.5, 10, 48), rimMat);
    rim.castShadow = true; g.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 40), this.mat(0xffd23d, 0.4, 0.4));
    g.add(rim2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 18, 6), this.mat(0xf4f6f8, 0.4, 0.5));
      spoke.position.set(Math.cos(a) * 9, Math.sin(a) * 9, 0);
      spoke.rotation.z = a + Math.PI / 2; g.add(spoke);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), this.mat(pick(this.rng, [0xff5a3d, 0x3aa0ff, 0xffd23d, 0x7ddb4f]), 0.5));
      cab.position.set(Math.cos(a) * 18, Math.sin(a) * 18, 0); cab.castShadow = true; g.add(cab);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.5, 12), this.mat(0xffffff, 0.3, 0.5));
    hub.rotation.x = Math.PI / 2; g.add(hub);
    // A-frame legs
    const legMat = this.mat(0xe8e8e8, 0.5, 0.3);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 22, 8), legMat);
      leg.position.set(s * 6, -9, 0); leg.rotation.z = s * 0.28; leg.castShadow = true; g.add(leg);
    }
    g.position.set(58, 20, 82);
    g.rotation.y = 2.6; // disc faces north-east, toward the boulevard cameras
    this.scene.add(g);
    this.ferrisWheel = g;
  }

  buildProps() {
    const rng = this.rng;
    // Streetlights along the boulevard
    for (let x = -170; x <= 170; x += 34) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 6), this.mat(0x2a2e33, 0.5, 0.6));
      pole.position.y = 4; pole.castShadow = true; g.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      lamp.position.y = 8.1; g.add(lamp);
      g.position.set(x, 0, 33);
      this.scene.add(g);
    }
    // Beach umbrellas + towels on the sand
    for (let i = 0; i < 10; i++) {
      const x = -150 + i * 32 + range(rng, -5, 5);
      const um = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8), this.mat(pick(rng, [0xff5a3d, 0xffd23d, 0x3aa0ff, 0xff8ac2]), 0.9));
      um.position.set(x, 2.6, 58 + range(rng, -2, 6)); um.castShadow = true; this.scene.add(um);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), this.mat(0x888888, 0.5));
      pole.position.set(x, 1.1, um.position.z); this.scene.add(pole);
    }
    // Traffic cones + barriers near the Sunset Strip roadblock zone
    for (let i = 0; i < 6; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 8), this.mat(0xff6a1a, 0.7));
      cone.position.set(-20 + i * 4, 0.55, -56 + (i % 2) * 3); cone.castShadow = true; this.scene.add(cone);
    }
  }
}

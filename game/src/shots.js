// Dossier shot staging: each shot is a fully staged, frozen frame of the live game.
// Cameras are placed so the yacht, police cars and heli sit INSIDE the frame and
// clear of the HUD panels (HUD lives in the screen corners; the action is centre-frame).
// Camera rule: the lookAt point sits on the camera->hero line extended, so the hero
// stays on-axis; the landmarks sit a few degrees either side of that line.
import * as THREE from 'three';
import { VEHICLE_DEFS } from './config.js';

// Place first, then enter — enterCar copies the car's position into the player.
function placeHero(game, x, z, heading, color, defIdx) {
  game.heroCar.def = VEHICLE_DEFS[defIdx];
  game.heroCar.place(x, z, heading);
  game.player.enterCar(game.heroCar, color);
}

export function stageShot(game, n) {
  const g = game;
  if (n === 1) return stageCover(g);
  if (n === 2) return stageFoot(g);
  if (n === 3) return stageChase(g);
  if (n === 4) return stageMeta(g);
  return null;
}

function stageCover(g) {
  // MISSION 6 "WRECK THE REGENT", 12:00, 111 KM/H, $18,450, wanted 4.
  // Noon base: bright blue sky, big fluffy white clouds, sun high.
  // Hero heads WEST down the beachfront; camera sits north-east, 3/4 rear.
  g.setPreset('noon');
  g.missions.start(6); g.missions.stageIdx = 1; // stage 2/4: ram the convoy escort
  g.cash = 18450; g.displaySpeedKmh = 111; g.missionTimerText = '0:23';
  g.wanted.setLevel(4, 'shot 1 staging');
  placeHero(g, 0, 40, Math.PI, 0xff6a1a, 0); // rounded ORANGE hero, heading west
  g.heroCar.condition = 62; // visibly dented — a chase car is never 98% clean
  g.heroCar.speed = 30.8;
  // Yacht + wheel pulled into the frame: BIG yacht (1.8x) close to the beach,
  // hull fully visible; wheel far left.
  g.world.yacht.scale.set(1.8, 1.8, 1.8);
  g.world.yacht.position.set(-20, -0.6, 76); g.world.yacht.rotation.y = -0.5;
  g.world.ferrisWheel.position.set(-62, 20, 80); g.world.ferrisWheel.rotation.y = 2.2;
  // Police cars AHEAD, close enough that POLICE reads (rear + flank + roof decals).
  g.wanted.stageUnits([[-10, 38.5, Math.PI], [-17, 43.5, Math.PI], [-30, 37, Math.PI], [-45, 44, Math.PI], [-58, 38, Math.PI], [16, 44, Math.PI]]);
  // Tank visible on the road ahead, right third of frame.
  g.tank.visible = true; g.tank.position.set(-16, 0, 36.5); g.tank.rotation.y = Math.PI;
  // Heli FULLY FRAMED: upper-centre, rotor clear of the top edge.
  g.wanted.stageHeli(-30, 25, 58);
  // Camera LOW, under the palm canopies (sightline passes beneath the fronds),
  // 3/4 rear of the hero, lookAt on the camera->hero line extended.
  g.setShotCamera(new THREE.Vector3(10, 4.5, 20), new THREE.Vector3(-16, 2, 58));
  g.hud.dialogue('UD', 'The Regent is running for the marina. Wreck his car — the tank is ours. Borrowed.', 9000);
  g.hud.toast('AIR UNIT DEPLOYED — KPD HELICOPTER OVERHEAD');
  return 'cover';
}

function stageFoot(g) {
  // MISSION 2 "COLLECT THE DROP", 14:30, $7,270, wanted 2 — Old Town market, on foot.
  g.setPreset('afternoon');
  g.missions.start(2); g.missions.stageIdx = 1; // stage 2/4: take out the lookout
  g.cash = 7270; g.displaySpeedKmh = null; g.missionTimerText = '1:47';
  g.wanted.setLevel(2, 'shot 2 staging');
  g.wanted.stageUnits([[-18, -34, 2.4], [-58, -8, 0.6]]);
  g.tank.visible = false;
  // Player on foot in the market plaza, facing the FRUIT sign; camera close behind
  // so the white jacket + red cap read as the player, not just another ped.
  g.player.exitCar(-40, -9, 0.4);
  // DENSE crowd: 22 varied peds across the plaza (heights/shirts/hats vary).
  g.crowd.spawnMarket(-40, -20, 22, 20240);
  // Downed enemy: unmistakable — lying flat in front of the player, red ring under him.
  const downed = g.crowd.peds[g.crowd.peds.length - 1];
  downed.knockDown();
  downed.group.position.set(-37.5, 0.25, -15);
  downed.group.rotation.y = 0.9;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 24), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(-37.5, 0.12, -15);
  g.scene.add(ring);
  g.combat.addEnemy(new THREE.Vector3(-37.5, 0, -15), downed.group, 0, null).down = true;
  g.enemiesDown = 1;
  // A standing lookout near the FRUIT stall.
  const lookout = g.crowd.peds[g.crowd.peds.length - 3];
  lookout.group.position.set(-44, 0, -24);
  g.combat.addEnemy(new THREE.Vector3(-44, 0, -24), lookout.group, 100, null);
  g.setShotCamera(new THREE.Vector3(-43, 2.6, -5), new THREE.Vector3(-40, 1.5, -20));
  g.hud.dialogue('UD', 'Package is under the FRUIT stall. Lookout is down — grab it and go.', 9000);
  g.hud.toast('HINT: DUCK BY A STALL TO HIDE');
  return 'foot';
}

function stageChase(g) {
  // MISSION 3 "OUTRUN THE SUNSET ROADBLOCK", 17:45, 110 KM/H, $12,860, wanted 3.
  // Golden hour: pink/orange sky WITH VISIBLE PINK CLOUDS, warm road, neon streaks.
  // Hero heads EAST on the Sunset Strip; camera sits north-west, 3/4 rear.
  g.setPreset('sunset');
  g.missions.start(3); g.missions.stageIdx = 1; // stage 2/3: break the roadblock
  g.cash = 12860; g.displaySpeedKmh = 110; g.missionTimerText = '0:45';
  g.wanted.setLevel(3, 'shot 3 staging');
  placeHero(g, 0, -60, 0, 0xd21f2b, 1); // rounded RED hero (COMET S)
  g.heroCar.condition = 68; // dented
  g.heroCar.speed = 30.5;
  // TWO POLICE cars legible AHEAD, close in (rear POLICE decals face the camera).
  g.wanted.stageUnits([[10, -58, 0], [17, -62.5, 0], [-24, -60, 0], [40, -57, 0]]);
  // Light heli + spotlight cone, fully framed upper-centre-right.
  g.wanted.stageHeli(26, 22, -48);
  // VISIBLE PINK CLOUDS: pull six cloud groups low and ahead, into the sky band.
  g.sky.clouds.forEach((c, i) => {
    if (i < 6) c.position.set(-40 + i * 30, 50 + (i % 3) * 7, -130 + (i % 2) * 30);
  });
  // Neon streaks along the warm road (never a black void).
  g.addNeonStreaks();
  // Wider 3/4 rear angle: camera closer, lower and further north of the road
  // so the hero reads as a rounded car, not a slab from directly behind.
  g.setShotCamera(new THREE.Vector3(-14, 4.5, -72), new THREE.Vector3(16, 2, -54));
  g.hud.dialogue('KK', 'Roadblock ahead on the Strip. Punch through — do not stop.', 9000);
  g.hud.toast('IN SIGHT — ROADBLOCK 120M');
  return 'chase';
}

function stageMeta(g) {
  // MAP/STATS: real 8-district map, 66.1% ring, tracks, ratings, stats, workshop, gear, save slot 1 FILLED.
  g.setPreset('noon');
  g.missions.start(6); g.missions.stageIdx = 2;
  g.cash = 21340; g.displaySpeedKmh = null; g.missionTimerText = '—';
  g.wanted.setLevel(0, 'shot 4 staging');
  g.tank.visible = false;
  placeHero(g, 0, 40, 0, 0xff6a1a, 0);
  g.heroCar.speed = 0;
  // High aerial camera behind the meta overlay so the city reads through the dim.
  g.setShotCamera(new THREE.Vector3(-60, 90, -40), new THREE.Vector3(20, 0, 10));
  g.hud.updateSaves(g.saves.slots);
  g.hud.showMeta(true);
  return 'meta';
}

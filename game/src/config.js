// Solara Bay — game configuration: districts, story missions, weapons, crew.
// Written in-session for Solara Bay v17. All names, numbers and story beats are original.
export const GAME_TITLE = 'SOLARA BAY';
export const GAME_SUBTITLE = 'GTA 6-style open-world crime — Vice City of the Leonida coast';
export const SAVE_KEY = 'solara-bay-v17-saves';
export const WORLD_SEED = 170624;

export const DISTRICTS = [
  { id: 'coral-bay', name: 'CORAL BAY', x: -90, z: 60, color: '#2fb7c9', friendly: 82, desc: 'Beachfront boulevard, marina and the big wheel.' },
  { id: 'marina', name: 'MARINA DISTRICT', x: 30, z: 70, color: '#3aa0ff', friendly: 64, desc: 'Yachts, docks and the Regent\'s mooring.' },
  { id: 'old-town', name: 'OLD TOWN', x: -95, z: -40, color: '#e8a33d', friendly: 71, desc: 'Brick lanes, the fruit market and old money.' },
  { id: 'neon-row', name: 'NEON ROW', x: 10, z: -30, color: '#ff4fd8', friendly: 58, desc: 'Clubs, arcades and all-night neon.' },
  { id: 'palm-heights', name: 'PALM HEIGHTS', x: 95, z: -55, color: '#7ddb4f', friendly: 77, desc: 'Hillside villas above the sunset road.' },
  { id: 'docks', name: 'THE DOCKS', x: 110, z: 45, color: '#9a8cff', friendly: 41, desc: 'Cranes, containers and quiet deals.' },
  { id: 'sunset-strip', name: 'SUNSET STRIP', x: -30, z: -95, color: '#ff7a3d', friendly: 66, desc: 'The long straight where roadblocks are set.' },
  { id: 'vice-point', name: 'VICE POINT', x: 60, z: -100, color: '#ffd23d', friendly: 49, desc: 'Downtown towers and the KPD precinct.' },
];

// 8 story missions. Each mission is a list of staged objectives plus a payout.
// Stages drive the HUD mission card, the minimap marker and the autopilot.
export const MISSIONS = [
  {
    id: 1, name: 'FIRST WHEELS', time: '09:15', cash: 1200, wanted: 1,
    intro: 'MK: Fresh off the bus, kid. Steal something with four wheels and bring it to the drop.',
    stages: [
      { text: 'Steal a car', kind: 'steal' },
      { text: 'Drive to the Coral Bay drop-off', kind: 'drive' },
      { text: 'Park inside the marker', kind: 'park' },
    ],
  },
  {
    id: 2, name: 'COLLECT THE DROP', time: '14:30', cash: 7270, wanted: 2,
    intro: 'UD: Package is under the FRUIT stall, Old Town market. Cops are already sniffing around.',
    stages: [
      { text: 'Reach the Old Town market on foot', kind: 'goto' },
      { text: 'Take out the lookout', kind: 'combat' },
      { text: 'Collect the drop', kind: 'collect' },
      { text: 'Lose the heat and get clear', kind: 'escape' },
    ],
  },
  {
    id: 3, name: 'OUTRUN THE SUNSET ROADBLOCK', time: '17:45', cash: 12860, wanted: 3,
    intro: 'KK: KPD set a roadblock on the Strip at sunset. Punch through it — do not stop.',
    stages: [
      { text: 'Reach the Sunset Strip', kind: 'drive' },
      { text: 'Break the roadblock', kind: 'chase' },
      { text: 'Outrun the pursuit (0:45)', kind: 'escape' },
    ],
  },
  {
    id: 4, name: 'HARBOR LIGHTS', time: '21:20', cash: 14500, wanted: 3,
    intro: 'LO: The Regent\'s yacht is moored at the marina. Board it, crack the safe, swim if you must.',
    stages: [
      { text: 'Reach the marina pier', kind: 'drive' },
      { text: 'Board the yacht', kind: 'goto' },
      { text: 'Crack the safe', kind: 'collect' },
      { text: 'Escape by boat or by road', kind: 'escape' },
    ],
  },
  {
    id: 5, name: 'NEON REIGN', time: '23:05', cash: 15200, wanted: 2,
    intro: 'MK: Street race through Neon Row. Three laps, no rules, winner takes the pot.',
    stages: [
      { text: 'Reach the Neon Row start line', kind: 'drive' },
      { text: 'Win the race — lap 1/3', kind: 'race' },
      { text: 'Win the race — lap 2/3', kind: 'race' },
      { text: 'Win the race — lap 3/3', kind: 'race' },
    ],
  },
  {
    id: 6, name: 'WRECK THE REGENT', time: '12:00', cash: 18450, wanted: 4,
    intro: 'UD: The Regent is fleeing down the beachfront in his armoured convoy. Wreck his car. The tank is ours — borrowed.',
    stages: [
      { text: 'Chase the Regent down the beachfront', kind: 'chase' },
      { text: 'Ram the convoy escort', kind: 'combat' },
      { text: 'Wreck the Regent\'s car', kind: 'wreck' },
      { text: 'Escape the air unit', kind: 'escape' },
    ],
  },
  {
    id: 7, name: 'THE LONG CON', time: '16:40', cash: 18400, wanted: 3,
    intro: 'KK: Three jobs, one afternoon. A forgery, a swap, a clean getaway. Do not improvise.',
    stages: [
      { text: 'Pick up the forged papers', kind: 'collect' },
      { text: 'Swap the case at the Docks', kind: 'goto' },
      { text: 'Getaway before the alarm', kind: 'escape' },
    ],
  },
  {
    id: 8, name: 'KING OF SOLARA BAY', time: '19:30', cash: 32000, wanted: 5,
    intro: 'LO: Tonight the whole city watches. Take the crown run — every crew, every cop, one road.',
    stages: [
      { text: 'Rally the crew at Vice Point', kind: 'goto' },
      { text: 'Run the crown gauntlet', kind: 'chase' },
      { text: 'Reach the Coral Bay finish', kind: 'drive' },
      { text: 'Become King of Solara Bay', kind: 'park' },
    ],
  },
];

export const WEAPONS = [
  { id: 'fists', name: 'FISTS', damage: 12, ammo: Infinity, reserve: Infinity, range: 2.2, rate: 0.45, color: '#e8e8e8' },
  { id: 'pistol', name: 'P9 PISTOL', damage: 25, ammo: 12, reserve: 96, range: 42, rate: 0.28, color: '#ffd23d' },
  { id: 'smg', name: 'VK SMG', damage: 16, ammo: 32, reserve: 160, range: 36, rate: 0.09, color: '#ff9a3d' },
  { id: 'shotgun', name: 'RIOT SHOTGUN', damage: 22, ammo: 8, reserve: 40, range: 20, rate: 0.9, color: '#ff5a3d' },
  { id: 'rifle', name: 'AR-77 RIFLE', damage: 34, ammo: 30, reserve: 150, range: 70, rate: 0.13, color: '#7ddb4f' },
  { id: 'sniper', name: 'LONGSHOT SNIPER', damage: 95, ammo: 5, reserve: 20, range: 120, rate: 1.4, color: '#3aa0ff' },
];

export const CREW = [
  { id: 'pilar', initials: 'PL', name: 'PILAR', role: 'GETAWAY DRIVER', ability: 'PILAR GETAWAY', skill: 'Ramming speed +25%, escape timer -20%' },
  { id: 'dee', initials: 'DE', name: 'DEE', role: 'HACKER', ability: 'DEE ON 25S', skill: 'Disables roadblock cameras, wanted decays faster' },
  { id: 'juno', initials: 'JN', name: 'JUNO', role: 'MUSCLE', ability: 'JUNO 30S', skill: 'Melee damage x2, carries the heavy bag' },
];

export const WANTED_LEVELS = [
  { level: 0, label: 'CLEAN', units: 0, desc: 'No heat. KPD patrols ignore you.' },
  { level: 1, label: 'NOTICED', units: 1, desc: 'One patrol unit takes an interest.' },
  { level: 2, label: 'CHASED', units: 2, desc: 'Patrol cars pursue on sight.' },
  { level: 3, label: 'HUNTED', units: 4, desc: 'Roadblocks, spike strips, air unit on standby.' },
  { level: 4, label: 'AIR UNIT', units: 6, desc: 'Helicopter deployed, KPD roadblocks everywhere.' },
  { level: 5, label: 'LOCKDOWN', units: 8, desc: 'Full lockdown. Tank support. No way out but speed.' },
];

export const VEHICLE_DEFS = [
  { id: 'regent-gt', name: 'REGENT GT', color: 0xff6a1a, topSpeed: 62, accel: 26, handling: 1.0 },
  { id: 'comet-s', name: 'COMET S', color: 0xd21f2b, topSpeed: 58, accel: 24, handling: 1.05 },
  { id: 'solara-x', name: 'SOLARA X', color: 0x2fb7c9, topSpeed: 54, accel: 22, handling: 1.1 },
  { id: 'kpd-interceptor', name: 'KPD INTERCEPTOR', color: 0x111418, topSpeed: 56, accel: 25, handling: 1.0 },
  { id: 'taxi', name: 'CABRIO TAXI', color: 0xffd23d, topSpeed: 44, accel: 16, handling: 0.9 },
  { id: 'scooter', name: 'VESPA SCOOTER', color: 0x9a8cff, topSpeed: 30, accel: 18, handling: 1.3 },
];

// Progress tracks shown on the MAP/STATS screen.
export const PROGRESS_TRACKS = [
  { id: 'story', label: 'STORY MISSIONS', done: 5, total: 8 },
  { id: 'races', label: 'STREET RACES', done: 7, total: 12 },
  { id: 'stunts', label: 'STUNT JUMPS', done: 11, total: 20 },
  { id: 'collect', label: 'COLLECTIBLES', done: 23, total: 50 },
  { id: 'export', label: 'EXPORT LIST', done: 4, total: 10 },
  { id: 'jobs', label: 'DISTRICT JOBS', done: 9, total: 16 },
  { id: 'friendly', label: 'DISTRICTS FRIENDLY', done: 5, total: 8 },
  { id: 'crew', label: 'CREW RECRUITED', done: 3, total: 3 },
];

export const CAREER_STATS = {
  carsStolen: 47, copsEscaped: 23, highestWanted: 5, distanceDrivenKm: 312.4,
  peopleTakenOut: 86, longestJumpM: 41.2, playtimeH: 18.6, headshots: 19,
};

export const MISSION_RATINGS = ['S', 'G', 'G', 'B', 'S', '—', '—', '—'];

export const DAY_PRESETS = {
  noon: { time: '12:00', sunElev: 62, sunAzim: 200, zenith: 0x2f7fe0, mid: 0x7ec3f2, horizon: 0xbfe3f7, fog: 0xbfe3f7, sunColor: 0xffffff, sunI: 2.8, hemiI: 1.0, exposure: 1.0, cloudTint: 0xffffff },
  afternoon: { time: '14:30', sunElev: 48, sunAzim: 230, zenith: 0x2a78d8, mid: 0x6fb6ee, horizon: 0xcfe8f5, fog: 0xcfe8f5, sunColor: 0xfff2d8, sunI: 2.6, hemiI: 1.0, exposure: 1.0, cloudTint: 0xffffff },
  sunset: { time: '17:45', sunElev: 9, sunAzim: 265, zenith: 0x4a2a6e, mid: 0xc65a7a, horizon: 0xff9a52, fog: 0xff9a52, sunColor: 0xffb36b, sunI: 2.4, hemiI: 0.8, exposure: 1.12, cloudTint: 0xffc2d6 },
};

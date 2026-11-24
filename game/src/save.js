// Save system: 3 slots in localStorage. Slot 1 ships with a mid-career
// "continue" save so the MAP/STATS screen shows a FILLED slot on first boot.
import { SAVE_KEY } from './config.js';

export const DEFAULT_SLOT_1 = {
  slot: 1, label: 'SAVE SLOT 1', mission: 6, missionName: 'WRECK THE REGENT',
  cash: 21340, completion: 66.1, playtimeH: 18.6, savedAt: 'TUE 24 NOV 11:02',
};

export class SaveSystem {
  constructor() {
    this.slots = [null, null, null];
    this.loadAll();
    if (!this.slots[0]) {
      this.slots[0] = { ...DEFAULT_SLOT_1 };
      this.persist();
    }
  }
  loadAll() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) this.slots = [arr[0] || null, arr[1] || null, arr[2] || null];
      }
    } catch (e) { /* storage unavailable — slots stay in memory */ }
  }
  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.slots)); } catch (e) { /* ignore */ }
  }
  save(slotIdx, data) {
    this.slots[slotIdx] = { slot: slotIdx + 1, ...data, savedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() };
    this.persist();
    return this.slots[slotIdx];
  }
  load(slotIdx) { return this.slots[slotIdx]; }
  filledCount() { return this.slots.filter(Boolean).length; }
}

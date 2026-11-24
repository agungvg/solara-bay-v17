// Canvas-generated textures: signage, decals, road and facade variation.
// No downloaded assets — every texture is drawn in code at boot.
import * as THREE from 'three';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Big bold word on a coloured board — used for shop signs, POLICE decals, billboards.
export function signTexture(word, { w = 512, h = 256, bg = '#1d7a3a', fg = '#ffffff', sub = '', font = 120 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${font}px Arial, sans-serif`;
    g.fillText(word, w / 2, sub ? h / 2 - 28 : h / 2);
    if (sub) { g.font = `700 44px Arial, sans-serif`; g.fillText(sub, w / 2, h / 2 + 62); }
  });
}

export function policeDecalTexture() {
  // White POLICE word on black — readable at a glance from the chase camera.
  return canvasTex(512, 128, (g) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 84px Arial, sans-serif';
    g.fillText('POLICE', 256, 64);
  });
}

export function roadTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#33363d'; g.fillRect(0, 0, w, h);
    // asphalt speckle
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // centre dashes (tile repeats along the road)
    g.fillStyle = '#ffd23d'; g.fillRect(w / 2 - 4, 20, 8, 90);
    // edge lines
    g.fillStyle = '#e8e8e8'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
  });
}

export function buildingTexture(base, lit) {
  // Facade with a window grid; some windows lit warm.
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 14; y < h - 20; y += 34) {
      for (let x = 14; x < w - 20; x += 30) {
        const warm = Math.random() < (lit ? 0.55 : 0.35);
        g.fillStyle = warm ? '#ffd98a' : '#3a4256';
        g.fillRect(x, y, 20, 22);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x, y, 20, 3);
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 12, w, 12);
  });
}

export function sandTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e8cf9e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(180,140,80,0.25)' : 'rgba(255,245,210,0.3)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

export function waterTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1e7fa8'); grad.addColorStop(1, '#0d4f73');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * h, x = Math.random() * w, len = 20 + Math.random() * 60;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    }
  });
}

export function plazaTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#a8946e' : '#c2b28e';
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = 'rgba(0,0,0,0.06)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

export function neonSignTexture(word, color) {
  return canvasTex(512, 128, (g) => {
    g.fillStyle = '#0d0a14'; g.fillRect(0, 0, 512, 128);
    g.shadowColor = color; g.shadowBlur = 26;
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 72px Arial, sans-serif';
    g.fillText(word, 256, 64);
    g.shadowBlur = 0;
    g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(6, 6, 500, 116);
  });
}

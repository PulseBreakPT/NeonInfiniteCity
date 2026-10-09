import * as THREE from 'three';
import { CityWorld } from './world/CityWorld.js';
import { FlightControls } from './engine/FlightControls.js';
import { Atmosphere } from './engine/Atmosphere.js';
import { BLOCK, CHUNK_SIZE, buildingAt, districtAt, nearestBeacon } from './world/procedural.js';
import { loadSave, saveGame, freshSave } from './game/save.js';

const $ = id => document.getElementById(id);
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth <= 700;
const app = {
  state: loadSave(), started: false, paused: false, night: true, rain: false,
  quality: !mobile, fps: 0, frames: 0, frameTime: 0, lastUI: 0,
  streak: 0, lastCollect: 0, toastTimer: 0
};
const collected = new Set(app.state.collected);
let camera, renderer, scene, world, controls, atmosphere;
let soundContext = null;

function notify(message, ms = 2900) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => node.classList.remove('visible'), ms);
}

function soundSuccess() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!soundContext) soundContext = new Audio();
    if (soundContext.state === 'suspended') soundContext.resume();
    const now = soundContext.currentTime;
    [520, 780, 1040].forEach((freq, i) => {
      const osc = soundContext.createOscillator();
      const gain = soundContext.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.065, now + i * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.24);
      osc.connect(gain).connect(soundContext.destination);
      osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.25);
    });
  } catch { /* Audio is optional. */ }
}

function collectSignal(target) {
  if (!world.collect(target.id)) return;
  collected.add(target.id);
  app.state.collected.push(target.id);
  const seconds = performance.now() / 1000;
  app.streak = (seconds - app.lastCollect < 80) ? app.streak + 1 : 1;
  app.lastCollect = seconds;
  const multiplier = Math.min(5, 1 + Math.floor((app.streak - 1) / 3));
  const earned = 150 * multiplier;
  app.state.score += earned;
  app.state.bestCombo = Math.max(app.state.bestCombo, multiplier);
  saveGame(app.state);
  soundSuccess();
  notify(`SINAL RECUPERADO  +${earned} PONTOS  /  COMBO x${multiplier}`, 3500);
  updateHUD(0);
}

function radarDraw(beacon) {
  const cvs = $('minimap');
  const ctx = cvs.getContext('2d');
  if (!ctx) return;
  const w = cvs.width, h = cvs.height, cx = w / 2, cz = h / 2;
  const size = 0.34; // world metres to minimap pixels
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0c141e'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(cx, cz);
  ctx.strokeStyle = 'rgba(255,117,87,.08)'; ctx.lineWidth = 1;
  for (const radius of [26, 54, 82]) { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); }
  const currentX = Math.floor(camera.position.x / BLOCK), currentZ = Math.floor(camera.position.z / BLOCK);
  for (let gx = currentX - 6; gx <= currentX + 6; gx++) {
    for (let gz = currentZ - 6; gz <= currentZ + 6; gz++) {
      const x = ((gx + 0.5) * BLOCK - camera.position.x) * size;
      const y = ((gz + 0.5) * BLOCK - camera.position.z) * size;
      if (Math.abs(x) > w * 0.65 || Math.abs(y) > h * 0.65) continue;
      const b = buildingAt(gx, gz, app.state.seed);
      ctx.fillStyle = b ? '#3a4251' : '#17433e';
      const bw = (b?.width ?? 33) * size, bh = (b?.depth ?? 33) * size;
      ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
      if (b?.height > 120) { ctx.strokeStyle = '#885348'; ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh); }
    }
  }
  if (beacon) {
    const bx = (beacon.x - camera.position.x) * size, bz = (beacon.z - camera.position.z) * size;
    if (Math.hypot(bx, bz) < w * 0.75) {
      ctx.fillStyle = '#ff6653'; ctx.shadowColor = '#ff6653'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(bx, bz, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  ctx.strokeStyle = 'rgba(151,201,235,.18)';
  ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(w, 0); ctx.moveTo(0, -h); ctx.lineTo(0, h); ctx.stroke();
  ctx.rotate(-controls.yaw);
  ctx.fillStyle = '#ffb98b'; ctx.strokeStyle = '#1d1718'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-6, 7); ctx.lineTo(0, 3); ctx.lineTo(6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,191,163,.45)'; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function updateHUD(speed) {
  if (!camera || !world) return;
  const x = camera.position.x, y = camera.position.y, z = camera.position.z;
  const gx = Math.floor(x / BLOCK), gz = Math.floor(z / BLOCK);
  const district = districtAt(gx, gz, app.state.seed);
  $('seed-label').textContent = String(app.state.seed).padStart(6, '0');
  $('district-label').textContent = district.name;
  $('coordinates').textContent = `${x.toFixed(0)} / ${z.toFixed(0)}`;
  $('altitude').textContent = Math.round(y);
  $('speed').textContent = Math.round(speed * 3.6);
  $('score').textContent = String(app.state.score).padStart(6, '0');
  $('signals').textContent = app.state.collected.length;
  $('combo').textContent = `MULTIPLICADOR x${Math.min(5, 1 + Math.floor(Math.max(0, app.streak - 1) / 3))}`;
  $('performance').textContent = `${app.fps} FPS`;
  $('chunks').textContent = `${world.active.size} SETORES`;
  const yawDegree = ((-controls.yaw * 180 / Math.PI) % 360 + 360) % 360;
  const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const heading = headings[Math.round(yawDegree / 45) % 8];
  $('direction-label').textContent = `RUMO ${heading} · ${Math.round(yawDegree)}°`;
  const beacon = nearestBeacon(world.getBeacons(), x, y, z);
  if (beacon) {
    $('target-distance').textContent = `${Math.round(beacon.distance)} M DO SINAL`;
    const relative = Math.atan2(-(beacon.x - x), -(beacon.z - z)) - controls.yaw;
    $('target-arrow').style.transform = `rotate(${relative}rad)`;
    if (app.started && !app.paused && beacon.distance < 16) collectSignal(beacon);
  } else {
    $('target-distance').textContent = 'À PROCURA DE SINAIS…';
  }
  radarDraw(beacon);
}

function showHelp(show) {
  $('help-panel').hidden = !show;
  $('help-btn').setAttribute('aria-expanded', String(show));
}

function setPaused(paused) {
  app.paused = paused;
  controls.enabled = app.started && !paused;
  $('pause-btn').textContent = paused ? '▶' : 'Ⅱ';
  $('pause-btn').setAttribute('aria-label', paused ? 'Retomar jogo' : 'Pausar jogo');
  if (paused && document.pointerLockElement) document.exitPointerLock();
  notify(paused ? 'EXPLORAÇÃO EM PAUSA' : 'EXPLORAÇÃO RETOMADA', 1400);
}

function switchNight() {
  app.night = !app.night;
  world.setNight(app.night);
  atmosphere.setNight(app.night);
  $('night-btn').classList.toggle('active', app.night);
  $('night-btn').setAttribute('aria-pressed', String(app.night));
  $('night-label').textContent = app.night ? 'NOITE' : 'DIA';
  notify(app.night ? 'MODO NOITE ATIVO' : 'MODO DIA ATIVO', 1100);
}

function switchRain() {
  app.rain = !app.rain;
  atmosphere.setRain(app.rain);
  $('rain-btn').classList.toggle('active', app.rain);
  $('rain-btn').setAttribute('aria-pressed', String(app.rain));
  notify(app.rain ? 'PRECIPITAÇÃO ATIVADA' : 'CÉU LIMPO', 1100);
}

function switchQuality() {
  app.quality = !app.quality;
  world.setRadius(app.quality ? 2 : 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, app.quality ? (mobile ? 1.45 : 1.85) : 1));
  renderer.setSize(innerWidth, innerHeight);
  $('quality-btn').classList.toggle('active', app.quality);
  $('quality-btn').setAttribute('aria-pressed', String(app.quality));
  $('quality-label').textContent = app.quality ? 'DETALHE ALTO' : 'DESEMPENHO';
  notify(app.quality ? 'DETALHE ALTO' : 'MODO DESEMPENHO', 1100);
}

function randomSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const numbers = new Uint32Array(1); crypto.getRandomValues(numbers);
    return 100000 + numbers[0] % 900000;
  }
  return Math.floor(Math.random() * 900000) + 100000;
}

function resetWorld() {
  app.state = freshSave(randomSeed());
  collected.clear(); app.streak = 0; app.lastCollect = 0;
  world.setSeed(app.state.seed, collected);
  camera.position.set(92, 118, 172);
  controls.yaw = -0.67; controls.pitch = -0.16; controls.velocity.set(0, 0, 0);
  saveGame(app.state);
  world.update(camera, 0);
  updateHUD(0);
  notify(`NOVO UNIVERSO GERADO / #${app.state.seed}`, 3500);
}

function saveScreenshot() {
  try {
    renderer.render(scene, camera);
    const image = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = `neon-infinite-${app.state.seed}-${Date.now()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    notify('CAPTURA GUARDADA', 2000);
  } catch { notify('CAPTURA INDISPONÍVEL NESTE DISPOSITIVO'); }
}

function setupButtons() {
  $('start-btn').addEventListener('click', () => {
    app.started = true; app.paused = false;
    app.state.totalFlights += 1; saveGame(app.state);
    controls.enabled = true;
    $('start-screen').classList.add('dismissed');
    if (!mobile) renderer.domElement.requestPointerLock?.();
    notify('BEM-VINDO À CIDADE SEM FRONTEIRAS', 2600);
  });
  $('help-btn').addEventListener('click', () => showHelp($('help-panel').hidden));
  $('close-help').addEventListener('click', () => showHelp(false));
  $('pause-btn').addEventListener('click', () => { if (app.started) setPaused(!app.paused); });
  $('night-btn').addEventListener('click', switchNight);
  $('rain-btn').addEventListener('click', switchRain);
  $('quality-btn').addEventListener('click', switchQuality);
  $('photo-btn').addEventListener('click', saveScreenshot);
  const newWorld = $('world-btn');
  let confirmUntil = 0;
  newWorld.addEventListener('click', () => {
    if (Date.now() > confirmUntil) {
      confirmUntil = Date.now() + 5500;
      newWorld.querySelector('span:last-child').textContent = 'CONFIRMAR?';
      notify('UM NOVO MUNDO REINICIA A PONTUAÇÃO. CARREGA NOVAMENTE.', 3400);
      setTimeout(() => { if (Date.now() >= confirmUntil) newWorld.querySelector('span:last-child').textContent = 'NOVO MUNDO'; }, 5600);
      return;
    }
    confirmUntil = 0;
    newWorld.querySelector('span:last-child').textContent = 'NOVO MUNDO';
    resetWorld();
  });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyH') showHelp($('help-panel').hidden);
    if (e.code === 'KeyP' && app.started) setPaused(!app.paused);
    if (e.code === 'KeyN') switchNight();
  });
  if (mobile) $('start-controls').textContent = 'Joystick para mover · Arrasta para olhar · Setas para subir e descer';
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function init() {
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(mobile ? 76 : 74, innerWidth / innerHeight, 0.4, 1450);
    camera.position.set(92, 118, 172);
    renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: mobile ? 'low-power' : 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.2 : 1.85));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.48;
    controls = new FlightControls(camera, renderer.domElement);
    controls.enabled = false;
    world = new CityWorld(scene, { seed: app.state.seed, collected, radius: app.quality ? 2 : 1 });
    atmosphere = new Atmosphere(scene, camera, mobile ? 230 : 510);
    world.update(camera, 0);
    $('quality-btn').classList.toggle('active', app.quality);
    $('quality-btn').setAttribute('aria-pressed', String(app.quality));
    $('quality-label').textContent = app.quality ? 'DETALHE ALTO' : 'DESEMPENHO';
    setupButtons();
    updateHUD(0);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && app.started && !app.paused) setPaused(true); });
    let previous = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      const velocity = controls.update(app.started && !app.paused ? dt : 0);
      world.update(camera, app.started && !app.paused ? dt : 0);
      atmosphere.update(app.started && !app.paused ? dt : 0);
      renderer.render(scene, camera);
      app.frames += 1; app.frameTime += dt;
      if (app.frameTime > 1.15) {
        app.fps = Math.round(app.frames / app.frameTime);
        app.frameTime = 0; app.frames = 0;
      }
      if (now - app.lastUI > 240) { app.lastUI = now; updateHUD(velocity); }
    }
    requestAnimationFrame(tick);
  } catch (err) {
    console.error('NEON INFINITE could not start:', err);
    $('start-screen').classList.add('dismissed');
    $('error-message').hidden = false;
    $('error-message').textContent = 'Não foi possível iniciar o motor 3D. Este jogo precisa de um navegador com WebGL ativo. Experimenta atualizar o Chrome ou desativar o modo de poupança de energia. Detalhes: ' + (err?.message || 'erro desconhecido');
  }
}

init();

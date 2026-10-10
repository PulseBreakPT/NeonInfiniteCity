import { CITIES, EARTH, GRID, project, unproject, wrapDx, randomHash, distance, clamp, Territory, updateTrail, trailHit, cellKey } from './core.js';

const $ = id => document.getElementById(id);
const STORE = 'atlasio-world-v1';
const COLORS = ['#ff537f','#ffc260','#9e82ff','#5ef0b2','#74aaff','#f491e5','#f0e873','#ef705b'];
const NAMES = ['CRIMSON','SOLAR','NEXUS','VIPER','ORBIT','NOVA','TITAN','BLAZE'];
const FPS_LIMIT = 1 / 58;
const WORLD_ZONE = 500;
const fmt = n => Number(n).toLocaleString('pt-PT');
const cleanCoord = (v, lim) => clamp(Number(v) || 0, -lim, lim);
const randomSeed = (a, b, i) => randomHash(Math.floor(a / 10) + i * 7, Math.floor(b / 10) - i * 11, 593);

function loadRecord() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || '{}');
    return { best: clamp(Math.floor(Number(v.best) || 0), 0, 9999999), matches: clamp(Math.floor(Number(v.matches) || 0), 0, 9999999), sound: Boolean(v.sound), lastCity: Number.isInteger(v.lastCity) && v.lastCity >= 0 && v.lastCity < CITIES.length ? v.lastCity : 0 };
  } catch { return { best: 0, matches: 0, sound: false, lastCity: 0 }; }
}

class AtlasGame {
  constructor() {
    this.saveData = loadRecord();
    this.map = null;
    this.canvas = $('world-layer');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.zoom = 17;
    this.width = 0; this.height = 0;
    this.lastFrame = performance.now();
    this.lastCamera = 0; this.lastHud = 0;
    this.paused = false; this.dead = false; this.inWorld = false; this.choosingPoint = false;
    this.started = false; this.helpOpen = false;
    this.actor = null; this.bots = []; this.orbs = [];
    this.heading = { x: 0, y: 1 };
    this.input = { x: 0, y: 0, joystick: false, boost: false };
    this.keys = new Set();
    this.scoreBonus = 0; this.kills = 0;
    this.boostCharge = 100; this.boostTime = 0;
    this.tickTime = 0; this.orbTimer = 0;
    this.chooseCity = this.saveData.lastCity;
    this.target = { ...CITIES[this.chooseCity] };
    this.areaLabel = this.target.name;
    this.sound = this.saveData.sound;
    this.audio = null;
    this.mapAvailable = Boolean(window.L);
    this.paintCities(); this.bind();
    if (this.mapAvailable) this.initializeMap();
    else { $('tile-warning').textContent = 'Não foi possível carregar o Leaflet. Precisas de internet para usar o mapa.'; $('tile-warning').hidden = false; }
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.updateLocation(this.target.lat, this.target.lng);
    this.updateHud();
    requestAnimationFrame(time => this.frame(time));
  }

  initializeMap() {
    const L = window.L;
    this.map = L.map('map', {
      center: [this.target.lat, this.target.lng], zoom: this.zoom,
      minZoom: 3, maxZoom: 18, zoomControl: false,
      scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
      touchZoom: false, dragging: false, keyboard: false,
      zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
      attributionControl: false, worldCopyJump: true,
      inertia: false
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 3, maxZoom: 18, maxNativeZoom: 18,
      keepBuffer: 1, updateWhenIdle: true, crossOrigin: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    let tileErrors = 0;
    this.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        layer.on('tileerror', () => { tileErrors += 1; if (tileErrors >= 4) $('tile-warning').hidden = false; });
        layer.on('tileload', () => { tileErrors = 0; $('tile-warning').hidden = true; });
      }
    });
    this.map.on('click', e => {
      if (!this.choosingPoint) return;
      const lat = cleanCoord(e.latlng.lat, 80), lng = cleanCoord(e.latlng.lng, 180);
      this.setTarget({ name: 'Zona selecionada', country: 'Mundo', lat, lng, emoji: '🌍' }, true);
      this.setPicking(false);
      this.notify('⌖ Localização marcada. Toca em JOGAR NESTA ZONA.', 'positive');
    });
  }

  paintCities() {
    const cell = (city, idx, type) => type === 'menu'
      ? `<button type="button" class="city-btn ${idx === this.chooseCity ? 'selected' : ''}" data-city="${idx}"><span class="city-flag">${city.emoji}</span><span class="city-name">${city.name}</span><small class="city-country">${city.country}</small></button>`
      : `<button type="button" class="world-city-btn ${idx === this.chooseCity ? 'selected' : ''}" data-city="${idx}"><span>${city.emoji}</span><span>${city.name}</span></button>`;
    $('city-grid').innerHTML = CITIES.map((c, i) => cell(c, i, 'menu')).join('');
    $('world-city-grid').innerHTML = CITIES.map((c, i) => cell(c, i, 'world')).join('');
  }

  bind() {
    for (const grid of ['city-grid','world-city-grid']) $(grid).addEventListener('click', e => {
      const button = e.target.closest('[data-city]');
      if (!button) return;
      const id = Number(button.dataset.city);
      this.chooseCity = id;
      this.setTarget(CITIES[id], true);
    });
    $('enter-btn').addEventListener('click', () => this.startAt(this.target));
    $('world-btn').addEventListener('click', () => this.openWorld());
    $('world-close').addEventListener('click', () => this.closeWorld());
    $('travel-btn').addEventListener('click', () => this.startTravel());
    $('pick-btn').addEventListener('click', () => this.setPicking(true));
    $('cancel-pick').addEventListener('click', () => this.setPicking(false));
    $('geo-btn').addEventListener('click', () => this.geolocate());
    $('zoom-out').addEventListener('click', () => { if (this.map) this.map.setZoom(Math.max(3, this.map.getZoom() - 1)); });
    $('zoom-in').addEventListener('click', () => { if (this.map) this.map.setZoom(Math.min(18, this.map.getZoom() + 1)); });
    $('lat-input').addEventListener('change', () => this.useCoordinates(false));
    $('lng-input').addEventListener('change', () => this.useCoordinates(false));
    $('pause-btn').addEventListener('click', () => this.togglePause());
    $('resume-btn').addEventListener('click', () => this.togglePause(false));
    $('pause-world-btn').addEventListener('click', () => { this.togglePause(false); this.openWorld(); });
    $('again-btn').addEventListener('click', () => this.startAt({ name: this.areaLabel, lat: this.actor?.spawn.lat ?? this.target.lat, lng: this.actor?.spawn.lng ?? this.target.lng }));
    $('death-world-btn').addEventListener('click', () => { $('death-overlay').hidden = true; this.openWorld(); });
    $('help-btn').addEventListener('click', () => this.help(true));
    $('help-close').addEventListener('click', () => this.help(false));
    $('help-play').addEventListener('click', () => this.help(false));
    $('sound-btn').addEventListener('click', () => { this.sound = !this.sound; this.saveData.sound = this.sound; this.persist(); this.updateSound(); this.beep(460, .07); });
    this.updateSound();
    this.bindJoystick();
    $('boost-btn').addEventListener('pointerdown', e => { e.preventDefault(); $('boost-btn').setPointerCapture(e.pointerId); this.input.boost = true; });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) $('boost-btn').addEventListener(type, () => { this.input.boost = false; });
    window.addEventListener('keydown', e => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyM' && !e.repeat) { if (this.inWorld) this.closeWorld(); else this.openWorld(); }
      if (e.code === 'KeyP' && !e.repeat) this.togglePause();
      if (e.code === 'Escape' && !e.repeat) { if (this.choosingPoint) this.setPicking(false); else if (this.inWorld) this.closeWorld(); else if (this.helpOpen) this.help(false); else if (this.paused) this.togglePause(false); }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear(); this.input.boost = false; this.input.joystick = false;
      if (this.started && !this.dead && !this.inWorld) this.togglePause(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.started && !this.dead && !this.inWorld) this.togglePause(true);
    });
    this.canvas.addEventListener('pointerdown', e => {
      if (!this.started || this.paused || this.dead || this.inWorld || this.helpOpen) return;
      const dx = e.clientX - this.width / 2, dy = -(e.clientY - this.height / 2);
      if (Math.hypot(dx, dy) > 30) this.inputDirection(dx, dy);
    });
  }

  bindJoystick() {
    const pad = $('joystick'), knob = $('stick');
    let pointer = null;
    const update = e => {
      const rect = pad.getBoundingClientRect();
      const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width * .32);
      const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height * .32);
      const len = Math.max(1, Math.hypot(x, y));
      this.input.x = clamp(x / len, -1, 1); this.input.y = -clamp(y / len, -1, 1);
      this.input.joystick = true;
      knob.style.transform = `translate(calc(-50% + ${this.input.x * rect.width * .25}px),calc(-50% + ${-this.input.y * rect.height * .25}px))`;
    };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); pointer = e.pointerId; pad.setPointerCapture(pointer); update(e); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pointer) update(e); });
    const stop = e => {
      if (e.pointerId !== pointer) return;
      pointer = null; this.input.joystick = false; this.input.x = 0; this.input.y = 0;
      knob.style.transform = 'translate(-50%,-50%)';
    };
    pad.addEventListener('pointerup', stop); pad.addEventListener('pointercancel', stop);
  }

  inputDirection(x, y) {
    const d = Math.hypot(x,y);
    if (d > 0.1) { this.heading = { x:x / d,y:y / d }; this.actor.moving = true; }
  }

  setTarget(target, moveMap) {
    this.target = { ...target, lat: cleanCoord(target.lat,80), lng: cleanCoord(target.lng,180) };
    this.areaLabel = this.target.name;
    $('lat-input').value = this.target.lat.toFixed(5);
    $('lng-input').value = this.target.lng.toFixed(5);
    this.paintCities();
    this.updateLocation(this.target.lat, this.target.lng);
    if (moveMap && this.map) {
      const zoom = this.inWorld ? Math.min(15, this.map.getZoom()) : this.zoom;
      this.map.setView([this.target.lat,this.target.lng],zoom,{animate:false});
    }
  }

  useCoordinates(moveMap=true) {
    const lat = Number($('lat-input').value), lng = Number($('lng-input').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>80 || Math.abs(lng)>180) {
      this.notify('Coordenadas inválidas. Latitude até ±80, longitude até ±180.', 'danger');return false;
    }
    this.chooseCity = -1;
    this.setTarget({ name:'Coordenadas livres',lat,lng,country:'Mundo',emoji:'🌍' },moveMap);
    return true;
  }

  startTravel() {
    const lat = Number($('lat-input').value), lng = Number($('lng-input').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 80 || Math.abs(lng) > 180) {
      this.notify('Coordenadas inválidas. Latitude até ±80, longitude até ±180.', 'danger');
      return;
    }
    if (Math.abs(lat - this.target.lat) > .00002 || Math.abs(lng - this.target.lng) > .00002) {
      this.chooseCity = -1;
      this.setTarget({ name: 'Coordenadas livres', country: 'Mundo', emoji: '🌍', lat, lng }, false);
    }
    this.startAt(this.target);
  }

  startAt(target) {
    this.target = { ...target,lat:cleanCoord(target.lat,80),lng:cleanCoord(target.lng,180) };
    this.areaLabel = target.name || 'Zona livre';
    this.started = true;this.dead = false;this.paused = false;this.helpOpen = false;this.inWorld = false;this.choosingPoint = false;
    $('app').classList.remove('is-menu','in-world','is-paused');
    for (const id of ['menu-overlay','world-overlay','pick-banner','pause-overlay','death-overlay','help-overlay']) $(id).hidden = true;
    this.input.joystick=false;this.input.boost=false;this.keys.clear();
    const pos = project(this.target.lat,this.target.lng);
    this.actor = { id:'you', x:pos.x,y:pos.y, spawn:{lat:this.target.lat,lng:this.target.lng}, trail:[], lastOwned:{...pos}, moving:false,
      territory:new Territory('you',pos.x,pos.y,37), color:'#22e5ee', energy:100 };
    this.heading = { x: 0, y: 1 };
    this.scoreBonus = 0;this.kills=0;this.boostCharge=100;this.boostTime=0;this.orbTimer=0;
    this.tickTime = 0;
    this.bots = Array.from({length:8},(_,i)=>this.makeBot(i,pos));
    this.orbs=[];this.addOrbs(pos,38);
    this.zoom = 17;
    if (this.map) {
      this.map.dragging.disable();this.map.touchZoom.disable();
      this.map.setView([this.target.lat,this.target.lng],this.zoom,{animate:false});
      setTimeout(()=>this.map?.invalidateSize(),40);
    }
    this.saveData.matches++;
    if (this.chooseCity>=0)this.saveData.lastCity=this.chooseCity;
    this.persist();
    this.updateLocation(this.target.lat,this.target.lng);
    this.updateHud();
    this.notify('◈ Sai da zona azul e regressa para conquistar!', 'positive');
    this.beep(510,.09);
  }

  makeBot(i,center) {
    const angle = i/8*Math.PI*2+randomSeed(center.x,center.y,i)*.4;
    const rad = 130+(i%3)*38+randomSeed(center.x,center.y,i+41)*18;
    const x=center.x+Math.cos(angle)*rad, y=center.y+Math.sin(angle)*rad;
    const name=NAMES[i], color=COLORS[i];
    return {id:`bot-${i}`,name,color, x,y,origin:{x,y},trail:[],lastOwned:{x,y},territory:new Territory(name,x,y,26+i%3*4),heading:angle,phase:i*1.2,excursion:0,respawn:0,speed:29+randomSeed(x,y,i)*7};
  }

  addOrbs(center,count=12) {
    const seed = Math.round(this.tickTime*1000);
    for(let i=0;i<count;i++) {
      const angle=randomSeed(center.x+seed,center.y,i+5)*Math.PI*2;
      const r=35+randomSeed(center.x+seed,center.y,i+29)*320;
      this.orbs.push({x:center.x+Math.cos(angle)*r,y:center.y+Math.sin(angle)*r,
        value:5+Math.floor(randomSeed(center.x,center.y,i+seed)*5)*3});
    }
    if(this.orbs.length>70)this.orbs=this.orbs.slice(-70);
  }

  updateLocation(lat,lng) {
    const north = lat >= 0?'N':'S', east=lng>=0?'E':'O';
    $('zone-name').textContent=(this.areaLabel||'MUNDO').toUpperCase();
    $('coordinates').textContent=`${Math.abs(lat).toFixed(3)}° ${north} · ${Math.abs(lng).toFixed(3)}° ${east}`;
  }

  openWorld() {
    if (!this.mapAvailable) { this.notify('Liga-te à internet para abrir o mapa mundial.','danger');return; }
    this.inWorld = true;
    this.choosingPoint = false;
    $('world-overlay').hidden = false;
    $('pause-overlay').hidden = true;
    $('pick-banner').hidden = true;
    $('app').classList.add('in-world');
    this.map.dragging.enable();this.map.touchZoom.enable();
    const center = this.started && this.actor ? unproject(this.actor.x,this.actor.y) : this.target;
    this.map.setView([center.lat,center.lng],12,{animate:false});
    if (this.started && this.actor) this.setTarget({ ...center, name:this.areaLabel },false);
    setTimeout(()=>this.map?.invalidateSize(),50);
  }
  closeWorld() {
    this.inWorld=false;this.setPicking(false);
    $('world-overlay').hidden=true;$('app').classList.remove('in-world');
    if (this.map) {
      this.map.dragging.disable();this.map.touchZoom.disable();
      const center = this.actor ? unproject(this.actor.x,this.actor.y):this.target;
      this.map.setView([center.lat,center.lng],this.zoom,{animate:false});
    }
    if (this.started && !this.dead) this.paused=false;
    if (this.dead) $('death-overlay').hidden=false;
  }
  setPicking(enabled) {
    this.choosingPoint=enabled;
    $('pick-banner').hidden=!enabled;
    $('world-overlay').hidden=enabled;
    if(enabled) this.notify('Arrasta o mapa e toca onde queres começar.','positive');
    else if(this.inWorld)$('world-overlay').hidden=false;
  }
  geolocate() {
    if (!navigator.geolocation) {this.notify('Geolocalização indisponível.','danger');return;}
    this.notify('A pedir a tua localização…');
    navigator.geolocation.getCurrentPosition(pos=>{
      this.chooseCity=-1;this.setTarget({name:'Perto de ti',country:'Mundo',emoji:'📍',lat:pos.coords.latitude,lng:pos.coords.longitude},true);
      this.notify('Localização encontrada. Já podes começar.','positive');
    },()=>this.notify('Não foi possível aceder à localização.','danger'),{enableHighAccuracy:false,timeout:8000,maximumAge:60000});
  }

  help(show) { this.helpOpen=show; $('help-overlay').hidden=!show; }
  togglePause(force) {
    if(!this.started||this.dead||this.inWorld)return;
    this.paused=typeof force==='boolean'?force:!this.paused;
    $('pause-overlay').hidden=!this.paused;
    $('app').classList.toggle('is-paused',this.paused);
  }
  notify(message,type='') {
    const item = document.createElement('div');
    item.className=`event-item ${type}`;item.textContent=message;
    const feed=$('event-feed');feed.prepend(item);
    while(feed.children.length>3)feed.lastChild.remove();
    setTimeout(()=>item.remove(),4000);
    $('status-text').textContent=message.replace(/^[^\p{L}\p{N}]+/u,'').slice(0,100);
  }
  persist() {try{localStorage.setItem(STORE,JSON.stringify(this.saveData));}catch{/* Browsers may block persistence. */}}
  updateSound() {$('sound-btn').textContent=this.sound?'♫':'♪';$('sound-btn').setAttribute('aria-pressed',String(this.sound));}
  beep(freq,duration=.075) {
    if (!this.sound) return;
    try {
      const Audio = window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      this.audio ||=new Audio();
      if(this.audio.state==='suspended')this.audio.resume();
      const osc=this.audio.createOscillator(),gain=this.audio.createGain();
      osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);
      osc.connect(gain).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);
    }catch{/* audio is optional */}
  }

  score() {return this.actor ? this.actor.territory.count*10+this.scoreBonus+this.kills*80:0;}
  updateHud() {
    const score=this.score();
    $('score').textContent=fmt(score);
    const lat=this.actor?unproject(this.actor.x,this.actor.y).lat:0;
    $('surface').textContent=fmt(Math.round((this.actor?.territory.count||0)*GRID*GRID*Math.cos(lat*Math.PI/180)**2))+' m²';
    if(score>this.saveData.best) {this.saveData.best=score;this.persist();}
    $('record').textContent=fmt(this.saveData.best);
    $('boost-fill').style.width=this.boostCharge.toFixed(1)+'%';
    const ranking=[{id:'you',name:'TU',color:'#26e9eb',score},...this.bots.filter(b=>!b.respawn).map(b=>({id:b.id,name:b.name,color:b.color,score:b.territory.count*10}))].sort((a,b)=>b.score-a.score).slice(0,6);
    $('leaderboard').innerHTML=ranking.map((b,i)=>`<div class="leader-row ${b.id==='you'?'mine':''}"><span class="leader-pos">${String(i+1).padStart(2,'0')}</span><span class="leader-color" style="background:${b.color}"></span><span class="leader-name">${b.name}</span><span class="leader-score">${fmt(b.score)}</span></div>`).join('');
  }

  movePlayer(dt) {
    const p=this.actor;
    let x=0,y=0;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))y++;
    if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))y--;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x--;
    if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x++;
    if(this.input.joystick) {x=this.input.x;y=this.input.y;}
    if(Math.hypot(x,y)>.12) this.inputDirection(x,y);
    if(!p.moving)return;
    const boosting=(this.input.boost||this.keys.has('Space'))&&this.boostCharge>2;
    const move=boosting?66:40;
    this.boostCharge=clamp(this.boostCharge+(boosting?-26:11)*dt,0,100);
    p.x+=this.heading.x*move*dt;
    p.y=clamp(p.y+this.heading.y*move*dt,-19900000,19900000);
    const result=updateTrail(p);
    if(result?.overextended){this.die('Foste longe demais sem fechar o território.');return;}
    if(result?.captured?.length){
      this.transferTerritory(p,result.captured);
      this.scoreBonus+=Math.min(500,Math.round(result.captured.length/4)*5);
      this.notify(`◈ TERRITÓRIO CONQUISTADO · +${result.captured.length*10} PTS`, 'positive');
      this.beep(660,.1);
    }
    if(p.trail.length>10&&trailHit(p,p.trail.slice(0,-7),5)) this.die('Cruzaste o teu próprio trilho.');
  }
  transferTerritory(owner,keys) {
    for(const bot of this.bots) {
      if(bot===owner || bot.respawn)continue;
      for(const cell of keys)bot.territory.cells.delete(cell);
    }
    if(owner!==this.actor)for(const cell of keys) this.actor.territory.cells.delete(cell);
  }

  updateBots(dt) {
    const you=this.actor;
    for(const bot of this.bots) {
      if(bot.respawn>0){
        bot.respawn-=dt;
        if(bot.respawn<=0){
          const re=this.makeBot(Number(bot.id.split('-')[1]),you);
          Object.assign(bot,re);
        }
        continue;
      }
      bot.phase+=dt;
      if(distance(bot,you)>620) {
        const re=this.makeBot(Number(bot.id.split('-')[1]),you);
        Object.assign(bot,re);
        continue;
      }
      const safe=bot.territory.contains(bot.x,bot.y);
      if(!safe)bot.excursion+=dt;else bot.excursion=0;
      if(bot.excursion>2.35){
        bot.heading=Math.atan2(bot.origin.y-bot.y,bot.origin.x-bot.x);
      } else if(bot.excursion<1.4 && bot.phase%4.5<.04) {
        const hunt=you.trail.length>5&&distance(bot,you)<130;
        bot.heading=hunt ? Math.atan2(you.y-bot.y,you.x-bot.x) : Math.atan2(bot.origin.y-bot.y,bot.origin.x-bot.x) + .75*Math.sin(bot.phase*1.2);
      }
      bot.heading+=Math.sin(bot.phase*.45+Number(bot.id.split('-')[1]))*dt*.40;
      bot.x+=Math.cos(bot.heading)*bot.speed*dt;
      bot.y+=Math.sin(bot.heading)*bot.speed*dt;
      const claim=updateTrail(bot);
      if(claim?.captured?.length)this.transferTerritory(bot,claim.captured);
      if(claim?.overextended){this.removeBot(bot);continue;}
      if(you.trail.length>2&&trailHit(bot,you.trail,8)){
        this.die(`${bot.name} cortou o teu trilho.`);return;
      }
      if(bot.trail.length>2&&trailHit(you,bot.trail,8)){
        this.removeBot(bot);this.kills++;
        this.notify(`✦ ${bot.name} ELIMINADO! +80 PTS`,'positive');this.beep(780,.08);
        continue;
      }
      if(distance(bot,you)<11){
        if(you.territory.count>bot.territory.count*1.22){this.removeBot(bot);this.kills++;this.notify(`⚡ ABSORVESTE ${bot.name}`,'positive');}
        else if(!you.territory.contains(you.x,you.y)){this.die(`Foste apanhado por ${bot.name}.`);return;}
      }
    }
  }
  removeBot(bot) {bot.respawn=5;bot.trail=[];bot.territory.cells.clear();}

  collectOrbs(dt) {
    this.orbTimer+=dt;
    for(let i=this.orbs.length-1;i>=0;i--) {
      if(distance(this.orbs[i],this.actor)<14) {
        const orb=this.orbs.splice(i,1)[0];
        this.scoreBonus+=orb.value;this.boostCharge=clamp(this.boostCharge+5,0,100);
        if(this.scoreBonus%45<orb.value)this.beep(620,.04);
      }
    }
    if(this.orbTimer>5){this.orbTimer=0;this.addOrbs(this.actor,10);}
  }
  die(reason) {
    if(this.dead)return;
    this.dead=true;this.input.boost=false;
    $('death-reason').textContent=reason;
    $('death-score').textContent=fmt(this.score());
    if(this.score()>this.saveData.best)this.saveData.best=this.score();
    $('death-record').textContent=fmt(this.saveData.best);
    this.persist();$('death-overlay').hidden=false;
    this.beep(170,.23);
  }
  resize() {
    this.width=Math.max(1,this.canvas.clientWidth);
    this.height=Math.max(1,this.canvas.clientHeight);
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*this.dpr);
    this.canvas.height=Math.round(this.height*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.map) this.map.invalidateSize({pan:false});
  }
  worldToScreen(p) {
    const center=this.map ? project(this.map.getCenter().lat,this.map.getCenter().lng) : project(this.target.lat,this.target.lng);
    const ppm=this.map?256*2**this.map.getZoom()/EARTH:.78;
    return { x:this.width/2+wrapDx(p.x-center.x)*ppm,y:this.height/2-(p.y-center.y)*ppm };
  }
  paintTerritory(actor) {
    if(!actor || !actor.territory.count)return;
    const ctx=this.ctx, cells=actor.territory.cells;
    const ppm=this.map?256*2**this.map.getZoom()/EARTH:.78;
    const size=GRID*ppm;
    if(size<1)return;
    ctx.fillStyle=actor.color+'4a';ctx.strokeStyle=actor.color+'c7';ctx.lineWidth=Math.max(1,Math.min(2.5,size*.17));
    const center=this.map?project(this.map.getCenter().lat,this.map.getCenter().lng):project(this.target.lat,this.target.lng);
    const originX=this.width/2,originY=this.height/2;
    for(const key of cells){
      const comma=key.indexOf(',');const gx=Number(key.slice(0,comma)),gy=Number(key.slice(comma+1));
      const px=originX+wrapDx(gx*GRID-center.x)*ppm,py=originY-((gy+1)*GRID-center.y)*ppm;
      if(px>this.width+size||px+size<0||py>this.height+size||py+size<0)continue;
      ctx.fillRect(px,py,size+.4,size+.4);
      if(!cells.has(cellKey(gx-1,gy))){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+size);ctx.stroke();}
      if(!cells.has(cellKey(gx+1,gy))){ctx.beginPath();ctx.moveTo(px+size,py);ctx.lineTo(px+size,py+size);ctx.stroke();}
      if(!cells.has(cellKey(gx,gy-1))){ctx.beginPath();ctx.moveTo(px,py+size);ctx.lineTo(px+size,py+size);ctx.stroke();}
      if(!cells.has(cellKey(gx,gy+1))){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+size,py);ctx.stroke();}
    }
  }
  paintTrail(actor) {
    if(!actor?.trail || actor.trail.length<2)return;
    const ctx=this.ctx, path=[...actor.trail, {x:actor.x,y:actor.y}];
    const first=this.worldToScreen(path[0]);
    ctx.save();ctx.beginPath();ctx.moveTo(first.x,first.y);
    for(let i=1;i<path.length;i++){const p=this.worldToScreen(path[i]);ctx.lineTo(p.x,p.y);}
    ctx.strokeStyle=actor.color+'55';ctx.lineWidth=15;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
    ctx.strokeStyle=actor.color;ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle='#ffffffdd';ctx.lineWidth=1.5;ctx.setLineDash([5,8]);ctx.stroke();ctx.restore();
  }
  paintOrbs(time) {
    const ctx=this.ctx;
    for(const orb of this.orbs){
      const p=this.worldToScreen(orb);
      if(p.x<-20||p.x>this.width+20||p.y<-20||p.y>this.height+20)continue;
      const radius=3+Math.sin(time*.004+orb.x)*.8;
      ctx.beginPath();ctx.arc(p.x,p.y,radius+4,0,Math.PI*2);ctx.fillStyle='#f8d57722';ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fillStyle='#ffe29a';ctx.fill();
    }
  }
  paintActor(actor,isYou,time){
    if(!actor||actor.respawn>0)return;
    const pos=this.worldToScreen(actor),ctx=this.ctx;
    if(pos.x<-40||pos.y<-40||pos.x>this.width+40||pos.y>this.height+40)return;
    const radius=isYou?12+Math.min(6,Math.sqrt(actor.territory.count)*.25):10+Math.min(4,Math.sqrt(actor.territory.count)*.18);
    ctx.save();
    if(isYou){ctx.beginPath();ctx.arc(pos.x,pos.y,radius+11+Math.sin(time*.004)*2,0,Math.PI*2);ctx.strokeStyle='#2debf564';ctx.lineWidth=2;ctx.stroke();}
    ctx.beginPath();ctx.arc(pos.x,pos.y,radius+4,0,Math.PI*2);ctx.fillStyle=actor.color+'40';ctx.fill();
    ctx.beginPath();ctx.arc(pos.x,pos.y,radius,0,Math.PI*2);ctx.fillStyle=actor.color;ctx.shadowBlur=22;ctx.shadowColor=actor.color;ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(pos.x-radius*.24,pos.y-radius*.24,radius*.52,0,Math.PI*2);ctx.fillStyle='#ffffff70';ctx.fill();
    ctx.font=`900 ${Math.max(11,radius*.88)}px DM Sans, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#052035';ctx.fillText(isYou?'◆':'✦',pos.x,pos.y+1);
    ctx.font='800 10px DM Sans, sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=8;
    ctx.fillText(isYou?'TU':actor.name,pos.x,pos.y-radius-11);ctx.restore();
  }
  draw(time) {
    const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);
    if(!this.started){
      const p=this.worldToScreen(project(this.target.lat,this.target.lng));
      ctx.beginPath();ctx.arc(p.x,p.y,28+5*Math.sin(time*.002),0,Math.PI*2);
      ctx.strokeStyle='#23eff6a7';ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle='#32eaf2';ctx.fill();return;
    }
    if(this.inWorld)return;
    for(const bot of this.bots)this.paintTerritory(bot);
    this.paintTerritory(this.actor);
    this.paintOrbs(time);
    for(const bot of this.bots)this.paintTrail(bot);
    this.paintTrail(this.actor);
    for(const bot of this.bots)this.paintActor(bot,false,time);
    this.paintActor(this.actor,true,time);
  }
  frame(now) {
    requestAnimationFrame(t=>this.frame(t));
    const dt=Math.min(.05,Math.max(0,(now-this.lastFrame)/1000));
    this.lastFrame=now;
    if(this.started&&!this.dead&&!this.paused&&!this.inWorld&&!this.helpOpen&&dt){
      this.tickTime+=dt;
      this.movePlayer(dt);
      if(!this.dead)this.updateBots(dt);
      if(!this.dead)this.collectOrbs(dt);
      if(this.map&&this.actor&&now-this.lastCamera>180){
        this.lastCamera=now;
        const ll=unproject(this.actor.x,this.actor.y);
        this.map.panTo([ll.lat,ll.lng],{animate:false,noMoveStart:true});
        if(now-this.lastHud>540){this.updateLocation(ll.lat,ll.lng);}
      }
      if(now-this.lastHud>300){this.lastHud=now;this.updateHud();}
    }
    if(dt>=FPS_LIMIT/2)this.draw(now);
  }
}

new AtlasGame();

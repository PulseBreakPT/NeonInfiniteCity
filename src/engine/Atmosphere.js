import * as THREE from 'three';

export class Atmosphere {
  constructor(scene, camera, count = 350) {
    this.scene = scene;
    this.camera = camera;
    this.night = true;
    this.raining = false;
    this.clock = 0;
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x080c15, 0.00175);
    this.ambient = new THREE.HemisphereLight(0x9bb5ff, 0x14131d, 1.15);
    this.sun = new THREE.DirectionalLight(0xff9b80, 1.3);
    this.sun.position.set(-100, 230, -120);
    scene.add(this.ambient, this.sun);

    this.positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.scatter(i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xa4c5f5, size: 0.65, transparent: true, opacity: 0.62, depthWrite: false });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  scatter(index) {
    const n = index * 3;
    this.positions[n] = (Math.random() - 0.5) * 190;
    this.positions[n + 1] = (Math.random() - 0.5) * 155;
    this.positions[n + 2] = (Math.random() - 0.5) * 190;
  }

  setNight(isNight) {
    this.night = isNight;
    this.scene.background.setHex(isNight ? 0x070a12 : 0x687b95);
    this.scene.fog.color.setHex(isNight ? 0x080c15 : 0x778397);
    this.scene.fog.density = isNight ? 0.00175 : 0.0015;
    this.ambient.intensity = isNight ? 1.15 : 2.8;
    this.sun.intensity = isNight ? 1.3 : 3.4;
    this.sun.color.setHex(isNight ? 0xff9b80 : 0xfff0da);
  }

  setRain(enabled) { this.raining = enabled; this.rain.visible = enabled; }

  update(dt) {
    if (!this.raining) return;
    this.clock += dt;
    this.rain.position.copy(this.camera.position);
    for (let i = 0; i < this.positions.length; i += 3) {
      this.positions[i + 1] -= dt * 94;
      this.positions[i] += dt * 13;
      if (this.positions[i + 1] < -75) { this.positions[i + 1] = 80; this.positions[i] = (Math.random() - 0.5) * 190; }
      if (this.positions[i] > 95) this.positions[i] = -95;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}

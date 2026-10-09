import * as THREE from 'three';

const DAY_BG = 0x9ecfff;
const DAY_FOG = 0xbdd7ef;
const NIGHT_BG = 0x070a12;
const NIGHT_FOG = 0x080c15;

export class Atmosphere {
  constructor(scene, camera, count = 350) {
    this.scene = scene;
    this.camera = camera;
    this.night = false;
    this.raining = false;
    this.clock = 0;

    scene.background = new THREE.Color(DAY_BG);
    scene.fog = new THREE.FogExp2(DAY_FOG, 0.00125);

    this.ambient = new THREE.HemisphereLight(0xf4f7ff, 0x45505d, 2.15);
    this.sun = new THREE.DirectionalLight(0xfff1d7, 4.3);
    this.sun.position.set(-180, 280, -120);
    this.fill = new THREE.DirectionalLight(0x8bb8ff, 1.1);
    this.fill.position.set(170, 110, 80);
    scene.add(this.ambient, this.sun, this.fill);

    this.sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(28, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff1ba, toneMapped: false })
    );
    this.sunSphere.frustumCulled = false;
    scene.add(this.sunSphere);

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
    this.scene.background.setHex(isNight ? NIGHT_BG : DAY_BG);
    this.scene.fog.color.setHex(isNight ? NIGHT_FOG : DAY_FOG);
    this.scene.fog.density = isNight ? 0.00175 : 0.0012;
    this.ambient.color.setHex(isNight ? 0x9bb5ff : 0xf4f7ff);
    this.ambient.groundColor.setHex(isNight ? 0x14131d : 0x45505d);
    this.ambient.intensity = isNight ? 1.15 : 2.15;
    this.sun.intensity = isNight ? 1.25 : 4.3;
    this.sun.color.setHex(isNight ? 0xff9b80 : 0xfff1d7);
    this.fill.intensity = isNight ? 0.18 : 1.1;
    this.sunSphere.visible = !isNight;
  }

  setRain(enabled) { this.raining = enabled; this.rain.visible = enabled; }

  update(dt) {
    this.clock += dt;
    this.sunSphere.position.copy(this.camera.position).add(new THREE.Vector3(-260, 210, -340));

    if (!this.raining) return;
    this.rain.position.copy(this.camera.position);
    for (let i = 0; i < this.positions.length; i += 3) {
      this.positions[i + 1] -= dt * 94;
      this.positions[i] += dt * 13;
      if (this.positions[i + 1] < -75) {
        this.positions[i + 1] = 80;
        this.positions[i] = (Math.random() - 0.5) * 190;
      }
      if (this.positions[i] > 95) this.positions[i] = -95;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
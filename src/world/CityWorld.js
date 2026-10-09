import * as THREE from 'three';
import { BLOCK, BLOCKS_PER_CHUNK, CHUNK_SIZE, ROAD, hash2, planChunk, chunkCoord, chunkKey } from './procedural.js';

const tmp = new THREE.Object3D();
const red = 0xff5445;
const amber = 0xffb565;
const cyan = 0x6ddcff;

function bodyMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x323b4a, metalness: 0.6, roughness: 0.68, vertexColors: false,
    emissive: 0x06080d, emissiveIntensity: 0.22
  });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uCityNight = { value: 1 };
    mat.userData.shader = shader;
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCityWorld;\nvarying vec3 vCityNormal;');
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      #ifdef USE_INSTANCING
        vCityWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vCityWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif
      vCityNormal = normal;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vCityWorld;\nvarying vec3 vCityNormal;\nuniform float uCityNight;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float sideWall = 1.0 - step(0.5, abs(vCityNormal.y));
      float horizontal = abs(vCityNormal.x) > 0.5 ? vCityWorld.z : vCityWorld.x;
      float col = fract(horizontal / 4.7);
      float floorLine = fract(vCityWorld.y / 4.6);
      float windowCell = step(0.19, col) * (1.0 - step(0.78, col))
                       * step(0.25, floorLine) * (1.0 - step(0.75, floorLine));
      vec2 grid = floor(vec2(horizontal / 4.7, vCityWorld.y / 4.6));
      float lit = fract(sin(dot(grid, vec2(127.1, 311.7))) * 43758.5453);
      float randomOn = step(0.39, lit);
      vec3 warm = mix(vec3(1.0, 0.30, 0.16), vec3(1.0, 0.70, 0.42), step(0.45, lit));
      vec3 windowGlow = mix(warm, vec3(0.30, 0.75, 1.0), step(0.97, lit));
      totalEmissiveRadiance += sideWall * windowCell * randomOn * windowGlow * 2.1 * uCityNight;
    `);
  };
  mat.customProgramCacheKey = () => 'infinite-windows-v2';
  return mat;
}

export class CityWorld {
  constructor(scene, { seed, radius = 2, collected = new Set() }) {
    this.scene = scene;
    this.seed = seed;
    this.radius = radius;
    this.collected = collected;
    this.active = new Map();
    this.currentKey = '';
    this.time = 0;
    this.night = true;
    this.geometry = {
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(0.4, 0.4, 1, 7)
    };
    this.material = {
      body: bodyMaterial(),
      road: new THREE.MeshStandardMaterial({ color: 0x0b0e15, metalness: 0.2, roughness: 0.92 }),
      ground: new THREE.MeshStandardMaterial({ color: 0x181d29, roughness: 1 }),
      foundation: new THREE.MeshStandardMaterial({ color: 0x222a37, roughness: 0.9 }),
      amber: new THREE.MeshBasicMaterial({ color: 0xff9b54, toneMapped: false }),
      cyan: new THREE.MeshBasicMaterial({ color: 0x77eaff, toneMapped: false }),
      stripe: new THREE.MeshBasicMaterial({ color: 0x7b5c50 }),
      park: new THREE.MeshStandardMaterial({ color: 0x122e2b, roughness: 1 }),
      beacon: new THREE.MeshBasicMaterial({ color: 0xff674d, toneMapped: false }),
      beam: new THREE.MeshBasicMaterial({ color: 0xff4933, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide })
    };
    this.ringGeometry = new THREE.TorusGeometry(10, 0.35, 6, 40);
    this.sphereGeometry = new THREE.IcosahedronGeometry(2.7, 1);
    this.beamGeometry = new THREE.CylinderGeometry(0.8, 1.3, 130, 8, 1, true);
  }

  place(mesh, items, getPose) {
    items.forEach((item, i) => {
      tmp.position.set(0, 0, 0); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1);
      getPose(tmp, item, i);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  createChunk(cx, cz) {
    const plan = planChunk(cx, cz, this.seed);
    const group = new THREE.Group();
    const centerX = cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const centerZ = cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const plane = new THREE.Mesh(this.geometry.plane, this.material.ground);
    plane.rotation.x = -Math.PI / 2;
    plane.scale.set(CHUNK_SIZE, CHUNK_SIZE, 1);
    plane.position.set(centerX, -0.3, centerZ);
    group.add(plane);

    const roadsX = new THREE.InstancedMesh(this.geometry.plane, this.material.road, BLOCKS_PER_CHUNK);
    const roadsZ = new THREE.InstancedMesh(this.geometry.plane, this.material.road, BLOCKS_PER_CHUNK);
    this.place(roadsX, Array.from({ length: BLOCKS_PER_CHUNK }, (_, i) => i), (o, i) => {
      o.position.set(cx * CHUNK_SIZE + i * BLOCK, 0.02, centerZ);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(ROAD, CHUNK_SIZE, 1);
    });
    this.place(roadsZ, Array.from({ length: BLOCKS_PER_CHUNK }, (_, i) => i), (o, i) => {
      o.position.set(centerX, 0.025, cz * CHUNK_SIZE + i * BLOCK);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(CHUNK_SIZE, ROAD, 1);
    });
    group.add(roadsX, roadsZ);

    const markings = [];
    for (let lane = 0; lane < BLOCKS_PER_CHUNK; lane++) {
      for (let n = 0; n < 12; n++) {
        markings.push({ x: cx * CHUNK_SIZE + lane * BLOCK, z: cz * CHUNK_SIZE + n * 21 + 10, horizontal: false });
        markings.push({ x: cx * CHUNK_SIZE + n * 21 + 10, z: cz * CHUNK_SIZE + lane * BLOCK, horizontal: true });
      }
    }
    const marks = new THREE.InstancedMesh(this.geometry.plane, this.material.stripe, markings.length);
    this.place(marks, markings, (o, m) => {
      o.position.set(m.x, 0.04, m.z);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(m.horizontal ? 7 : 0.28, m.horizontal ? 0.28 : 7, 1);
    });
    group.add(marks);

    if (plan.buildings.length) {
      const bases = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, plan.buildings.length);
      this.place(bases, plan.buildings, (o, b) => {
        o.position.set(b.x, 1, b.z);
        o.scale.set(b.width + 4, 2, b.depth + 4);
      });
      const bodies = new THREE.InstancedMesh(this.geometry.box, this.material.body, plan.buildings.length);
      this.place(bodies, plan.buildings, (o, b) => {
        o.position.set(b.x, b.height / 2 + 2, b.z);
        o.scale.set(b.width, b.height, b.depth);
      });
      for (let i = 0; i < plan.buildings.length; i++) {
        const b = plan.buildings[i];
        const shades = { coral: 0xb7a8ab, red: 0x9b8c9c, gold: 0xc4b3a5, blue: 0x939fae };
        const tint = new THREE.Color(shades[b.tone]);
        tint.multiplyScalar(0.74 + hash2(b.gx, b.gz, this.seed + 50) * 0.35);
        bodies.setColorAt(i, tint);
      }
      bodies.instanceColor.needsUpdate = true;
      group.add(bases, bodies);

      const crowns = plan.buildings.filter(b => b.hasCrown);
      if (crowns.length) {
        const crownMesh = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, crowns.length);
        this.place(crownMesh, crowns, (o, b) => {
          o.position.set(b.x, b.height + 5.2, b.z);
          o.scale.set(b.width * 0.7, 6.5, b.depth * 0.7);
        });
        group.add(crownMesh);
      }
      const spires = plan.buildings.filter(b => b.hasAntenna);
      if (spires.length) {
        const spireMesh = new THREE.InstancedMesh(this.geometry.cylinder, this.material.amber, spires.length);
        this.place(spireMesh, spires, (o, b) => {
          o.position.set(b.x, b.height + 11, b.z);
          o.scale.set(0.55, 18, 0.55);
        });
        group.add(spireMesh);
      }
      const ribbons = plan.buildings.filter(b => b.style === 2 || b.style === 4);
      if (ribbons.length) {
        const ribbonMesh = new THREE.InstancedMesh(this.geometry.box, this.material.amber, ribbons.length);
        this.place(ribbonMesh, ribbons, (o, b) => {
          o.position.set(b.x + b.width / 2 + 0.18, b.height / 2 + 2, b.z + b.depth / 2 + 0.18);
          o.scale.set(0.42, b.height, 0.42);
        });
        group.add(ribbonMesh);
      }
    }

    if (plan.parks.length) {
      const parks = new THREE.InstancedMesh(this.geometry.box, this.material.park, plan.parks.length);
      this.place(parks, plan.parks, (o, p) => {
        o.position.set(p.x, 0.3, p.z); o.scale.set(40, 0.6, 40);
      });
      group.add(parks);
    }

    const lampPositions = [];
    for (let x = 0; x < BLOCKS_PER_CHUNK; x++) {
      for (let z = 0; z < BLOCKS_PER_CHUNK; z++) {
        lampPositions.push({ x: cx * CHUNK_SIZE + x * BLOCK + 8, z: cz * CHUNK_SIZE + z * BLOCK + 8 });
      }
    }
    const lamps = new THREE.InstancedMesh(this.geometry.box, this.material.amber, lampPositions.length);
    this.place(lamps, lampPositions, (o, p) => {
      o.position.set(p.x, 5.2, p.z); o.scale.set(0.65, 10.4, 0.65);
    });
    group.add(lamps);

    const carData = Array.from({ length: 14 }, (_, i) => {
      const lane = Math.floor(hash2(cx * 30 + i, cz, this.seed + 156) * BLOCKS_PER_CHUNK);
      return {
        lane, offset: hash2(cx, cz * 30 + i, this.seed + 67) * CHUNK_SIZE,
        speed: (11 + hash2(cx - i, cz + i, this.seed + 34) * 30) * (i % 2 ? 1 : -1),
        direction: i % 3 === 0 ? 'x' : 'z',
        color: i % 4 === 0 ? 'cyan' : 'amber'
      };
    });
    const vehicleBatches = {};
    for (const color of ['amber', 'cyan']) {
      const cars = carData.filter(v => v.color === color);
      const inst = new THREE.InstancedMesh(this.geometry.box, this.material[color], cars.length);
      inst.frustumCulled = false;
      vehicleBatches[color] = { cars, inst };
      group.add(inst);
    }

    let beaconObject = null;
    if (plan.beacon && !this.collected.has(plan.beacon.id)) {
      const b = plan.beacon;
      const marker = new THREE.Group();
      marker.position.set(b.x, b.y, b.z);
      const ring = new THREE.Mesh(this.ringGeometry, this.material.beacon);
      ring.rotation.x = Math.PI / 2;
      const secondRing = new THREE.Mesh(this.ringGeometry, this.material.amber);
      secondRing.rotation.y = Math.PI / 2;
      secondRing.scale.setScalar(0.65);
      const center = new THREE.Mesh(this.sphereGeometry, this.material.beacon);
      const beam = new THREE.Mesh(this.beamGeometry, this.material.beam);
      beam.position.y = -65;
      marker.add(ring, secondRing, center, beam);
      group.add(marker);
      beaconObject = marker;
    }

    this.scene.add(group);
    this.active.set(chunkKey(cx, cz), { group, plan, vehicleBatches, beaconObject });
  }

  releaseChunk(data) {
    this.scene.remove(data.group);
    // Releasing instance attributes matters in an endless world: removing a Group
    // alone does not free its InstancedMesh GPU allocations.
    data.group.traverse(object => {
      if (object.isInstancedMesh && typeof object.dispose === 'function') object.dispose();
    });
  }

  update(camera, dt) {
    this.time += dt;
    const cx = chunkCoord(camera.position.x), cz = chunkCoord(camera.position.z);
    const nextKey = `${cx}/${cz}/${this.radius}`;
    if (this.currentKey !== nextKey) {
      this.currentKey = nextKey;
      const needed = new Set();
      // Generate nearest chunks first to avoid visible holes during fast flight.
      const coords = [];
      for (let dz = -this.radius; dz <= this.radius; dz++) {
        for (let dx = -this.radius; dx <= this.radius; dx++) coords.push({ x: cx + dx, z: cz + dz, d: dx * dx + dz * dz });
      }
      coords.sort((a, b) => a.d - b.d);
      for (const c of coords) {
        const k = chunkKey(c.x, c.z);
        needed.add(k);
        if (!this.active.has(k)) this.createChunk(c.x, c.z);
      }
      for (const [key, data] of this.active) {
        if (!needed.has(key)) { this.releaseChunk(data); this.active.delete(key); }
      }
    }
    for (const [key, data] of this.active) {
      if (data.beaconObject) {
        data.beaconObject.rotation.y += dt * 0.45;
        data.beaconObject.position.y = data.plan.beacon.y + Math.sin(this.time * 2.2 + data.plan.cx) * 2;
      }
      for (const { cars, inst } of Object.values(data.vehicleBatches)) {
        this.place(inst, cars, (o, car) => {
          const p = ((car.offset + this.time * car.speed) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
          if (car.direction === 'z') {
            o.position.set(data.plan.cx * CHUNK_SIZE + car.lane * BLOCK + (car.speed > 0 ? 3.7 : -3.7), 1.3, data.plan.cz * CHUNK_SIZE + p);
            o.scale.set(2.9, 1.4, 6.5);
          } else {
            o.position.set(data.plan.cx * CHUNK_SIZE + p, 1.3, data.plan.cz * CHUNK_SIZE + car.lane * BLOCK + (car.speed > 0 ? -3.7 : 3.7));
            o.scale.set(6.5, 1.4, 2.9);
          }
        });
      }
    }
  }

  getBeacons() {
    const result = [];
    for (const data of this.active.values()) {
      if (data.beaconObject && data.plan.beacon) result.push(data.plan.beacon);
    }
    return result;
  }

  collect(id) {
    for (const data of this.active.values()) {
      if (data.plan.beacon?.id !== id || !data.beaconObject) continue;
      data.group.remove(data.beaconObject);
      data.beaconObject = null;
      return true;
    }
    return false;
  }

  setNight(enabled) {
    this.night = enabled;
    if (this.material.body.userData.shader) this.material.body.userData.shader.uniforms.uCityNight.value = enabled ? 1 : 0.12;
  }

  setRadius(radius) { this.radius = Math.max(1, Math.min(3, radius)); }
  setSeed(seed, collected) {
    for (const data of this.active.values()) this.releaseChunk(data);
    this.active.clear();
    this.currentKey = '';
    this.seed = seed;
    this.collected = collected;
    this.time = 0;
  }
}

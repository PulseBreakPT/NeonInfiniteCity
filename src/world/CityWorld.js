import * as THREE from 'three';
import { BLOCK, BLOCKS_PER_CHUNK, CHUNK_SIZE, ROAD, hash2, planChunk, chunkCoord, chunkKey } from './procedural.js';

const tmp = new THREE.Object3D();
const tempVec = new THREE.Vector3();
const amber = 0xffb565;
const cyan = 0x6ddcff;
const red = 0xff5445;
const white = 0xfff1da;

function bodyMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x323b4a,
    metalness: 0.58,
    roughness: 0.67,
    vertexColors: false,
    emissive: 0x06080d,
    emissiveIntensity: 0.22
  });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uCityNight = { value: 0.12 };
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
      float randomOn = step(0.41, lit);
      vec3 warm = mix(vec3(1.0, 0.30, 0.16), vec3(1.0, 0.70, 0.42), step(0.45, lit));
      vec3 windowGlow = mix(warm, vec3(0.30, 0.75, 1.0), step(0.97, lit));
      totalEmissiveRadiance += sideWall * windowCell * randomOn * windowGlow * 2.1 * uCityNight;
    `);
  };
  mat.customProgramCacheKey = () => 'neon-infinite-windows-v3';
  return mat;
}

function paletteColor(name) {
  return { amber, cyan, red, white }[name] ?? amber;
}

function districtBaseColor(tone) {
  return { coral: 0xb7a8ab, red: 0x9b8c9c, gold: 0xc4b3a5, blue: 0x939fae }[tone] ?? 0xa9a9b2;
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
    this.night = false;
    this.geometry = {
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(0.4, 0.4, 1, 7),
      cone: new THREE.ConeGeometry(0.7, 1.2, 8),
      sphere: new THREE.SphereGeometry(0.5, 10, 10)
    };
    this.material = {
      body: bodyMaterial(),
      road: new THREE.MeshStandardMaterial({ color: 0x20242d, metalness: 0.1, roughness: 0.92 }),
      lane: new THREE.MeshBasicMaterial({ color: 0xf1d3a6, toneMapped: false }),
      shoulder: new THREE.MeshStandardMaterial({ color: 0x535d69, roughness: 0.94 }),
      curb: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 1 }),
      ground: new THREE.MeshStandardMaterial({ color: 0x7b8776, roughness: 1 }),
      foundation: new THREE.MeshStandardMaterial({ color: 0x404854, roughness: 0.9 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0x7d858d, roughness: 0.97 }),
      plaza: new THREE.MeshStandardMaterial({ color: 0xa7abae, roughness: 0.98 }),
      amber: new THREE.MeshBasicMaterial({ color: amber, toneMapped: false }),
      cyan: new THREE.MeshBasicMaterial({ color: cyan, toneMapped: false }),
      red: new THREE.MeshBasicMaterial({ color: red, toneMapped: false }),
      white: new THREE.MeshBasicMaterial({ color: white, toneMapped: false }),
      park: new THREE.MeshStandardMaterial({ color: 0x4f8c56, roughness: 1 }),
      treeLeaf: new THREE.MeshStandardMaterial({ color: 0x3d7442, roughness: 1 }),
      treeTrunk: new THREE.MeshStandardMaterial({ color: 0x6d5443, roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ color: 0x4db1d1, roughness: 0.24, metalness: 0.1 }),
      beacon: new THREE.MeshBasicMaterial({ color: 0xff674d, toneMapped: false }),
      beam: new THREE.MeshBasicMaterial({ color: 0xff4933, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide })
    };
    this.ringGeometry = new THREE.TorusGeometry(10, 0.35, 6, 40);
    this.sphereGeometry = new THREE.IcosahedronGeometry(2.7, 1);
    this.beamGeometry = new THREE.CylinderGeometry(0.8, 1.3, 130, 8, 1, true);
  }

  place(mesh, items, getPose) {
    items.forEach((item, i) => {
      tmp.position.set(0, 0, 0);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      getPose(tmp, item, i);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  buildingColor(building) {
    const tint = new THREE.Color(districtBaseColor(building.tone));
    tint.multiplyScalar(0.74 + hash2(building.gx, building.gz, this.seed + 50) * 0.35);
    return tint;
  }

  buildCars(cx, cz) {
    const colors = ['white', 'amber', 'cyan', 'red'];
    return Array.from({ length: 22 }, (_, i) => {
      const lane = Math.floor(hash2(cx * 30 + i, cz, this.seed + 156) * BLOCKS_PER_CHUNK);
      return {
        lane,
        offset: hash2(cx, cz * 30 + i, this.seed + 67) * CHUNK_SIZE,
        speed: (12 + hash2(cx - i, cz + i, this.seed + 34) * 28) * (i % 2 ? 1 : -1),
        direction: i % 3 === 0 ? 'x' : 'z',
        color: colors[i % colors.length],
        length: 5.4 + hash2(cx + i * 7, cz - i * 3, this.seed + 904) * 2.2,
        width: 2.4 + hash2(cx - i * 4, cz + i * 9, this.seed + 507) * 0.7,
        height: 1.2 + hash2(cx + i * 8, cz + i * 11, this.seed + 301) * 0.35,
        cabin: 0.44 + hash2(cx + i * 5, cz + i * 6, this.seed + 99) * 0.13
      };
    });
  }

  createChunk(cx, cz) {
    const plan = planChunk(cx, cz, this.seed);
    const group = new THREE.Group();
    const centerX = cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const centerZ = cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;

    const ground = new THREE.Mesh(this.geometry.plane, this.material.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.scale.set(CHUNK_SIZE, CHUNK_SIZE, 1);
    ground.position.set(centerX, -0.32, centerZ);
    group.add(ground);

    const roadIndices = Array.from({ length: BLOCKS_PER_CHUNK }, (_, i) => i);
    const roadsX = new THREE.InstancedMesh(this.geometry.plane, this.material.road, BLOCKS_PER_CHUNK);
    const roadsZ = new THREE.InstancedMesh(this.geometry.plane, this.material.road, BLOCKS_PER_CHUNK);
    this.place(roadsX, roadIndices, (o, i) => {
      o.position.set(cx * CHUNK_SIZE + i * BLOCK, 0.02, centerZ);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(ROAD, CHUNK_SIZE, 1);
    });
    this.place(roadsZ, roadIndices, (o, i) => {
      o.position.set(centerX, 0.025, cz * CHUNK_SIZE + i * BLOCK);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(CHUNK_SIZE, ROAD, 1);
    });
    group.add(roadsX, roadsZ);

    const laneMarks = [];
    const crosswalks = [];
    const curbs = [];
    for (let lane = 0; lane < BLOCKS_PER_CHUNK; lane++) {
      const worldLaneX = cx * CHUNK_SIZE + lane * BLOCK;
      const worldLaneZ = cz * CHUNK_SIZE + lane * BLOCK;
      curbs.push(
        { x: worldLaneX - ROAD * 0.5 - 2.1, z: centerZ, scaleX: 1.25, scaleZ: CHUNK_SIZE },
        { x: worldLaneX + ROAD * 0.5 + 2.1, z: centerZ, scaleX: 1.25, scaleZ: CHUNK_SIZE },
        { x: centerX, z: worldLaneZ - ROAD * 0.5 - 2.1, scaleX: CHUNK_SIZE, scaleZ: 1.25 },
        { x: centerX, z: worldLaneZ + ROAD * 0.5 + 2.1, scaleX: CHUNK_SIZE, scaleZ: 1.25 }
      );
      for (let n = 0; n < 12; n++) {
        laneMarks.push({ x: worldLaneX, z: cz * CHUNK_SIZE + n * 21 + 10, horizontal: false, length: 8.5, width: 0.3 });
        laneMarks.push({ x: cx * CHUNK_SIZE + n * 21 + 10, z: worldLaneZ, horizontal: true, length: 8.5, width: 0.3 });
      }
      for (let other = 0; other < BLOCKS_PER_CHUNK; other++) {
        const ix = cx * BLOCKS_PER_CHUNK + lane;
        const iz = cz * BLOCKS_PER_CHUNK + other;
        const x = (ix + 0.5) * BLOCK;
        const z = (iz + 0.5) * BLOCK;
        for (let s = -2; s <= 2; s++) {
          crosswalks.push({ x: x + s * 1.8, z: z - ROAD * 0.58, horizontal: true });
          crosswalks.push({ x: x + s * 1.8, z: z + ROAD * 0.58, horizontal: true });
          crosswalks.push({ x: x - ROAD * 0.58, z: z + s * 1.8, horizontal: false });
          crosswalks.push({ x: x + ROAD * 0.58, z: z + s * 1.8, horizontal: false });
        }
      }
    }
    const markMesh = new THREE.InstancedMesh(this.geometry.plane, this.material.lane, laneMarks.length);
    this.place(markMesh, laneMarks, (o, m) => {
      o.position.set(m.x, 0.045, m.z);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(m.horizontal ? m.length : m.width, m.horizontal ? m.width : m.length, 1);
    });
    const crosswalkMesh = new THREE.InstancedMesh(this.geometry.plane, this.material.white, crosswalks.length);
    this.place(crosswalkMesh, crosswalks, (o, m) => {
      o.position.set(m.x, 0.046, m.z);
      o.rotation.x = -Math.PI / 2;
      o.scale.set(m.horizontal ? 1.1 : 3.4, m.horizontal ? 3.4 : 1.1, 1);
    });
    const curbMesh = new THREE.InstancedMesh(this.geometry.box, this.material.curb, curbs.length);
    this.place(curbMesh, curbs, (o, c) => {
      o.position.set(c.x, 0.15, c.z);
      o.scale.set(c.scaleX, 0.3, c.scaleZ);
    });
    group.add(markMesh, crosswalkMesh, curbMesh);

    const lotPads = new THREE.InstancedMesh(this.geometry.box, this.material.sidewalk, BLOCKS_PER_CHUNK * BLOCKS_PER_CHUNK);
    const lots = [];
    for (let ix = 0; ix < BLOCKS_PER_CHUNK; ix++) {
      for (let iz = 0; iz < BLOCKS_PER_CHUNK; iz++) {
        lots.push({ x: (cx * BLOCKS_PER_CHUNK + ix + 0.5) * BLOCK, z: (cz * BLOCKS_PER_CHUNK + iz + 0.5) * BLOCK });
      }
    }
    this.place(lotPads, lots, (o, p) => {
      o.position.set(p.x, 0.21, p.z);
      o.scale.set(BLOCK - ROAD - 1.8, 0.42, BLOCK - ROAD - 1.8);
    });
    group.add(lotPads);

    if (plan.buildings.length) {
      const bases = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, plan.buildings.length);
      const podiums = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, plan.buildings.length);
      const bodies = new THREE.InstancedMesh(this.geometry.box, this.material.body, plan.buildings.length);
      const upperTowers = new THREE.InstancedMesh(this.geometry.box, this.material.body, plan.buildings.length);
      const roofUnits = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, plan.buildings.length);
      const crowns = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, plan.buildings.length);
      const ribbons = new THREE.InstancedMesh(this.geometry.box, this.material.amber, plan.buildings.filter(b => b.hasRibbon).length || 1);
      const skyGardens = new THREE.InstancedMesh(this.geometry.box, this.material.park, plan.buildings.filter(b => b.hasSkyGarden).length || 1);
      const helipads = new THREE.InstancedMesh(this.geometry.cylinder, this.material.white, plan.buildings.filter(b => b.hasHelipad).length || 1);
      const spires = new THREE.InstancedMesh(this.geometry.cylinder, this.material.white, plan.buildings.filter(b => b.hasAntenna).length || 1);

      this.place(bases, plan.buildings, (o, b) => {
        o.position.set(b.x, 1.1, b.z);
        o.scale.set(b.width + 6.5, 2.2, b.depth + 6.5);
      });
      this.place(podiums, plan.buildings, (o, b) => {
        o.position.set(b.x, b.podiumHeight * 0.5 + 2.2, b.z);
        o.scale.set(Math.min(BLOCK - ROAD - 8, b.width + 4.6), b.podiumHeight, Math.min(BLOCK - ROAD - 8, b.depth + 4.6));
      });
      this.place(bodies, plan.buildings, (o, b) => {
        const mainHeight = Math.max(12, b.height - Math.min(18, b.podiumHeight));
        o.position.set(b.x, b.podiumHeight + mainHeight * 0.5 + 2.2, b.z);
        o.scale.set(b.width, mainHeight, b.depth);
      });
      this.place(upperTowers, plan.buildings, (o, b) => {
        const mainHeight = Math.max(12, b.height - Math.min(18, b.podiumHeight));
        const upperHeight = Math.max(12, mainHeight * (0.22 + b.terraceLevels * 0.08));
        o.position.set(b.x, b.podiumHeight + mainHeight - upperHeight * 0.5 + 2.2, b.z);
        o.scale.set(Math.max(9, b.width * b.taper), upperHeight, Math.max(9, b.depth * (b.slender ? b.taper * 0.88 : b.taper)));
      });
      this.place(roofUnits, plan.buildings, (o, b) => {
        o.position.set(b.x, b.height + b.roofUnitHeight * 0.5 + 2.2, b.z);
        o.scale.set(Math.max(6, b.width * 0.38), b.roofUnitHeight, Math.max(6, b.depth * 0.38));
      });
      this.place(crowns, plan.buildings, (o, b) => {
        const crownScale = [0.66, 0.58, 0.74, 0.5][b.crownType] ?? 0.64;
        const crownHeight = 5.2 + b.crownType * 1.8;
        o.position.set(b.x, b.height + b.roofUnitHeight + crownHeight * 0.5 + 2.2, b.z);
        o.scale.set(Math.max(5, b.width * crownScale), crownHeight, Math.max(5, b.depth * crownScale));
      });

      for (let i = 0; i < plan.buildings.length; i++) {
        const tint = this.buildingColor(plan.buildings[i]);
        bodies.setColorAt(i, tint);
        upperTowers.setColorAt(i, tint.clone().multiplyScalar(0.92));
      }
      bodies.instanceColor.needsUpdate = true;
      upperTowers.instanceColor.needsUpdate = true;
      group.add(bases, podiums, bodies, upperTowers, roofUnits, crowns);

      const ribbonBuildings = plan.buildings.filter(b => b.hasRibbon);
      if (ribbonBuildings.length) {
        this.place(ribbons, ribbonBuildings, (o, b) => {
          o.position.set(b.x + b.width * 0.5 + 0.22, b.height * 0.5 + b.podiumHeight * 0.5 + 2.2, b.z + b.depth * 0.5 + 0.22);
          o.scale.set(0.46, b.height + b.podiumHeight, 0.46);
        });
        group.add(ribbons);
      }

      const gardenBuildings = plan.buildings.filter(b => b.hasSkyGarden);
      if (gardenBuildings.length) {
        this.place(skyGardens, gardenBuildings, (o, b) => {
          o.position.set(b.x, b.height * 0.58 + b.podiumHeight * 0.5 + 2.2, b.z);
          o.scale.set(Math.max(7, b.width * 0.58), 1.4, Math.max(7, b.depth * 0.58));
        });
        group.add(skyGardens);
      }

      const helipadBuildings = plan.buildings.filter(b => b.hasHelipad);
      if (helipadBuildings.length) {
        this.place(helipads, helipadBuildings, (o, b) => {
          o.position.set(b.x, b.height + b.roofUnitHeight + 3.15, b.z);
          o.scale.set(Math.max(5, b.width * 0.22), 0.32, Math.max(5, b.depth * 0.22));
        });
        group.add(helipads);
      }

      const spireBuildings = plan.buildings.filter(b => b.hasAntenna);
      if (spireBuildings.length) {
        this.place(spires, spireBuildings, (o, b) => {
          o.position.set(b.x, b.height + b.roofUnitHeight + 11.5, b.z);
          o.scale.set(0.48, 18, 0.48);
        });
        group.add(spires);
      }
    }

    if (plan.parks.length) {
      const parks = new THREE.InstancedMesh(this.geometry.box, this.material.park, plan.parks.length);
      this.place(parks, plan.parks, (o, p) => {
        o.position.set(p.x, 0.45, p.z);
        o.scale.set(40, 0.9, 40);
      });
      group.add(parks);

      const trees = [];
      const pavilions = [];
      for (const park of plan.parks) {
        for (let i = 0; i < park.treeCount; i++) {
          const angle = hash2(park.gx + i * 3, park.gz - i * 2, this.seed + 500) * Math.PI * 2;
          const radius = 6 + hash2(park.gx + i * 5, park.gz + i * 7, this.seed + 777) * 13;
          trees.push({
            x: park.x + Math.cos(angle) * radius,
            z: park.z + Math.sin(angle) * radius,
            height: 6 + hash2(park.gx + i, park.gz + i, this.seed + 444) * 4.5,
            crown: 3.2 + hash2(park.gx - i, park.gz + i, this.seed + 151) * 2.1
          });
        }
        if (park.hasPavilion) {
          pavilions.push({ x: park.x, z: park.z, kind: park.kind });
        }
      }
      if (trees.length) {
        const treeTrunks = new THREE.InstancedMesh(this.geometry.box, this.material.treeTrunk, trees.length);
        const treeCrowns = new THREE.InstancedMesh(this.geometry.sphere, this.material.treeLeaf, trees.length);
        this.place(treeTrunks, trees, (o, t) => {
          o.position.set(t.x, t.height * 0.5, t.z);
          o.scale.set(0.9, t.height, 0.9);
        });
        this.place(treeCrowns, trees, (o, t) => {
          o.position.set(t.x, t.height + t.crown * 0.55, t.z);
          o.scale.set(t.crown, t.crown * 0.88, t.crown);
        });
        group.add(treeTrunks, treeCrowns);
      }
      if (pavilions.length) {
        const pavilionBases = new THREE.InstancedMesh(this.geometry.box, this.material.plaza, pavilions.length);
        const pavilionRoofs = new THREE.InstancedMesh(this.geometry.cone, this.material.foundation, pavilions.length);
        this.place(pavilionBases, pavilions, (o, p) => {
          o.position.set(p.x, 1.15, p.z);
          o.scale.set(p.kind === 'plaza' ? 8 : 6, 2.3, p.kind === 'plaza' ? 8 : 6);
        });
        this.place(pavilionRoofs, pavilions, (o, p) => {
          o.position.set(p.x, 5.4, p.z);
          o.scale.set(p.kind === 'plaza' ? 7 : 5.5, 4.8, p.kind === 'plaza' ? 7 : 5.5);
        });
        group.add(pavilionBases, pavilionRoofs);
      }
    }

    const lampPositions = [];
    for (let x = 0; x < BLOCKS_PER_CHUNK; x++) {
      for (let z = 0; z < BLOCKS_PER_CHUNK; z++) {
        const baseX = cx * CHUNK_SIZE + x * BLOCK;
        const baseZ = cz * CHUNK_SIZE + z * BLOCK;
        lampPositions.push(
          { x: baseX + ROAD * 0.5 + 1.8, z: baseZ + ROAD * 0.5 + 1.8 },
          { x: baseX - ROAD * 0.5 - 1.8, z: baseZ + ROAD * 0.5 + 1.8 },
          { x: baseX + ROAD * 0.5 + 1.8, z: baseZ - ROAD * 0.5 - 1.8 },
          { x: baseX - ROAD * 0.5 - 1.8, z: baseZ - ROAD * 0.5 - 1.8 }
        );
      }
    }
    const lampPosts = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, lampPositions.length);
    const lampHeads = new THREE.InstancedMesh(this.geometry.box, this.material.white, lampPositions.length);
    this.place(lampPosts, lampPositions, (o, p) => {
      o.position.set(p.x, 5.7, p.z);
      o.scale.set(0.38, 11.4, 0.38);
    });
    this.place(lampHeads, lampPositions, (o, p) => {
      o.position.set(p.x, 11.5, p.z);
      o.scale.set(1.3, 0.24, 1.3);
    });
    group.add(lampPosts, lampHeads);

    const carData = this.buildCars(cx, cz);
    const vehicleBatches = {};
    for (const color of ['white', 'amber', 'cyan', 'red']) {
      const cars = carData.filter(v => v.color === color);
      const body = new THREE.InstancedMesh(this.geometry.box, this.material[color], cars.length || 1);
      const cabin = new THREE.InstancedMesh(this.geometry.box, this.material.foundation, cars.length || 1);
      const headlights = new THREE.InstancedMesh(this.geometry.box, this.material.white, cars.length || 1);
      const taillights = new THREE.InstancedMesh(this.geometry.box, this.material.red, cars.length || 1);
      body.frustumCulled = cabin.frustumCulled = headlights.frustumCulled = taillights.frustumCulled = false;
      vehicleBatches[color] = { cars, body, cabin, headlights, taillights };
      group.add(body, cabin, headlights, taillights);
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
    data.group.traverse(object => {
      if (object.isInstancedMesh && typeof object.dispose === 'function') object.dispose();
    });
  }

  poseVehicle(data, car, object, localOffset, scale) {
    const p = ((car.offset + this.time * car.speed) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
    if (car.direction === 'z') {
      object.position.set(data.plan.cx * CHUNK_SIZE + car.lane * BLOCK + (car.speed > 0 ? 3.4 : -3.4), 1.2, data.plan.cz * CHUNK_SIZE + p);
      object.rotation.y = 0;
    } else {
      object.position.set(data.plan.cx * CHUNK_SIZE + p, 1.2, data.plan.cz * CHUNK_SIZE + car.lane * BLOCK + (car.speed > 0 ? -3.4 : 3.4));
      object.rotation.y = Math.PI * 0.5;
    }
    object.translateX(localOffset.x);
    object.translateY(localOffset.y);
    object.translateZ(localOffset.z * (car.speed >= 0 ? 1 : -1));
    object.scale.set(scale.x, scale.y, scale.z);
  }

  update(camera, dt) {
    this.time += dt;
    const cx = chunkCoord(camera.position.x);
    const cz = chunkCoord(camera.position.z);
    const nextKey = `${cx}/${cz}/${this.radius}`;
    if (this.currentKey !== nextKey) {
      this.currentKey = nextKey;
      const needed = new Set();
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
        if (!needed.has(key)) {
          this.releaseChunk(data);
          this.active.delete(key);
        }
      }
    }

    for (const data of this.active.values()) {
      if (data.beaconObject) {
        data.beaconObject.rotation.y += dt * 0.45;
        data.beaconObject.position.y = data.plan.beacon.y + Math.sin(this.time * 2.2 + data.plan.cx) * 2;
      }

      for (const batch of Object.values(data.vehicleBatches)) {
        const { cars, body, cabin, headlights, taillights } = batch;
        this.place(body, cars, (o, car) => {
          this.poseVehicle(data, car, o, { x: 0, y: car.height * 0.5, z: 0 }, { x: car.width, y: car.height, z: car.length });
        });
        this.place(cabin, cars, (o, car) => {
          this.poseVehicle(data, car, o, { x: 0, y: car.height + 0.38, z: -car.length * 0.06 }, { x: car.width * 0.72, y: car.height * 0.75, z: car.length * car.cabin });
        });
        this.place(headlights, cars, (o, car) => {
          this.poseVehicle(data, car, o, { x: 0, y: car.height * 0.68, z: car.length * 0.48 }, { x: car.width * 0.52, y: 0.11, z: 0.18 });
        });
        this.place(taillights, cars, (o, car) => {
          this.poseVehicle(data, car, o, { x: 0, y: car.height * 0.62, z: -car.length * 0.48 }, { x: car.width * 0.52, y: 0.11, z: 0.18 });
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
    this.material.road.color.setHex(enabled ? 0x0c1017 : 0x2a3038);
    this.material.ground.color.setHex(enabled ? 0x181d29 : 0x7b8776);
    this.material.park.color.setHex(enabled ? 0x17372e : 0x4f8c56);
    this.material.treeLeaf.color.setHex(enabled ? 0x264b2a : 0x3d7442);
    this.material.foundation.color.setHex(enabled ? 0x222a37 : 0x5d6572);
    this.material.sidewalk.color.setHex(enabled ? 0x505762 : 0x8c949d);
    this.material.curb.color.setHex(enabled ? 0x81868f : 0xc8ccd2);
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
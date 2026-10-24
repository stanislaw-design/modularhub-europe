import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Scena domku na słupach (spec 0076). Wymiary w metrach wg danych wpisu: dom 50,2 m² (9,2 x 5,46)
// i taras 42,3 m² (9,2 x 4,6), całość nad terenem. Model jest rysowany kodem, bez pliku .glb.
export const W = 9.2;
export const D = 5.46;
export const TERRACE_D = 4.6;
export const FLOOR_Y = 3;
const WALL_H = 2.7;
const Z_FRONT = D / 2 + TERRACE_D;
const Z_MID = (Z_FRONT - D / 2) / 2;

export type ChaletMode = "shell" | "frame";

// Prosty generator liczb deterministycznych: drzewa stoją zawsze w tych samych miejscach.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Tekstura drewna rysowana na płótnie: deski, szczeliny i słoje. Jeden kafel to 1 m x 1 m.
function woodTexture(base: [number, number, number], boards: number, seed: number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(seed);
  const width = size / boards;
  for (let i = 0; i < boards; i++) {
    const tone = 0.82 + rand() * 0.3;
    ctx.fillStyle = `rgb(${base[0] * tone | 0},${base[1] * tone | 0},${base[2] * tone | 0})`;
    ctx.fillRect(i * width, 0, width, size);
    for (let g = 0; g < 6; g++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.07})`;
      ctx.lineWidth = 1;
      const x = i * width + rand() * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rand() - 0.5) * 4, size);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(i * width, 0, 1.5, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Teren zanikający w przezroczystość na brzegu, żeby nie było twardej krawędzi dysku.
function groundTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(58,78,44,1)");
  gradient.addColorStop(0.55, "rgba(44,62,36,1)");
  gradient.addColorStop(1, "rgba(28,40,28,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Pudełko z siatką UV przeskalowaną do metrów, żeby deski miały tę samą szerokość na każdej ścianie.
function boxGeometry(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv;
  const scales: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let face = 0; face < 6; face++) {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v;
      uv.setXY(i, uv.getX(i) * scales[face][0], uv.getY(i) * scales[face][1]);
    }
  }
  return geometry;
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(boxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function shaped(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
  geometry.scale(sx, sy, sz);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

// Setki jednego materiału łączą się w jedną: kilkaset belek i drobiazgów to kilka wywołań rysowania.
// Cienie (liczone raz, patrz renderer.shadowMap.autoUpdate) rzucają wszystko poza szkłem i terenem.
function mergeByMaterial(group: THREE.Group) {
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const child of [...group.children]) {
    if (!(child instanceof THREE.Mesh) || child.rotation.x !== 0) continue;
    const source = child.geometry as THREE.BufferGeometry;
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.translate(child.position.x, child.position.y, child.position.z);
    const list = byMaterial.get(child.material as THREE.Material) ?? [];
    list.push(geometry);
    byMaterial.set(child.material as THREE.Material, list);
    group.remove(child);
  }
  for (const [material, geometries] of byMaterial) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((part) => part.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

export function buildChaletScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Scena jest nieruchoma, więc cienie liczą się raz i przy zmianie widoku, nie co klatkę.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  scene.environment = pmrem.fromScene(environment, 0.04).texture;
  scene.environmentIntensity = 0.55;
  environment.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();

  const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...extra });

  const concrete = std(0x8d8a83, { roughness: 0.95 });
  const deck = std(0xffffff, { map: woodTexture([142, 104, 70], 7, 11), roughness: 0.7 });
  const cladding = std(0xffffff, { map: woodTexture([176, 112, 62], 8, 23), roughness: 0.65 });
  const wall = std(0xf3f0e8, { roughness: 0.9 });
  const roofMat = std(0x34373c, { roughness: 0.6, metalness: 0.15 });
  const dark = std(0x23262b, { roughness: 0.5, metalness: 0.4 });
  const pergolaWood = std(0x4a3a2c, { roughness: 0.7 });
  const frameWood = std(0xe6b36a, { roughness: 0.8 });
  const gravel = std(0x6c675d, { roughness: 1 });
  const stone = std(0x86837b, { roughness: 1 });
  const cushion = std(0xe9e1d2, { roughness: 1 });
  const furniture = std(0x2f3236, { roughness: 0.6 });
  const interior = std(0xf1c98e, { emissive: 0xf1c98e, emissiveIntensity: 0.25 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xa8cfe0,
    transparent: true,
    opacity: 0.22,
    roughness: 0.04,
    metalness: 0,
    envMapIntensity: 1.6,
    depthWrite: false,
  });
  const leaves = [std(0x3f6b3a, { flatShading: true }), std(0x2f5a34, { flatShading: true }), std(0x557a3a, { flatShading: true })];
  const trunk = std(0x4a3a2a);
  const pot = std(0x6b5648, { roughness: 0.9 });

  // Teren, podjazd, ścieżka i drzewa: zawsze widoczne.
  const base = new THREE.Group();
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture(), transparent: true, roughness: 1, depthWrite: false });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(24, 64), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  base.add(ground);
  base.add(box(W + 0.6, 0.05, Z_FRONT + D / 2 + 1, gravel, 0, 0.025, Z_MID));
  for (let i = 0; i < 6; i++) {
    base.add(box(1.1, 0.06, 0.55, stone, 3 + (i % 2 ? 0.25 : -0.25), 0.03, Z_FRONT + 1.2 + i * 0.95));
  }
  for (const x of [-W / 2 + 0.3, 0, W / 2 - 0.3]) {
    for (const z of [-D / 2 + 0.3, D / 2 - 0.3, Z_FRONT - 0.3]) {
      base.add(box(0.3, FLOOR_Y - 0.25, 0.3, concrete, x, (FLOOR_Y - 0.25) / 2, z));
    }
  }
  base.add(box(W, 0.25, D + TERRACE_D, deck, 0, FLOOR_Y - 0.125, Z_MID));
  const rand = seeded(7);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + rand() * 0.3;
    const radius = 14 + rand() * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius + 2;
    const size = 0.8 + rand() * 0.7;
    base.add(shaped(new THREE.CylinderGeometry(0.14 * size, 0.2 * size, 1.4 * size, 6), trunk, x, 0.7 * size, z));
    base.add(shaped(new THREE.IcosahedronGeometry(1.15 * size, 1), leaves[i % leaves.length], x, 2.1 * size, z, 1, 1.25, 1));
  }
  mergeByMaterial(base);
  scene.add(base);

  // Gotowy dom: ściany, przeszklenie, dach, pergola, balustrada, meble.
  const shell = new THREE.Group();
  const wy = FLOOR_Y + WALL_H / 2;
  shell.add(box(W, WALL_H, 0.2, wall, 0, wy, -D / 2 + 0.1));
  shell.add(box(0.2, WALL_H, D, wall, -W / 2 + 0.1, wy, 0));
  shell.add(box(0.2, WALL_H, D, cladding, W / 2 - 0.1, wy, 0));
  shell.add(box(1.3, WALL_H, 0.2, cladding, -W / 2 + 0.75, wy, D / 2 - 0.1));
  shell.add(box(1.3, WALL_H, 0.2, wall, W / 2 - 0.75, wy, D / 2 - 0.1));
  shell.add(box(W - 2.6, WALL_H, 0.05, glass, 0, wy, D / 2 - 0.1));
  for (const x of [-W / 2 + 1.4, -2.2, 0, 2.2, W / 2 - 1.4]) shell.add(box(0.07, WALL_H, 0.12, dark, x, wy, D / 2 - 0.1));
  shell.add(box(W - 2.6, 0.08, 0.12, dark, 0, FLOOR_Y + 0.04, D / 2 - 0.1));
  shell.add(box(W - 2.6, 0.08, 0.12, dark, 0, FLOOR_Y + WALL_H - 0.04, D / 2 - 0.1));
  // Okno w lewej ścianie.
  shell.add(box(0.05, 1.3, 2.6, glass, -W / 2 - 0.005, FLOOR_Y + 1.5, -0.2));
  shell.add(box(0.08, 1.4, 0.08, dark, -W / 2 - 0.02, FLOOR_Y + 1.5, -1.55));
  shell.add(box(0.08, 1.4, 0.08, dark, -W / 2 - 0.02, FLOOR_Y + 1.5, 1.15));
  shell.add(box(0.08, 0.08, 2.76, dark, -W / 2 - 0.02, FLOOR_Y + 2.18, -0.2));
  shell.add(box(0.08, 0.08, 2.76, dark, -W / 2 - 0.02, FLOOR_Y + 0.82, -0.2));
  // Dach z cienką okapnicą.
  const roofY = FLOOR_Y + WALL_H + 0.125;
  shell.add(box(W + 1, 0.25, D + 1.2, roofMat, 0, roofY, 0.3));
  shell.add(box(W + 1.04, 0.05, D + 1.24, dark, 0, roofY - 0.14, 0.3));
  // Pergola nad tarasem.
  const pergolaY = FLOOR_Y + WALL_H + 0.05;
  for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) shell.add(box(0.16, WALL_H + 0.05, 0.16, pergolaWood, x, FLOOR_Y + (WALL_H + 0.05) / 2, Z_FRONT - 0.3));
  shell.add(box(W, 0.18, 0.18, pergolaWood, 0, pergolaY, Z_FRONT - 0.3));
  for (let z = D / 2 + 1.0; z < Z_FRONT - 0.2; z += 0.38) shell.add(box(W - 0.3, 0.07, 0.16, pergolaWood, 0, pergolaY + 0.1, z));
  // Balustrada tarasu: poręcz, dolna listwa i słupki.
  const railY = FLOOR_Y + 0.45;
  shell.add(box(W, 0.05, 0.05, dark, 0, FLOOR_Y + 1, Z_FRONT - 0.03));
  shell.add(box(W, 0.04, 0.04, dark, 0, railY, Z_FRONT - 0.03));
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) {
    shell.add(box(0.05, 0.05, TERRACE_D, dark, x, FLOOR_Y + 1, D / 2 + TERRACE_D / 2));
    shell.add(box(0.04, 0.04, TERRACE_D, dark, x, railY, D / 2 + TERRACE_D / 2));
  }
  for (let x = -W / 2 + 0.03; x <= W / 2; x += 0.55) shell.add(box(0.025, 1, 0.025, dark, x, FLOOR_Y + 0.5, Z_FRONT - 0.03));
  for (let z = D / 2 + 0.55; z < Z_FRONT - 0.2; z += 0.55) {
    for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) shell.add(box(0.025, 1, 0.025, dark, x, FLOOR_Y + 0.5, z));
  }
  // Wnętrze widoczne przez szybę: sofa, dywan, stolik i lampa.
  shell.add(box(3.2, 0.05, 2.2, cushion, -0.8, FLOOR_Y + 0.03, 0.3));
  shell.add(box(2.4, 0.42, 0.95, furniture, -1.4, FLOOR_Y + 0.25, -0.2));
  shell.add(box(2.4, 0.55, 0.2, furniture, -1.4, FLOOR_Y + 0.55, -0.62));
  shell.add(box(2.2, 0.12, 0.8, cushion, -1.4, FLOOR_Y + 0.52, -0.1));
  shell.add(box(1.0, 0.06, 0.7, pergolaWood, 0.5, FLOOR_Y + 0.4, 0.55));
  shell.add(box(0.5, 0.5, 0.5, interior, 2.5, FLOOR_Y + 0.25, -1.6));
  shell.add(box(0.4, 1.6, 0.4, interior, -3.8, FLOOR_Y + 0.8, -1.9));
  // Stół i krzesła na tarasie, donice z roślinami.
  const tableZ = D / 2 + 2.7;
  shell.add(box(2.1, 0.06, 1.0, furniture, 1.6, FLOOR_Y + 0.78, tableZ));
  for (const dx of [-0.9, 0.9]) {
    for (const dz of [-0.4, 0.4]) shell.add(box(0.06, 0.78, 0.06, furniture, 1.6 + dx, FLOOR_Y + 0.39, tableZ + dz));
  }
  for (const dx of [-0.6, 0.6]) {
    for (const side of [-1, 1]) {
      shell.add(box(0.45, 0.06, 0.45, furniture, 1.6 + dx, FLOOR_Y + 0.45, tableZ + side * 0.85));
      shell.add(box(0.45, 0.5, 0.05, furniture, 1.6 + dx, FLOOR_Y + 0.7, tableZ + side * 1.05));
    }
  }
  for (const x of [-W / 2 + 0.7, W / 2 - 0.7]) {
    shell.add(shaped(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 8), pot, x, FLOOR_Y + 0.25, Z_FRONT - 0.7));
    shell.add(shaped(new THREE.IcosahedronGeometry(0.45, 1), leaves[2], x, FLOOR_Y + 0.85, Z_FRONT - 0.7, 1, 1.2, 1));
  }
  mergeByMaterial(shell);
  scene.add(shell);

  // Szkielet: słupki ścian co 0,6 m, rygle, belki stropu i krokwie dachu.
  const frame = new THREE.Group();
  const stud = (x: number, z: number) => frame.add(box(0.08, WALL_H, 0.12, frameWood, x, wy, z));
  for (let x = -W / 2 + 0.1; x <= W / 2 - 0.05; x += 0.6) {
    stud(x, -D / 2 + 0.1);
    stud(x, D / 2 - 0.1);
  }
  for (let z = -D / 2 + 0.7; z < D / 2 - 0.1; z += 0.6) {
    frame.add(box(0.12, WALL_H, 0.08, frameWood, -W / 2 + 0.1, wy, z));
    frame.add(box(0.12, WALL_H, 0.08, frameWood, W / 2 - 0.1, wy, z));
  }
  for (const y of [FLOOR_Y + 0.03, FLOOR_Y + WALL_H - 0.03]) {
    frame.add(box(W, 0.06, 0.12, frameWood, 0, y, -D / 2 + 0.1));
    frame.add(box(W, 0.06, 0.12, frameWood, 0, y, D / 2 - 0.1));
    frame.add(box(0.12, 0.06, D, frameWood, -W / 2 + 0.1, y, 0));
    frame.add(box(0.12, 0.06, D, frameWood, W / 2 - 0.1, y, 0));
  }
  for (let x = -W / 2 + 0.3; x <= W / 2; x += 0.6) {
    frame.add(box(0.08, 0.25, D + TERRACE_D, frameWood, x, FLOOR_Y - 0.375, Z_MID));
    frame.add(box(0.08, 0.12, D + 1, frameWood, x, FLOOR_Y + WALL_H + 0.1, 0.3));
  }
  frame.add(box(W, 0.12, 0.08, frameWood, 0, FLOOR_Y + WALL_H + 0.1, -D / 2 - 0.2));
  frame.add(box(W, 0.12, 0.08, frameWood, 0, FLOOR_Y + WALL_H + 0.1, D / 2 + 0.8));
  mergeByMaterial(frame);
  frame.visible = false;
  scene.add(frame);

  // Światła: liczba świateł jest stała, więc przełączanie widoku nie kompiluje shaderów od nowa.
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x4a5a3c, 0.55));
  const sun = new THREE.DirectionalLight(0xffd3a0, 3.1);
  sun.position.set(14, 9, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -17;
  cam.right = 17;
  cam.top = 17;
  cam.bottom = -17;
  cam.near = 1;
  cam.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb0ff, 0.7);
  fill.position.set(-12, 6, -8);
  scene.add(fill);
  const lamp = new THREE.PointLight(0xffc27a, 14, 8, 2);
  lamp.position.set(0, FLOOR_Y + 2.2, 0.4);
  scene.add(lamp);

  return {
    setMode(mode: ChaletMode) {
      shell.visible = mode === "shell";
      frame.visible = mode === "frame";
      lamp.intensity = mode === "shell" ? 14 : 0;
      renderer.shadowMap.needsUpdate = true;
    },
  };
}

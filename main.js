import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/controls/PointerLockControls.js';

// --- Basic scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 1.6, 4); // eye height ~1.6m

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 10, 5);
scene.add(dir);

// --- Simple room placeholder (if GLB not present) ---
function buildDemoRoom() {
  const room = new THREE.Group();

  const roomSize = { x: 12, y: 3.2, z: 18 };
  const matWall = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9, metalness: 0.0 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 1.0, metalness: 0.0 });
  const matCeil  = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 1.0, metalness: 0.0 });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.x, roomSize.z), matFloor);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  room.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(roomSize.x, roomSize.z), matCeil);
  ceil.rotation.x =  Math.PI/2;
  ceil.position.y = roomSize.y;
  room.add(ceil);

  // Walls (thin boxes)
  const wallThickness = 0.2;
  const wall1 = new THREE.Mesh(new THREE.BoxGeometry(roomSize.x, roomSize.y, wallThickness), matWall);
  wall1.position.set(0, roomSize.y/2, -roomSize.z/2);
  const wall2 = new THREE.Mesh(new THREE.BoxGeometry(roomSize.x, roomSize.y, wallThickness), matWall);
  wall2.position.set(0, roomSize.y/2,  roomSize.z/2);
  const wall3 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomSize.y, roomSize.z), matWall);
  wall3.position.set(-roomSize.x/2, roomSize.y/2, 0);
  const wall4 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomSize.y, roomSize.z), matWall);
  wall4.position.set(roomSize.x/2, roomSize.y/2, 0);
  room.add(wall1, wall2, wall3, wall4);

  // Some "frames" on walls
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  for (let i = -2; i <= 2; i++) {
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), frameMat);
    frame.position.set(i * 2.0, 1.5, -roomSize.z/2 + 0.11);
    room.add(frame);
  }

  // Simple pedestals
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.9 });
  for (let k = -2; k <= 2; k += 2) {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), pedMat);
    ped.position.set(k * 1.5, 0.45, -2 + (k%4===0? -1 : 1));
    room.add(ped);
  }

  scene.add(room);
  return { roomSize };
}

let worldBounds = { x: 5.5, z: 8.5 }; // default; will update if GLB provides bounds
const demo = buildDemoRoom(); // builds placeholder room

// --- Pointer Lock Controls (WASD + mouse) ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());

const move = { forward:false, backward:false, left:false, right:false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

addEventListener('keydown', (e)=>{
  if (e.code==='KeyW' || e.code==='ArrowUp') move.forward = true;
  if (e.code==='KeyS' || e.code==='ArrowDown') move.backward = true;
  if (e.code==='KeyA' || e.code==='ArrowLeft') move.left = true;
  if (e.code==='KeyD' || e.code==='ArrowRight') move.right = true;
});
addEventListener('keyup', (e)=>{
  if (e.code==='KeyW' || e.code==='ArrowUp') move.forward = false;
  if (e.code==='KeyS' || e.code==='ArrowDown') move.backward = false;
  if (e.code==='KeyA' || e.code==='ArrowLeft') move.left = false;
  if (e.code==='KeyD' || e.code==='ArrowRight') move.right = false;
});

function clampMovement() {
  // Simple bounds clamp to keep the player inside the room.
  const obj = controls.getObject();
  const x = obj.position.x;
  const z = obj.position.z;
  obj.position.x = THREE.MathUtils.clamp(x, -worldBounds.x, worldBounds.x);
  obj.position.z = THREE.MathUtils.clamp(z, -worldBounds.z, worldBounds.z);
  // Keep eye height constant at ~1.6m for simplicity
  obj.position.y = 1.6;
}

function updateMovement() {
  const delta = clock.getDelta();
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(move.forward) - Number(move.backward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  const speed = 3.5; // m/s
  if (move.forward || move.backward) velocity.z -= direction.z * speed * delta;
  if (move.left || move.right)       velocity.x -= direction.x * speed * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  clampMovement();
}

// --- Try to load a GLB placed at /assets/sample.glb ---
const loader = new GLTFLoader();
loader.load('./assets/sample.glb', (gltf)=>{
  console.log('Loaded GLB: assets/sample.glb');
  const model = gltf.scene;
  scene.add(model);

  // Optional: compute bounds to set walk area limits
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  worldBounds.x = Math.max(worldBounds.x, size.x*0.45);
  worldBounds.z = Math.max(worldBounds.z, size.z*0.45);
}, (xhr)=>{
  // progress
}, (err)=>{
  console.warn('No GLB found at ./assets/sample.glb; using demo room only.');
});

// --- Resize ---
addEventListener('resize', ()=>{
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- Render loop ---
function animate(){
  requestAnimationFrame(animate);
  updateMovement();
  renderer.render(scene, camera);
}
animate();

import * as THREE from "three";
import { OrbitControls } from "OrbitControls";
import { RoundedBoxGeometry } from "RoundedBoxGeometry";
import { RGBELoader } from "RGBELoader";
import { TWEEN } from "Tween";
import { Booster } from "./booster.js";
import { Score } from "./score.js";

const RED = 0xFF3B30;
const ORANGE = 0xFF9500;
const YELLOW = 0xFFCC00;
const GREEN = 0x4CD964;
const TEAL = 0x5AC8FA;
const BLUE = 0x007AFF;
const PURPLE = 0x5856D6;
const PINK = 0xFF2D55;
const COLORS = [RED, GREEN, BLUE, YELLOW, ORANGE, TEAL, PURPLE, PINK];

init();

export function init() {
  let booster = new Booster();
  let score = new Score(booster);
  const spheres = [];
  const boxes = [];
  let maxColor = 2;
  let rotationSpeed = 0.5;

  const container = document.getElementById("container");
  const start = document.getElementById("start");

  const clock = new THREE.Clock();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerCheck = false;
  let running = false;

  const scene = new THREE.Scene();
  scene.background = null; // transparent

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 5000);
  camera.position.set(-6, 3, 7);

  const audioLoader = new THREE.AudioLoader();
  const sounds = {};
  let listener;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;

  const light = new THREE.AmbientLight(0xfff0dd, 1);
  scene.add(light);

  const hdrEquirect = new RGBELoader().load(
    "hdr/neon.hdr",
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );
  scene.background = hdrEquirect;

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0,
    transmission: 1, // Transparency
    thickness: 0.3,
    clearcoat: 0.5,
    envMap: hdrEquirect,
    envMapIntensity: 2,
  });

  const metalMaterials = COLORS.map((color) => {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0,
      metalness: 0.65,
      transmission: 0, // Solid
      thickness: 1.0,
      clearcoat: 1.0,
      envMap: hdrEquirect,
      envMapIntensity: 1.25,
    });
  });

  const dice = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        const box = addBox([i, j, k]);
        boxes.push(box);
        dice.add(box);
      }
    }
  }
  scene.add(dice);
  render();

  function render() {
    requestAnimationFrame(render);

    if (rotationSpeed > 0) {
      const delta = clock.getDelta();
      dice.rotation.y += rotationSpeed * delta;
    }

    controls.update();
    TWEEN.update();
    booster.update();
    renderer.render(scene, camera);

    checkIntersections();
  }

  function startGame() {
    if (running) {
      return;
    }
    running = true;
    start.style.display = "none";

    boxes.forEach((box) => {
      box.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0.1);
    });

    setInterval(() => {
      spawn();
    }, 500);

    playAmbient();
  }

  function spawn() {
    const index = THREE.MathUtils.randInt(0, dice.children.length - 1);
    const box = dice.children[index];
    if (box.children.length === 0) {
      const color = THREE.MathUtils.randInt(0, maxColor - 1);
      addSphere(box, metalMaterials[color]);
      playAppear();
    }
  }

  function checkIntersections() {
    if (!pointerCheck) {
      return;
    }
    pointerCheck = false;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(spheres);
    if (intersects.length === 3) {
      const same = !!intersects.reduce((material, intersection) => {
        if (material === null) {
          return null;
        } else if (material === undefined) {
          material = intersection.object.material;
        } else if (material !== intersection.object.material) {
          material = null;
        }
        return material;
      }, undefined);
      if (same) {
        const intersectionSpheres = intersects.map((intersect) => {
          return intersect.object;
        });
        removeSpheres(intersectionSpheres);
      }
    }
  }

  function onPointerDown(event) {
    // calculate pointer position in normalized device coordinates (-1 to +1) for both components
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    pointerCheck = true;
    rotationSpeed = 0;
    if (!running) {
      startGame();
    }
  }

  function addBox(position) {
    const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 16, 0);
    const box = new THREE.Mesh(boxGeometry, glassMaterial);
    box.position.set(...position);
    box.name = `box:${ position.join("") }`;
    return box;
  }

  function addSphere(box, material) {
    const sphereGeometry = new THREE.SphereGeometry(0.25, 32, 16);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.name = `sphere:${ Object.values(box.position).join("") }`;
    box.add(sphere);
    sphere.scale.x = 0;
    sphere.scale.y = 0;
    sphere.scale.z = 0;
    const appear = new TWEEN.Tween(sphere.scale).to({
      x: 1,
      y: 1,
      z: 1,
    }, 1000).easing(TWEEN.Easing.Elastic.Out);
    appear.start();
    spheres.push(sphere);
    return sphere;
  }

  async function removeSpheres(spheres) {
    const [firstSphere, middleSphere, lastSphere] = spheres;
    await explodeSphere(firstSphere);
    await explodeSphere(middleSphere);
    await explodeSphere(lastSphere);
    score.addScore(1);
  }

  async function explodeSphere(sphere) {
    return new Promise((resolve) => {
      const tween = new TWEEN.Tween(sphere.scale).to({
        x: 20,
        y: 20,
        z: 20,
      }, 250).easing(TWEEN.Easing.Elastic.In).onComplete(() => {
        playPop();
        removeSphere(sphere);
        resolve();
      });
      tween.start();
    });
  }

  function removeSphere(sphere) {
    if (sphere) {
      sphere.removeFromParent();
      const indexOfObject = spheres.findIndex(_sphere => {
        return _sphere === sphere;
      });
      if (indexOfObject >= 0) {
        spheres.splice(indexOfObject, 1);
      }
    }
  }

  function initListener() {
    if (!listener) {
      listener = new THREE.AudioListener();
      camera.add(listener);
    }
  }

  function playAmbient() {
    initListener();
    if (sounds.ambient) {
      sounds.ambient.play();
      return;
    }
    sounds.ambient = new THREE.Audio(listener);
    audioLoader.load("sfx/ambient.mp3", (buffer) => {
      sounds.ambient.setBuffer(buffer);
      sounds.ambient.setLoop(true);
      sounds.ambient.setVolume(0.5);
      sounds.ambient.play();
    });
  }

  function playAppear() {
    initListener();
    if (sounds.appear) {
      sounds.appear.play();
      return;
    }
    sounds.appear = new THREE.Audio(listener);
    audioLoader.load("sfx/appear.mp3", (buffer) => {
      sounds.appear.setBuffer(buffer);
      sounds.appear.setVolume(2);
      sounds.appear.play();
    });
  }

  function playPop() {
    initListener();
    if (sounds.pop) {
      sounds.pop.play();
      return;
    }
    sounds.pop = new THREE.Audio(listener);
    audioLoader.load("sfx/pop.mp3", (buffer) => {
      sounds.pop.setBuffer(buffer);
      sounds.pop.setVolume(2);
      sounds.pop.play();
    });
  }

  function gameOver() {
    // TODO: Check all boxes are full
  }

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("pointerdown", onPointerDown);
}
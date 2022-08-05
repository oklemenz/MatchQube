import * as THREE from 'three';

import { OrbitControls } from 'https://unpkg.com/three@0.143.0/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.143.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'https://unpkg.com/three@0.143.0/examples/jsm/loaders/RGBELoader.js';
import { TWEEN } from 'https://unpkg.com/three@0.143.0/examples/jsm/libs/tween.module.min'
import { FontLoader } from 'https://unpkg.com/three@0.143.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://unpkg.com/three@0.143.0/examples/jsm/geometries/TextGeometry.js';

const RED = 0xFF3B30;
const ORANGE = 0xFF9500;
const YELLOW = 0xFFCC00;
const GREEN = 0x4CD964;
const TEAL = 0x5AC8FA;
const BLUE = 0x007AFF;
const PURPLE = 0x5856D6;
const PINK = 0xFF2D55;
const COLORS = [RED, GREEN, BLUE, YELLOW, ORANGE, TEAL, PURPLE, PINK];

// TODOs
// - Booster Factor, 1x, 2x (increase after match, decrease after time => circular progress indicator)
// - Score, increased by match to score (Combos?)
// - Highscore (localStorage)
// - Increasing spawn frequency
// - Increasing colors (start with 1 color)
// - Match animation: Line (Camera through Spheres) + Particle System
// - No-match animation: Grow/Shrink spheres one after the other
// - Sound effects, background music (spherical) =>
//   - https://www.youtube.com/watch?v=v032bWPTqyI
//   - https://www.youtube.com/watch?v=-lAZfyAJKYo
// - Partially overlapping (check point around center)
// - Animate appear (from small to fill cube to sphere) => tweenjs
// - Improve sounds
// - Matrix logic (all in row (three axis), next, previous, above, below, etc..

export function init() {
  const container = document.getElementById("container");

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
    "hdr/neon.hdr", // adobe stock (to be licensed under oklemenz)
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

  const spheres = [];
  const boxes = [];
  let maxColor = 2;
  let rotationSpeed = 0.5;

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
  //showPressToStart();
  render();

  function render() {
    requestAnimationFrame(render);

    if (rotationSpeed > 0) {
      const delta = clock.getDelta();
      dice.rotation.y += rotationSpeed * delta;
    }

    controls.update();
    TWEEN.update();
    renderer.render(scene, camera);

    checkIntersections();
  }

  function startGame() {
    if (running) {
      return;
    }
    running = true;

    boxes.forEach((box) => {
      box.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0.1);
    });

    // new TWEEN.Tween({ val: 0 }).to({ val: 1 }, 1000).onUpdate((v) => {
    // }).start();

    setInterval(() => {
      spawn();
    }, 2500);

    playAmbient();
  }

  function spawn() {
    const index = THREE.MathUtils.randInt(0, dice.children.length - 1);
    const box = dice.children[index];
    if (box.children.length === 0) {
      const color = THREE.MathUtils.randInt(0, maxColor);
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
        playPop();
        intersects.forEach((intersect) => {
          removeSphere(intersect.object);
        });
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
    const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 16);
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.name = `sphere:${ Object.values(box.position).join("") }`;
    box.add(sphere);
    spheres.push(sphere);
    return sphere;
  }

  function removeSphere(sphereToBeRemoved) {
    if (sphereToBeRemoved) {
      sphereToBeRemoved.removeFromParent();
      const indexOfObject = spheres.findIndex(sphere => {
        return sphere === sphereToBeRemoved;
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

  function showPressToStart() {
    const loader = new FontLoader();
    loader.load("font/helvetiker_bold.typeface.json", (font) => {
      const textGeometry = new TextGeometry("Press To Start", {
        font: font,
        size: 100,
        height: 5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 10,
        bevelSize: 8,
        bevelOffset: 0,
        bevelSegments: 5
      });
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
      const text = new THREE.Mesh(textGeometry, material);
      //text.position = { x: 0, y: -80, z: 0 };
      camera.add(text);
    });
  }

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("pointerdown", onPointerDown);
}

init();

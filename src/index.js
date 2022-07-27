import * as THREE from 'three';

import { OrbitControls } from 'https://unpkg.com/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.142.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'https://unpkg.com/three@0.142.0/examples/jsm/loaders/RGBELoader.js';

export function init() {
  const container = document.getElementById("container");

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = null; // transparent

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 5000);
  camera.position.set(-6, 3, 7);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;

  const light = new THREE.AmbientLight(0xfff0dd, 1);
  scene.add(light);

  const hdrEquirect = new RGBELoader().load(
    "hdr/quarry_04_2k.hdr", // https://polyhaven.com
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );
  scene.background = hdrEquirect;

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0,
    transmission: 1, // Add transparency
    thickness: 0.3,
    clearcoat: 0.5,
    envMap: hdrEquirect,
    envMapIntensity: 2.5,
  });

  const metalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff0000, // Red
    roughness: 0,
    metalness: 1.0,
    transmission: 0, // Solid
    thickness: 0.3,
    clearcoat: 1.0,
    envMap: hdrEquirect,
    envMapIntensity: 2.5,
  });

  cube();
  animate();

  function cube() {
    const dice = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          dice.add(newBox(i, j, k));
        }
      }
    }
    scene.add(dice);
  }

  function newBox(...position) {
    const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 16, 0.1);
    boxGeometry.name = `box-${position.x}-${position.y}-${position.z}`;
    const box = new THREE.Mesh(boxGeometry, glassMaterial);
    box.position.set(...position);
    const sphere = newSphere(0, 0, 0);
    box.add(sphere);
    return box;
  }

  function newSphere(...position) {
    const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 16);
    const sphere = new THREE.Mesh(sphereGeometry, metalMaterial);
    sphere.position.set(...position);
    return sphere;
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

init();

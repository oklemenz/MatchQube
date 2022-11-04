import * as THREE from "three";
import { OrbitControls } from "OrbitControls";
import { RGBELoader } from "RGBELoader";
import { TWEEN } from "Tween";
import { Audio } from "./audio.js";
import { Booster } from "./booster.js";
import { Score } from "./score.js";
import { Dice } from "./dice.js";

init();

// TODO: Decrease spawnRate
// TODO: Increase colors
// TODO:

export function init() {
  const container = document.getElementById("container");
  const status = document.getElementById("status");

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
    "hdr/neon.hdr",
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );
  scene.background = hdrEquirect;

  const booster = new Booster();
  const score = new Score(booster);
  const audio = new Audio(camera);
  const dice = new Dice(scene, camera, audio, score);
  scene.add(dice);
  setStatus("Click to Start");
  render();

  function render() {
    requestAnimationFrame(render);
    TWEEN.update();
    controls.update();
    booster.update();
    if (dice.check() && dice.running) {
      gameOver();
    }
    dice.update();
    renderer.render(scene, camera);
  }

  function startGame() {
    if (dice.running) {
      return;
    }
    booster.reset();
    score.reset();
    dice.reset();
    dice.start();
    audio.playAmbient();
    clearStatus();
  }

  function gameOver() {
    dice.stop();
    setStatus("Game Over - Click to Start");
  }

  function setStatus(text) {
    status.innerText = text;
    status.style.display = "block";
  }

  function clearStatus() {
    status.innerText = "";
    status.style.display = "none";
  }

  function onPointerUp(event) {
    // calculate pointer position in normalized device coordinates (-1 to +1) for both components
    dice.setPointer((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  }

  window.addEventListener("pointerup", onPointerUp);
  status.addEventListener("click", startGame);

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
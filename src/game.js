import * as THREE from "three";
import { OrbitControls } from "OrbitControls";
import { RGBELoader } from "RGBELoader";
import { TWEEN } from "Tween";

import { Audio } from "./audio.js";
import { Booster } from "./booster.js";
import { Score } from "./score.js";
import { Materials } from "./materials.js";
import { Dice } from "./dice.js";

init();

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

  const hdrEquirect = new RGBELoader().load("hdr/neon.hdr", () => {
    hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
  });
  scene.background = hdrEquirect;

  const booster = new Booster();
  const score = new Score(booster);
  const audio = new Audio(camera);
  const materials = new Materials(scene);
  const dice = new Dice(camera, audio, materials, score);
  scene.add(dice);
  setStatus("Click to Start");
  render();

  function render() {
    requestAnimationFrame(render);

    update();
    renderer.render(scene, camera);
  }

  function update() {
    TWEEN.update();
    controls.update();
    booster.update();
    dice.update();
    if (dice.check() && dice.running) {
      gameOver();
    }
    // TODO: Slowly decrease spawnRate
    // TODO: Increase colors after reaching points 100 / 200, etc..
  }

  function startGame() {
    if (dice.running) {
      return;
    }
    score.reset();
    dice.start();
    audio.playAmbient();
    clearStatus();
  }

  function gameOver() {
    dice.stop();
    booster.reset();
    setStatus("Game Over - Click to Start");
    audio.playEnd();
  }

  function setStatus(text) {
    status.innerText = text;
    status.style.display = "block";
  }

  function clearStatus() {
    status.innerText = "";
    status.style.display = "none";
  }

  function onPointerDown(event) {
    this.pointer = {x: event.clientX, y: event.clientY};
    dice.stopAutoRotate();
  }

  function onPointerMove(event) {
    if (this.pointer && distance(this.pointer, {x: event.clientX, y: event.clientY}) > 2) {
      dice.resetPointer();
      this.pointer = null;
    }
  }

  function onPointerUp(event) {
    if (this.pointer) {
      this.pointer = null;
      // calculate pointer position in normalized device coordinates (-1 to +1) for both components
      dice.setPointer((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
      dice.startAutoRotate();
    }
  }

  function distance(pointA, pointB){
    return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));
  }

  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  status.addEventListener("click", startGame);

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
}

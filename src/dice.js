import * as THREE from "three";
import { TWEEN } from "Tween";

import { Box } from "./box.js";

export class Dice extends THREE.Group {
  constructor(camera, audio, materials, score) {
    super();

    this.camera = camera;
    this.audio = audio;
    this.materials = materials;
    this.score = score;

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this.boxes = [];
    this.spheres = [];
    this.colors = 2;
    this.spawnRate = 3000;
    this.minSpawnRate = 1000;
    this.spawnDecreaseRate = 1;
    this.running = false;
    this.autoRotationSpeed = 0;
    this.autoRotationSpeed = 0;
    this.pointer = new THREE.Vector2();
    this.pointerCheck = false;

    this.setup();
    this.startAutoRotate();
  }

  setup() {
    // x
    for (let i = -1; i <= 1; i++) {
      // y
      for (let j = -1; j <= 1; j++) {
        // z
        for (let k = -1; k <= 1; k++) {
          const box = new Box([i, j, k], this.materials);
          this.add(box);
          this.boxes.push(box);
        }
      }
    }
  }

  setPointer(x, y) {
    if (this.running) {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointerCheck = true;
    }
  }

  resetPointer() {
    this.pointer.x = 0;
    this.pointer.y = 0;
    this.pointerCheck = false;
  }

  start() {
    this.reset();
    this.boxes.forEach((box) => {
      box.start();
    });
    this.running = true;
    this.stopAutoRotate();
  }

  stop() {
    this.boxes.forEach((box) => {
      box.stop();
    });
    this.running = false;
    this.startAutoRotate();
  }

  startAutoRotate() {
    if (!this.running) {
      this.autoRotationSpeed = 0.5;
    }
  }

  stopAutoRotate() {
    this.autoRotationSpeed = 0;
  }

  reset() {
    this.boxes.forEach((box) => {
      box.reset();
    });
    this.spheres = [];
  }

  check() {
    for (const box of this.boxes) {
      if (!box.check()) {
        return false;
      }
    }
    return true;
  }

  update() {
    if (this.autoRotationSpeed > 0) {
      this.rotation.y += this.autoRotationSpeed / 100;
    }
    this.checkSpawn();
    this.checkIntersections();
  }

  async removeSpheres(spheres) {
    const [firstSphere, middleSphere, lastSphere] = spheres;
    await this.explodeSphere(firstSphere);
    await this.explodeSphere(middleSphere);
    await this.explodeSphere(lastSphere);
    const scoreBefore = this.score.score;
    const scoreAfter = this.score.addScore();
    if (scoreAfter >= 100 && String(scoreAfter).length - String(scoreBefore) > 0 && this.colors < this.materials.colorCount - 1) {
      this.colors++;
    }
  }

  async blockSphere(sphere) {
    const tweenGrow = new TWEEN.Tween(sphere.scale)
      .to(
        {
          x: 1.5,
          y: 1.5,
          z: 1.5
        },
        250
      )
      .easing(TWEEN.Easing.Elastic.In)
      .onComplete(() => {
        this.audio.playBlock();
        const tweenShrink = new TWEEN.Tween(sphere.scale)
          .to(
            {
              x: 1,
              y: 1,
              z: 1
            },
            250
          )
          .easing(TWEEN.Easing.Elastic.Out);
        tweenShrink.start();
      });
    tweenGrow.start();
  }

  async explodeSphere(sphere) {
    return new Promise((resolve) => {
      // TODO: Particle explode (refine tween)
      const tween = new TWEEN.Tween(sphere.scale)
        .to(
          {
            x: 20,
            y: 20,
            z: 20
          },
          250
        )
        .easing(TWEEN.Easing.Elastic.In)
        .onComplete(() => {
          this.audio.playPop();
          this.removeSphere(sphere);
          resolve();
        });
      tween.start();
    });
  }

  removeSphere(sphere) {
    sphere.box.reset();
    const indexOfObject = this.spheres.findIndex((_sphere) => {
      return _sphere === sphere;
    });
    if (indexOfObject >= 0) {
      this.spheres.splice(indexOfObject, 1);
    }
  }

  checkSpawn() {
    const delta = this.clock.getElapsedTime() * 1000;
    if (delta > this.spawnRate) {
      this.clock.stop();
      this.spawn();
      if (this.spawnRate > this.minSpawnRate) {
        this.spawnRate -= this.spawnDecreaseRate;
      }
      this.clock.start();
    }
  }

  spawn() {
    if (!this.running) {
      return;
    }
    const index = this.randomFreeIndex();
    if (index >= 0) {
      const box = this.boxes[index];
      let color = -1;
      const random = THREE.MathUtils.randInt(0, 1) === 1;
      if (!random) {
        color = this.missingColorInAxes(index);
      }
      if (color === -1) {
        color = THREE.MathUtils.randInt(0, this.colors - 1);
      }
      const sphere = box.fill(color);
      this.spheres.push(sphere);
      this.audio.playAppear();
    }
  }

  checkIntersections() {
    if (!this.running || !this.pointerCheck) {
      return;
    }
    this.pointerCheck = false;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.spheres);
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
        const spheres = intersects.map((intersect) => {
          return intersect.object;
        });
        this.removeSpheres(spheres);
      }
    } else if (intersects.length > 0) {
      const sphere = intersects[0].object;
      this.blockSphere(sphere);
    }
  }

  randomFreeIndex() {
    const startIndex = THREE.MathUtils.randInt(0, this.boxes.length - 1);
    let index = startIndex;
    let box = this.boxes[index];
    let pass = false;
    while (box.children.length > 0) {
      index++;
      if (index >= this.boxes.length) {
        index = 0;
        pass = true;
      }
      if (pass && index === startIndex) {
        return -1;
      }
      box = this.children[index];
    }
    return index;
  }

  missingColorInAxes(index) {
    const colors = {
      x: {},
      y: {},
      z: {}
    };
    this.iterateIndexInAxes(index, (axis, iterationIndex) => {
      const box = this.boxes[iterationIndex];
      if (box.color >= 0) {
        colors[axis][box.color] = colors[axis][box.color] || 0;
        colors[axis][box.color]++;
      }
    });
    for (const axis of ["x", "y", "z"]) {
      for (const color in colors[axis]) {
        if (colors[axis][color] === 2) {
          return parseInt(color);
        }
      }
    }
    return -1;
  }

  convertPositionToIndex({ x, y, z }) {
    return x + 1 + (y + 1) * 3 + (z + 1) * 9;
  }

  convertIndexToPosition(index) {
    const z = Math.floor(index / 9) - 1;
    const y = Math.floor((index - (z + 1) * 9) / 3) - 1;
    const x = Math.floor(index - (z + 1) * 9 - (y + 1) * 3) - 1;
    return { x, y, z };
  }

  iterateIndexInAxes(index, cb, axes) {
    const p = this.convertIndexToPosition(index);
    if (!axes || axes.includes("x")) {
      for (let i = -1; i <= 1; i++) {
        // x
        cb("x", this.convertPositionToIndex({ x: i, y: p.y, z: p.z }));
      }
    }
    if (!axes || axes.includes("y")) {
      for (let j = -1; j <= 1; j++) {
        // y
        cb("y", this.convertPositionToIndex({ x: p.x, y: j, z: p.z }));
      }
    }
    if (!axes || axes.includes("z")) {
      for (let k = -1; k <= 1; k++) {
        // z
        cb("z", this.convertPositionToIndex({ x: p.x, y: p.y, z: k }));
      }
    }
  }
}

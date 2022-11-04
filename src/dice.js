import * as THREE from "three";
import { RoundedBoxGeometry } from "RoundedBoxGeometry";
import { TWEEN } from "Tween";

const RED = 0xFF3B30;
const ORANGE = 0xFF9500;
const YELLOW = 0xFFCC00;
const GREEN = 0x4CD964;
const TEAL = 0x5AC8FA;
const BLUE = 0x007AFF;
const PURPLE = 0x5856D6;
const PINK = 0xFF2D55;
const COLORS = [RED, GREEN, BLUE, YELLOW, ORANGE, TEAL, PURPLE, PINK];

export class Dice extends THREE.Group {

  constructor(scene, camera, audio, score) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.score = score;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();

    this.boxes = [];
    this.spheres = [];
    this.colors = 2;
    this.spawnRate = 1000;
    this.autoRotationSpeed = 0.5;
    this.running = false;

    this.pointer = new THREE.Vector2();
    this.pointerCheck = false;

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      roughness: 0,
      transmission: 1, // Transparency
      thickness: 0.3,
      clearcoat: 0.5,
      envMap: this.scene.background,
      envMapIntensity: 2,
    });

    this.metalMaterials = COLORS.map((color) => {
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0,
        metalness: 0.65,
        transmission: 0, // Solid
        thickness: 1.0,
        clearcoat: 1.0,
        envMap: this.scene.background,
        envMapIntensity: 1.25,
      });
    });

    this.setup();
  }

  setup() {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          const box = this.addBox([i, j, k]);
          this.boxes.push(box);
          this.add(box);
        }
      }
    }
  }

  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointerCheck = true;
  }

  start() {
    this.autoRotationSpeed = 0;
    this.boxes.forEach((box) => {
      box.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0.1);
    });
    this.startSpawn();
    this.running = true;
  }

  stop() {
    this.autoRotationSpeed = 0.5;
    this.boxes.forEach((box) => {
      box.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0);
    });
    this.stopSpawn();
    this.running = false;
  }

  reset() {
    this.spheres = [];
    this.boxes.forEach((box) => {
      for (const sphere of box.children) {
        sphere.removeFromParent();
      }
    });
  }

  check() {
    for (const box of this.boxes) {
      if (box.children.length === 0) {
        return false;
      }
    }
    return true;
  }

  update() {
    if (this.autoRotationSpeed > 0) {
      const delta = this.clock.getDelta();
      this.rotation.y += this.autoRotationSpeed * delta;
    }
    this.checkIntersections();
  }

  addBox(position) {
    const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 16, 0);
    const box = new THREE.Mesh(boxGeometry, this.glassMaterial);
    box.position.set(...position);
    box.name = `box:${ position.join("") }`;
    return box;
  }

  addSphere(box, material) {
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
    this.spheres.push(sphere);
    return sphere;
  }

  async removeSpheres(spheres) {
    const [firstSphere, middleSphere, lastSphere] = spheres;
    await this.explodeSphere(firstSphere);
    await this.explodeSphere(middleSphere);
    await this.explodeSphere(lastSphere);
    this.score.addScore(1);
  }

  async explodeSphere(sphere) {
    return new Promise((resolve) => {
      const tween = new TWEEN.Tween(sphere.scale).to({
        x: 20,
        y: 20,
        z: 20,
      }, 250).easing(TWEEN.Easing.Elastic.In).onComplete(() => {
        this.audio.playPop();
        this.removeSphere(sphere);
        resolve();
      });
      tween.start();
    });
  }

  removeSphere(sphere) {
    if (sphere) {
      sphere.removeFromParent();
      const indexOfObject = this.spheres.findIndex(_sphere => {
        return _sphere === sphere;
      });
      if (indexOfObject >= 0) {
        this.spheres.splice(indexOfObject, 1);
      }
    }
  }

  startSpawn() {
    this.stopSpawn();
    this.spawnInterval = setInterval(() => {
      this.spawn();
    }, this.spawnRate);
  }

  stopSpawn() {
    clearInterval(this.spawnInterval);
  }

  spawn() {
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
        return;
      }
      box = this.children[index];
    }
    if (box.children.length === 0) {
      const color = THREE.MathUtils.randInt(0, this.colors - 1);
      this.addSphere(box, this.metalMaterials[color]);
      this.audio.playAppear();
    }
  }

  checkIntersections() {
    if (!this.pointerCheck) {
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
        const intersectionSpheres = intersects.map((intersect) => {
          return intersect.object;
        });
        this.removeSpheres(intersectionSpheres);
      }
    }
  }
}
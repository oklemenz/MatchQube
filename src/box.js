import * as THREE from "three";
import { RoundedBoxGeometry } from "RoundedBoxGeometry";
import { TWEEN } from "Tween";

export class Box extends THREE.Mesh {

  constructor(position, materials) {
    const boxGeometry = new RoundedBoxGeometry(1, 1, 1, 16, 0);
    super(boxGeometry, materials.GLASS_MATERIAL);
    this.position.set(...position);
    this.name = `box:${ position.join("") }`;
    this.color = -1;
    this.fillMaterial = null;
    this.materials = materials;
  }

  start() {
    this.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0.1);
  }

  stop() {
    this.geometry = new RoundedBoxGeometry(1, 1, 1, 16, 0);
  }

  fill(color, animated = true) {
    this.reset();
    this.color = color;
    this.fillMaterial = this.materials.METAL_MATERIALS[this.color];
    const sphereGeometry = new THREE.SphereGeometry(0.25, 32, 16);
    const sphere = new THREE.Mesh(sphereGeometry, this.fillMaterial);
    sphere.name = `sphere:${ Object.values(this.position).join("") }`;
    this.add(sphere);
    if (animated) {
      sphere.scale.x = 0;
      sphere.scale.y = 0;
      sphere.scale.z = 0;
      const appear = new TWEEN.Tween(sphere.scale).to({
        x: 1,
        y: 1,
        z: 1,
      }, 1000).easing(TWEEN.Easing.Elastic.Out);
      appear.start();
    }
    sphere.box = this;
    return sphere;
  }

  reset() {
    this.color = -1;
    for (const sphere of this.children) {
      sphere.removeFromParent();
    }
  }

  check() {
    return this.children.length > 0;
  }
}
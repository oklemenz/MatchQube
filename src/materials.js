import * as THREE from "three";

export class Materials {
  constructor(scene) {
    this.scene = scene;

    this.COLOR = {
      RED: 0xff3b30,
      ORANGE: 0xff9500,
      YELLOW: 0xffcc00,
      GREEN: 0x4cd964,
      TEAL: 0x5ac8fa,
      BLUE: 0x007aff,
      PURPLE: 0x5856d6,
      PINK: 0xff2d55
    };

    this.COLORS = [
      this.COLOR.RED,
      this.COLOR.GREEN,
      this.COLOR.BLUE,
      this.COLOR.YELLOW,
      this.COLOR.ORANGE,
      this.COLOR.TEAL,
      this.COLOR.PURPLE,
      this.COLOR.PINK
    ];

    this.GLASS_MATERIAL = new THREE.MeshPhysicalMaterial({
      roughness: 0,
      transmission: 1, // Transparency
      thickness: 0.3,
      clearcoat: 0.5,
      envMap: this.scene.background,
      envMapIntensity: 2
    });

    this.METAL_MATERIALS = this.COLORS.map((color) => {
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0,
        metalness: 0.65,
        transmission: 0, // Solid
        thickness: 1.0,
        clearcoat: 1.0,
        envMap: this.scene.background,
        envMapIntensity: 1.25
      });
    });
  }
}

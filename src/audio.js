import * as THREE from "three";

export class Audio {

  constructor(camera) {
    this.camera = camera;
    this.audioLoader = new THREE.AudioLoader();
    this.sounds = {};
    this.listener = null;
  }

  initListener() {
    if (!this.listener) {
      this.listener = new THREE.AudioListener();
      this.camera.add(this.listener);
    }
  }

  playAmbient() {
    this.initListener();
    if (this.sounds.ambient) {
      this.sounds.ambient.play();
      return;
    }
    this.sounds.ambient = new THREE.Audio(this.listener);
    this.audioLoader.load("sfx/ambient.mp3", (buffer) => {
      this.sounds.ambient.setBuffer(buffer);
      this.sounds.ambient.setLoop(true);
      this.sounds.ambient.setVolume(0.5);
      this.sounds.ambient.play();
    });
  }

  playAppear() {
    this.initListener();
    if (this.sounds.appear) {
      this.sounds.appear.play();
      return;
    }
    this.sounds.appear = new THREE.Audio(this.listener);
    this.audioLoader.load("sfx/appear.mp3", (buffer) => {
      this.sounds.appear.setBuffer(buffer);
      this.sounds.appear.setVolume(2);
      this.sounds.appear.play();
    });
  }

  playPop() {
    this.initListener();
    if (this.sounds.pop) {
      this.sounds.pop.play();
      return;
    }
    this.sounds.pop = new THREE.Audio(this.listener);
    this.audioLoader.load("sfx/pop.mp3", (buffer) => {
      this.sounds.pop.setBuffer(buffer);
      this.sounds.pop.setVolume(2);
      this.sounds.pop.play();
    });
  }
}
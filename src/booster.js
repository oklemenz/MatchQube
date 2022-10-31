export class Booster {

  static STATE_INITIAL  = 0;
  static STATE_CHARGE   = 1;
  static STATE_WAIT_RUN = 2;
  static STATE_RUN      = 3;
  static STATE_LAPSED   = 4;
  static STATE_WAIT     = 5;

  constructor() {
    this.value = 1;
    this.degree = 0;
    this.state = Booster.STATE_INITIAL;
    this.boosterProgress = document.getElementById("booster-progress");
    this.boosterText = document.getElementById("booster-text");
  }

  charge() {
    this.state = Booster.STATE_CHARGE;
    this.value++;
    this.text();
  }

  progress() {
    this.boosterProgress.style.background = `conic-gradient(orange ${this.degree}deg, black 0deg)`;
  }

  text() {
    this.boosterText.innerText = `${this.value}x`;
    this.pulse();
  }

  pulse() {
    this.boosterProgress.classList.add("start-pulse");
    setTimeout(() => {
      this.boosterProgress.classList.remove("start-pulse");
    }, 1000);
  }

  update() {
    switch (this.state) {
      case Booster.STATE_INITIAL:
        break;
      case Booster.STATE_CHARGE:
        if (this.degree < 360) {
          this.degree += 10;
        } else {
          this.degree = 360;
          this.state = Booster.STATE_WAIT_RUN;
        }
        break;
      case Booster.STATE_WAIT_RUN:
        setTimeout(() => {
          this.state = Booster.STATE_RUN;
        }, 500);
        break;
      case Booster.STATE_RUN:
        if (this.degree > 0) {
          this.degree -= 1;
        } else {
          this.degree = 0;
          this.state = Booster.STATE_LAPSED;
        }
        break;
      case Booster.STATE_LAPSED:
        if (this.value > 1) {
          this.value--;
          this.text();
        }
        if (this.value === 1) {
          this.state = Booster.STATE_INITIAL;
        } else {
          this.state = Booster.STATE_WAIT;
        }
        break;
      case Booster.STATE_WAIT:
        setTimeout(() => {
          this.state = Booster.STATE_CHARGE;
        }, 500);
        break;
    }
    this.progress();
  }
}
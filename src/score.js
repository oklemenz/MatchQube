export class Score {
  constructor(booster) {
    this.booster = booster;
    this.score = 0;
    this.highscore = 0;
    this.scoreElement = document.getElementById("score");
    this.highscoreElement = document.getElementById("highscore");
    this.loadHighscore();
  }

  reset() {
    this.scoreElement.innerText = 0;
  }

  addScore(num = 1) {
    this.score += num * this.booster.value;
    this.booster.charge();
    this.setHighscore();
    this.scoreElement.innerText = this.score;
    this.scoreElement.classList.add("start-pulse");
    setTimeout(() => {
      this.scoreElement.classList.remove("start-pulse");
    }, 1000);
  }

  setHighscore() {
    if (this.score > this.highscore) {
      this.highscore = this.score;
      this.storeHighscore();
      this.highscoreElement.innerText = this.highscore;
      this.highscoreElement.classList.add("score_add");
      setTimeout(() => {
        this.highscoreElement.classList.remove("start-pulse");
      }, 1000);
    }
  }

  storeHighscore() {
    window.localStorage.setItem("matchqube.highscore", this.highscore);
  }

  loadHighscore() {
    this.highscore = parseInt(window.localStorage.getItem("match.qube.highscore")) || 0;
  }
}

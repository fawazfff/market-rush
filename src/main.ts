import Phaser from "phaser";
import { MarketScene } from "./scenes/MarketScene";
import "./style.css";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 520,
  backgroundColor: "#e9e2d3",
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MarketScene],
});

window.addEventListener("beforeunload", () => game.destroy(true));

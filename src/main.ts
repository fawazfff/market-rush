import Phaser from "phaser";
import { MarketScene } from "./scenes/MarketScene";
import { buyStock, changePrice, closeDay, marketPulse, serveMeal, state } from "./economy";
import "./style.css";

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: "game", width: 960, height: 520,
  backgroundColor: "#e9e2d3", pixelArt: true, antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MarketScene],
});
const el = (id: string) => document.getElementById(id);
const set = (id: string, value: string | number) => { const node = el(id); if (node) node.textContent = String(value); };
function render() {
  set("day", String(state.day).padStart(2, "0")); set("money", state.money);
  set("rice-stock", state.rice); set("tomato-stock", state.tomatoes); set("chicken-stock", state.chicken);
  set("served", state.served); set("meal-price", state.mealPrice); set("reputation", `${state.reputation} reputation`);
  set("rice-price", state.wholesale.rice); set("tomato-price", state.wholesale.tomatoes); set("chicken-price", state.wholesale.chicken);
  set("supplier-rice", state.supplier.rice); set("supplier-tomatoes", state.supplier.tomatoes); set("supplier-chicken", state.supplier.chicken);
  set("rival-one-price", `${state.rival.price} coins`); set("rival-two-price", `${state.rivalTwo.price} coins`);
  set("rival-one-stock", `${state.rival.stock} meals in stock · ${state.rival.sold} sold`);
  set("rival-two-stock", `${state.rivalTwo.stock} meals in stock · ${state.rivalTwo.sold} sold`);
  set("buy-cost", `${state.wholesale.rice * 2 + state.wholesale.tomatoes * 2} coins`);
  set("market-note", state.message);
}
function notify(message: string) { state.message = message; set("message", message); render(); }
el("buy-button")?.addEventListener("click", () => notify(buyStock()));
el("serve-button")?.addEventListener("click", () => notify(serveMeal()));
el("price-down")?.addEventListener("click", () => notify(changePrice(-1)));
el("price-up")?.addEventListener("click", () => notify(changePrice(1)));
el("next-day")?.addEventListener("click", () => notify(closeDay()));
render();
window.setInterval(() => { marketPulse(); render(); }, 9000);
window.addEventListener("beforeunload", () => game.destroy(true));

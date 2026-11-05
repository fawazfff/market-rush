import Phaser from "phaser";
import { BazaarScene } from "./scenes/BazaarScene";
import { DungeonScene } from "./scenes/DungeonScene";
import {
  RESOURCES,
  advanceMarketDay,
  brokerOffer,
  negotiateOffer,
  sellResource,
  beginExpedition,
  buyPotion,
  craftBlade,
  craftTonic,
  finishExpedition,
  marketPrice,
  marketReason,
  sellAllLoot,
  state,
  upgradeWeapon,
  usePotion,
  type ResourceId,
} from "./economy";
import "./style.css";
import "./market.css";

const byId = (id: string) => document.getElementById(id);
const setText = (id: string, value: string | number) => {
  const node = byId(id);
  if (node) node.textContent = String(value);
};
const setWidth = (id: string, value: number) => {
  const node = byId(id);
  if (node instanceof HTMLElement) node.style.width = value + "%";
};
let game: Phaser.Game | null = null;
let marketClock = 0;

function notify(message: string): void {
  setText("toast-message", message);
  const toast = byId("toast");
  if (!toast) return;
  toast.classList.add("visible");
  window.clearTimeout(Number(toast.dataset.timer || 0));
  const timer = window.setTimeout(() => toast.classList.remove("visible"), 3400);
  toast.dataset.timer = String(timer);
}

function setSceneMode(mode: string): void {
  const inDungeon = mode === "dungeon";
  byId("enter-rift")?.classList.toggle("hidden", inDungeon);
  byId("return-bazaar")?.classList.toggle("hidden", !inDungeon);
  setText("area-name", inDungeon ? "THE UNDERROOT RIFT" : "THE LANTERN BAZAAR");
  setText("area-subtitle", inDungeon ? "Recover something worth bringing home." : "Trade well. Prepare well. Then go deeper.");
  setText("scene-status", inDungeon ? "EXPEDITION IN PROGRESS" : "SAFE ZONE");
}

function renderInventory(): void {
  const host = byId("inventory-list");
  if (!host) return;
  const count = RESOURCES.reduce((total, item) => total + state.bag[item.id], 0);
  if (count === 0) {
    host.innerHTML = '<div class="empty-inventory"><span>◇</span><b>Your pack is empty</b><small>Defeat creatures in the rift to recover resources.</small></div>';
    return;
  }
  host.innerHTML = RESOURCES.map((item) => {
    const quantity = state.bag[item.id];
    if (quantity === 0) return "";
    const offer = brokerOffer(item.id);
    return '<div class="inventory-row inventory-row-trade"><span class="resource-symbol">' + item.icon + '</span><span class="resource-name">' + item.name + '<small class="broker-quote">Mara offers ' + offer + 'c each</small></span><b>×' + quantity + '</b><button data-negotiate="' + item.id + '" title="Ask Mara for a better price">ASK</button><button data-sell="' + item.id + '">SELL 1</button></div>';
  }).join("");
  host.querySelectorAll<HTMLButtonElement>("[data-negotiate]").forEach((button) => button.addEventListener("click", () => {
    const result = negotiateOffer(button.dataset.negotiate as ResourceId);
    render();
    notify(result);
  }));
  host.querySelectorAll<HTMLButtonElement>("[data-sell]").forEach((button) => button.addEventListener("click", () => {
    const result = sellResource(button.dataset.sell as ResourceId);
    render();
    notify(result.message);
  }));
}

function renderMarket(): void {
  const host = byId("market-list");
  if (!host) return;
  host.innerHTML = RESOURCES.map((item) => {
    const price = brokerOffer(item.id);
    const supply = state.market.supply[item.id];
    const demand = state.market.demand[item.id];
    return '<article class="market-row">' +
      '<div class="market-item-top"><span class="resource-symbol">' + item.icon + '</span><span class="market-name">' + item.name + '</span><b>' + price + '<small>c</small></b></div>' +
      '<div class="market-reason">' + marketReason(item.id) + '</div>' +
      '<div class="market-meter"><i style="width:' + Math.max(8, Math.min(100, supply * 5)) + '%"></i></div>' +
      '<div class="market-numbers"><span>STOCK ' + supply + '</span><span>DEMAND ' + demand + '</span></div>' +
      '</article>';
  }).join("");
}

function render(): void {
  setText("coin-count", state.coins);
  setText("health-number", state.health + " / " + state.maxHealth);
  setWidth("health-fill", state.health / state.maxHealth * 100);
  setText("tonic-count", state.potions);
  setText("blade-level", state.weaponTier === 0 ? "Worn blade" : "Blade +" + state.weaponTier);
  setText("blade-damage", " " + (15 + state.weaponTier * 7) + " damage");
  setText("market-day", String(state.market.day).padStart(2, "0"));
  setText("market-story", state.market.message);
  setText("run-kills", state.run.kills);
  setText("run-finds", state.run.found);
  setText("run-count", state.run.totalRuns);
  setText("run-summary", state.run.lastSummary);
  setText("total-earned", state.totals.coinsEarned);
  setText("item-count", RESOURCES.reduce((total, item) => total + state.bag[item.id], 0));
  const sellButton = byId("sell-loot") as HTMLButtonElement | null;
  if (sellButton) sellButton.disabled = RESOURCES.reduce((total, item) => total + state.bag[item.id], 0) === 0;
  const tonicButton = byId("use-tonic") as HTMLButtonElement | null;
  if (tonicButton) tonicButton.disabled = state.potions <= 0 || state.health >= state.maxHealth;
  const upgradeButton = byId("upgrade-blade") as HTMLButtonElement | null;
  if (upgradeButton) {
    upgradeButton.disabled = state.weaponTier >= 2;
    setText("upgrade-price", state.weaponTier >= 2 ? "MAX LEVEL" : (70 + state.weaponTier * 45) + " COINS");
  }
  renderInventory();
  renderMarket();
}

function createGame(): void {
  if (game) return;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-world",
    width: 960,
    height: 600,
    backgroundColor: "#252b26",
    antialias: true,
    render: { roundPixels: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 600,
    },
    scene: [BazaarScene, DungeonScene],
  });
  game.events.on("scene-mode", (mode: string) => setSceneMode(mode));
  game.events.on("toast", (message: string) => notify(message));
  game.events.on("state-change", render);
  game.events.on("enter-dungeon", enterDungeon);
  game.events.on("extract-now", (knockedOut: boolean) => extractDungeon(Boolean(knockedOut)));
}

function startGame(): void {
  byId("landing")?.classList.add("is-hidden");
  byId("game-shell")?.classList.remove("is-hidden");
  createGame();
  render();
  if (!marketClock) {
    // One real minute advances seven in-game market days.
    marketClock = window.setInterval(() => {
      advanceMarketDay();
      render();
    }, 60000 / 7);
  }
}

function enterDungeon(): void {
  if (!game || game.scene.isActive("DungeonScene")) return;
  beginExpedition();
  game.scene.stop("BazaarScene");
  game.scene.start("DungeonScene");
  setSceneMode("dungeon");
  render();
}

function extractDungeon(knockedOut = false): void {
  if (!game || !game.scene.isActive("DungeonScene")) return;
  const summary = finishExpedition(knockedOut);
  game.scene.stop("DungeonScene");
  game.scene.start("BazaarScene");
  setSceneMode("bazaar");
  render();
  notify(summary);
}

byId("touch-attack")?.addEventListener("click", () => game?.events.emit("touch-attack"));
byId("touch-interact")?.addEventListener("click", () => game?.events.emit("touch-interact"));
byId("start-game")?.addEventListener("click", startGame);
byId("enter-rift")?.addEventListener("click", enterDungeon);
byId("return-bazaar")?.addEventListener("click", () => extractDungeon(false));
byId("sell-loot")?.addEventListener("click", () => {
  const result = sellAllLoot();
  render();
  notify(result.message);
});
byId("craft-tonic")?.addEventListener("click", () => {
  notify(craftTonic());
  render();
});
byId("craft-blade")?.addEventListener("click", () => {
  notify(craftBlade());
  render();
});
byId("buy-tonic")?.addEventListener("click", () => {
  notify(buyPotion());
  render();
});
byId("use-tonic")?.addEventListener("click", () => {
  notify(usePotion());
  render();
});
byId("upgrade-blade")?.addEventListener("click", () => {
  notify(upgradeWeapon());
  render();
});
byId("back-to-menu")?.addEventListener("click", () => {
  if (game && game.scene.isActive("DungeonScene")) extractDungeon(false);
  byId("game-shell")?.classList.add("is-hidden");
  byId("landing")?.classList.remove("is-hidden");
});
window.addEventListener("beforeunload", () => {
  window.clearInterval(marketClock);
  game?.destroy(true);
});

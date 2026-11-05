import Phaser from "phaser";
import { MarketScene } from "./scenes/MarketScene";
import { INGREDIENTS, RECIPES, buyIngredient, closeShift, completeOrder, disappointCustomer, marketPulse, recipeById, startNextDay, state, type IngredientId, type RecipeId } from "./economy";
import "./style.css";

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: "game", width: 960, height: 540,
  backgroundColor: "#f4ead6", antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MarketScene],
});
const $ = (id: string) => document.getElementById(id);
const set = (id: string, value: string | number) => { const node = $(id); if (node) node.textContent = String(value); };
const setButton = (id: string, value: string) => { const node = $(id)?.querySelector("b"); if (node) node.textContent = value; };
let selectedOrder: RecipeId = "jollof";
let selectedRecipe: RecipeId = "jollof";
let cooking = false;
let cookStart = 0;
let cookDuration = 2200;
let cookTimer = 0;
let shiftTimer = 120;
let shiftInterval = 0;
let orderCount = 0;

function renderPantry() {
  const host = $("pantry-list"); if (!host) return;
  host.innerHTML = INGREDIENTS.map((item) => {
    const qty = state.stock[item.id];
    return `<div class="pantry-item"><span class="ingredient-icon">${item.icon}</span><span class="ingredient-name">${item.label}</span><b class="${qty <= 1 ? "low-stock" : ""}">${qty}</b><button data-buy="${item.id}" ${state.supplier[item.id] < 2 || state.coins < state.wholesale[item.id] * 2 ? "disabled" : ""}>+${state.wholesale[item.id] * 2}</button></div>`;
  }).join("");
  host.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((button) => button.addEventListener("click", () => {
    notify(buyIngredient(button.dataset.buy as IngredientId)); render();
  }));
}
function renderMarket() {
  const host = $("market-list"); if (!host) return;
  host.innerHTML = INGREDIENTS.map((item) => `<div class="market-item"><span>${item.icon} ${item.label}</span><b>${state.wholesale[item.id]}</b><small>${state.supplier[item.id]} left</small></div>`).join("");
  const rivals = $("rival-list"); if (!rivals) return;
  rivals.innerHTML = state.rivals.map((rival) => `<div class="rival-row"><span class="rival-avatar">${rival.id === "grill" ? "🔥" : "🫘"}</span><span><b>${rival.name}</b><small>${rival.meals} meals ready · ${rival.sold} sold</small></span><strong>${rival.price} <small>coins</small></strong></div>`).join("");
}
function render() {
  set("day", String(state.day).padStart(2, "0")); set("coins", state.coins); set("rep", state.reputation);
  set("sold", state.sold); set("revenue", state.revenue);
  set("market-story", state.marketMessage);
  renderPantry(); renderMarket();
  document.querySelectorAll<HTMLButtonElement>(".recipe").forEach((button) => button.classList.toggle("active", button.dataset.recipe === selectedRecipe));
}
function notify(message: string) { set("feedback", message); }
function showOrder(id: RecipeId) {
  selectedOrder = id; selectedRecipe = id;
  const recipe = recipeById(id);
  set("order-name", recipe.name); set("order-icon", recipe.icon);
  set("order-detail", Object.entries(recipe.ingredients).map(([key, amount]) => `${amount} ${key}`).join(" · "));
  set("order-status", "CUSTOMER ORDER");
  notify(`A customer wants ${recipe.name}. Choose the matching dish and cook!`);
  render();
}
function setCookingProgress(value: number) {
  const marker = $("heat-marker") as HTMLElement | null;
  if (marker) marker.style.left = `${Math.min(100, value)}%`;
  const progress = $("heat-progress") as HTMLElement | null;
  if (progress) progress.style.width = `${Math.min(100, value)}%`;
}
function startCooking() {
  if (!state.shiftOpen || cooking) return;
  if (selectedRecipe !== selectedOrder) { notify(`This customer ordered ${recipeById(selectedOrder).shortName}. Select that dish first.`); return; }
  const recipe = recipeById(selectedRecipe);
  const missing = Object.entries(recipe.ingredients).find(([id, amount]) => state.stock[id as IngredientId] < (amount ?? 0));
  if (missing) { notify(`You're out of ${missing[0]}. Buy more from the pantry.`); return; }
  cooking = true; cookStart = performance.now(); cookDuration = recipe.cookTime;
  cookTimer = window.setInterval(tickCooking, 30);
  $("cook-button")!.classList.add("cooking");
  set("cook-hint", "Watch the marker. Green is the sweet spot.");
  setButton("cook-button", "Cooking…");
  ($("serve-button") as HTMLButtonElement).disabled = false;
}
function tickCooking() {
  const progress = Math.min(100, (performance.now() - cookStart) / cookDuration * 100);
  setCookingProgress(progress);
  if (progress >= 100) {
    window.clearInterval(cookTimer); cooking = false;
    set("cook-hint", "It's ready! Serve now for a good result.");
    setButton("cook-button", "Ready to serve");
  }
}
function servePlate() {
  const progress = Math.min(100, (performance.now() - cookStart) / cookDuration * 100);
  if (!cooking && progress < 1) { notify("Start cooking before serving."); return; }
  if (progress < 62) { notify("Still cooking! Wait for the marker to reach the green zone."); return; }
  window.clearInterval(cookTimer); cooking = false;
  const quality = progress >= 74 && progress <= 92 ? 1.2 : progress <= 98 ? 1 : 0.7;
  const result = completeOrder(selectedRecipe, quality);
  if (!result.ok) { notify(result.message); return; }
  notify(result.message); setCookingProgress(0);
  setButton("cook-button", "Start cooking"); set("cook-hint", "Hit SERVE when the marker enters the green zone.");
  $("cook-button")!.classList.remove("cooking");
  ($("serve-button") as HTMLButtonElement).disabled = true;
  orderCount += 1;
  game.scene.getScene("MarketScene").events.emit("order-served");
  if (orderCount % 3 === 0) marketPulse();
  showOrder(RECIPES[Math.floor(Math.random() * RECIPES.length)].id);
  render();
}
function skipOrder() {
  disappointCustomer(); notify("The customer left. Reputation took a hit.");
  showOrder(RECIPES[Math.floor(Math.random() * RECIPES.length)].id); render();
  game.scene.getScene("MarketScene").events.emit("customer-left");
}
function updateClock() {
  shiftTimer -= 1;
  set("shift-time", `0${Math.floor(shiftTimer / 60)}:${String(shiftTimer % 60).padStart(2, "0")}`);
  if (shiftTimer <= 0) finishDay();
}
function finishDay() {
  if (!state.shiftOpen) return;
  state.shiftSeconds = shiftTimer;
  const summary = closeShift();
  set("sum-sold", summary.sold); set("sum-revenue", summary.revenue); set("sum-expenses", summary.expenses);
  set("sum-profit", summary.profit);
  set("day-summary", `Day ${summary.day} is over. ${summary.profit >= 0 ? "You made a profit. Nice work." : "It was a tough day. Adjust your menu and prices tomorrow."}`);
  $("day-modal")!.classList.remove("hidden");
  window.clearInterval(shiftInterval); render();
}
function openNextDay() {
  startNextDay(); shiftTimer = 120; set("shift-time", "02:00");
  $("day-modal")!.classList.add("hidden");
  set("shift-label", "LUNCH SHIFT"); notify("New day, new customers. Let's make it count.");
  render(); shiftInterval = window.setInterval(updateClock, 1000);
}
document.querySelectorAll<HTMLButtonElement>(".recipe").forEach((button) => button.addEventListener("click", () => {
  selectedRecipe = button.dataset.recipe as RecipeId; render();
  const recipe = recipeById(selectedRecipe);
  notify(selectedRecipe === selectedOrder ? `${recipe.name} is ready to cook.` : `This customer ordered ${recipeById(selectedOrder).shortName}. Select the matching dish to serve them.`);
}));
$("cook-button")?.addEventListener("click", startCooking);
$("serve-button")?.addEventListener("click", servePlate);
$("skip-order")?.addEventListener("click", skipOrder);
$("close-day")?.addEventListener("click", finishDay);
$("next-day")?.addEventListener("click", openNextDay);
const scene = game.scene.getScene("MarketScene");
scene.events.on("customer-selected", (data: { order: RecipeId }) => showOrder(data.order));
render();
shiftInterval = window.setInterval(updateClock, 1000);
window.setInterval(() => { if (state.shiftOpen) { marketPulse(); renderMarket(); set("market-story", state.marketMessage); } }, 10000);
window.addEventListener("beforeunload", () => { window.clearInterval(shiftInterval); window.clearInterval(cookTimer); game.destroy(true); });

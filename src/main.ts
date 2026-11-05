import "./style.css";

type IngredientId = "rice" | "chicken" | "tomato" | "bread";
type RecipeId = "jollof" | "wrap" | "tomatoRice";
type Ingredient = { id: IngredientId; name: string; icon: string; base: number; stock: number; demand: number; };
type Recipe = { id: RecipeId; name: string; description: string; price: number; ingredients: Partial<Record<IngredientId, number>>; tags: string[]; art: string; };
type Customer = { name: string; role: string; budget: number; likes: RecipeId[]; patience: string; };
type GameState = {
  day: number; coins: number; reputation: number; stock: Record<IngredientId, number>;
  market: Record<IngredientId, { stock: number; demand: number; price: number }>;
  queue: Customer[]; served: number; sales: number; revenue: number; spent: number;
  selected: RecipeId; askingPrice: number; event: string; eventText: string;
  lastSummary: string; rivals: { name: string; coins: number; reputation: number; today: number }[];
};
const ingredients: Ingredient[] = [
  { id: "rice", name: "Rice", icon: "🌾", base: 7, stock: 36, demand: 18 },
  { id: "chicken", name: "Chicken", icon: "🍗", base: 16, stock: 22, demand: 25 },
  { id: "tomato", name: "Tomato", icon: "🍅", base: 5, stock: 42, demand: 17 },
  { id: "bread", name: "Bread", icon: "🥖", base: 8, stock: 30, demand: 20 },
];
const recipes: Recipe[] = [
  { id: "jollof", name: "Smoky Jollof", description: "A proper street classic", price: 38, ingredients: { rice: 1, tomato: 2, chicken: 1 }, tags: ["Popular", "Filling"], art: "🍛" },
  { id: "wrap", name: "Chicken Wrap", description: "Quick, warm and satisfying", price: 32, ingredients: { bread: 1, chicken: 1, tomato: 1 }, tags: ["Quick", "Portable"], art: "🌯" },
  { id: "tomatoRice", name: "Tomato Rice", description: "Simple food, honest price", price: 24, ingredients: { rice: 1, tomato: 2 }, tags: ["Budget", "Vegetarian"], art: "🍚" },
];
const customerNames = ["Ada", "Tunde", "Zainab", "Emeka", "Mariam", "Chidi", "Bola", "Seyi", "Amina", "Kelechi", "Ife", "Yusuf"];
const roles = ["Office worker", "Student", "Taxi driver", "Market trader", "Nurse", "Builder"];
const likesByRecipe: RecipeId[][] = [["jollof"], ["wrap"], ["tomatoRice"], ["jollof", "wrap"], ["wrap", "tomatoRice"], ["jollof", "tomatoRice"]];
const events = [
  { name: "A quiet morning", text: "The market is calm. Suppliers have their usual stock.", changes: {} as Partial<Record<IngredientId, number>> },
  { name: "Chicken shortage", text: "A late delivery has made chicken harder to find. Its price rises today.", changes: { chicken: 1.45 } },
  { name: "Fresh tomato harvest", text: "Farmers brought in a big tomato harvest. Tomato prices fall today.", changes: { tomato: 0.65 } },
  { name: "Payday crowd", text: "More people have money to spend. Customers are a little less price-sensitive.", changes: {} as Partial<Record<IngredientId, number>> },
  { name: "Rainy afternoon", text: "Fewer people are walking around. Customers are more careful with money.", changes: {} as Partial<Record<IngredientId, number>> },
];
const defaultState = (): GameState => ({
  day: 1, coins: 90, reputation: 1,
  stock: { rice: 3, chicken: 2, tomato: 5, bread: 2 },
  market: Object.fromEntries(ingredients.map(i => [i.id, { stock: i.stock, demand: i.demand, price: i.base }])) as GameState["market"],
  queue: [], served: 0, sales: 0, revenue: 0, spent: 0, selected: "jollof", askingPrice: 38,
  event: "", eventText: "", lastSummary: "Your stall is ready. Buy ingredients, then serve your first customer.",
  rivals: [{ name: "Mama K's Kitchen", coins: 100, reputation: 2, today: 0 }, { name: "The Lunch Box", coins: 100, reputation: 1, today: 0 }],
});
let state = load();
function load(): GameState {
  try { const raw = localStorage.getItem("street-food-rivals-save"); if (raw) return { ...defaultState(), ...JSON.parse(raw) } as GameState; } catch { /* use fresh game */ }
  return defaultState();
}
function save() { localStorage.setItem("street-food-rivals-save", JSON.stringify(state)); }
function el<T extends HTMLElement>(id: string) { return document.getElementById(id) as T; }
function money(n: number) { return "₵" + Math.round(n); }
function price(id: IngredientId) { return Math.max(2, Math.round(state.market[id].price)); }
function canCook(recipe: Recipe) { return Object.entries(recipe.ingredients).every(([id, qty]) => state.stock[id as IngredientId] >= (qty || 0)); }
function getQueue() {
  const count = state.event === "Payday crowd" ? 6 : state.event === "Rainy afternoon" ? 3 : 5;
  return Array.from({ length: count }, (_, i) => {
    const likes = likesByRecipe[Math.floor(Math.random() * likesByRecipe.length)];
    return { name: customerNames[(state.day * 3 + i * 2) % customerNames.length], role: roles[(state.day + i) % roles.length], budget: 22 + Math.floor(Math.random() * 25), likes, patience: ["Just browsing", "Getting hungry", "In a hurry"][i % 3] } as Customer;
  });
}
function pickEvent() {
  for (const item of ingredients) state.market[item.id].price = item.base;
  const event = events[(state.day - 1) % events.length];
  state.event = event.name; state.eventText = event.text;
  for (const [id, factor] of Object.entries(event.changes)) state.market[id as IngredientId].price = Math.round(ingredients.find(i => i.id === id)!.base * (factor || 1));
}
function startDay() {
  state.served = 0; state.sales = 0; state.revenue = 0; state.spent = 0;
  state.rivals.forEach(r => r.today = 0);
  pickEvent(); state.queue = getQueue();
  state.selected = "jollof"; state.askingPrice = recipes[0].price;
  save(); render();
}
function buy(id: IngredientId) {
  const p = price(id);
  if (state.coins < p) return toast("Not enough coins for that ingredient.");
  if (state.market[id].stock <= 0) return toast("The supplier is sold out today.");
  state.coins -= p; state.spent += p; state.stock[id] += 1;
  state.market[id].stock -= 1; state.market[id].demand += 1;
  toast("Bought 1 " + id + " for " + money(p) + "."); save(); render();
}
function selectRecipe(id: RecipeId) {
  state.selected = id; state.askingPrice = recipes.find(r => r.id === id)!.price; render();
}
function serve() {
  const customer = state.queue[0]; if (!customer) return;
  const recipe = recipes.find(r => r.id === state.selected)!;
  if (!canCook(recipe)) return toast("You're missing ingredients for " + recipe.name + ".");
  const rivalPrice = recipe.price + (state.day % 3 === 0 ? -2 : 3);
  const liked = customer.likes.includes(recipe.id);
  const competitive = state.askingPrice <= rivalPrice;
  const affordable = state.askingPrice <= customer.budget;
  const won = liked && affordable && (competitive || Math.random() > 0.4);
  state.served += 1;
  state.stock = { ...state.stock };
  for (const [id, qty] of Object.entries(recipe.ingredients)) {
    state.stock[id as IngredientId] -= qty || 0;
    state.market[id as IngredientId].demand += qty || 0;
    state.market[id as IngredientId].stock = Math.max(0, state.market[id as IngredientId].stock - (qty || 0));
  }
  if (won) {
    state.coins += state.askingPrice; state.revenue += state.askingPrice; state.sales += 1;
    state.reputation = Math.min(10, state.reputation + 0.35);
    state.lastSummary = customer.name + " bought " + recipe.name + " for " + money(state.askingPrice) + ".";
    toast(customer.name + " chose your stall!");
  } else {
    state.rivals[Math.floor(Math.random() * state.rivals.length)].today += 1;
    state.reputation = Math.max(0, state.reputation - 0.12);
    state.lastSummary = customer.name + " went elsewhere. " + (!liked ? "They wanted something else." : !affordable ? "Your price was over their budget." : "A rival made a better offer.");
    toast(customer.name + " walked to another stall.");
  }
  state.queue.shift();
  if (state.queue.length === 0) endDay();
  save(); render();
}
function endDay() {
  const rivalSales = state.rivals.map(() => 1 + Math.floor(Math.random() * 3));
  state.rivals.forEach((r, i) => { r.today += rivalSales[i]; r.coins += rivalSales[i] * (25 + Math.floor(Math.random() * 10)); });
  for (const item of ingredients) {
    const m = state.market[item.id];
    m.stock = Math.min(60, m.stock + 4 + Math.floor(Math.random() * 4));
    m.demand = Math.max(8, m.demand - 2 + Math.floor(Math.random() * 5));
    m.price = Math.max(3, Math.round(item.base * (1 + (m.demand - m.stock / 2) / 100)));
  }
  const profit = state.revenue - state.spent;
  state.lastSummary = "Day " + state.day + " complete. " + state.sales + " sales, " + money(state.revenue) + " revenue, " + money(profit) + " net result.";
  toast("Business closed. Your day is complete.");
  save();
}
function nextDay() {
  if (state.queue.length) return;
  state.day += 1; startDay();
}
function toast(message: string) {
  const node = el("toast"); node.textContent = message; node.classList.add("show");
  window.setTimeout(() => node.classList.remove("show"), 2400);
}
function render() {
  el("day").textContent = String(state.day).padStart(2, "0");
  el("day-ledger").textContent = String(state.day).padStart(2, "0");
  const repFill = document.querySelector<HTMLElement>(".rep-track i"); if (repFill) repFill.style.width = (state.reputation * 10) + "%";
  el("coins").textContent = money(state.coins);
  el("rep").textContent = state.reputation.toFixed(1) + "/10";
  el("event-name").textContent = state.event || "Opening day";
  el("event-copy").textContent = state.eventText || "Your first customers are on their way.";
  el("customer-count").textContent = state.queue.length + " waiting";
  el("queue-count").textContent = state.queue.length + " waiting";
  el("daily-sales").textContent = String(state.sales);
  el("daily-revenue").textContent = money(state.revenue);
  el("daily-spent").textContent = money(state.spent);
  el("daily-result").textContent = state.lastSummary;
  el("queue").innerHTML = state.queue.length ? state.queue.slice(0, 4).map((c, i) => '<article class="customer-card ' + (i === 0 ? "active" : "") + '"><div class="customer-avatar">' + c.name.slice(0,1) + '</div><div class="customer-info"><b>' + c.name + '</b><small>' + c.role + '</small></div><div class="customer-budget"><b>' + money(c.budget) + '</b><small>BUDGET</small></div>' + (i === 0 ? '<span class="turn-tag">NOW</span>' : '') + '</article>').join("") : '<div class="empty-state">All customers served. Your stall is closed for today.</div>';
  const current = state.queue[0];
  el("customer-wants").textContent = current ? "Looking for: " + current.likes.map(id => recipes.find(r => r.id === id)!.name).join(" or ") : "No customers waiting";
  el("market-cards").innerHTML = ingredients.map(i => {
    const m = state.market[i.id], p = price(i.id);
    return '<article class="ingredient-card"><div class="ingredient-icon">' + i.icon + '</div><div class="ingredient-meta"><b>' + i.name + '</b><small>' + m.stock + ' in market · demand ' + m.demand + '</small></div><strong>' + money(p) + '</strong><button data-buy="' + i.id + '" ' + (state.coins < p || m.stock <= 0 ? "disabled" : "") + '>BUY +1</button></article>';
  }).join("");
  el("recipe-cards").innerHTML = recipes.map(r => {
    const enough = canCook(r), selected = state.selected === r.id;
    return '<button class="recipe-card ' + (selected ? "selected" : "") + '" data-recipe="' + r.id + '"><div class="recipe-art">' + r.art + '</div><div class="recipe-details"><b>' + r.name + '</b><small>' + r.description + '</small><span>' + Object.entries(r.ingredients).map(([id,q]) => q + ' ' + id).join(" · ") + '</span></div><div class="recipe-price">' + money(r.price) + '<small>suggested</small></div><i class="recipe-check">' + (selected ? "✓" : "") + '</i><em class="' + (enough ? "ready" : "missing") + '">' + (enough ? "READY" : "NEED STOCK") + '</em></button>';
  }).join("");
  const recipe = recipes.find(r => r.id === state.selected)!;
  el("selected-recipe").textContent = recipe.name;
  const slider = el<HTMLInputElement>("asking-price"); slider.value = String(state.askingPrice); slider.max = String(Math.max(60, current?.budget || 60));
  el("asking-price-label").textContent = money(state.askingPrice);
  el("serve-button").toggleAttribute("disabled", !current || !canCook(recipe));
  el("serve-button").textContent = current ? "SERVE CUSTOMER" : "DAY COMPLETE";
  el("next-day").classList.toggle("visible", !current);
  el("next-day").toggleAttribute("disabled", !!current);
  el("rivals").innerHTML = state.rivals.map(r => '<div class="rival-row"><span class="rival-avatar">' + r.name.slice(0,1) + '</span><span><b>' + r.name + '</b><small>' + r.reputation + ' reputation</small></span><strong>' + r.today + '<small>served</small></strong></div>').join("");
  save();
}
document.addEventListener("click", e => {
  const target = e.target as HTMLElement;
  const buyId = target.closest<HTMLElement>("[data-buy]")?.dataset.buy as IngredientId | undefined;
  const recipeId = target.closest<HTMLElement>("[data-recipe]")?.dataset.recipe as RecipeId | undefined;
  if (buyId) buy(buyId);
  if (recipeId) selectRecipe(recipeId);
});
el("asking-price").addEventListener("input", e => { state.askingPrice = Number((e.target as HTMLInputElement).value); el("asking-price-label").textContent = money(state.askingPrice); });
el("serve-button").addEventListener("click", serve);
el("next-day").addEventListener("click", nextDay);
el("reset-game").addEventListener("click", () => { if (confirm("Start a new food stall from day one? This clears your saved game.")) { localStorage.removeItem("street-food-rivals-save"); state = defaultState(); startDay(); } });
startDay();

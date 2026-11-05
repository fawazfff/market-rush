export type IngredientId = "rice" | "tomato" | "beef" | "pepper" | "beans" | "oil";
export type RecipeId = "jollof" | "suya" | "akara";
export type Recipe = {
  id: RecipeId;
  name: string;
  shortName: string;
  icon: string;
  ingredients: Partial<Record<IngredientId, number>>;
  basePrice: number;
  cookTime: number;
};

export const RECIPES: Recipe[] = [
  { id: "jollof", name: "Jollof Rice Bowl", shortName: "Jollof", icon: "🍚", ingredients: { rice: 1, tomato: 1 }, basePrice: 18, cookTime: 2200 },
  { id: "suya", name: "Suya Wrap", shortName: "Suya", icon: "🥙", ingredients: { beef: 1, pepper: 1 }, basePrice: 22, cookTime: 2600 },
  { id: "akara", name: "Akara Bites", shortName: "Akara", icon: "🫘", ingredients: { beans: 1, oil: 1 }, basePrice: 14, cookTime: 1900 },
];

export const INGREDIENTS: { id: IngredientId; label: string; icon: string; basePrice: number }[] = [
  { id: "rice", label: "Rice", icon: "🌾", basePrice: 4 },
  { id: "tomato", label: "Tomato", icon: "🍅", basePrice: 3 },
  { id: "beef", label: "Beef", icon: "🥩", basePrice: 6 },
  { id: "pepper", label: "Pepper", icon: "🌶️", basePrice: 2 },
  { id: "beans", label: "Beans", icon: "🫘", basePrice: 4 },
  { id: "oil", label: "Oil", icon: "🫗", basePrice: 3 },
];

export type Rival = {
  id: "grill" | "akara";
  name: string;
  recipe: RecipeId;
  coins: number;
  meals: number;
  price: number;
  sold: number;
};

export const state = {
  day: 1,
  coins: 100,
  reputation: 50,
  sold: 0,
  revenue: 0,
  expenses: 0,
  prices: { jollof: 18, suya: 22, akara: 14 } as Record<RecipeId, number>,
  stock: { rice: 3, tomato: 3, beef: 2, pepper: 2, beans: 2, oil: 2 } as Record<IngredientId, number>,
  supplier: { rice: 22, tomato: 20, beef: 14, pepper: 18, beans: 16, oil: 14 } as Record<IngredientId, number>,
  wholesale: { rice: 4, tomato: 3, beef: 6, pepper: 2, beans: 4, oil: 3 } as Record<IngredientId, number>,
  rivals: [
    { id: "grill", name: "Grill House", recipe: "suya", coins: 55, meals: 3, price: 23, sold: 0 },
    { id: "akara", name: "Aunty B's Akara", recipe: "akara", coins: 48, meals: 3, price: 15, sold: 0 },
  ] as Rival[],
  marketMessage: "The supplier is open. Stock up before the lunch crowd arrives.",
  shiftSeconds: 120,
  shiftOpen: true,
};

export function recipeById(id: RecipeId) {
  return RECIPES.find((recipe) => recipe.id === id)!;
}

export function canCook(id: RecipeId) {
  const recipe = recipeById(id);
  return Object.entries(recipe.ingredients).every(([key, amount]) =>
    state.stock[key as IngredientId] >= (amount ?? 0),
  );
}

export function buyIngredient(id: IngredientId, quantity = 2) {
  const cost = state.wholesale[id] * quantity;
  if (state.supplier[id] < quantity) return `Only ${state.supplier[id]} ${INGREDIENTS.find((item) => item.id === id)?.label.toLowerCase()} left at the supplier.`;
  if (state.coins < cost) return "You don't have enough coins for that purchase.";
  state.coins -= cost;
  state.expenses += cost;
  state.stock[id] += quantity;
  state.supplier[id] -= quantity;
  state.marketMessage = `You bought ${quantity} units of ${id} for ${cost} coins.`;
  return state.marketMessage;
}

export function changePrice(id: RecipeId, amount: number) {
  state.prices[id] = Math.max(8, Math.min(35, state.prices[id] + amount));
  return `${recipeById(id).shortName} now costs ${state.prices[id]} coins.`;
}

export function completeOrder(id: RecipeId, quality: number) {
  const recipe = recipeById(id);
  if (!canCook(id)) return { ok: false, message: "You're out of an ingredient. Restock before taking another order." };
  for (const [key, amount] of Object.entries(recipe.ingredients)) {
    state.stock[key as IngredientId] -= amount ?? 0;
  }
  const base = state.prices[id];
  const earned = Math.max(1, Math.round(base * quality));
  const tip = quality >= 1.18 ? 2 : quality >= 0.95 ? 1 : 0;
  state.coins += earned + tip;
  state.revenue += earned + tip;
  state.sold += 1;
  if (quality >= 1.18) state.reputation = Math.min(100, state.reputation + 2);
  else if (quality >= 0.95) state.reputation = Math.min(100, state.reputation + 1);
  else state.reputation = Math.max(0, state.reputation - 1);
  return {
    ok: true,
    earned: earned + tip,
    message: quality >= 1.18 ? `Perfect plate! ${earned + tip} coins earned, including a tip.` : quality >= 0.95 ? `Order served. You earned ${earned + tip} coins.` : `The food was overcooked. You earned ${earned + tip} coins, but lost a little reputation.`,
  };
}

export function disappointCustomer() {
  state.reputation = Math.max(0, state.reputation - 2);
}

function buyForRival(rival: Rival) {
  const recipe = recipeById(rival.recipe);
  if (rival.meals >= 4) return;
  const needs = Object.entries(recipe.ingredients) as [IngredientId, number][];
  if (needs.some(([id, amount]) => state.supplier[id] < amount || rival.coins < state.wholesale[id] * amount)) return;
  for (const [id, amount] of needs) {
    state.supplier[id] -= amount;
    rival.coins -= state.wholesale[id] * amount;
  }
  rival.meals += 2;
}

export function rivalSale(rivalId: Rival["id"]) {
  const rival = state.rivals.find((item) => item.id === rivalId);
  if (!rival || rival.meals <= 0) return;
  rival.meals -= 1;
  rival.coins += rival.price;
  rival.sold += 1;
  if (rival.meals <= 1) rival.price = Math.min(30, rival.price + 1);
}

export function marketPulse() {
  for (const rival of state.rivals) {
    buyForRival(rival);
    if (rival.meals > 0 && Math.random() > 0.25) rivalSale(rival.id);
    if (rival.meals >= 4) rival.price = Math.max(12, rival.price - 1);
  }

  for (const item of INGREDIENTS) {
    const available = state.supplier[item.id];
    const pressure = Math.max(0, 1 - available / 20);
    state.wholesale[item.id] = Math.max(1, Math.round(item.basePrice * (1 + pressure * 0.9)));
    state.supplier[item.id] = Math.min(28, available + 1);
  }

  const scarce = INGREDIENTS
    .filter((item) => state.supplier[item.id] <= 5)
    .sort((a, b) => state.supplier[a.id] - state.supplier[b.id])[0];
  state.marketMessage = scarce
    ? `${scarce.label} is running low. The whole street is paying more for it.`
    : "Supplier prices are moving with demand. Rivals are restocking too.";
}

export function closeShift() {
  state.shiftOpen = false;
  const rent = 5;
  state.coins = Math.max(0, state.coins - rent);
  state.expenses += rent;
  return {
    day: state.day,
    sold: state.sold,
    revenue: state.revenue,
    expenses: state.expenses,
    profit: state.revenue - state.expenses,
    reputation: state.reputation,
  };
}

export function startNextDay() {
  state.day += 1;
  state.sold = 0;
  state.revenue = 0;
  state.expenses = 0;
  state.shiftSeconds = 120;
  state.shiftOpen = true;
  for (const item of INGREDIENTS) state.supplier[item.id] = Math.min(28, state.supplier[item.id] + 4);
  state.marketMessage = `Day ${state.day}. The street is opening up again.`;
}

export type MarketState = {
  day: number;
  money: number;
  rice: number;
  tomatoes: number;
  chicken: number;
  mealPrice: number;
  reputation: number;
  served: number;
  supplier: { rice: number; tomatoes: number; chicken: number };
  wholesale: { rice: number; tomatoes: number; chicken: number };
  rival: { name: string; money: number; stock: number; price: number; sold: number };
  rivalTwo: { name: string; money: number; stock: number; price: number; sold: number };
  message: string;
};

export const state: MarketState = {
  day: 1, money: 100, rice: 5, tomatoes: 5, chicken: 2,
  mealPrice: 18, reputation: 50, served: 0,
  supplier: { rice: 28, tomatoes: 24, chicken: 16 },
  wholesale: { rice: 4, tomatoes: 3, chicken: 6 },
  rival: { name: "Grill House", money: 82, stock: 5, price: 20, sold: 0 },
  rivalTwo: { name: "Noodle Spot", money: 74, stock: 4, price: 17, sold: 0 },
  message: "Your stall is ready. Buy ingredients, set a price and serve the lunch crowd.",
};

export function buyStock() {
  const cost = state.wholesale.rice * 2 + state.wholesale.tomatoes * 2;
  if (state.money < cost) return "Not enough coins to buy this stock.";
  if (state.supplier.rice < 2 || state.supplier.tomatoes < 2) return "The supplier is running low. Check back after it restocks.";
  state.money -= cost;
  state.rice += 2;
  state.tomatoes += 2;
  state.supplier.rice -= 2;
  state.supplier.tomatoes -= 2;
  return `Bought 2 rice and 2 tomatoes for ${cost} coins.`;
}

export function serveMeal() {
  if (state.rice < 1 || state.tomatoes < 1) return "You need 1 rice and 1 tomato to prepare a rice bowl.";
  const budget = 13 + Math.floor(Math.random() * 15);
  const preference = Math.random();
  const rivalPressure = state.rival.price <= state.mealPrice || state.rivalTwo.price <= state.mealPrice;
  const fairPrice = state.mealPrice <= budget;
  if (!fairPrice && preference > 0.22) {
    state.reputation = Math.max(0, state.reputation - 1);
    return `A customer with ${budget} coins walked away. Your bowl costs ${state.mealPrice}.`;
  }
  if (rivalPressure && preference > 0.7) {
    return "A customer chose a rival stall with a lower price.";
  }
  state.rice -= 1;
  state.tomatoes -= 1;
  state.money += state.mealPrice;
  state.served += 1;
  state.reputation = Math.min(100, state.reputation + 1);
  return `Rice bowl sold for ${state.mealPrice} coins. A customer is happy.`;
}

export function changePrice(amount: number) {
  state.mealPrice = Math.max(8, Math.min(35, state.mealPrice + amount));
  return `Your rice bowl now costs ${state.mealPrice} coins.`;
}

export function marketPulse() {
  const rivals = [state.rival, state.rivalTwo];
  for (const rival of rivals) {
    const bought = Math.min(2, state.supplier.rice);
    if (bought > 0 && rival.money >= bought * state.wholesale.rice) {
      rival.stock += bought;
      rival.money -= bought * state.wholesale.rice;
      state.supplier.rice -= bought;
    }
    if (rival.stock > 0 && Math.random() > 0.25) {
      rival.stock -= 1;
      rival.money += rival.price;
      rival.sold += 1;
    }
    if (rival.stock >= 7) rival.price = Math.max(12, rival.price - 1);
    if (rival.stock <= 2) rival.price = Math.min(28, rival.price + 1);
  }

  const riceShortage = 1 - state.supplier.rice / 28;
  const tomatoShortage = 1 - state.supplier.tomatoes / 24;
  state.wholesale.rice = Math.max(3, Math.round(4 * (1 + riceShortage * 0.65)));
  state.wholesale.tomatoes = Math.max(2, Math.round(3 * (1 + tomatoShortage * 0.6)));
  if (state.supplier.rice < 8) state.message = "Rice is getting scarce. The supplier has raised its price.";
  else if (state.supplier.tomatoes < 7) state.message = "Tomatoes are running low across the street.";
  else state.message = "The market is moving. Watch supplier stock and rival prices.";
  state.supplier.rice = Math.min(28, state.supplier.rice + 1);
  state.supplier.tomatoes = Math.min(24, state.supplier.tomatoes + 1);
}

export function closeDay() {
  state.day += 1;
  state.money = Math.max(0, state.money - 5);
  state.supplier.rice = Math.min(28, state.supplier.rice + 7);
  state.supplier.tomatoes = Math.min(24, state.supplier.tomatoes + 6);
  state.supplier.chicken = Math.min(16, state.supplier.chicken + 4);
  marketPulse();
  return `Day ${state.day} begins. 5 coins rent paid. The supplier restocked overnight.`;
}

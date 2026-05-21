const BASE = '/api';

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Ingredients
  getIngredients: () => req('/ingredients'),
  addIngredient: (body) => req('/ingredients', { method: 'POST', body }),
  updateIngredient: (id, body) => req(`/ingredients/${id}`, { method: 'PUT', body }),
  deleteIngredient: (id) => req(`/ingredients/${id}`, { method: 'DELETE' }),
  stockIn: (id, body) => req(`/ingredients/${id}/stock-in`, { method: 'POST', body }),
  getIngredientHistory: (id) => req(`/ingredients/${id}/history`),
  // Fuel
  getFuel: () => req('/fuel'),
  addFuel: (body) => req('/fuel', { method: 'POST', body }),
  deleteFuel: (id) => req(`/fuel/${id}`, { method: 'DELETE' }),
  // Recipes
  getRecipes: () => req('/recipes'),
  addRecipe: (body) => req('/recipes', { method: 'POST', body }),
  updateRecipe: (id, body) => req(`/recipes/${id}`, { method: 'PUT', body }),
  deleteRecipe: (id) => req(`/recipes/${id}`, { method: 'DELETE' }),
  // Orders
  getOrders: () => req('/orders'),
  addOrder: (body) => req('/orders', { method: 'POST', body }),
  deleteOrder: (id) => req(`/orders/${id}`, { method: 'DELETE' }),
  // Reports
  getSummary: () => req('/reports/summary'),
  getConsumption: (from, to) => req(`/reports/consumption${from ? `?from=${from}&to=${to}` : ''}`),
};

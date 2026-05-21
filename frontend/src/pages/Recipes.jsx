import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function Modal({ title, children, onClose, large }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${large ? ' modal-lg' : ''}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const CATEGORIES = ['Starter', 'Main Course', 'Biryani', 'Bread', 'Dessert', 'Beverage', 'Side Dish', 'Snack', 'Other'];

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Main Course', description: '', selling_price: '', serves: 1, ingredients: [] });
  const [error, setError] = useState('');

  const load = () => Promise.all([api.getRecipes(), api.getIngredients()]).then(([r, i]) => { setRecipes(r); setIngredients(i); });
  useEffect(() => { load(); }, []);

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.category || '').toLowerCase().includes(search.toLowerCase()));

  const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))];

  function openAdd() {
    setForm({ name: '', category: 'Main Course', description: '', selling_price: '', serves: 1, ingredients: [] });
    setError('');
    setModal('form');
    setSelected(null);
  }

  function openEdit(r) {
    setSelected(r);
    setForm({
      name: r.name,
      category: r.category || '',
      description: r.description || '',
      selling_price: r.selling_price,
      serves: r.serves,
      ingredients: r.ingredients.map(i => ({ ingredient_id: i.ingredient_id, quantity: i.quantity, _name: i.ingredient_name, _unit: i.unit }))
    });
    setError('');
    setModal('form');
  }

  function addIngredientRow() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient_id: '', quantity: '' }] }));
  }

  function removeIngredientRow(idx) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  }

  function updateIngRow(idx, key, val) {
    setForm(f => {
      const ings = [...f.ingredients];
      ings[idx] = { ...ings[idx], [key]: val };
      if (key === 'ingredient_id') {
        const ing = ingredients.find(i => i.id === Number(val));
        if (ing) { ings[idx]._unit = ing.unit; ings[idx]._name = ing.name; }
      }
      return { ...f, ingredients: ings };
    });
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Recipe name is required'); return; }
    const ings = form.ingredients.filter(i => i.ingredient_id && i.quantity);
    try {
      const payload = { ...form, ingredients: ings };
      if (selected) await api.updateRecipe(selected.id, payload);
      else await api.addRecipe(payload);
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(r) {
    if (!confirm(`Delete recipe "${r.name}"?`)) return;
    await api.deleteRecipe(r.id);
    load();
  }

  const getCostPerServe = (r) => {
    return r.ingredients.reduce((sum, i) => {
      const ing = ingredients.find(x => x.id === i.ingredient_id);
      return sum + (ing ? ing.cost_per_unit * i.quantity : 0);
    }, 0);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Recipes</div>
          <div className="page-subtitle">Define dishes and their ingredient requirements</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Recipe</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="form-input" style={{ paddingLeft: 32, width: 240 }} placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="badge badge-gray">{filtered.length} recipes</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dish Name</th>
                <th>Category</th>
                <th>Serves</th>
                <th>Selling Price</th>
                <th>Est. Cost/Serve</th>
                <th>Margin</th>
                <th>Ingredients</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">📋</div><p>No recipes yet. Create your first recipe.</p></div></td></tr>
              ) : filtered.map(r => {
                const cost = getCostPerServe(r);
                const price = Number(r.selling_price);
                const margin = price > 0 ? ((price - cost) / price * 100).toFixed(0) : null;
                return (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong>{r.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{r.description}</div>}</td>
                    <td>{r.category ? <span className="badge badge-blue">{r.category}</span> : '—'}</td>
                    <td>{r.serves}</td>
                    <td>₹{price.toFixed(2)}</td>
                    <td>₹{cost.toFixed(2)}</td>
                    <td>
                      {margin !== null ? (
                        <span className={`badge ${Number(margin) >= 30 ? 'badge-green' : Number(margin) >= 10 ? 'badge-yellow' : 'badge-red'}`}>{margin}%</span>
                      ) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewRecipe(r)}>
                        {r.ingredients.length} items
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'form' && (
        <Modal title={selected ? 'Edit Recipe' : 'New Recipe'} onClose={() => setModal(null)} large>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Dish Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input className="form-input" type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Serves (portions)</label>
              <input className="form-input" type="number" min="1" value={form.serves} onChange={e => setForm({ ...form, serves: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Ingredients (per recipe/per serve)</label>
              <button className="btn btn-ghost btn-sm" onClick={addIngredientRow}>+ Add Row</button>
            </div>
            {form.ingredients.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No ingredients added. Click "+ Add Row" to start.</div>
            ) : (
              <div className="ing-list">
                {form.ingredients.map((row, idx) => {
                  const ing = ingredients.find(i => i.id === Number(row.ingredient_id));
                  return (
                    <div className="ing-row" key={idx}>
                      <select className="form-select" value={row.ingredient_id} onChange={e => updateIngRow(idx, 'ingredient_id', e.target.value)}>
                        <option value="">Select ingredient...</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input className="form-input" type="number" step="0.001" placeholder="Qty" value={row.quantity} onChange={e => updateIngRow(idx, 'quantity', e.target.value)} style={{ width: 90 }} />
                      <span className="unit-label">{ing ? ing.unit : ''}</span>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeIngredientRow(idx)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{selected ? 'Save Changes' : 'Create Recipe'}</button>
          </div>
        </Modal>
      )}

      {viewRecipe && (
        <Modal title={`Recipe: ${viewRecipe.name}`} onClose={() => setViewRecipe(null)}>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {viewRecipe.category && <span className="badge badge-blue">{viewRecipe.category}</span>}
            <span className="badge badge-gray">Serves {viewRecipe.serves}</span>
            <span className="badge badge-green">₹{Number(viewRecipe.selling_price).toFixed(2)}</span>
          </div>
          {viewRecipe.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{viewRecipe.description}</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ingredient</th><th>Quantity</th><th>Unit</th><th>Est. Cost</th></tr></thead>
              <tbody>
                {viewRecipe.ingredients.map((i, idx) => {
                  const ing = ingredients.find(x => x.id === i.ingredient_id);
                  const cost = ing ? ing.cost_per_unit * i.quantity : 0;
                  return (
                    <tr key={idx}>
                      <td>{i.ingredient_name}</td>
                      <td>{i.quantity}</td>
                      <td>{i.unit}</td>
                      <td>₹{cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
            Total ingredient cost: ₹{getCostPerServe(viewRecipe).toFixed(2)}
          </div>
        </Modal>
      )}
    </>
  );
}

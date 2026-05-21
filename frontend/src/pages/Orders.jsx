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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [modal, setModal] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_name: '', date: new Date().toISOString().split('T')[0], notes: '', items: [] });
  const [error, setError] = useState('');

  const load = () => Promise.all([api.getOrders(), api.getRecipes()]).then(([o, r]) => { setOrders(o); setRecipes(r); });
  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o =>
    (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  function openNew() {
    setForm({ customer_name: '', date: new Date().toISOString().split('T')[0], notes: '', items: [{ recipe_id: '', quantity: 1, unit_price: '' }] });
    setError('');
    setModal('form');
  }

  function addItemRow() {
    setForm(f => ({ ...f, items: [...f.items, { recipe_id: '', quantity: 1, unit_price: '' }] }));
  }

  function removeItemRow(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function updateItem(idx, key, val) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      if (key === 'recipe_id') {
        const r = recipes.find(x => x.id === Number(val));
        if (r) items[idx].unit_price = r.selling_price;
      }
      return { ...f, items };
    });
  }

  const total = form.items.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);

  async function handleSave() {
    const items = form.items.filter(i => i.recipe_id && i.quantity > 0);
    if (items.length === 0) { setError('Add at least one dish'); return; }
    try {
      await api.addOrder({ ...form, items: items.map(i => ({ ...i, recipe_id: Number(i.recipe_id), quantity: Number(i.quantity), unit_price: Number(i.unit_price) })) });
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(o) {
    if (!confirm(`Delete order ${o.order_number}? Stock will be restored.`)) return;
    await api.deleteOrder(o.id);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Billing & Orders</div>
          <div className="page-subtitle">Record billed orders — stock is auto-deducted from recipes</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Bill / Order</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="form-input" style={{ paddingLeft: 32, width: 240 }} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="badge badge-gray">{filtered.length} orders</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">🧾</div><p>No orders yet. Create your first bill.</p></div></td></tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td><strong>{o.order_number}</strong></td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{o.date}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewOrder(o)}>
                      {o.items.length} dish{o.items.length !== 1 ? 'es' : ''}
                    </button>
                  </td>
                  <td><strong>₹{Number(o.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewOrder(o)}>View</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'form' && (
        <Modal title="New Bill / Order" onClose={() => setModal(null)} large>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input className="form-input" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer / event name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>Dishes Ordered</label>
              <button className="btn btn-ghost btn-sm" onClick={addItemRow}>+ Add Dish</button>
            </div>
            {form.items.map((item, idx) => {
              const recipe = recipes.find(r => r.id === Number(item.recipe_id));
              return (
                <div className="order-item-row" key={idx}>
                  <select className="form-select" style={{ flex: 3 }} value={item.recipe_id} onChange={e => updateItem(idx, 'recipe_id', e.target.value)}>
                    <option value="">Select dish...</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} {r.category ? `(${r.category})` : ''}</option>)}
                  </select>
                  <input className="form-input" type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} style={{ width: 70 }} placeholder="Qty" />
                  <input className="form-input" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} style={{ width: 100 }} placeholder="Price" />
                  <span style={{ fontSize: 13, color: '#6b7280', minWidth: 60 }}>
                    = ₹{((Number(item.unit_price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => removeItemRow(idx)}>✕</button>
                </div>
              );
            })}
            <div className="order-total">Total: ₹{total.toFixed(2)}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>

          <div className="alert alert-warning">
            ⚠️ Saving this order will automatically deduct ingredients from stock based on recipe quantities.
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Bill & Deduct Stock</button>
          </div>
        </Modal>
      )}

      {viewOrder && (
        <Modal title={`Order: ${viewOrder.order_number}`} onClose={() => setViewOrder(null)}>
          <div style={{ marginBottom: 12 }}>
            <div><strong>Customer:</strong> {viewOrder.customer_name || '—'}</div>
            <div><strong>Date:</strong> {viewOrder.date}</div>
            {viewOrder.notes && <div><strong>Notes:</strong> {viewOrder.notes}</div>}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Dish</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
              <tbody>
                {viewOrder.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.recipe_name}</td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.unit_price).toFixed(2)}</td>
                    <td>₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, marginTop: 12 }}>
            Total: ₹{Number(viewOrder.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </Modal>
      )}
    </>
  );
}

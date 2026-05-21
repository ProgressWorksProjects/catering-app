import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'box', 'bag', 'bottle', 'packet', 'tray'];

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'stockin' | 'history'
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ name: '', unit: 'kg', low_stock_alert: '', cost_per_unit: '' });
  const [stockForm, setStockForm] = useState({ quantity: '', cost_per_unit: '', supplier: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [error, setError] = useState('');

  const load = () => api.getIngredients().then(setIngredients);
  useEffect(() => { load(); }, []);

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  function openAdd() {
    setForm({ name: '', unit: 'kg', low_stock_alert: '', cost_per_unit: '' });
    setError('');
    setModal('add');
  }

  function openEdit(ing) {
    setSelected(ing);
    setForm({ name: ing.name, unit: ing.unit, low_stock_alert: ing.low_stock_alert, cost_per_unit: ing.cost_per_unit });
    setError('');
    setModal('edit');
  }

  function openStockIn(ing) {
    setSelected(ing);
    setStockForm({ quantity: '', cost_per_unit: ing.cost_per_unit || '', supplier: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setError('');
    setModal('stockin');
  }

  async function openHistory(ing) {
    setSelected(ing);
    const h = await api.getIngredientHistory(ing.id);
    setHistory(h);
    setModal('history');
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.unit) { setError('Unit is required'); return; }
    try {
      if (modal === 'add') await api.addIngredient(form);
      else await api.updateIngredient(selected.id, form);
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleStockIn() {
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { setError('Enter a valid quantity'); return; }
    try {
      await api.stockIn(selected.id, stockForm);
      setModal(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(ing) {
    if (!confirm(`Delete "${ing.name}"? This cannot be undone.`)) return;
    await api.deleteIngredient(ing.id);
    load();
  }

  function getStockColor(ing) {
    if (ing.low_stock_alert > 0 && ing.current_stock <= ing.low_stock_alert) return '#ef4444';
    if (ing.low_stock_alert > 0 && ing.current_stock <= ing.low_stock_alert * 1.5) return '#f59e0b';
    return '#10b981';
  }

  function getStockPct(ing) {
    if (!ing.low_stock_alert) return 100;
    return Math.min(100, (ing.current_stock / (ing.low_stock_alert * 2)) * 100);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Ingredients & Stock</div>
          <div className="page-subtitle">Track raw materials and record incoming stock</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Ingredient</button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input className="form-input" style={{ paddingLeft: 32, width: 240 }} placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="badge badge-gray">{filtered.length} items</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Unit</th>
                <th>Current Stock</th>
                <th>Alert Level</th>
                <th>Cost/Unit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🥕</div><p>No ingredients yet. Add your first ingredient.</p></div></td></tr>
              ) : filtered.map(ing => {
                const color = getStockColor(ing);
                const pct = getStockPct(ing);
                const isLow = ing.low_stock_alert > 0 && ing.current_stock <= ing.low_stock_alert;
                return (
                  <tr key={ing.id}>
                    <td><strong>{ing.name}</strong></td>
                    <td>{ing.unit}</td>
                    <td>
                      <div className="stock-bar-wrap">
                        <div className="stock-bar">
                          <div className="stock-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span style={{ color, fontWeight: 600, minWidth: 60 }}>{Number(ing.current_stock).toFixed(2)}</span>
                      </div>
                    </td>
                    <td>{ing.low_stock_alert > 0 ? ing.low_stock_alert : '—'}</td>
                    <td>₹{Number(ing.cost_per_unit).toFixed(2)}</td>
                    <td>
                      {isLow
                        ? <span className="badge badge-red">Low Stock</span>
                        : <span className="badge badge-green">OK</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => openStockIn(ing)}>+ Stock In</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openHistory(ing)}>History</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ing)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ing)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Ingredient' : 'Edit Ingredient'} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tomatoes" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unit *</label>
              <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
                <option value="other">other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost per Unit (₹)</label>
              <input className="form-input" type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Low Stock Alert Level</label>
            <input className="form-input" type="number" step="0.01" value={form.low_stock_alert} onChange={e => setForm({ ...form, low_stock_alert: e.target.value })} placeholder="Alert when stock falls below this" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Add Ingredient' : 'Save Changes'}</button>
          </div>
        </Modal>
      )}

      {modal === 'stockin' && selected && (
        <Modal title={`Stock In — ${selected.name}`} onClose={() => setModal(null)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="alert alert-success">
            Current stock: <strong>{Number(selected.current_stock).toFixed(2)} {selected.unit}</strong>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity ({selected.unit}) *</label>
              <input className="form-input" type="number" step="0.01" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} placeholder="0.00" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Cost per Unit (₹)</label>
              <input className="form-input" type="number" step="0.01" value={stockForm.cost_per_unit} onChange={e => setStockForm({ ...stockForm, cost_per_unit: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={stockForm.date} onChange={e => setStockForm({ ...stockForm, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input className="form-input" value={stockForm.supplier} onChange={e => setStockForm({ ...stockForm, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          {stockForm.quantity && stockForm.cost_per_unit && (
            <div className="alert alert-success">
              Total cost: ₹{(Number(stockForm.quantity) * Number(stockForm.cost_per_unit)).toFixed(2)}
            </div>
          )}
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-success" onClick={handleStockIn}>Record Stock In</button>
          </div>
        </Modal>
      )}

      {modal === 'history' && selected && (
        <Modal title={`Stock History — ${selected.name}`} onClose={() => setModal(null)}>
          {history.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📦</div><p>No stock entries yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Qty In</th><th>Cost/Unit</th><th>Supplier</th><th>Notes</th></tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>+{h.quantity} {selected.unit}</td>
                      <td>₹{Number(h.cost_per_unit).toFixed(2)}</td>
                      <td>{h.supplier || '—'}</td>
                      <td>{h.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

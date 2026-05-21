import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const FUEL_TYPES = ['LPG', 'CNG', 'Diesel', 'Petrol', 'Wood', 'Coal', 'Electricity', 'Other'];
const UNITS = ['kg', 'L', 'cylinder', 'unit', 'kWh', 'ton'];

function Modal({ title, children, onClose }) {
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

export default function Fuel() {
  const [entries, setEntries] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fuel_type: 'LPG', quantity: '', unit: 'kg', cost: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [error, setError] = useState('');

  const load = () => api.getFuel().then(setEntries);
  useEffect(() => { load(); }, []);

  const totalCost = entries.reduce((s, e) => s + Number(e.cost || 0), 0);
  const byType = entries.reduce((acc, e) => {
    acc[e.fuel_type] = (acc[e.fuel_type] || 0) + Number(e.cost || 0);
    return acc;
  }, {});

  async function handleSave() {
    if (!form.quantity || Number(form.quantity) <= 0) { setError('Enter a valid quantity'); return; }
    try {
      await api.addFuel(form);
      setModal(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this fuel entry?')) return;
    await api.deleteFuel(id);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fuel & Utilities</div>
          <div className="page-subtitle">Track fuel and utility consumption</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ fuel_type: 'LPG', quantity: '', unit: 'kg', cost: '', date: new Date().toISOString().split('T')[0], notes: '' }); setError(''); setModal(true); }}>+ Add Entry</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>⛽</div>
          <div>
            <div className="stat-value">{entries.length}</div>
            <div className="stat-label">Total entries</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>💸</div>
          <div>
            <div className="stat-value">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-label">Total fuel cost</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>📦</div>
          <div>
            <div className="stat-value">{Object.keys(byType).length}</div>
            <div className="stat-label">Fuel types used</div>
          </div>
        </div>
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Cost by Fuel Type</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(byType).map(([type, cost]) => (
              <div key={type} style={{ background: '#f0f2f5', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ fontWeight: 600 }}>{type}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Fuel Log</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Fuel Type</th><th>Quantity</th><th>Unit</th><th>Cost (₹)</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">⛽</div><p>No fuel entries yet.</p></div></td></tr>
              ) : entries.map(e => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td><span className="badge badge-yellow">{e.fuel_type}</span></td>
                  <td>{e.quantity}</td>
                  <td>{e.unit}</td>
                  <td>₹{Number(e.cost || 0).toFixed(2)}</td>
                  <td>{e.notes || '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title="Add Fuel / Utility Entry" onClose={() => setModal(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fuel / Utility Type *</label>
              <select className="form-select" value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })}>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0.00" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Total Cost (₹)</label>
            <input className="form-input" type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Entry</button>
          </div>
        </Modal>
      )}
    </>
  );
}

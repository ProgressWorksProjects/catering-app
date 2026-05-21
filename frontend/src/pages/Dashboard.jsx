import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSummary().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data) return <div className="alert alert-error">Failed to load data</div>;

  const { totalIngredients, lowStock, totalOrders, totalRevenue, recentOrders, lowStockItems, topDishes, monthlyRevenue } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of your catering operations</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => api.getSummary().then(setData)}>↻ Refresh</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>🥕</div>
          <div>
            <div className="stat-value">{totalIngredients}</div>
            <div className="stat-label">Ingredients tracked</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: lowStock > 0 ? 'pointer' : 'default' }} onClick={() => lowStock > 0 && onNavigate('ingredients')}>
          <div className="stat-icon" style={{ background: lowStock > 0 ? '#fee2e2' : '#d1fae5' }}>{lowStock > 0 ? '⚠️' : '✅'}</div>
          <div>
            <div className="stat-value" style={{ color: lowStock > 0 ? '#ef4444' : undefined }}>{lowStock}</div>
            <div className="stat-label">Low stock alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>🧾</div>
          <div>
            <div className="stat-value">{totalOrders}</div>
            <div className="stat-label">Total orders</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>💰</div>
          <div>
            <div className="stat-value">₹{Number(totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-label">Total revenue</div>
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span>⚠️</span>
          <strong>{lowStockItems.length} ingredient{lowStockItems.length > 1 ? 's' : ''} running low:</strong>&nbsp;
          {lowStockItems.map(i => i.name).join(', ')}
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Orders</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('orders')}>View all →</button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🧾</div><p>No orders yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th></tr></thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>{o.customer_name || '—'}</td>
                      <td>{o.date}</td>
                      <td>₹{Number(o.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Dishes</div>
          </div>
          {topDishes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>No orders yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Dish</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topDishes.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.total_qty}</td>
                      <td>₹{Number(d.revenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {monthlyRevenue.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Monthly Revenue</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>
                {monthlyRevenue.map((m, i) => (
                  <tr key={i}>
                    <td>{m.month}</td>
                    <td>{m.orders}</td>
                    <td>₹{Number(m.revenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

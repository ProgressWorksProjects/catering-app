import React, { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Ingredients from './pages/Ingredients.jsx';
import Recipes from './pages/Recipes.jsx';
import Orders from './pages/Orders.jsx';
import Fuel from './pages/Fuel.jsx';

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'ingredients', icon: '🥕', label: 'Ingredients' },
  { id: 'recipes', icon: '📋', label: 'Recipes' },
  { id: 'orders', icon: '🧾', label: 'Billing / Orders' },
  { id: 'fuel', icon: '⛽', label: 'Fuel / Utilities' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🍽️</span>
          <span className="logo-text">Catering Manager</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <div key={n.id} className={`nav-item${page === n.id ? ' active' : ''}`} onClick={() => setPage(n.id)}>
              <span className="icon">{n.icon}</span>
              <span className="label">{n.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
        {page === 'ingredients' && <Ingredients />}
        {page === 'recipes' && <Recipes />}
        {page === 'orders' && <Orders />}
        {page === 'fuel' && <Fuel />}
      </main>
    </div>
  );
}

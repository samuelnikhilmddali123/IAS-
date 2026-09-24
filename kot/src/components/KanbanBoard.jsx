import React from 'react';
import {
  Search,
  Calendar,
  MoreHorizontal,
  Plus,
  Bell,
  CookingPot,
  ConciergeBell
} from 'lucide-react';
import { OrderCard } from './OrderCard';
import { RightPanel } from './RightPanel';

export function KanbanBoard({
  orders,
  completedOrders,
  alerts,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  onAcceptOrder,
  onRejectOrder,
  onMarkReady,
  onMarkCompleted,
  onOpenNewOrderModal
}) {
  // Filter logic helper
  const filterOrders = (list) => {
    return list.filter((order) => {
      // Type filter
      if (filterType !== 'All Orders' && order.type !== filterType) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesTable = order.table ? order.table.toLowerCase().includes(query) : false;
        const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(query));
        return matchesId || matchesTable || matchesItem;
      }
      return true;
    });
  };


  const prepFiltered = filterOrders(orders.prep || []);
  const readyFiltered = filterOrders(orders.ready || []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', minHeight: 0 }}>
      {/* Controls / Filter Bar */}
      <div className="controls-bar">
        <div className="controls-left">
          <h2 className="section-title">Live Kitchen Orders</h2>
          <span className="section-subtitle">Fresh Orders. On Time. Always.</span>
        </div>

        <div className="controls-right">
          <div className="search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by Order No, Table or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All Orders">All Orders</option>
            <option value="Dine In">Dine In</option>
            <option value="Delivery">Delivery</option>
          </select>

          <button className="date-btn">
            <Calendar size={14} />
            <span>Today</span>
          </button>

          <button className="icon-btn" title="More Options">
            <MoreHorizontal size={16} />
          </button>

          <button className="add-order-btn" onClick={onOpenNewOrderModal}>
            <Plus size={16} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Order Columns + Right Panel */}
      <div className="main-dashboard-grid">
        <div className="kanban-column column-prep">
          <div className="column-header">
            <div className="column-header-left">
              <div className="column-header-icon">
                <CookingPot size={14} />
              </div>
              <div className="column-title-group">
                <div className="column-title">
                  Preparing
                  <span className="column-badge">{prepFiltered.length}</span>
                </div>
                <span className="column-subtitle">In progress</span>
              </div>
            </div>
          </div>

          <div className="kanban-cards-scroll">
            {prepFiltered.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9a3412', fontSize: '0.85rem' }}>
                No orders preparing
              </div>
            ) : (
              prepFiltered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onMarkReady={onMarkReady}
                  onReject={onRejectOrder}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div className="kanban-column column-ready">
          <div className="column-header">
            <div className="column-header-left">
              <div className="column-header-icon">
                <ConciergeBell size={14} />
              </div>
              <div className="column-title-group">
                <div className="column-title">
                  Ready
                  <span className="column-badge">{readyFiltered.length}</span>
                </div>
                <span className="column-subtitle">Ready to serve</span>
              </div>
            </div>
          </div>

          <div className="kanban-cards-scroll">
            {readyFiltered.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#166534', fontSize: '0.85rem' }}>
                No orders ready
              </div>
            ) : (
              readyFiltered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onMarkCompleted={onMarkCompleted}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side Panel */}
        <RightPanel completedOrders={completedOrders} alerts={alerts} />
      </div>
    </div>
  );
}

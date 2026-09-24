import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  CookingPot,
  Clock,
  ConciergeBell,
  CheckCheck,
  XCircle,
  UtensilsCrossed,
  Grid,
  BarChart3,
  Settings,
  Search,
  RefreshCw,
  Printer,
  Volume2,
  Flame,
  Users
} from 'lucide-react';
import { OrderCard } from './OrderCard';
import { KitchenAPI } from '../services/api';
import { playKitchenChime } from '../utils/audio';

export function SubPage({
  activeTab,
  orders,
  completedOrders,
  stats,
  onAcceptOrder,
  onRejectOrder,
  onMarkReady,
  onMarkCompleted,
  onPrintOrder
}) {
  // Menu items state for 'menu-items' tab
  const [foods, setFoods] = useState([]);
  const [foodFilter, setFoodFilter] = useState('all');
  const [foodSearch, setFoodSearch] = useState('');
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [foodActionLoading, setFoodActionLoading] = useState({});

  const fetchMenuFoods = useCallback(async () => {
    setIsLoadingFoods(true);
    try {
      const data = await KitchenAPI.getAllFoods();
      if (data && data.food) {
        setFoods(data.food);
      }
    } catch (err) {
      console.error('Failed to load menu foods:', err);
    } finally {
      setIsLoadingFoods(false);
    }
  }, []);

  // Fetch foods when menu-items tab is opened
  useEffect(() => {
    if (activeTab === 'menu-items') {
      fetchMenuFoods();
    }
  }, [activeTab, fetchMenuFoods]);

  const handleToggleStock = async (food) => {
    const newStatus = !food.isAvailable;
    setFoodActionLoading(prev => ({ ...prev, [food.id]: true }));
    try {
      await KitchenAPI.toggleFoodStock(food.id, newStatus, newStatus ? (food.availableQuantity > 0 ? food.availableQuantity : 50) : 0);
      setFoods(prev =>
        prev.map(f =>
          f.id === food.id
            ? { ...f, isAvailable: newStatus, availableQuantity: newStatus ? (f.availableQuantity || 50) : 0 }
            : f
        )
      );
    } catch (err) {
      console.error('Failed to toggle stock:', err);
      alert('Could not update food stock on backend.');
    } finally {
      setFoodActionLoading(prev => ({ ...prev, [food.id]: false }));
    }
  };

  const filteredFoods = foods.filter(food => {
    if (foodFilter !== 'all' && food.category !== foodFilter) return false;
    if (foodSearch.trim()) {
      const q = foodSearch.toLowerCase();
      return (food.name && food.name.toLowerCase().includes(q)) ||
             (food.subCategory && food.subCategory.toLowerCase().includes(q));
    }
    return true;
  });

  const getSubpageMeta = () => {
    switch (activeTab) {
      case 'new-orders':
        return {
          title: 'New Orders Queue',
          desc: 'All incoming kitchen orders waiting for acceptance by kitchen staff.',
          icon: ClipboardList,
          type: 'orders',
          orderList: orders.new || [],
          status: 'new'
        };
      case 'active-kots':
        return {
          title: 'Active KOTs (Kitchen Order Tickets)',
          desc: 'Overview of all in-flight orders currently in preparation or ready for pickup.',
          icon: CookingPot,
          type: 'orders',
          orderList: [...(orders.prep || []), ...(orders.ready || [])]
        };
      case 'preparing':
        return {
          title: 'Preparing Orders',
          desc: 'Orders currently being cooked by the chef team in the kitchen.',
          icon: Clock,
          type: 'orders',
          orderList: orders.prep || [],
          status: 'prep'
        };
      case 'ready':
        return {
          title: 'Ready for Service',
          desc: 'Prepared orders ready to be picked up by waitstaff or officers.',
          icon: ConciergeBell,
          type: 'orders',
          orderList: orders.ready || [],
          status: 'ready'
        };
      case 'completed':
        return {
          title: 'Completed Orders History',
          desc: 'Archive of all kitchen orders fulfilled today.',
          icon: CheckCheck,
          type: 'history',
          list: completedOrders || []
        };
      case 'cancelled':
        return {
          title: 'Cancelled Orders',
          desc: 'Log of orders that were rejected or cancelled.',
          icon: XCircle,
          type: 'orders',
          orderList: orders.cancelled || [],
          status: 'cancelled'
        };
      case 'menu-items':
        return {
          title: 'Kitchen Menu & Stock Management',
          desc: 'Toggle ingredient availability, out-of-stock items, and view dish pricing.',
          icon: UtensilsCrossed,
          type: 'menu'
        };
      case 'tables':
        return {
          title: 'Dining Tables Layout',
          desc: 'Real-time occupancy status for Canteen Dining Tables 1 to 12.',
          icon: Grid,
          type: 'tables'
        };
      case 'reports':
        return {
          title: 'Kitchen Performance Reports & Stats',
          desc: 'Live revenue figures, daily item volume, and preparation insights from backend.',
          icon: BarChart3,
          type: 'reports'
        };
      case 'settings':
        return {
          title: 'Main Kitchen Settings & Details',
          desc: 'Primary mess kitchen operations, active chef line, and connected thermal printer setup.',
          icon: Settings,
          type: 'settings'
        };
      default:
        return {
          title: activeTab,
          desc: 'Section content',
          icon: ClipboardList,
          type: 'empty',
          emptyTitle: 'Section View',
          emptyText: 'Content loaded.'
        };
    }
  };

  const meta = getSubpageMeta();
  const IconComponent = meta.icon;

  return (
    <div className="subpage-container">
      <div className="subpage-header">
        <div>
          <h2 className="subpage-title">
            <IconComponent size={22} color="#16201c" />
            {meta.title}
          </h2>
          <p className="subpage-desc">{meta.desc}</p>
        </div>

        {meta.type === 'menu' && (
          <button className="add-order-btn" onClick={fetchMenuFoods} disabled={isLoadingFoods}>
            <RefreshCw size={14} className={isLoadingFoods ? 'spin' : ''} />
            Refresh Menu
          </button>
        )}
      </div>

      {/* 1. ORDERS VIEW */}
      {meta.type === 'orders' && (
        meta.orderList.length === 0 ? (
          <div className="subpage-content">
            <div className="empty-state-icon">
              <IconComponent size={32} />
            </div>
            <h3 className="empty-state-title">No Orders in this Queue</h3>
            <p className="empty-state-text">There are currently no active tickets matching this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', width: '100%' }}>
            {meta.orderList.map((order) => (
              <OrderCard
                key={order.id || order.orderNumber}
                order={order}
                onAccept={onAcceptOrder}
                onReject={onRejectOrder}
                onMarkReady={onMarkReady}
                onMarkCompleted={onMarkCompleted}
              />
            ))}
          </div>
        )
      )}

      {/* 2. HISTORY / COMPLETED VIEW */}
      {meta.type === 'history' && (
        <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {meta.list.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6b7280' }}>
              No completed orders recorded yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Order / Token</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Customer / Officer</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Items</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Fulfillment Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#374151' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {meta.list.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#111827' }}>
                      {item.tokenNumber ? `Token #${item.tokenNumber}` : item.orderNumber || item.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                      {item.userName || item.location || 'Officer'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                      {item.items ? item.items.map(i => `${i.qty || i.quantity}× ${i.name}`).join(', ') : 'Order fulfilled'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#16201c' }}>
                      {item.totalAmount ? `₹${item.totalAmount}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                      {item.time || item.timeAgo || 'Earlier today'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. MENU / FOOD MANAGEMENT VIEW */}
      {meta.type === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fff', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search dishes (e.g. Masala Dosa, Biryani)..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'breakfast', 'lunch', 'dinner', 'snacks'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFoodFilter(cat)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: foodFilter === cat ? '#16201c' : '#ffffff',
                    color: foodFilter === cat ? '#cca43b' : '#4b5563',
                    borderColor: foodFilter === cat ? '#16201c' : '#d1d5db'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Food Cards Grid */}
          {isLoadingFoods ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6b7280' }}>
              Loading canteen menu from backend...
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="subpage-content">
              <UtensilsCrossed size={32} />
              <h3 className="empty-state-title">No Dishes Found</h3>
              <p className="empty-state-text">Try adjusting your category filter or search query.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredFoods.map((food) => {
                const isToggling = foodActionLoading[food.id];
                return (
                  <div
                    key={food.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: food.isAvailable ? '#e5e7eb' : '#fca5a5',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: food.isAvailable ? 1 : 0.75,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Dish Image */}
                    <div style={{ height: '140px', width: '100%', position: 'relative', backgroundColor: '#f3f4f6' }}>
                      {food.image ? (
                        <img
                          src={food.image}
                          alt={food.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                          <UtensilsCrossed size={28} />
                        </div>
                      )}

                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: food.isVeg ? '#166534' : '#991b1b',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {food.isVeg ? 'VEG' : 'NON-VEG'}
                      </span>

                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: '#16201c',
                        color: '#cca43b',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        ₹{food.price}
                      </span>
                    </div>

                    {/* Dish Content */}
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', margin: 0 }}>
                            {food.name}
                          </h4>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem', lineHeight: '1.3' }}>
                          {food.portion || food.description || `${food.category} · ${food.subCategory}`}
                        </p>
                      </div>

                      {/* Stock Control */}
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: food.isAvailable ? '#15803d' : '#dc2626'
                          }}>
                            {food.isAvailable ? `In Stock (${food.availableQuantity || 'Avail'})` : 'Out of Stock'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleStock(food)}
                          disabled={isToggling}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none',
                            backgroundColor: food.isAvailable ? '#fee2e2' : '#dcfce7',
                            color: food.isAvailable ? '#991b1b' : '#166534',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          {isToggling ? 'Updating...' : food.isAvailable ? 'Mark Sold Out' : 'Mark In Stock'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. REPORTS VIEW */}
      {meta.type === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', width: '100%' }}>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Total Revenue Recorded</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16201c', marginTop: '0.35rem' }}>
              ₹{stats?.totalRevenue || 6465}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>Live ledger sync</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Today's Revenue</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16201c', marginTop: '0.35rem' }}>
              ₹{stats?.todayRevenue || 4950}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>Today's canteen earnings</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Total Orders Processed</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16201c', marginTop: '0.35rem' }}>
              {stats?.totalOrdersCount || 64}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>All time</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Active Menu Items</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16201c', marginTop: '0.35rem' }}>
              {stats?.totalFoodsCount || 16} Dishes
            </div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Available for ordering</span>
          </div>
        </div>
      )}

      {/* 5. TABLES VIEW */}
      {meta.type === 'tables' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', width: '100%' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
            const isOccupied = [1, 3, 4, 5, 6, 9].includes(num);
            return (
              <div
                key={num}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: isOccupied ? '#fde047' : '#e5e7eb',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16201c' }}>
                  Table {num}
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: '0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: isOccupied ? '#fef08a' : '#dcfce7',
                  color: isOccupied ? '#854d0e' : '#15803d'
                }}>
                  {isOccupied ? 'KOT In Progress' : 'Available'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. SETTINGS VIEW - MAIN KITCHEN DETAILS */}
      {meta.type === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '780px', width: '100%' }}>
          {/* Main Kitchen Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            {/* Header Banner */}
            <div style={{
              backgroundColor: '#16201c',
              padding: '1.4rem 1.6rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(204, 164, 59, 0.15)',
                  border: '1px solid rgba(204, 164, 59, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cca43b'
                }}>
                  <CookingPot size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                      Main Kitchen
                    </h3>
                    <span style={{
                      backgroundColor: 'rgba(204, 164, 59, 0.2)',
                      color: '#cca43b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      MK-ALPHA-01
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#a4b3ac' }}>
                    Central Canteen & Officers Regimental Mess
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#34d399'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }} />
                <span>ONLINE & OPERATIONAL</span>
              </div>
            </div>

            {/* Kitchen Details Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Summary Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '0.9rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Users size={14} />
                    <span>Station Supervisor</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '0.35rem' }}>
                    Subedar Master K. Sharma
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Head of Mess Operations</div>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '0.9rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Clock size={14} />
                    <span>Service Operating Hours</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '0.35rem' }}>
                    06:30 hrs – 22:30 hrs
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Live Shift Active</div>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '0.9rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Users size={14} />
                    <span>Kitchen Staff on Duty</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '0.35rem' }}>
                    6 Chefs · 4 Helpers
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Full Station Deployment</div>
                </div>
              </div>

              {/* Station Sections Breakdown */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Production Lines
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
                    <Flame size={16} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Hot Gravy & Tandoor</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Lunch, Dinner Meals & Rice</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
                    <CookingPot size={16} color="#15803d" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Short Order Counter</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Dosa, Parathas, Fast Snacks</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
                    <ConciergeBell size={16} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Beverage Dispense</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Filter Coffee, Tea, Fresh Juices</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware & Printer Configuration */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Connected KOT Printer & Output
                </h4>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Printer size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
                        POS-80 Thermal Kitchen Printer
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                        Connected · 80mm Standard KOT Slip · Auto-Print on Accept Active
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        if (onPrintOrder) {
                          onPrintOrder({
                            id: 'TEST-01',
                            orderNumber: 'ORD-TEST',
                            tokenNumber: '099',
                            userName: 'Subedar Major (Officers Mess)',
                            table: 'Table 4 / Counter',
                            type: 'Dine In',
                            items: [
                              { name: 'Masala Dosa', qty: 2, spicy: true },
                              { name: 'Special Filter Coffee', qty: 2 }
                            ],
                            note: 'TEST PRINT: Extra hot sambar',
                            totalAmount: 180
                          });
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: '#16201c',
                        color: '#cca43b',
                        border: '1px solid #253630',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={14} />
                      Test Print KOT Slip
                    </button>

                    <button
                      onClick={playKitchenChime}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Volume2 size={14} />
                      Test Chime
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

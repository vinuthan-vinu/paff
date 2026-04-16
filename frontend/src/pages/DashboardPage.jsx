import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllFacilities } from '../api/facilityApi';
import { getAllBookings } from '../api/bookingApi';
import { getAllTickets } from '../api/ticketApi';
import { HiOutlineOfficeBuilding, HiOutlineCalendar, HiOutlineTicket, HiOutlineUsers } from 'react-icons/hi';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ facilities: 0, bookings: 0, tickets: 0, pending: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [facRes, bookRes, tickRes] = await Promise.all([
        getAllFacilities(),
        getAllBookings(),
        getAllTickets(),
      ]);

      const bookings = bookRes.data;
      const tickets = tickRes.data;

      setStats({
        facilities: facRes.data.length,
        bookings: bookings.length,
        tickets: tickets.length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
      });

      setRecentBookings(bookings.slice(0, 5));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const cls = status.toLowerCase().replace('_', '-');
    return <span className={`badge badge-${cls}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name} 👋</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-cyan)' }}>
            <HiOutlineOfficeBuilding />
          </div>
          <div className="stat-value">{stats.facilities}</div>
          <div className="stat-label">Total Facilities</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--primary-400)' }}>
            <HiOutlineCalendar />
          </div>
          <div className="stat-value">{stats.bookings}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-violet)' }}>
            <HiOutlineTicket />
          </div>
          <div className="stat-value">{stats.tickets}</div>
          <div className="stat-label">Support Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--accent-amber)' }}>
            <HiOutlineUsers />
          </div>
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending Approvals</div>
        </div>
      </div>

      {recentBookings.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">Recent Bookings</h2>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.facilityName}</td>
                    <td>{b.bookingDate}</td>
                    <td>{b.startTime} – {b.endTime}</td>
                    <td>{statusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

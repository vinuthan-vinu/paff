import { useState, useEffect } from 'react';
import { getNotifications, markAsRead } from '../api/notificationApi';
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('Failed'); }
  };

  const typeIcon = {
    BOOKING_APPROVED: '✅', BOOKING_REJECTED: '❌',
    TICKET_UPDATE: '🔄', TICKET_ASSIGNED: '👤', COMMENT_ADDED: '💬'
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on your bookings and tickets</p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state animate-pulse">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <HiOutlineBell style={{ fontSize: '2rem', opacity: 0.3 }} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              className="glass-card"
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: n.isRead ? 0.6 : 1,
                borderLeft: n.isRead ? 'none' : '3px solid var(--primary-500)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span style={{ fontSize: '1.5rem' }}>{typeIcon[n.type] || '🔔'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>{n.message}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              {!n.isRead && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleMarkRead(n.id)}>
                  <HiOutlineCheck /> Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

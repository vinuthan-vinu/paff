import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineBell } from 'react-icons/hi';
import { getUnreadCount } from '../../api/notificationApi';
import { useAuth } from '../../context/useAuth';

const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Overview of campus operations' },
  '/admin': { title: 'Admin', subtitle: 'Administrative controls and shortcuts' },
  '/facilities': { title: 'Facilities', subtitle: 'Resource catalogue and management' },
  '/bookings': { title: 'Bookings', subtitle: 'Requests, approvals, and schedules' },
  '/tickets': { title: 'Tickets', subtitle: 'Incidents, attachments, and workflow' },
  '/notifications': { title: 'Notifications', subtitle: 'Recent activity and unread alerts' },
};

export default function TopBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId;

    const loadUnreadCount = async () => {
      try {
        const response = await getUnreadCount();
        setUnreadCount(response.data.count ?? 0);
      } catch {
        setUnreadCount(0);
      }
    };

    if (user) {
      loadUnreadCount();
      intervalId = window.setInterval(loadUnreadCount, 10000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [user]);

  const currentPage = pageTitles[pathname] ?? pageTitles['/'];

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{currentPage.title}</h1>
        <p className="topbar-subtitle">{currentPage.subtitle}</p>
      </div>
      <div className="topbar-actions">
        <Link to="/notifications" className="topbar-bell" aria-label="Notifications">
          <HiOutlineBell />
          {unreadCount > 0 && (
            <span className="topbar-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </Link>
        <div className="topbar-user">
          <span className="topbar-user-name">{user?.name}</span>
          <span className="topbar-user-role">{user?.role}</span>
        </div>
      </div>
    </header>
  );
}

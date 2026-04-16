import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineViewGrid, HiOutlineOfficeBuilding, HiOutlineCalendar, HiOutlineTicket, HiOutlineBell, HiOutlineLogout, HiOutlineCog } from 'react-icons/hi';
import './Layout.css';

export default function Sidebar() {
  const { user, logout, isAdmin, isTechnician } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: <HiOutlineViewGrid />, label: 'Dashboard' },
    { path: '/facilities', icon: <HiOutlineOfficeBuilding />, label: 'Facilities' },
    { path: '/bookings', icon: <HiOutlineCalendar />, label: 'Bookings' },
    { path: '/tickets', icon: <HiOutlineTicket />, label: 'Tickets' },
    { path: '/notifications', icon: <HiOutlineBell />, label: 'Notifications' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">SmartCampus</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
}

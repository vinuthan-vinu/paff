import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteFacility, getAllFacilities } from '../api/facilityApi';
import { approveBooking, getAllBookings, rejectBooking } from '../api/bookingApi';
import { getAllTickets, rejectTicket, updateTicketStatus } from '../api/ticketApi';
import { deleteUser, getAllUsers, getUserSubmissions, updateUser } from '../api/userApi';

import {
  HiOutlineCalendar,
  HiOutlineCheck,
  HiOutlineOfficeBuilding,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTicket,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineX,
} from 'react-icons/hi';

import toast from 'react-hot-toast';
import { useAdminRealtimeRefresh } from '../hooks/useAdminRealtimeRefresh';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserRecords, setSelectedUserRecords] = useState(null);
  const [loadingUserRecords, setLoadingUserRecords] = useState(false);


  const loadAdminData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [facilityResponse, bookingResponse, ticketResponse, userResponse] = await Promise.all([
        getAllFacilities(),
        getAllBookings(),
        getAllTickets(),
        getAllUsers(),
      ]);

      setFacilities(facilityResponse.data);
      setBookings(bookingResponse.data);
      setTickets(ticketResponse.data);
      setUsers(userResponse.data);

    } catch {
      toast.error('Failed to load admin data');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useAdminRealtimeRefresh(() => loadAdminData(true), true);

  useEffect(() => {
    loadAdminData();
    const intervalId = window.setInterval(() => loadAdminData(true), 15000);
    return () => window.clearInterval(intervalId);
  }, [loadAdminData]);

  const pendingBookings = bookings.filter((booking) => booking.status === 'PENDING').slice(0, 5);
  const actionableTickets = tickets
    .filter((ticket) => ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(ticket.status))
    .slice(0, 5);
  const recentFacilities = facilities.slice(0, 5);

  const handleDeleteFacility = async (facilityId) => {
    if (!window.confirm('Delete this resource?')) {
      return;
    }

    try {
      await deleteFacility(facilityId);
      toast.success('Resource deleted');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete resource');
    }
  };

  const handleApproveBooking = async (bookingId) => {
    try {
      await approveBooking(bookingId);
      toast.success('Booking approved');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve booking');
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const reason = window.prompt('Enter a rejection reason');
    if (!reason) {
      return;
    }

    try {
      await rejectBooking(bookingId, reason);
      toast.success('Booking rejected');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleStartTicket = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'IN_PROGRESS', 'Work has started');
      toast.success('Ticket moved to IN_PROGRESS');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update ticket');
    }
  };

  const handleRejectTicket = async (ticketId) => {
    const reason = window.prompt('Enter a rejection reason');
    if (!reason) {
      return;
    }

    try {
      await rejectTicket(ticketId, reason);
      toast.success('Ticket rejected');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'CLOSED');
      toast.success('Ticket closed');
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close ticket');
    }
  };

  const handleOpenUserRecords = async (userId) => {
    setLoadingUserRecords(true);
    try {
      const res = await getUserSubmissions(userId);
      const user = users.find(u => u.id === userId);
      setSelectedUserRecords({ ...res.data, user });
    } catch {
      toast.error('Failed to load user records');
    } finally {
      setLoadingUserRecords(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove all their data.')) return;
    try {
      await deleteUser(userId);
      toast.success('User deleted');
      setSelectedUserRecords(null);
      await loadAdminData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleUpdateRole = async (userId, user, newRole) => {
    try {
      await updateUser(userId, { ...user, role: newRole });
      toast.success(`User role updated to ${newRole}`);
      await loadAdminData(true);
      if (selectedUserRecords && selectedUserRecords.user.id === userId) {
        setSelectedUserRecords(prev => ({ ...prev, user: { ...prev.user, role: newRole } }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user role');
    }
  };


  const statCards = [
    { label: 'Resources', value: facilities.length, icon: <HiOutlineOfficeBuilding /> },
    { label: 'Users', value: users.length, icon: <HiOutlineUser /> },
    { label: 'Pending Bookings', value: bookings.filter((booking) => booking.status === 'PENDING').length, icon: <HiOutlineCalendar /> },
    { label: 'Open Tickets', value: tickets.filter((ticket) => ticket.status === 'OPEN').length, icon: <HiOutlineTicket /> },
  ];


  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state animate-pulse">Loading admin workspace...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage resources, booking approvals, and operational issues from one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/facilities?create=1">
            <HiOutlinePlus /> Add Resource
          </Link>
          <Link className="btn btn-secondary" to="/bookings">
            Review All Bookings
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-icon" style={{ color: 'var(--accent-orange)', fontSize: '1.6rem', marginBottom: 'var(--space-sm)' }}>
              {card.icon}
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
        <section className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Resources</h2>
              <p className="page-subtitle">Edit and remove facility records directly from the dashboard.</p>
            </div>
            <Link className="btn btn-secondary btn-sm" to="/facilities">Open Full Catalogue</Link>
          </div>
          {recentFacilities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No resources available.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentFacilities.map((facility) => (
                  <tr key={facility.id}>
                    <td>{facility.name}</td>
                    <td>{facility.type}</td>
                    <td><span className={`badge badge-${facility.status === 'ACTIVE' ? 'active' : 'out-of-service'}`}>{facility.status.replace('_', ' ')}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <Link className="btn btn-secondary btn-sm" to={`/facilities?edit=${facility.id}`}>
                          <HiOutlinePencil /> Edit
                        </Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFacility(facility.id)}>
                          <HiOutlineTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pending Bookings</h2>
              <p className="page-subtitle">Approve or reject new requests as soon as users submit them.</p>
            </div>
            <Link className="btn btn-secondary btn-sm" to="/bookings">Open Booking Queue</Link>
          </div>
          {pendingBookings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No pending bookings right now.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>User ID</th>
                  <th>User</th>
                  <th>Date</th>

                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.facilityName}</td>
                    <td>
                      <button className="btn-link" onClick={() => handleOpenUserRecords(booking.userId)}>
                        #{booking.userId}
                      </button>
                    </td>
                    <td>{booking.userName}</td>
                    <td>{booking.bookingDate}</td>

                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleApproveBooking(booking.id)}>
                          <HiOutlineCheck /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRejectBooking(booking.id)}>
                          <HiOutlineX /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Tickets</h2>
              <p className="page-subtitle">Respond to user-reported issues without leaving the admin dashboard.</p>
            </div>
            <Link className="btn btn-secondary btn-sm" to="/tickets">Open Ticket Board</Link>
          </div>
          {actionableTickets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No active tickets right now.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Reporter ID</th>
                  <th>Category</th>
                  <th>Status</th>

                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {actionableTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 600 }}>#{ticket.id}</td>
                    <td>
                      <button className="btn-link" onClick={() => handleOpenUserRecords(ticket.reporter.id)}>
                        #{ticket.reporter.id}
                      </button>
                    </td>
                    <td>{ticket.category}</td>

                    <td><span className={`badge badge-${ticket.status.toLowerCase().replace('_', '-')}`}>{ticket.status.replace('_', ' ')}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {ticket.status === 'OPEN' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleStartTicket(ticket.id)}>
                              Start
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleRejectTicket(ticket.id)}>
                              Reject
                            </button>
                          </>
                        )}
                        {ticket.status === 'RESOLVED' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleCloseTicket(ticket.id)}>
                            Close
                          </button>
                        )}
                        {ticket.status === 'IN_PROGRESS' && (
                          <Link className="btn btn-secondary btn-sm" to={`/tickets?ticket=${ticket.id}`}>
                            View Updates
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registered Users</h2>
              <p className="page-subtitle">View and manage all registered campus members.</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>#{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto', display: 'inline-block', width: 'auto', backgroundColor: 'var(--bg-secondary)' }}
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, user, e.target.value)}
                    >
                      <option value="USER">USER</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenUserRecords(user.id)}>
                      View Full Record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {selectedUserRecords && (
        <div className="modal-overlay" onClick={() => setSelectedUserRecords(null)}>
          <div className="modal-content" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedUserRecords.user.name}'s Records</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  User ID: #{selectedUserRecords.user.id} • {selectedUserRecords.user.email}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedUserRecords(null)}>
                <HiOutlineX />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-lg)', maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiOutlineCalendar /> Bookings
                </h3>
                {selectedUserRecords.bookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No bookings found.</p>
                ) : (
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserRecords.bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.facilityName}</td>
                          <td>{b.bookingDate}</td>
                          <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                          <td>
                            {b.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-success btn-xs" onClick={() => handleApproveBooking(b.id)}>Approve</button>
                                <button className="btn btn-danger btn-xs" onClick={() => handleRejectBooking(b.id)}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HiOutlineTicket /> Maintenance Tickets
                </h3>
                {selectedUserRecords.tickets.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tickets found.</p>
                ) : (
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserRecords.tickets.map((t) => (
                        <tr key={t.id}>
                          <td>#{t.id}</td>
                          <td>{t.category}</td>
                          <td><span className={`badge badge-${t.status.toLowerCase().replace('_', '-')}`}>{t.status}</span></td>
                          <td>
                            {t.status === 'OPEN' && (
                              <button className="btn btn-primary btn-xs" onClick={() => handleStartTicket(t.id)}>Start</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                <button className="btn btn-danger" onClick={() => handleDeleteUser(selectedUserRecords.user.id)}>
                   Delete User Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

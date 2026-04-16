import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllBookings, getMyBookings, createBooking, approveBooking, rejectBooking, cancelBooking } from '../api/bookingApi';
import { getAllFacilities } from '../api/facilityApi';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineBan } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function BookingsPage() {
  const { user, isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [formData, setFormData] = useState({
    facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', expectedAttendees: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [bookRes, facRes] = await Promise.all([
        isAdmin() ? getAllBookings() : getMyBookings(),
        getAllFacilities(),
      ]);
      setBookings(bookRes.data);
      setFacilities(facRes.data.filter(f => f.status === 'ACTIVE'));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createBooking({
        ...formData,
        facilityId: parseInt(formData.facilityId),
        expectedAttendees: formData.expectedAttendees ? parseInt(formData.expectedAttendees) : null,
      });
      toast.success('Booking request submitted!');
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveBooking(id);
      toast.success('Booking approved');
      loadData();
    } catch (err) { toast.error('Failed to approve'); }
  };

  const handleReject = async () => {
    try {
      await rejectBooking(rejectModal, rejectReason);
      toast.success('Booking rejected');
      setRejectModal(null);
      setRejectReason('');
      loadData();
    } catch (err) { toast.error('Failed to reject'); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(id);
      toast.success('Booking cancelled');
      loadData();
    } catch (err) { toast.error('Failed to cancel'); }
  };

  const statusBadge = (status) => {
    const cls = status.toLowerCase().replace('_', '-');
    return <span className={`badge badge-${cls}`}>{status}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">{isAdmin() ? 'Manage all booking requests' : 'Your booking requests'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> New Booking
        </button>
      </div>

      {loading ? (
        <div className="empty-state animate-pulse">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <p>No bookings yet. Create your first booking!</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Facility</th>
                {isAdmin() && <th>Requested By</th>}
                <th>Date</th>
                <th>Time</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.facilityName}</td>
                  {isAdmin() && <td>{b.userName}</td>}
                  <td>{b.bookingDate}</td>
                  <td>{b.startTime} – {b.endTime}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.purpose || '—'}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      {isAdmin() && b.status === 'PENDING' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(b.id)} title="Approve">
                            <HiOutlineCheck />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(b.id)} title="Reject">
                            <HiOutlineX />
                          </button>
                        </>
                      )}
                      {!isAdmin() && (b.status === 'PENDING' || b.status === 'APPROVED') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(b.id)}>
                          <HiOutlineBan /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Booking</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Facility</label>
                <select className="form-input" value={formData.facilityId} onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })} required>
                  <option value="">Select a facility...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={formData.bookingDate} onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input className="form-input" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input className="form-input" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Purpose</label>
                <input className="form-input" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="e.g. Team meeting" />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Attendees</label>
                <input className="form-input" type="number" min="1" value={formData.expectedAttendees} onChange={(e) => setFormData({ ...formData, expectedAttendees: e.target.value })} />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} type="submit">Submit Booking</button>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reject Booking</h2>
              <button className="modal-close" onClick={() => setRejectModal(null)}><HiOutlineX /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea className="form-input" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide a reason..." required />
            </div>
            <button className="btn btn-danger btn-lg" style={{ width: '100%' }} onClick={handleReject}>Confirm Rejection</button>
          </div>
        </div>
      )}
    </div>
  );
}

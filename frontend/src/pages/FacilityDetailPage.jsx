import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getFacilityById } from '../api/facilityApi';
import {
  HiOutlineArrowLeft,
  HiOutlineLocationMarker,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineStatusOnline,
  HiOutlineCalendar,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const typeLabels = {
  LECTURE_HALL: '🏫 Lecture Hall',
  LAB: '🔬 Lab',
  MEETING_ROOM: '🤝 Meeting Room',
  EQUIPMENT: '📷 Equipment',
};

/** Check if a resource is currently within its availability window */
function isCurrentlyAvailable(raw) {
  if (!raw) return null;
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  const endMinutes = parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10);
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/** Parse booking hours from availability string */
function extractBookingHours(raw) {
  if (!raw) return null;
  const timeMatch = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) return null;
  return { start: timeMatch[1], end: timeMatch[2] };
}

/** Parse available days from availability string */
function extractAvailableDays(raw) {
  if (!raw) return null;
  // Match patterns like "Mon-Fri", "Weekdays", "Mon,Tue,Wed"
  const dayPatterns = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Weekdays|Weekends|Daily|Mon-Fri|Mon-Sat)/gi;
  const matches = raw.match(dayPatterns);
  return matches ? matches.join(', ') : null;
}

export default function FacilityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFacility = async () => {
      try {
        const res = await getFacilityById(id);
        setFacility(res.data);
      } catch (err) {
        toast.error('Failed to load facility details');
        navigate('/facilities');
      } finally {
        setLoading(false);
      }
    };
    loadFacility();
  }, [id, navigate]);

  if (loading) {
    return <div className="page-container"><div className="empty-state animate-pulse">Loading...</div></div>;
  }

  if (!facility) {
    return null;
  }

  const liveStatus = isCurrentlyAvailable(facility.availabilityWindows);
  const bookingHours = extractBookingHours(facility.availabilityWindows);
  const availableDays = extractAvailableDays(facility.availabilityWindows);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/facilities')}>
          <HiOutlineArrowLeft /> Back to Facilities
        </button>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-xl)', maxWidth: 850, margin: '0 auto' }}>
        {/* Name + Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{facility.name}</h1>
          <span
            className={`badge badge-${facility.status === 'ACTIVE' ? 'active' : 'out-of-service'}`}
            style={{ fontSize: '0.9rem', padding: '6px 14px' }}
          >
            {facility.status.replace('_', ' ')}
          </span>
        </div>

        {/* Type */}
        <p style={{ color: 'var(--primary-400)', fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-xl)' }}>
          {typeLabels[facility.type] || facility.type}
        </p>

        {/* ── Core Metadata Grid ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)',
          background: 'var(--bg-secondary)', padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
        }}>
          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <HiOutlineLocationMarker style={{ fontSize: '1.5rem', color: 'var(--accent-orange)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Location</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{facility.location}</div>
            </div>
          </div>

          {/* Capacity */}
          {facility.capacity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <HiOutlineUserGroup style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Capacity</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{facility.capacity} People</div>
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <HiOutlineStatusOnline style={{ fontSize: '1.5rem', color: facility.status === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-error)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: facility.status === 'ACTIVE' ? 'var(--status-success)' : 'var(--status-error)' }}>
                {facility.status === 'ACTIVE' ? '● Active' : '● Out of Service'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Availability & Booking Info ── */}
        <div style={{
          marginBottom: 'var(--space-xl)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px var(--space-lg)',
            background: 'var(--primary-50)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <HiOutlineClock style={{ fontSize: '1.1rem', color: 'var(--primary-900)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-900)' }}>Availability & Booking Hours</span>

            {/* Live indicator */}
            {liveStatus !== null && (
              <span style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                color: liveStatus ? 'var(--status-success)' : 'var(--status-error)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: liveStatus ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: liveStatus ? 'var(--status-success)' : 'var(--status-error)',
                  display: 'inline-block',
                  animation: liveStatus ? 'pulse 2s infinite' : 'none',
                }} />
                {liveStatus ? 'Open Now' : 'Currently Closed'}
              </span>
            )}
          </div>

          <div style={{ padding: 'var(--space-lg)' }}>
            {facility.availabilityWindows ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                {/* Available Days */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <HiOutlineCalendar style={{ color: 'var(--primary-400)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Days</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {availableDays || 'As per schedule'}
                  </div>
                </div>

                {/* Booking Hours */}
                {bookingHours && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <HiOutlineClock style={{ color: 'var(--accent-orange)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booking Hours</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {bookingHours.start} – {bookingHours.end}
                    </div>
                  </div>
                )}

                {/* Full Schedule String */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <HiOutlineInformationCircle style={{ color: 'var(--accent-violet)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Schedule</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {facility.availabilityWindows}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Unavailable Slots Indicator ── */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: 'rgba(245,158,11,0.08)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--accent-amber)',
              }}>
                <HiOutlineInformationCircle style={{ fontSize: '1.3rem', color: 'var(--accent-amber)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-amber)' }}>
                    Availability schedule not configured
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Booking hours and available days have not been set for this resource. Contact an administrator.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Description</h3>
          <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {facility.description || 'No description provided.'}
          </p>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)' }}>
          <Link to={`/bookings?facilityId=${facility.id}`} className="btn btn-primary btn-lg">
            Book this Resource
          </Link>
          <Link to={`/tickets?facilityId=${facility.id}`} className="btn btn-secondary btn-lg">
            Report Issue
          </Link>
        </div>
      </div>
    </div>
  );
}

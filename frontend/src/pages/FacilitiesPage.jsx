import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getAllFacilities, createFacility, updateFacility, deleteFacility } from '../api/facilityApi';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineFilter, HiOutlineClock } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAdminRealtimeRefresh } from '../hooks/useAdminRealtimeRefresh';

/* ── helpers ── */
const typeLabels = {
  LECTURE_HALL: '🏫 Lecture Hall',
  LAB: '🔬 Lab',
  MEETING_ROOM: '🤝 Meeting Room',
  EQUIPMENT: '📷 Equipment',
};

const CAPACITY_RANGES = [
  { label: 'Any Capacity', min: 0, max: Infinity },
  { label: '1 – 30', min: 1, max: 30 },
  { label: '31 – 100', min: 31, max: 100 },
  { label: '101 – 300', min: 101, max: 300 },
  { label: '300 +', min: 301, max: Infinity },
];

/** Parse availabilityWindows string into a structured display */
function parseAvailability(raw) {
  if (!raw) return null;
  // Handles formats like "Mon-Fri 08:00-17:00" or "08:00-17:00" or "Mon-Fri 08:00-12:00, 13:00-17:00"
  return raw;
}

/** Check if a resource is currently within its availability window */
function isCurrentlyAvailable(raw) {
  if (!raw) return null; // unknown
  // Try to extract time range like 08:00-17:00
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;
  const now = new Date();
  const startH = parseInt(timeMatch[1], 10);
  const startM = parseInt(timeMatch[2], 10);
  const endH = parseInt(timeMatch[3], 10);
  const endM = parseInt(timeMatch[4], 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export default function FacilitiesPage() {
  const { user, isAdmin, loading: loadingAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  /* ── filter state ── */
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCapacity, setFilterCapacity] = useState(0); // index into CAPACITY_RANGES
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'LECTURE_HALL', location: '', capacity: '', description: '', availabilityWindows: '', status: 'ACTIVE',
  });

  /* ── data loading ── */
  const loadFacilities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAllFacilities();
      setFacilities(res.data);
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useAdminRealtimeRefresh(() => loadFacilities(true), isAdmin);

  useEffect(() => {
    if (!loadingAuth) {
      loadFacilities();
      const interval = setInterval(() => loadFacilities(true), 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [loadFacilities, loadingAuth, user]);

  /* ── CRUD (admin only) ── */
  const handleDelete = async (id) => {
    if (!confirm('Delete this facility?')) return;
    try {
      await deleteFacility(id);
      toast.success('Facility deleted');
      loadFacilities();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const resetForm = useCallback(() => {
    setFormData({ name: '', type: 'LECTURE_HALL', location: '', capacity: '', description: '', availabilityWindows: '', status: 'ACTIVE' });
  }, []);

  const openEdit = useCallback((facility) => {
    setEditing(facility);
    setFormData({
      name: facility.name, type: facility.type, location: facility.location,
      capacity: facility.capacity, description: facility.description || '',
      availabilityWindows: facility.availabilityWindows || '', status: facility.status,
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('create');
    nextParams.delete('edit');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, capacity: parseInt(formData.capacity, 10) };
      if (editing) {
        await updateFacility(editing.id, payload);
        toast.success('Facility updated');
      } else {
        await createFacility(payload);
        toast.success('Facility created');
      }
      closeModal();
      resetForm();
      loadFacilities();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  /* Deep-link support for admin (create / edit via query params) */
  useEffect(() => {
    if (!isAdmin || facilities.length === 0) {
      return;
    }
    const createRequested = searchParams.get('create') === '1';
    const editId = Number(searchParams.get('edit'));
    if (createRequested && !showModal) {
      resetForm();
      setEditing(null);
      setShowModal(true);
    }
    if (editId) {
      const facilityToEdit = facilities.find((f) => f.id === editId);
      if (facilityToEdit && editing?.id !== editId) {
        openEdit(facilityToEdit);
      }
    }
  }, [searchParams, facilities, isAdmin, showModal, editing, openEdit, resetForm]);

  /* ── derive unique locations for location filter ── */
  const uniqueLocations = [...new Set(facilities.map((f) => f.location).filter(Boolean))].sort();

  /* ── filtering ── */
  const filtered = facilities.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || f.type === filterType;
    const capRange = CAPACITY_RANGES[filterCapacity];
    const matchCap = !f.capacity || (f.capacity >= capRange.min && f.capacity <= capRange.max);
    const matchLoc = !filterLocation || f.location === filterLocation;
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchType && matchCap && matchLoc && matchStatus;
  });

  /* ── pill style helper ── */
  const pillStyle = (active) => ({
    padding: '8px 18px',
    borderRadius: '50px',
    border: active ? '1.5px solid var(--primary-900)' : '1px solid var(--border-color)',
    backgroundColor: active ? 'var(--primary-900)' : 'white',
    color: active ? 'white' : 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    boxShadow: !active ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
  });

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Facilities</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Manage resources' : 'Browse resources'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}>
            <HiOutlinePlus /> Add Facility
          </button>
        )}
      </div>

      {/* ── Search + Type pills ── */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
          <HiOutlineSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 42, borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['', 'LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={pillStyle(filterType === type)}
            >
              {type === '' ? 'ALL FACILITIES' : typeLabels[type].split(' ').slice(1).join(' ')}
            </button>
          ))}
        </div>

        {/* Toggle advanced filters */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowAdvancedFilters((v) => !v)}
        >
          <HiOutlineFilter /> Filters
        </button>
      </div>

      {/* ── Advanced Filters Row ── */}
      {showAdvancedFilters && (
        <div
          style={{
            display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)',
            flexWrap: 'wrap', alignItems: 'flex-end',
            background: 'var(--bg-secondary)', padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {/* Capacity filter */}
          <div style={{ minWidth: 150 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Capacity</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={filterCapacity}
              onChange={(e) => setFilterCapacity(Number(e.target.value))}
            >
              {CAPACITY_RANGES.map((r, i) => (
                <option key={i} value={i}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Location filter */}
          <div style={{ minWidth: 180 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Location</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ minWidth: 150 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Status</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          {/* Clear filters */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterCapacity(0); setFilterLocation(''); setFilterStatus(''); setSearch(''); setFilterType(''); }}
            style={{ marginBottom: 2 }}
          >
            <HiOutlineX /> Clear All
          </button>
        </div>
      )}

      {/* ── Results count ── */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', fontWeight: 500 }}>
        Showing {filtered.length} of {facilities.length} resources
      </div>

      {/* ── Facility Cards Grid ── */}
      {loading ? (
        <div className="empty-state animate-pulse">Loading facilities...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <HiOutlineSearch style={{ fontSize: '2rem', opacity: 0.3 }} />
          <p>No facilities found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((f) => {
            const availability = parseAvailability(f.availabilityWindows);
            const liveStatus = isCurrentlyAvailable(f.availabilityWindows);

            return (
              <div key={f.id} className="glass-card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }}>
                {/* Row: Name + Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{f.name}</h3>
                  <span className={`badge badge-${f.status === 'ACTIVE' ? 'active' : 'out-of-service'}`}>
                    {f.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Type */}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
                  {typeLabels[f.type] || f.type}
                </p>

                {/* Location + Capacity row */}
                <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                  <span>📍 {f.location}</span>
                  {f.capacity && <span>👥 {f.capacity}</span>}
                </div>

                {/* Availability Window */}
                {availability && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-sm)',
                    padding: '6px 10px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <HiOutlineClock style={{ fontSize: '1rem', color: 'var(--primary-400)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{availability}</span>
                    {liveStatus !== null && (
                      <span style={{
                        marginLeft: 'auto',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                        color: liveStatus ? 'var(--status-success)' : 'var(--status-error)',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: liveStatus ? 'var(--status-success)' : 'var(--status-error)',
                          display: 'inline-block',
                        }} />
                        {liveStatus ? 'Open Now' : 'Closed'}
                      </span>
                    )}
                  </div>
                )}

                {/* If NO availability windows set → show an "unavailable slots" indicator */}
                {!availability && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.8rem', color: 'var(--text-muted)',
                    marginBottom: 'var(--space-sm)',
                    padding: '6px 10px',
                    background: 'rgba(245,158,11,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--accent-amber)',
                  }}>
                    <HiOutlineClock style={{ fontSize: '1rem', color: 'var(--accent-amber)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: 'var(--accent-amber)' }}>Schedule not configured</span>
                  </div>
                )}

                {/* Description */}
                {f.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                    {f.description.substring(0, 100)}{f.description.length > 100 ? '...' : ''}
                  </p>
                )}

                {/* Spacer to push buttons to bottom */}
                <div style={{ flex: 1 }} />

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Link to={`/facilities/${f.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    View Details
                  </Link>
                </div>

                {/* Admin-only: Edit + Delete */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>
                      <HiOutlinePencil /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>
                      <HiOutlineTrash /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit Modal (admin only) ── */}
      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Facility' : 'Add New Facility'}</h2>
              <button className="modal-close" onClick={closeModal}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="LECTURE_HALL">Lecture Hall</option>
                  <option value="LAB">Lab</option>
                  <option value="MEETING_ROOM">Meeting Room</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="form-input" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Availability Windows</label>
                <input className="form-input" placeholder="e.g. Mon-Fri 08:00-17:00" value={formData.availabilityWindows} onChange={(e) => setFormData({ ...formData, availabilityWindows: e.target.value })} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Available days &amp; booking hours (e.g. &quot;Mon-Fri 08:00-17:00&quot; or &quot;Weekdays 09:00-18:00, Sat 10:00-14:00&quot;)
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                </select>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} type="submit">
                {editing ? 'Update Facility' : 'Create Facility'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllFacilities, createFacility, updateFacility, deleteFacility } from '../api/facilityApi';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function FacilitiesPage() {
  const { isAdmin } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    name: '', type: 'LECTURE_HALL', location: '', capacity: '', description: '', availabilityWindows: '', status: 'ACTIVE'
  });

  useEffect(() => { 
    loadFacilities(); 
    const interval = setInterval(() => loadFacilities(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const loadFacilities = async (silent = false) => {
    if (!silent) setLoading(true);
      const res = await getAllFacilities();
      setFacilities(res.data);
    } catch (err) {
      toast.error('Failed to load facilities');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, capacity: parseInt(formData.capacity) };
      if (editing) {
        await updateFacility(editing.id, payload);
        toast.success('Facility updated');
      } else {
        await createFacility(payload);
        toast.success('Facility created');
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
      loadFacilities();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this facility?')) return;
    try {
      await deleteFacility(id);
      toast.success('Facility deleted');
      loadFacilities();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (facility) => {
    setEditing(facility);
    setFormData({
      name: facility.name, type: facility.type, location: facility.location,
      capacity: facility.capacity, description: facility.description || '',
      availabilityWindows: facility.availabilityWindows || '', status: facility.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'LECTURE_HALL', location: '', capacity: '', description: '', availabilityWindows: '', status: 'ACTIVE' });
  };

  const filtered = facilities.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                        f.location.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || f.type === filterType;
    return matchSearch && matchType;
  });

  const typeLabels = { LECTURE_HALL: '🏫 Lecture Hall', LAB: '🔬 Lab', MEETING_ROOM: '🤝 Meeting Room', EQUIPMENT: '📷 Equipment' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facilities</h1>
          <p className="page-subtitle">Browse and manage campus resources</p>
        </div>
        {isAdmin() && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}>
            <HiOutlinePlus /> Add Facility
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
          <HiOutlineSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 42, borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['', 'LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '50px',
                border: filterType === type ? '1px solid var(--primary-900)' : '1px solid var(--border-color)',
                backgroundColor: filterType === type ? 'var(--primary-900)' : 'white',
                color: filterType === type ? 'white' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                boxShadow: filterType !== type ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
              }}
            >
              {type === '' ? 'ALL FACILITIES' : typeLabels[type].split(' ')[1] + (typeLabels[type].split(' ')[2] ? ' ' + typeLabels[type].split(' ')[2] : '')}
            </button>
          ))}
        </div>
      </div>

      {/* Facility Cards Grid */}
      {loading ? (
        <div className="empty-state animate-pulse">Loading facilities...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <HiOutlineSearch style={{ fontSize: '2rem', opacity: 0.3 }} />
          <p>No facilities found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map((f) => (
            <div key={f.id} className="glass-card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{f.name}</h3>
                <span className={`badge badge-${f.status === 'ACTIVE' ? 'active' : 'out-of-service'}`}>
                  {f.status.replace('_', ' ')}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
                {typeLabels[f.type] || f.type}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                <span>📍 {f.location}</span>
                {f.capacity && <span>👥 {f.capacity}</span>}
              </div>
              {f.description && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                  {f.description.substring(0, 100)}{f.description.length > 100 ? '...' : ''}
                </p>
              )}
              {isAdmin() && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>
                    <HiOutlinePencil /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>
                    <HiOutlineTrash /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Facility' : 'Add New Facility'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiOutlineX /></button>
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
                <input className="form-input" placeholder="e.g. 08:00-17:00" value={formData.availabilityWindows} onChange={(e) => setFormData({ ...formData, availabilityWindows: e.target.value })} />
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

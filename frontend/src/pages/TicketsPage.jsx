import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllTickets, getMyTickets, getAssignedTickets, createTicket, updateTicketStatus, addComment, getComments } from '../api/ticketApi';
import { getAllFacilities } from '../api/facilityApi';
import { HiOutlinePlus, HiOutlineX, HiOutlineChatAlt2 } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function TicketsPage() {
  const { user, isAdmin, isTechnician } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [formData, setFormData] = useState({
    facilityId: '', category: '', description: '', priority: 'MEDIUM'
  });

  useEffect(() => { 
    loadTickets();
    const interval = setInterval(() => loadTickets(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTickets = async (silent = false) => {
    if (!silent) setLoading(true);
      const [tickRes, facRes] = await Promise.all([
        isAdmin() ? getAllTickets() : isTechnician() ? getAssignedTickets() : getMyTickets(),
        getAllFacilities(),
      ]);
      setTickets(tickRes.data);
      setFacilities(facRes.data);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTicket({ ...formData, facilityId: parseInt(formData.facilityId) });
      toast.success('Ticket created');
      setShowCreate(false);
      loadTickets();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusUpdate = async (ticketId, status, notes = null) => {
    try {
      await updateTicketStatus(ticketId, status, notes);
      toast.success(`Ticket ${status.toLowerCase()}`);
      loadTickets();
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update status'); }
  };

  const openTicketDetail = async (ticket) => {
    setSelectedTicket(ticket);
    try {
      const res = await getComments(ticket.id);
      setComments(res.data);
    } catch { setComments([]); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(selectedTicket.id, newComment);
      setNewComment('');
      const res = await getComments(selectedTicket.id);
      setComments(res.data);
      toast.success('Comment added');
    } catch { toast.error('Failed to add comment'); }
  };

  const statusBadge = (status) => {
    const cls = status.toLowerCase().replace('_', '-');
    return <span className={`badge badge-${cls}`}>{status.replace('_', ' ')}</span>;
  };

  const priorityColor = { LOW: 'var(--accent-cyan)', MEDIUM: 'var(--accent-amber)', HIGH: 'var(--accent-rose)', CRITICAL: '#ef4444' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">Maintenance & incident tracking</p>
        </div>
        {!isAdmin() && !isTechnician() && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <HiOutlinePlus /> Report Issue
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state animate-pulse">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state"><p>No tickets found</p></div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Facility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>#{t.id}</td>
                  <td>{t.category}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor[t.priority] }}></span>
                      {t.priority}
                    </span>
                  </td>
                  <td>{statusBadge(t.status)}</td>
                  <td>{t.facility?.name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openTicketDetail(t)}>
                        <HiOutlineChatAlt2 /> View
                      </button>
                      {(isAdmin() || isTechnician()) && t.status === 'OPEN' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(t.id, 'IN_PROGRESS')}>
                          Start
                        </button>
                      )}
                      {isTechnician() && t.status === 'IN_PROGRESS' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(t.id, 'RESOLVED', 'Issue resolved')}>
                          Resolve
                        </button>
                      )}
                      {isAdmin() && t.status === 'RESOLVED' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(t.id, 'CLOSED')}>
                          Close
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

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Report an Issue</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Facility</label>
                <select className="form-input" value={formData.facilityId} onChange={e => setFormData({...formData, facilityId: e.target.value})} required>
                  <option value="">Select facility...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Broken Projector" required />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-input" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the issue..." required />
              </div>
              <button className="btn btn-primary btn-lg" style={{width:'100%'}} type="submit">Submit Ticket</button>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail + Comments Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" style={{maxWidth: 600}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ticket #{selectedTicket.id}</h2>
              <button className="modal-close" onClick={() => setSelectedTicket(null)}><HiOutlineX /></button>
            </div>
            <div style={{marginBottom: 'var(--space-md)'}}>
              <p style={{color: 'var(--text-secondary)', marginBottom: 8}}><strong>Category:</strong> {selectedTicket.category}</p>
              <p style={{color: 'var(--text-secondary)', marginBottom: 8}}><strong>Status:</strong> {statusBadge(selectedTicket.status)}</p>
              <p style={{color: 'var(--text-secondary)', marginBottom: 8}}><strong>Description:</strong></p>
              <p style={{color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: '0.9rem'}}>{selectedTicket.description}</p>
            </div>

            <h3 style={{fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)'}}>Comments</h3>
            <div style={{maxHeight: 200, overflowY: 'auto', marginBottom: 'var(--space-md)'}}>
              {comments.length === 0 ? (
                <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>No comments yet</p>
              ) : comments.map(c => (
                <div key={c.id} style={{padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4}}>
                    <span style={{fontWeight: 600, color: 'var(--primary-400)'}}>{c.user?.name || 'User'}</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{fontSize: '0.85rem'}}>{c.content}</p>
                </div>
              ))}
            </div>

            <div style={{display: 'flex', gap: 'var(--space-sm)'}}>
              <input className="form-input" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
              <button className="btn btn-primary" onClick={handleAddComment}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

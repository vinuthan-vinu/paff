import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  addComment,
  assignTicket,
  createTicket,
  deleteComment,
  getAllTickets,
  getAssignedTickets,
  getComments,
  getMyTickets,
  getTicketById,
  rejectTicket,
  resolveTicket,
  updateComment,
  updateTicketStatus,
  uploadTicketAttachments,
} from '../api/ticketApi';
import { getAllFacilities } from '../api/facilityApi';
import {
  HiOutlineChatAlt2,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAdminRealtimeRefresh } from '../hooks/useAdminRealtimeRefresh';

const API_BASE_URL = 'http://localhost:8080';

export default function TicketsPage() {
  const { user, isAdmin, isTechnician, loading: loadingAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({
    facilityId: '',
    category: '',
    description: '',
    contactDetails: '',
    priority: 'MEDIUM',
  });

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [ticketResponse, facilityResponse] = await Promise.all([
        isAdmin ? getAllTickets() : isTechnician ? getAssignedTickets() : getMyTickets(),
        getAllFacilities({ status: 'ACTIVE' }),
      ]);

      setTickets(ticketResponse.data);
      setFacilities(facilityResponse.data);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAdmin, isTechnician]);

  useAdminRealtimeRefresh(() => loadTickets(true), isAdmin);

  const refreshSelectedTicket = useCallback(async (ticketId) => {
    const [ticketResponse, commentResponse] = await Promise.all([
      getTicketById(ticketId),
      getComments(ticketId),
    ]);
    setSelectedTicket(ticketResponse.data);
    setComments(commentResponse.data);
  }, []);

  const openTicketDetail = useCallback(async (ticketId) => {
    try {
      await refreshSelectedTicket(ticketId);
    } catch {
      toast.error('Failed to load ticket details');
    }
  }, [refreshSelectedTicket]);

  useEffect(() => {
    if (!loadingAuth) {
      loadTickets();
      const interval = window.setInterval(() => loadTickets(true), 5000);
      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [loadTickets, loadingAuth, user]);

  useEffect(() => {
    const ticketId = Number(searchParams.get('ticket'));
    if (!ticketId || loading) {
      return;
    }

    if (selectedTicket?.id === ticketId) {
      return;
    }

    const ticketFromList = tickets.find((ticket) => ticket.id === ticketId);
    if (ticketFromList) {
      openTicketDetail(ticketId);
    }
  }, [searchParams, tickets, loading, selectedTicket, openTicketDetail]);

  const handleCreate = async (event) => {
    event.preventDefault();

    if (attachments.length > 3) {
      toast.error('You can upload up to 3 images');
      return;
    }

    if ([...attachments].some((file) => !file.type.startsWith('image/'))) {
      toast.error('Only image files are allowed');
      return;
    }

    try {
      const ticketResponse = await createTicket({
        ...formData,
        facilityId: parseInt(formData.facilityId, 10),
      });

      if (attachments.length > 0) {
        await uploadTicketAttachments(ticketResponse.data.id, attachments);
      }

      toast.success('Ticket created');
      setShowCreate(false);
      setAttachments([]);
      setFormData({
        facilityId: '',
        category: '',
        description: '',
        contactDetails: '',
        priority: 'MEDIUM',
      });
      await loadTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleStartTicket = async (ticketId) => {
    try {
      if (isTechnician) {
        await assignTicket(ticketId, user.id);
      } else {
        await updateTicketStatus(ticketId, 'IN_PROGRESS', 'Work has started');
      }
      toast.success('Ticket moved to IN_PROGRESS');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await refreshSelectedTicket(ticketId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start ticket');
    }
  };

  const handleRejectTicket = async (ticketId) => {
    const reason = window.prompt('Enter the rejection reason');
    if (!reason) {
      return;
    }

    try {
      await rejectTicket(ticketId, reason);
      toast.success('Ticket rejected');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await refreshSelectedTicket(ticketId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject ticket');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    const notes = window.prompt('Enter resolution notes');
    if (!notes) {
      return;
    }

    try {
      await resolveTicket(ticketId, notes);
      toast.success('Ticket resolved');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await refreshSelectedTicket(ticketId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resolve ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'CLOSED');
      toast.success('Ticket closed');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await refreshSelectedTicket(ticketId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close ticket');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) {
      return;
    }

    try {
      await addComment(selectedTicket.id, newComment.trim());
      setNewComment('');
      await refreshSelectedTicket(selectedTicket.id);
      toast.success('Comment added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingCommentContent.trim()) {
      toast.error('Comment content is required');
      return;
    }

    try {
      await updateComment(commentId, editingCommentContent.trim());
      setEditingCommentId(null);
      setEditingCommentContent('');
      await refreshSelectedTicket(selectedTicket.id);
      toast.success('Comment updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      await refreshSelectedTicket(selectedTicket.id);
      toast.success('Comment deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  const statusBadge = (status) => {
    const cls = status.toLowerCase().replace('_', '-');
    return <span className={`badge badge-${cls}`}>{status.replace('_', ' ')}</span>;
  };

  const priorityColor = {
    LOW: 'var(--accent-cyan)',
    MEDIUM: 'var(--accent-amber)',
    HIGH: 'var(--accent-rose)',
    CRITICAL: '#dc2626',
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">Maintenance & incident tracking</p>
        </div>
        {!isAdmin && !isTechnician && (
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
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td style={{ fontWeight: 600 }}>#{ticket.id}</td>
                  <td>{ticket.category}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: priorityColor[ticket.priority],
                        }}
                      />
                      {ticket.priority}
                    </span>
                  </td>
                  <td>{statusBadge(ticket.status)}</td>
                  <td>{ticket.facility?.name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openTicketDetail(ticket.id)}
                      >
                        <HiOutlineChatAlt2 /> View
                      </button>
                      {(isAdmin || isTechnician) && ticket.status === 'OPEN' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartTicket(ticket.id)}
                          >
                            Start
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectTicket(ticket.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isTechnician && ticket.status === 'IN_PROGRESS' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleResolveTicket(ticket.id)}
                        >
                          Resolve
                        </button>
                      )}
                      {isAdmin && ticket.status === 'RESOLVED' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleCloseTicket(ticket.id)}
                        >
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Report an Issue</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <HiOutlineX />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Facility</label>
                <select
                  className="form-input"
                  value={formData.facilityId}
                  onChange={(event) => setFormData({ ...formData, facilityId: event.target.value })}
                  required
                >
                  <option value="">Select facility...</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>{facility.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                  placeholder="e.g. Broken Projector"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={formData.priority}
                  onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Details</label>
                <input
                  className="form-input"
                  value={formData.contactDetails}
                  onChange={(event) => setFormData({ ...formData, contactDetails: event.target.value })}
                  placeholder="Email or phone number"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder="Describe the issue..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Images (up to 3)</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setAttachments(Array.from(event.target.files || []))}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  PNG, JPG, or WEBP only. Maximum 3 files.
                </p>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} type="submit">
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 720 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Ticket #{selectedTicket.id}</h2>
              <button className="modal-close" onClick={() => setSelectedTicket(null)}>
                <HiOutlineX />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {statusBadge(selectedTicket.status)}
                <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.06)', color: 'var(--text-secondary)' }}>
                  {selectedTicket.priority}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong>Facility:</strong> {selectedTicket.facility?.name || '—'}
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong>Contact:</strong> {selectedTicket.contactDetails}
              </p>
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}><strong>Description:</strong></p>
                <p
                  style={{
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: '0.9rem',
                  }}
                >
                  {selectedTicket.description}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Images</h3>
              {selectedTicket.attachments?.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-sm)' }}>
                  {selectedTicket.attachments.map((attachment) => (
                    <img
                      key={attachment.id}
                      src={`${API_BASE_URL}${attachment.fileUrl}`}
                      alt={attachment.fileName}
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-color)' }}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No images attached</p>
              )}
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Status History</h3>
              {selectedTicket.statusHistory?.length ? (
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                  {selectedTicket.statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <strong>{entry.status.replace('_', ' ')}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {entry.notes}
                        </p>
                      )}
                      {entry.changedBy?.name && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Updated by {entry.changedBy.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No status history yet</p>
              )}
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Comments</h3>
            <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 'var(--space-md)' }}>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No comments yet</p>
              ) : comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 'var(--space-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--primary-400)' }}>
                      {comment.user?.name || 'User'}
                    </span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editingCommentContent}
                        onChange={(event) => setEditingCommentContent(event.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleEditComment(comment.id)}>
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentContent('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.85rem' }}>{comment.content}</p>
                      {comment.user?.id === user?.id && (
                        <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 8 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentContent(comment.content);
                            }}
                          >
                            <HiOutlinePencil /> Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <HiOutlineTrash /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <input
                className="form-input"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button className="btn btn-primary" onClick={handleAddComment}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

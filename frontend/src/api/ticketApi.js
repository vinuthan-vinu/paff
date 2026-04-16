import API from './axiosInstance';

export const getAllTickets = () => API.get('/tickets');
export const getMyTickets = () => API.get('/tickets/my');
export const getAssignedTickets = () => API.get('/tickets/assigned');
export const getTicketById = (id) => API.get(`/tickets/${id}`);
export const createTicket = (data) => API.post('/tickets', data);
export const uploadTicketAttachments = (id, files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  return API.post(`/tickets/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const assignTicket = (id, technicianId) => API.patch(`/tickets/${id}/assign`, { technicianId });
export const updateTicketStatus = (id, status, notes) => API.patch(`/tickets/${id}/status`, { status, notes });
export const rejectTicket = (id, reason) => API.patch(`/tickets/${id}/reject`, { reason });
export const resolveTicket = (id, notes) => API.patch(`/tickets/${id}/resolve`, { notes });
export const addComment = (ticketId, content) => API.post(`/tickets/${ticketId}/comments`, { content });
export const getComments = (ticketId) => API.get(`/tickets/${ticketId}/comments`);
export const updateComment = (commentId, content) => API.put(`/comments/${commentId}`, { content });
export const deleteComment = (commentId) => API.delete(`/comments/${commentId}`);
export const deleteTicket = (id) => API.delete(`/tickets/${id}`);

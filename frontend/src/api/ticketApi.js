import API from './axiosInstance';

export const getAllTickets = () => API.get('/tickets');
export const getMyTickets = () => API.get('/tickets/my');
export const getAssignedTickets = () => API.get('/tickets/assigned');
export const getTicketById = (id) => API.get(`/tickets/${id}`);
export const createTicket = (data) => API.post('/tickets', data);
export const assignTicket = (id, technicianId) => API.patch(`/tickets/${id}/assign`, { technicianId });
export const updateTicketStatus = (id, status, notes) => API.patch(`/tickets/${id}/status`, { status, notes });
export const addComment = (ticketId, content) => API.post(`/tickets/${ticketId}/comments`, { content });
export const getComments = (ticketId) => API.get(`/tickets/${ticketId}/comments`);
export const deleteComment = (ticketId, commentId) => API.delete(`/tickets/${ticketId}/comments/${commentId}`);

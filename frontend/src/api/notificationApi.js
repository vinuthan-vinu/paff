import API from './axiosInstance';

export const getNotifications = () => API.get('/notifications');
export const getUnreadNotifications = () => API.get('/notifications/unread');
export const getUnreadCount = () => API.get('/notifications/unread/count');
export const markAsRead = (id) => API.patch(`/notifications/${id}/read`);

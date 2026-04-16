import API from './axiosInstance';

export const getAllBookings = () => API.get('/bookings');
export const getMyBookings = () => API.get('/bookings/my');
export const getBookingById = (id) => API.get(`/bookings/${id}`);
export const createBooking = (data) => API.post('/bookings', data);
export const approveBooking = (id) => API.patch(`/bookings/${id}/approve`);
export const rejectBooking = (id, reason) => API.patch(`/bookings/${id}/reject`, { reason });
export const cancelBooking = (id) => API.patch(`/bookings/${id}/cancel`);
export const deleteBooking = (id) => API.delete(`/bookings/${id}`);

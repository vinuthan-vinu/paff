import API from './axiosInstance';

export const loginUser = (data) => API.post('/auth/login', data);
export const registerUser = (data) => API.post('/auth/register', data);
export const googleLogin = (idToken) => API.post('/auth/google', { idToken });
export const getCurrentUser = () => API.get('/auth/me');

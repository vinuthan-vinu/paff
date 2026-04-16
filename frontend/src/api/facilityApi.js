import API from './axiosInstance';

export const getAllFacilities = (params) => API.get('/facilities', { params });
export const getFacilityById = (id) => API.get(`/facilities/${id}`);
export const createFacility = (data) => API.post('/facilities', data);
export const updateFacility = (id, data) => API.put(`/facilities/${id}`, data);
export const deleteFacility = (id) => API.delete(`/facilities/${id}`);

import API from './axiosInstance';

export const getAllFacilities = (params) => API.get('/resources', { params });
export const getFacilityById = (id) => API.get(`/resources/${id}`);
export const createFacility = (data) => API.post('/resources', data);
export const updateFacility = (id, data) => API.put(`/resources/${id}`, data);
export const deleteFacility = (id) => API.delete(`/resources/${id}`);

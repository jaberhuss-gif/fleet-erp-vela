import axios from 'axios';

const API_URL = '/api/buildings';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
});

// المواقع
export const getSites = () => api.get('/sites');
export const createSite = (data) => api.post('/sites', data);

// أوامر العمل
export const getWorkOrders = () => api.get('/work-orders');
export const createWorkOrder = (data) => api.post('/work-orders', data);
export const closeWorkOrder = (id, data) => api.put(`/work-orders/${id}/close`, data);
export const importWorkOrders = (rows) => api.post('/import-work-orders', { rows });

// لوحة التحكم
export const getDashboard = () => api.get('/dashboard');
// التقارير الشهرية
export const closeMonth = (data) => api.post('/close-month', data);
export const getMonthlyClosures = () => api.get('/monthly-closures');
export const reopenMonth = (id, user) => api.post(`/reopen-month/${id}`, { user });
export const checkMonthLock = (month, year) => api.get(`/check-month-lock?month=${month}&year=${year}`);

export default api;
export const deleteSite = (id) => api.delete(`/sites/${id}`);


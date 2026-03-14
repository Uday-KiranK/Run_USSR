import axios from 'axios';

const kioskApi = axios.create({ baseURL: 'http://localhost:5000/api' });

kioskApi.interceptors.request.use(config => {
  const token = sessionStorage.getItem('kioskToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default kioskApi;

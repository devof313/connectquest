import axios from 'axios';

// In production, frontend is served by the same Express server so we use relative URLs.
// In local dev, Vite runs on a different port so we hit localhost:3001.
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

const api = axios.create({
  baseURL,
  timeout: 15000,
});

export default api;

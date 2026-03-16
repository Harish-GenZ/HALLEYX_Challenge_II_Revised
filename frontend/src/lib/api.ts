import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export const api = axios.create({
  baseURL: configuredBaseUrl || '/api',
});


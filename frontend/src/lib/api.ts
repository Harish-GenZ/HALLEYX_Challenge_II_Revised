import axios from 'axios';
import type { AxiosError } from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
export const apiBaseUrl = configuredBaseUrl || '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
});

function getResponseErrorMessage(error: AxiosError<{ error?: string }>) {
  const message = error.response?.data?.error;
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function getApiErrorMessage(error: unknown, resourceLabel: string) {
  if (!axios.isAxiosError(error)) {
    return `Unable to load ${resourceLabel} right now. Please try again.`;
  }

  const typedError = error as AxiosError<{ error?: string }>;
  const responseMessage = getResponseErrorMessage(typedError);
  if (responseMessage) {
    return responseMessage;
  }

  if (!typedError.response) {
    return `Unable to reach the backend for ${resourceLabel}. Check that the API server is deployed and reachable.`;
  }

  if (typedError.response.status === 404 && apiBaseUrl === '/api' && !import.meta.env.DEV) {
    return `This deployment cannot find its backend API yet. Add BACKEND_PUBLIC_URL in Vercel or set VITE_API_BASE_URL to your hosted backend URL ending with /api, then redeploy.`;
  }

  if (typedError.response.status >= 500) {
    return `The backend returned an error while loading ${resourceLabel}. Please check the server logs and database connection.`;
  }

  return `Unable to load ${resourceLabel} right now. Please try again.`;
}

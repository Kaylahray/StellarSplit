import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  API_TIMEOUT,
  BASE_API_URL,
  DEFAULT_API_REQUEST_ERROR,
  DEFAULT_NETWORK_CONNECTIVITY_ERROR,
} from "../constants/api";

function createApiClient(baseURL: string) {
  const apiInstance = axios.create({
    baseURL,
    timeout: API_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
    },
  });

  apiInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      return config;
    },
  );

  apiInstance.interceptors.response.use(
    async (response) => {
      return response;
    },
    async (error) => {
      return Promise.reject(
        error.response?.data?.message ||
          DEFAULT_API_REQUEST_ERROR ||
          DEFAULT_NETWORK_CONNECTIVITY_ERROR,
      );
    },
  );

  return apiInstance;
}

// Export an API client instance - e.g. stellarSplitApiClient('/stellar-split')
export const apiClient = createApiClient(BASE_API_URL);

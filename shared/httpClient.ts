/* eslint-disable no-restricted-imports */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { performance } from 'perf_hooks';
import logger from './logger';
import { externalApiCallCounter, externalApiDuration } from './metrics';

async function trackExternalApiCall<T>(apiName: string, fn: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
  const start = performance.now();
  try {
    const response = await fn();
    const duration = performance.now() - start;
    externalApiDuration.record(duration, { api: apiName, status: response.status });
    externalApiCallCounter.add(1, { api: apiName, status: response.status });
    logger.info({ api: apiName, duration: String(duration), status: String(response.status) }, 'External API call');
    return response;
  } catch (error) {
    const duration = performance.now() - start;
    let status = 0;
    if (axios.isAxiosError(error)) {
      status = error.response?.status || 0;
    }
    externalApiDuration.record(duration, { api: apiName, status });
    externalApiCallCounter.add(1, { api: apiName, status });
    logger.error({ api: apiName, duration: String(duration), status: String(status), err: error }, 'External API call failed');
    throw error;
  }
}

async function get<T>(apiName: string, url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return trackExternalApiCall(apiName, () => axios.get<T>(url, config));
}

async function post<T>(apiName: string, url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return trackExternalApiCall(apiName, () => axios.post<T>(url, data, config));
}

function isHttpError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

export const httpClient = { get, post };
export { isHttpError };
export default httpClient;

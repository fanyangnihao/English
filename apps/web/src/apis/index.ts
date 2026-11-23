import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useUserStore } from "@/stores/user";
import router from "@/router";
import { refreshTokenApi } from "./auth";
import { ElMessage } from "element-plus";
import type { Token } from "@en/common/user";

export const uploadUrl = import.meta.env.VITE_MINIO_ENDPOINT;
export const socketUrl = import.meta.env.VITE_SOCKET_URL;
export const timeout = 50000;

const AUTH_EXPIRY_SKEW_MS = 60_000;
const PUBLIC_AUTH_PATHS = new Set([
  "/user/login",
  "/user/register",
  "/user/refresh-token",
]);

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

class SessionExpiredError extends Error {}

let refreshPromise: Promise<Token> | null = null;
let sessionExpiredNotified = false;

const isPublicAuthRequest = (url?: string) =>
  Boolean(url && PUBLIC_AUTH_PATHS.has(url.split("?")[0]));

const getJwtExpiration = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as {
      exp?: number;
    };
    return typeof claims.exp === "number" ? claims.exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const isTokenExpiringSoon = (token: string) => {
  const expiresAt = getJwtExpiration(token);
  return expiresAt > 0 && expiresAt - Date.now() <= AUTH_EXPIRY_SKEW_MS;
};

const notifySessionExpired = () => {
  const userStore = useUserStore();
  userStore.logout();

  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  ElMessage.error("登录已过期,请重新登录");
  void router.replace("/");
};

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const userStore = useUserStore();
  const refreshToken = userStore.getRefreshToken;
  if (!refreshToken) {
    notifySessionExpired();
    return Promise.reject(new SessionExpiredError("Refresh token missing"));
  }

  sessionExpiredNotified = false;
  refreshPromise = refreshTokenApi({ refreshToken })
    .then((response) => {
      if (
        !response.success ||
        response.code !== 200 ||
        !response.data?.accessToken ||
        !response.data?.refreshToken
      ) {
        throw new SessionExpiredError(
          response.message || "Refresh token is invalid",
        );
      }

      userStore.updateToken(response.data);
      return response.data;
    })
    .catch((error: unknown) => {
      const refreshRejected =
        error instanceof SessionExpiredError ||
        (axios.isAxiosError(error) && error.response?.status === 401);

      if (refreshRejected) {
        notifySessionExpired();
      } else if (axios.isAxiosError(error) && !error.response) {
        ElMessage.error("网络连接失败,请重试");
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const serverApi = axios.create({
  baseURL: "/api/v1",
  timeout,
});

serverApi.interceptors.request.use(async (config) => {
  const userStore = useUserStore();
  const accessToken = userStore.getAccessToken;
  if (!accessToken || isPublicAuthRequest(config.url)) return config;

  if (isTokenExpiringSoon(accessToken)) {
    const token = await refreshAccessToken();
    config.headers.Authorization = `Bearer ${token.accessToken}`;
  } else {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

serverApi.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!error.response) {
      if (error.code === "ERR_NETWORK") {
        ElMessage.error("网络连接失败,请重试");
      }
      return Promise.reject(error);
    }

    if (
      status !== 401 ||
      !originalRequest ||
      isPublicAuthRequest(originalRequest.url)
    ) {
      ElMessage.error("服务器异常,请稍后再试");
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      await refreshAccessToken();
      return serverApi(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export const aiApi = axios.create({
  baseURL: "/ai/v1",
  timeout,
});

aiApi.interceptors.response.use((res) => {
  return res.data;
});

export interface Response<T = any> {
  timestamp: string;
  path: string;
  message: string;
  code: number;
  success: boolean;
  data: T;
}

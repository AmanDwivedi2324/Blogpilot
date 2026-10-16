const API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_BASE = "/api/v1/auth";

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  // Prevent multiple simultaneous requests from refreshing together.
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}${AUTH_BASE}/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.data?.accessToken) {
          setAccessToken(null);
          return null;
        }

        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(
  endpoint,
  { method = "GET", token, body, headers = {}, retry = true } = {}
) {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const request = async (currentToken) => {
    const requestHeaders = { ...headers };

    if (currentToken) {
      requestHeaders.Authorization = `Bearer ${currentToken}`;
    }

    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;

    if (body !== undefined && !isFormData) {
      requestHeaders["Content-Type"] = "application/json";
    }

    return fetch(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      credentials: "include",
      ...(body !== undefined
        ? {
            body: isFormData ? body : JSON.stringify(body),
          }
        : {}),
    });
  };

  let response = await request(token || accessToken);

  if (response.status === 401 && retry && !endpoint.endsWith("/refresh")) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      response = await request(newToken);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.detail || "Something went wrong."
    );
  }

  return data;
}

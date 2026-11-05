export const USER_TOKEN = "forno_user_token";
export const ADMIN_TOKEN = "forno_admin_token";

export async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const stored = localStorage.getItem(options.admin ? ADMIN_TOKEN : USER_TOKEN);
  const authToken = options.token || stored;
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  let data = {};
  try {
    data = await response.json();
  } catch (parseError) {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return data;
}

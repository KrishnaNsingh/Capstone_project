import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Use environment variable for backend URL or default to relative paths for local development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Prepend backend URL for API calls, ensuring no double slashes
  let fullUrl = url;
  if (url.startsWith("/api/")) {
    // Remove trailing slash from BACKEND_URL if present and ensure single slash
    const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const apiPath = url.startsWith('/') ? url : `/${url}`;
    fullUrl = `${baseUrl}${apiPath}`;
  }
  
  // Handle FormData differently from JSON
  const isFormData = data instanceof FormData;
  
  const res = await fetch(fullUrl, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    // Don't include credentials to avoid CORS issues with specific origins
    credentials: "omit",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    // Prepend backend URL for API calls, ensuring no double slashes
    let fullUrl = url;
    if (url.startsWith("/api/")) {
      // Remove trailing slash from BACKEND_URL if present and ensure single slash
      const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
      const apiPath = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${baseUrl}${apiPath}`;
    }
    
    const res = await fetch(fullUrl, {
      // Don't include credentials to avoid CORS issues with specific origins
      credentials: "omit",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
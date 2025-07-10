import axios from "axios";

const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
});

// You can add interceptors for handling tokens or errors globally
// apiClient.interceptors.request.use(config => { ... });
// apiClient.interceptors.response.use(response => { ... });

export default apiClient;

export async function isAuthenticated(): Promise<boolean> {
  try {
    const res = await apiClient.get('/auth/check');
    return !!res.data.authenticated;
  } catch {
    return false;
  }
} 
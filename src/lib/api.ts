import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// You can add interceptors for handling tokens or errors globally
// apiClient.interceptors.request.use(config => { ... });
// apiClient.interceptors.response.use(response => { ... });

export default apiClient; 
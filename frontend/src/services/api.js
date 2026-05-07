import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "http://127.0.0.1:5000/api" : "/api");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.message || error.response?.data?.msg || "";

    if (status === 401 && /token|authorization/i.test(apiMessage)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

    return Promise.reject(error);
  }
);

export default api;

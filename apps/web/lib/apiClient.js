// apps/web/lib/apiClient.js
import axios from "axios";


const api = axios.create({
baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
});


// Attach JWT if present
api.interceptors.request.use((config) => {
if (typeof window !== "undefined") {
const token = localStorage.getItem("token");
if (token) config.headers.Authorization = `Bearer ${token}`;
}
return config;
});


export default api;
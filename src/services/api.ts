import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Configure base token automatically if it exists
const token = Cookies.get("establishment_token") || Cookies.get("client_token");
if (token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function setAuthToken(token?: string, type: 'establishment' | 'client' = 'establishment') {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    Cookies.set(`${type}_token`, token, { expires: 7 }); // expires in 7 days
    return;
  }

  delete api.defaults.headers.common.Authorization;
  Cookies.remove('establishment_token');
  Cookies.remove('client_token');
}

export function getAuthToken(type: 'establishment' | 'client' = 'establishment') {
  return Cookies.get(`${type}_token`);
}

import axios from "axios";

// TODO: point at the EOS-backend base URL (see EOS-backend), attach auth token via interceptor
export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

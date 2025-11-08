import axios from "./axios";

export const registerRequest = async (client) =>
  axios.post(`/auth/register`, client);

export const loginRequest = async (client) => axios.post(`/auth/login`, client);

export const verifyTokenRequest = async () => axios.get(`/auth/verify`);


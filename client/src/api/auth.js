import axios from "./axios";

export const registerRequest = async (Cliente) =>
  axios.post(`/auth/register`, Cliente);

export const loginRequest = async (Cliente) => axios.post(`/auth/login`, Cliente);

export const verifyTokenRequest = async () => axios.get(`/auth/verify`);


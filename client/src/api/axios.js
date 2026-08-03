// client/src/api/axios.js

import axios from "axios";
import { API_URL } from "../config";

const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

instance.interceptors.response.use(
  response => response,

  error => {
    const status =
      error.response?.status;

    const codigo =
      error.response?.data
        ?.codigo;

    if (
      status === 423 &&
      codigo ===
        "CUENTA_BLOQUEADA_PREVENTIVAMENTE"
    ) {
      /*
       * La cookie es httpOnly en producción,
       * por lo que el frontend no necesita
       * ni puede eliminarla directamente.
       * El backend ya la invalida.
       */
      window.dispatchEvent(
        new CustomEvent(
          "cuenta-bloqueada",
          {
            detail: {
              message:
                error.response?.data
                  ?.message,

              motivo:
                error.response?.data
                  ?.motivo,
            },
          },
        ),
      );

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login?bloqueado=1";
      }
    }

    return Promise.reject(error);
  },
);

export default instance;

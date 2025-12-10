// src/libs/jwt.js
import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";

export async function createAccessToken(payload) {
  return new Promise((resolve, reject) => {
    const finalPayload = {
      ...payload,
      aud: payload?.aud ?? "cliente",
    };
    jwt.sign(
      finalPayload,
      TOKEN_SECRET,
      { expiresIn: "1d" },
      (err, token) => (err ? reject(err) : resolve(token))
    );
  });
}

/** Verifica un access token y retorna el payload decodificado. */
export function verifyAccessToken(token) {
  return jwt.verify(token, TOKEN_SECRET);
}

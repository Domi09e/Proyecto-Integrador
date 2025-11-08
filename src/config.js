export const PORT = process.env.PORT || 4000;
export const TOKEN_SECRET = process.env.TOKEN_SECRET || "super_secret_key_change_me";

// --- Variables para SQL SERVER (Ajustadas a tu configuración) ---

// Corregido: Este es el cambio más importante. 
// Debe coincidir con el "Server name" de tu imagen.
export const DB_SERVER = process.env.DB_SERVER || 'localhost'; 
export const DB_DATABASE = process.env.DB_DATABASE || 'bnpl_db';
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_PORT = process.env.DB_PORT || 3306; // Este puerto es el estándar y suele ser correcto.

export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";


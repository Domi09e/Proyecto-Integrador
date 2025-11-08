// src/app.js
// No se necesitan cambios, tu configuración es excelente.
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import { FRONTEND_URL } from "./config.js";
import adminAuthRoutes from "./routes/authAdmin.routes.js";
import adminStoresRoutes from "./routes/authAT.routes.js";

import path from "path";

const app = express();

app.use(
  cors({
    credentials: true,
    origin: FRONTEND_URL,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminStoresRoutes);
app.use("/uploads", express.static(path.resolve("uploads")));


// El código para servir el frontend en producción es correcto.
if (process.env.NODE_ENV === "production") {
  const path = await import("path");
  app.use(express.static("client/dist"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve("client", "dist", "index.html"));
  });
}

export default app;


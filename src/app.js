// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import { FRONTEND_URL } from "./config.js";

// RUTAS
import authRoutes from "./routes/auth.routes.js";
import adminAuthRoutes from "./routes/authAdmin.routes.js";
import adminStoresRoutes from "./routes/authAT.routes.js";
import AURoutes from "./routes/AU.routes.js";
import tiendaRoutes from "./routes/tienda.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import partnerRoutes from "./routes/partner.routes.js";

const app = express();

// Middlewares
app.use(
  cors({
    credentials: true,
    origin: FRONTEND_URL,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Rutas API
app.use("/api", AURoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminStoresRoutes);

// 🔥 ESTAS SON LAS RUTAS QUE EL FRONT NECESITA
app.use("/api/tiendas", tiendaRoutes);
app.use("/api/categorias", categoryRoutes);

app.use("/api", partnerRoutes);

import bnplRoutes from "./routes/bnpl.routes.js";

app.use("/api", bnplRoutes);

import paymentRoutes from "./routes/payment.routes.js";

app.use("/api", paymentRoutes);

import clientRoutes from "./routes/client.routes.js";
app.use("/api/client", clientRoutes);


// Static uploads
app.use("/uploads", express.static(path.resolve("uploads")));

// Producción
if (process.env.NODE_ENV === "production") {
  const path = await import("path");
  app.use(express.static("client/dist"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve("client", "dist", "index.html"));
  });
}

export default app;

// src/routes/tienda.routes.js
import { Router } from "express";
import { getStores, getStoreById } from "../controllers/shops.controller.js";

const router = Router();

// GET /api/tiendas
router.get("/", getStores);
router.get("/tiendas/:id", getStoreById); // GET /api/tiendas/:id

export default router;

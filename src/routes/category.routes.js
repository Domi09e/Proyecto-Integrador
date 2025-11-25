// src/routes/category.routes.js
import { Router } from "express";
import { getCategories } from "../controllers/category.controller.js";

const router = Router();

// GET /api/categorias
router.get("/", getCategories);

export default router;

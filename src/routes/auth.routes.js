import { Router } from "express";
import {
  login,
  logout,
  register,
  verifyToken,
} from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getStores } from '../controllers/shops.controller.js';
import { getCategories } from '../controllers/category.controller.js';

const router = Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/login", validateSchema(loginSchema), login);

// Protegemos las rutas que necesitan un usuario autenticado
router.post("/logout", requireAuth, logout);
router.get("/verify", requireAuth, verifyToken);
router.get('/stores', getStores);
router.get('/categories', getCategories); 

export default router;


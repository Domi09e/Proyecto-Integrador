import db from "../models/index.js";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";

const { Cliente } = db;  

// POST /api/auth/register-cliente
export const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      telefono,
      address,
    } = req.body;

    // ¿Email ya usado?
    const clienteFound = await Cliente.findOne({ where: { email } });
    if (clienteFound) {
      return res
        .status(400)
        .json({ message: ["El email ya está en uso"] });
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10);

    const newCliente = await Cliente.create({
      nombre,
      apellido,
      email,
      telefono,
      address,
      password_hash,
      poder_credito: 0, 
      activo: 1,
    });

    const tokenPayload = { id: newCliente.id, tipo: "cliente" };
    const token = await createAccessToken(tokenPayload);

    res.cookie("token", token, {
      httpOnly: process.env.NODE_ENV !== "development",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      id: newCliente.id,
      nombre: newCliente.nombre,
      apellido: newCliente.apellido,
      email: newCliente.email,
      telefono: newCliente.telefono,
      address: newCliente.address,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login-cliente
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const clienteFound = await Cliente.findOne({ where: { email } });

    if (!clienteFound) {
      return res.status(400).json({ message: ["El email no existe"] });
    }

    const isMatch = await bcrypt.compare(
      password,
      clienteFound.password_hash
    );
    if (!isMatch) {
      return res.status(400).json({ message: ["La contraseña es incorrecta"] });
    }

    if (!clienteFound.activo) {
      return res
        .status(403)
        .json({ message: ["Tu cuenta está inactiva, contacta soporte"] });
    }

    const tokenPayload = { id: clienteFound.id, tipo: "cliente" };
    const token = await createAccessToken(tokenPayload);

    res.cookie("token", token, {
      httpOnly: process.env.NODE_ENV !== "development",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      id: clienteFound.id,
      nombre: clienteFound.nombre,
      apellido: clienteFound.apellido,
      email: clienteFound.email,
      telefono: clienteFound.telefono,
      address: clienteFound.address,
      poder_credito: clienteFound.poder_credito,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/verify (para clientes)
export const verifyToken = async (req, res) => {
  const clienteFound = await Cliente.findByPk(req.cliente.id);
  if (!clienteFound) return res.status(401).json({ message: "Unauthorized" });

  return res.json({
    id: clienteFound.id,
    nombre: clienteFound.nombre,
    apellido: clienteFound.apellido,
    email: clienteFound.email,
    telefono: clienteFound.telefono,
    address: clienteFound.address,
    poder_credito: clienteFound.poder_credito,
  });
};

export const logout = (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.sendStatus(200);
};

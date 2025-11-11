// controllers/adminAuth.controller.js
import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import { createAccessToken } from '../libs/jwt.js';

const { Usuario } = db;

// REGISTER (admin)
export const registerAdmin = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol } = req.body || {};

    // Validaciones mínimas
    if (!email || !password || !nombre) {
      return res.status(400).json({ message: ['nombre, email y password son requeridos'] });
    }

    // ¿Ya existe por email?
    const existing = await Usuario.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: ['The email is already in use'] });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await Usuario.create({
      nombre,
      apellido,
      email,
      telefono,
      password_hash: passwordHash,
      rol: rol || 'admin_general',
      activo: true,
    });

    const tokenPayload = { id: admin.id };
    const token = await createAccessToken(tokenPayload);

    // === Cookie igual que tu controller de clientes (misma estrategia) ===
    res.cookie('admin_token', token, {
      httpOnly: process.env.NODE_ENV !== 'development',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.status(201).json({
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
      rol: admin.rol,
    });
  } catch (error) {
    console.error('[registerAdmin]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// LOGIN (admin)
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const admin = await Usuario.findOne({ where: { email } });

    if (!admin) {
      return res.status(400).json({ message: ['The email does not exist'] });
    }
    if (!admin.activo) {
      return res.status(403).json({ message: 'Usuario administrador inactivo' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ message: ['The password is incorrect'] });
    }

    const tokenPayload = { id: admin.id };
    const token = await createAccessToken(tokenPayload);

    // === Cookie igual que tu controller de clientes ===
    res.cookie('admin_token', token, {
      httpOnly: process.env.NODE_ENV !== 'development',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.json({
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
      rol: admin.rol,
    });
  } catch (error) {
    console.error('[loginAdmin]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// VERIFY (admin) — igual estructura
// Nota: req.user debe venir de un middleware requireAdmin que verifique el JWT de la cookie 'admin_token'
export const verifyAdminToken = async (req, res) => {
  const admin = await Usuario.findByPk(req.user.id);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  return res.json({
    id: admin.id,
    nombre: admin.nombre,
    apellido: admin.apellido,
    email: admin.email,
    rol: admin.rol,
  });
};

// LOGOUT (admin) — igual estrategia de limpiar cookie
export const logoutAdmin = (_req, res) => {
  res.cookie('admin_token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.sendStatus(200);
};

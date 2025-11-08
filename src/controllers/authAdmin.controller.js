import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import { createAccessToken } from '../libs/jwt.js';
import { Op } from 'sequelize';

const { Usuario } = db;

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24, // 1 día
};

const normEmail = (e) => String(e || '').trim().toLowerCase();

/**
 * POST /api/admin/auth/register
 * Body esperado (solo columnas existentes):
 * { nombre, apellido?, email, password, telefono?, rol? }
 */
export const registerAdmin = async (req, res) => {
  try {
    let { nombre, apellido, email, password, telefono, rol } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: ['nombre, email y password son requeridos'] });
    }

    email = normEmail(email);

    // Verifica email / teléfono si viene
    const whereOr = [{ email }];
    if (telefono) whereOr.push({ telefono });

    const existing = await Usuario.findOne({
      where: { [Op.or]: whereOr },
      attributes: ['id', 'email', 'telefono'],
    });

    if (existing) {
      if (existing.email === email) return res.status(400).json({ message: ['El email ya está en uso'] });
      if (telefono && existing.telefono === telefono) return res.status(400).json({ message: ['El teléfono ya está en uso'] });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const admin = await Usuario.create({
      nombre: String(nombre).trim(),
      apellido: apellido ? String(apellido).trim() : null,
      email,
      telefono: telefono || null,
      password_hash,
      rol: rol || 'admin_general', // default de tu tabla
      activo: true,                // default de tu tabla
    });

    const token = await createAccessToken({ id: admin.id, aud: 'admin', rol: admin.rol });
    res.cookie('admin_token', token, cookieOpts);

    return res.status(201).json({
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
      rol: admin.rol,
    });
  } catch (error) {
    console.error('[registerAdmin]', error);
    return res.status(500).json({ message: 'Error al registrar admin' });
  }
};

/**
 * POST /api/admin/auth/login
 * Body: { email, password }
 */
export const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: ['email y password son requeridos'] });
    }

    email = normEmail(email);

    const admin = await Usuario.findOne({
      where: { email },
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'password_hash', 'rol', 'activo'],
    });

    if (!admin) return res.status(400).json({ message: ['El email no existe'] });
    if (!admin.activo) return res.status(403).json({ message: 'Usuario administrador inactivo' });

    const ok = await bcrypt.compare(password, admin.password_hash || '');
    if (!ok) return res.status(400).json({ message: ['La contraseña es incorrecta'] });

    const token = await createAccessToken({ id: admin.id, aud: 'admin', rol: admin.rol });
    res.cookie('admin_token', token, cookieOpts);

    return res.json({
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      email: admin.email,
      rol: admin.rol,
    });
  } catch (error) {
    console.error('[loginAdmin]', error);
    return res.status(500).json({ message: 'Error al iniciar sesión admin' });
  }
};

/**
 * GET /api/admin/auth/verify  (protegido con requireAdmin)
 */
export const verifyAdmin = async (req, res) => {
  try {
    const admin = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono', 'rol', 'activo', 'createdAt', 'updatedAt'],
    });
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });
    return res.json(admin);
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

/**
 * POST /api/admin/auth/logout
 */
export const logoutAdmin = (_req, res) => {
  res.clearCookie('admin_token', cookieOpts);
  return res.sendStatus(200);
};

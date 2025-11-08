
import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import { createAccessToken } from '../libs/jwt.js';

const { User } = db;

export const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, address, birth_date, legal_name } = req.body;

    const userFound = await User.findOne({ where: { email } });
    if (userFound) {
      return res.status(400).json({ message: ["The email is already in use"] });
    }

    const usernameFound = await User.findOne({ where: { username } });
    if (usernameFound) {
      return res.status(400).json({ message: ["The username is already in use"] });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password_hash: passwordHash,
      phone,
      address,
      birth_date,
      legal_name,
    });

    const tokenPayload = { id: newUser.id };
    const token = await createAccessToken(tokenPayload);

    res.cookie('token', token, {
      httpOnly: process.env.NODE_ENV !== 'development',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await User.findOne({ where: { email } });

    if (!userFound) {
      return res.status(400).json({ message: ["The email does not exist"] });
    }

    const isMatch = await bcrypt.compare(password, userFound.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: ["The password is incorrect"] });
    }

    const tokenPayload = { id: userFound.id };
    const token = await createAccessToken(tokenPayload);

    res.cookie('token', token, {
        httpOnly: process.env.NODE_ENV !== "development",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      id: userFound.id,
      username: userFound.username,
      email: userFound.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  // req.user es establecido por el middleware requireAuth
  const userFound = await User.findByPk(req.user.id);
  if (!userFound) return res.status(401).json({ message: 'Unauthorized' });

  return res.json({
    id: userFound.id,
    username: userFound.username,
    email: userFound.email,
  });
};

export const logout = (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.sendStatus(200);
};


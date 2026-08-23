import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AuthenticationError, NotFoundError } from '../utils/errors';

interface LoginResult {
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user) {
    throw new AuthenticationError('Username atau password salah');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Akun Anda tidak aktif. Hubungi pemilik toko.');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AuthenticationError('Username atau password salah');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = jwt.sign(
    { userId: user.id },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string): Promise<{ accessToken: string }> {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Token tidak valid');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User tidak ditemukan atau tidak aktif');
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    return { accessToken };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Refresh token tidak valid');
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    throw new NotFoundError('User tidak ditemukan');
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions,
    },
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

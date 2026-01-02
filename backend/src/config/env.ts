type NodeEnv = 'production' | 'development' | 'test' | string;

import type { SignOptions } from 'jsonwebtoken';

const NODE_ENV: NodeEnv = process.env.NODE_ENV || 'development';
export const isProduction = NODE_ENV === 'production';

export type JwtConfig = {
  secret: string;
  refreshSecret: string;
  expiresIn: NonNullable<SignOptions['expiresIn']>;
  refreshExpiresIn: NonNullable<SignOptions['expiresIn']>;
  algorithm: 'HS256';
};

const requiredInProd = (name: string): string | undefined => {
  const value = process.env[name];
  if (isProduction && (!value || value.trim().length === 0)) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getJwtConfig = (): JwtConfig => {
  const secret = requiredInProd('JWT_SECRET') || 'default-secret';
  const refreshSecret = requiredInProd('JWT_REFRESH_SECRET') || 'default-refresh-secret';

  const expiresIn = (process.env.JWT_EXPIRES_IN || '1h') as NonNullable<SignOptions['expiresIn']>;
  const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as NonNullable<SignOptions['expiresIn']>;

  if (!isProduction) {
    if (secret === 'default-secret') {
      // eslint-disable-next-line no-console
      console.warn('⚠️ JWT_SECRET not set; using insecure default (dev only).');
    }
    if (refreshSecret === 'default-refresh-secret') {
      // eslint-disable-next-line no-console
      console.warn('⚠️ JWT_REFRESH_SECRET not set; using insecure default (dev only).');
    }
  }

  return {
    secret,
    refreshSecret,
    expiresIn,
    refreshExpiresIn,
    algorithm: 'HS256'
  };
};

export const validateEnvOnBoot = () => {
  // This will throw in production if required vars are missing.
  getJwtConfig();
};

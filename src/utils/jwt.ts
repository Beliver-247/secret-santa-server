import jwt from 'jsonwebtoken';
import config from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret as jwt.Secret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwtSecret as jwt.Secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

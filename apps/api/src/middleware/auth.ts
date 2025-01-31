import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/db/client';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only administrators allowed' });
  }
  next();
};
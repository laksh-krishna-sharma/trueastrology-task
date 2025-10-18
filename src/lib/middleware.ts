import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from './auth';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: { userId: string };
}

export function withAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = decoded;
      return handler(req, res);
    } catch {
      return res.status(500).json({ error: 'Authentication error' });
    }
  };
}
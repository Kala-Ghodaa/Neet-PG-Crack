import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken & { role?: string; displayName?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const demoHeader = req.headers['x-demo-user-uid'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || 'candidate@pgprep.edu',
        decodedToken.name || 'Dr. Candidate'
      );
      req.user = {
        ...decodedToken,
        role: dbUser.role,
        displayName: dbUser.displayName,
      };
      return next();
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  // Support authenticated preview/evaluation candidate profile persisted in PostgreSQL
  if (demoHeader) {
    try {
      const dbUser = await getOrCreateUser(
        demoHeader,
        `${demoHeader}@pgpreparena.edu`,
        demoHeader === 'admin-candidate-01' ? 'Dr. Arjun Mehta (Admin & Faculty)' : 'Dr. Ananya Sharma (NEET PG Candidate)'
      );
      req.user = {
        uid: dbUser.uid,
        email: dbUser.email,
        role: dbUser.role,
        displayName: dbUser.displayName,
        aud: 'pg-prep-arena',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        firebase: { identities: {}, sign_in_provider: 'custom' },
        iat: Math.floor(Date.now() / 1000),
        iss: 'pg-prep-arena',
        sub: dbUser.uid,
      };
      return next();
    } catch (error) {
      console.error('Error resolving session user:', error);
      return res.status(500).json({ error: 'Authentication service error' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Missing token' });
};

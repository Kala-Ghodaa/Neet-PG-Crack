import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function loadFirebaseConfig(): { projectId: string } {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidatePaths = [
      path.resolve(process.cwd(), 'firebase-applet-config.json'),
      path.resolve(currentDir, '../../firebase-applet-config.json'),
      path.resolve(currentDir, '../firebase-applet-config.json'),
      path.resolve(currentDir, 'firebase-applet-config.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn('Could not read firebase-applet-config.json, falling back to default:', err);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'quixotic-theorem-3xq1s',
  };
}

const firebaseConfig = loadFirebaseConfig();

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();

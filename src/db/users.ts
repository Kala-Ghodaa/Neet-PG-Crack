import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName = 'Medical Candidate'
) {
  try {
    const role = uid.includes('admin') ? 'admin' : 'student';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile with database.', {
      cause: error,
    });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to fetch user profile.', { cause: error });
  }
}

export async function updateUserRole(uid: string, role: 'student' | 'admin') {
  try {
    const rows = await db
      .update(users)
      .set({ role })
      .where(eq(users.uid, uid))
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed in updateUserRole:', error);
    throw new Error('Failed to update user role.', { cause: error });
  }
}

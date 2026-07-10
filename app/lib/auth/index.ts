import NextAuth from 'next-auth';
import { authConfig } from './config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcryptjs';

export function normalizeLocalUsername(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function localUserEmailForName(name: string) {
  const slug = normalizeLocalUsername(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `${slug || 'user'}@local.hapax`;
}

export async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `;
}

async function getUserByLogin(login: string): Promise<User | undefined> {
  try {
    await ensureUsersTable();
    const normalized = normalizeLocalUsername(login);
    const user = await sql<User>`
      SELECT *
      FROM users
      WHERE lower(name) = lower(${normalized}) OR lower(email) = lower(${normalized})
      LIMIT 1
    `;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Name', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            username: z.string().min(1),
            password: z.string().min(4),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;
          const user = await getUserByLogin(username);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});

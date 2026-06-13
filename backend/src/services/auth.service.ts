import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { conflict, unauthorized, badRequest } from '../utils/http.js';
import { waterBaseMl } from '../utils/nutrition.js';
import { normalizeEmail } from '../utils/email.js';
import { env } from '../config/env.js';

const BCRYPT_COST = 12; // 2024+ floor; bcryptjs is pure-JS so keep this in step with hardware

const DEFAULT_HABITS = ['8h sleep', '10k steps', '5 veg servings', 'No late-night snacking', 'Protein at every meal'];

async function bootstrapUser(userId: string, weightKg = 78) {
  const base = waterBaseMl(weightKg);
  await prisma.profile.create({ data: { userId, weightKg, waterBaseMl: base, waterTargetMl: base } });
  await prisma.habit.createMany({ data: DEFAULT_HABITS.map((name) => ({ userId, name })) });
}

export async function register(rawEmail: string, password: string, name?: string) {
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('Email already registered');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await prisma.user.create({ data: { email, name, passwordHash, lastLoginAt: new Date() } });
  await bootstrapUser(user.id);
  return { token: signToken({ userId: user.id, email: user.email }), user: publicUser(user) };
}

export async function login(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: signToken({ userId: user.id, email: user.email }), user: publicUser(user) };
}

/**
 * Sign in with a Google ID token (from Google Identity Services on the frontend).
 * Verifies the token with Google, checks the audience, then finds-or-creates the user.
 */
export async function loginWithGoogle(idToken: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw unauthorized('Invalid Google token');
  const p = (await res.json()) as { aud?: string; sub?: string; email?: string; name?: string; email_verified?: string | boolean };

  if (env.googleClientId && p.aud !== env.googleClientId) throw unauthorized('Google token audience mismatch');
  if (!p.sub || !p.email) throw badRequest('Google token missing subject/email');
  // Only trust the email for account matching/creation if Google says it's verified —
  // prevents hijacking a password account by minting a Google identity with its email string.
  const emailVerified = p.email_verified === true || p.email_verified === 'true';
  const email = normalizeEmail(p.email);

  // Match by Google subject first (stable id). Only fall back to email when it's verified.
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: p.sub }, ...(emailVerified ? [{ email }] : [])] },
  });
  if (!user) {
    if (!emailVerified) throw unauthorized('Google email is not verified');
    user = await prisma.user.create({ data: { email, name: p.name ?? null, googleId: p.sub } });
    await bootstrapUser(user.id);
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: p.sub } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: signToken({ userId: user.id, email: user.email }), user: publicUser(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? publicUser(user) : null;
}

function publicUser(u: { id: string; email: string; name: string | null }) {
  return { id: u.id, email: u.email, name: u.name };
}

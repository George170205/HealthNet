import { Amplify } from 'aws-amplify'
import {
  signIn, signOut, getCurrentUser, fetchAuthSession,
} from 'aws-amplify/auth'
import { amplifyConfig, isAwsConfigured } from '../config/aws'
import type { AuthUser } from '../types'

// Configura Amplify al importar este módulo
if (isAwsConfigured()) {
  Amplify.configure(amplifyConfig)
}

// ──────────────────────────────────────────────────────────
// DEMO credentials (modo sin AWS configurado)
// ──────────────────────────────────────────────────────────
const DEMO_USERS: Record<string, { password: string; role: 'admin' | 'viewer' }> = {
  'admin@healthnet.com': { password: 'Demo1234!', role: 'admin' },
  'viewer@healthnet.com': { password: 'Demo1234!', role: 'viewer' },
}

let _demoUser: AuthUser | null = null

// ──────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthUser> {
  if (!isAwsConfigured()) {
    // Modo demo local
    const entry = DEMO_USERS[email.toLowerCase()]
    if (!entry || entry.password !== password) {
      throw new Error('Credenciales incorrectas')
    }
    _demoUser = { username: email, email, role: entry.role }
    return _demoUser
  }

  await signIn({ username: email, password })
  return getAuthenticatedUser()
}

export async function logout(): Promise<void> {
  _demoUser = null
  if (!isAwsConfigured()) return
  await signOut()
}

export async function getAuthenticatedUser(): Promise<AuthUser> {
  if (!isAwsConfigured()) {
    if (!_demoUser) throw new Error('No autenticado')
    return _demoUser
  }

  const user = await getCurrentUser()
  return {
    username: user.username,
    email: user.signInDetails?.loginId || user.username,
    role: 'admin',
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!isAwsConfigured()) return 'demo-token'
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() ?? null
  } catch {
    return null
  }
}

export async function getCredentials(): Promise<{
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
} | undefined> {
  if (!isAwsConfigured()) return undefined
  try {
    const session = await fetchAuthSession()
    const creds = session.credentials
    if (creds) {
      return {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      }
    }
    return undefined
  } catch (err) {
    console.error('[Auth] Error obteniendo credenciales temporales de Cognito:', err)
    return undefined
  }
}

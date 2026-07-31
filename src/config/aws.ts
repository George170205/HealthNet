// ──────────────────────────────────────────────────────────────────────
// Configuración de AWS — todos los valores vienen de variables de entorno
// Copia .env.example a .env y llena los valores antes de correr el proyecto
// ──────────────────────────────────────────────────────────────────────

export const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'us-west-1',

  // Cognito
  cognito: {
    userPoolId:       import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID    || '',
    identityPoolId:   import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || '',
  },

  // IoT Core
  iot: {
    endpoint: import.meta.env.VITE_IOT_ENDPOINT || '', // xxxxxx-ats.iot.region.amazonaws.com
    topicPrefix: 'healthnet/devices',
  },
} as const

// ──────────────────────────────────────────────────────────────────────
// Amplify v6 config object
// ──────────────────────────────────────────────────────────────────────
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId:       AWS_CONFIG.cognito.userPoolId,
      userPoolClientId: AWS_CONFIG.cognito.userPoolClientId,
      identityPoolId:   AWS_CONFIG.cognito.identityPoolId,
    },
  },
}

/** Devuelve true si las variables de entorno de AWS están configuradas */
export const isAwsConfigured = () =>
  Boolean(
    AWS_CONFIG.cognito.userPoolId &&
    AWS_CONFIG.cognito.userPoolClientId &&
    AWS_CONFIG.iot.endpoint
  )

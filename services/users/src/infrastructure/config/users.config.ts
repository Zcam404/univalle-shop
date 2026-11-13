/**
 * Infraestructura · Configuración del servicio.
 *
 * Lee y valida las variables de entorno una sola vez al arrancar. Si falta una
 * variable obligatoria el servicio no arranca y el error dice cuál es, en lugar
 * de fallar más tarde en medio de una petición.
 */

/** Token de inyección de dependencias para la configuración. */
export const USERS_CONFIG = Symbol('UsersConfig');

export interface UsersConfig {
  /** Puerto HTTP en el que escucha el servicio. */
  port: number;
  /** Cadena de conexión a la base MongoDB propia de este servicio. */
  mongoUri: string;
  jwt: {
    /** Secreto compartido con el API Gateway para firmar y validar tokens. */
    secret: string;
    /** Duración del token de acceso, en segundos. */
    expiresInSeconds: number;
  };
  /** Dominios de correo con los que se permite registrarse. */
  allowedEmailDomains: string[];
  /** Minutos de validez del código de verificación. */
  verificationCodeTtlMinutes: number;
  smtp: {
    host: string;
    port: number;
    /** Remitente de los correos (ej. `Univalle Shop <no-reply@univalleshop.local>`). */
    from: string;
  };
  /** Cuenta administradora inicial; `null` si no se configuró. */
  admin: { name: string; email: string; password: string } | null;
}

/**
 * Construye la configuración a partir de las variables de entorno.
 *
 * @param env Variables de entorno (por defecto `process.env`; las pruebas pueden pasar otras).
 * @throws Error Si falta una variable obligatoria o un número no es válido.
 */
export function loadUsersConfig(env: NodeJS.ProcessEnv = process.env): UsersConfig {
  /** Devuelve la variable o lanza un error claro si no está definida. */
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name}.`);
    return value;
  };

  /** Lee una variable numérica positiva, con valor por defecto. */
  const positiveInt = (name: string, fallback: number): number => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`La variable ${name} debe ser un entero positivo (valor recibido: "${raw}").`);
    }
    return value;
  };

  const adminEmail = env.ADMIN_EMAIL?.trim();

  return {
    port: positiveInt('PORT', 3001),
    mongoUri: required('MONGO_URI'),
    jwt: {
      secret: required('JWT_SECRET'),
      expiresInSeconds: positiveInt('JWT_EXPIRES_IN_SECONDS', 3600),
    },
    allowedEmailDomains: required('ALLOWED_EMAIL_DOMAINS').split(','),
    verificationCodeTtlMinutes: positiveInt('VERIFICATION_CODE_TTL_MINUTES', 15),
    smtp: {
      host: required('SMTP_HOST'),
      port: positiveInt('SMTP_PORT', 1025),
      from: env.SMTP_FROM?.trim() || 'Univalle Shop <no-reply@univalleshop.local>',
    },
    admin: adminEmail
      ? {
          name: env.ADMIN_NAME?.trim() || 'Administrador Univalle Shop',
          email: adminEmail,
          password: required('ADMIN_PASSWORD'),
        }
      : null,
  };
}

/**
 * Infraestructura · Conversión entre el documento de MongoDB y la entidad de dominio.
 *
 * Mantiene separados los dos modelos: si cambia la forma en que se guarda un
 * usuario, solo cambia este archivo y el esquema, no el dominio.
 */
import { Address } from '../../domain/entities/address.js';
import { User } from '../../domain/entities/user.js';
import { Email } from '../../domain/value-objects/email.js';
import { VerificationCode } from '../../domain/value-objects/verification-code.js';
import { UserRecord } from './user.schema.js';

export class UserRecordMapper {
  /** Reconstruye la entidad `User` a partir del documento leído de MongoDB. */
  static toDomain(record: UserRecord): User {
    return User.restore({
      id: record._id,
      name: record.name,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      affiliation: record.affiliation,
      role: record.role,
      phone: record.phone ?? null,
      emailVerified: record.emailVerified,
      verificationCode: record.verificationCode
        ? VerificationCode.restore({
            code: record.verificationCode.code,
            expiresAt: new Date(record.verificationCode.expiresAt),
            failedAttempts: record.verificationCode.failedAttempts,
          })
        : null,
      addresses: (record.addresses ?? []).map((a) =>
        Address.restore({ ...a, additionalInfo: a.additionalInfo ?? null }),
      ),
      createdAt: new Date(record.createdAt),
    });
  }

  /** Convierte la entidad `User` en el documento que se guarda en MongoDB. */
  static toRecord(user: User): UserRecord {
    const code = user.verificationCode;
    return {
      _id: user.id,
      name: user.name,
      email: user.email.value,
      passwordHash: user.passwordHash,
      affiliation: user.affiliation,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      verificationCode: code
        ? { code: code.code, expiresAt: code.expiresAt, failedAttempts: code.failedAttempts }
        : null,
      addresses: user.addresses.map((a) => a.toPrimitives()),
      createdAt: user.createdAt,
    };
  }
}

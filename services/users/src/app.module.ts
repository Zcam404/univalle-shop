/**
 * Módulo raíz del servicio de Usuarios: composición de dependencias.
 *
 * Es el único lugar que conoce a la vez los puertos y sus implementaciones.
 * Aquí se decide qué adaptador recibe cada puerto (MongoDB, bcrypt, JWT,
 * SMTP...) y se construyen los casos de uso con ellos. Para cambiar una
 * tecnología basta con cambiar su línea en este archivo; el dominio y los
 * casos de uso no se tocan (principio de inversión de dependencias).
 */
import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { ENSURE_ADMIN_USER } from './application/ports/in/admin.ports.js';
import { ADD_ADDRESS, LIST_ADDRESSES, REMOVE_ADDRESS, UPDATE_ADDRESS } from './application/ports/in/address.ports.js';
import { LOGIN, REGISTER_USER, RESEND_VERIFICATION_CODE, VERIFY_EMAIL } from './application/ports/in/auth.ports.js';
import { GET_PROFILE, UPDATE_PROFILE } from './application/ports/in/profile.ports.js';
import { CLOCK, Clock } from './application/ports/out/clock.js';
import { ID_GENERATOR, IdGenerator } from './application/ports/out/id-generator.js';
import { PASSWORD_HASHER, PasswordHasher } from './application/ports/out/password-hasher.js';
import { TOKEN_ISSUER, TokenIssuer } from './application/ports/out/token-issuer.js';
import { USER_REPOSITORY, UserRepository } from './application/ports/out/user.repository.js';
import {
  VERIFICATION_CODE_GENERATOR,
  VerificationCodeGenerator,
} from './application/ports/out/verification-code-generator.js';
import { VERIFICATION_NOTIFIER, VerificationNotifier } from './application/ports/out/verification-notifier.js';
import { VerificationCodeIssuer } from './application/services/verification-code-issuer.js';
import { AddAddressUseCase } from './application/use-cases/add-address.use-case.js';
import { EnsureAdminUserUseCase } from './application/use-cases/ensure-admin-user.use-case.js';
import { GetProfileUseCase } from './application/use-cases/get-profile.use-case.js';
import { ListAddressesUseCase } from './application/use-cases/list-addresses.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case.js';
import { RemoveAddressUseCase } from './application/use-cases/remove-address.use-case.js';
import { ResendVerificationCodeUseCase } from './application/use-cases/resend-verification-code.use-case.js';
import { UpdateAddressUseCase } from './application/use-cases/update-address.use-case.js';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case.js';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case.js';
import { InstitutionalEmailPolicy } from './domain/services/institutional-email-policy.js';
import { AdminSeeder } from './infrastructure/bootstrap/admin-seeder.js';
import { USERS_CONFIG, UsersConfig } from './infrastructure/config/users.config.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { HealthController } from './infrastructure/http/health.controller.js';
import { ProfileController } from './infrastructure/http/profile.controller.js';
import { SmtpVerificationNotifier } from './infrastructure/notifications/smtp-verification-notifier.js';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository.js';
import { UserRecord, UserSchema } from './infrastructure/persistence/user.schema.js';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher.js';
import { CryptoVerificationCodeGenerator } from './infrastructure/security/crypto-verification-code-generator.js';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer.js';
import { SystemClock } from './infrastructure/system/system-clock.js';
import { UuidIdGenerator } from './infrastructure/system/uuid-id-generator.js';

@Module({})
export class AppModule {
  /**
   * Arma el módulo con la configuración ya cargada.
   *
   * @param config Configuración leída de las variables de entorno.
   */
  static forRoot(config: UsersConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        MongooseModule.forRoot(config.mongoUri, { serverSelectionTimeoutMS: 5_000 }),
        MongooseModule.forFeature([{ name: UserRecord.name, schema: UserSchema }]),
        TerminusModule,
      ],
      controllers: [AuthController, ProfileController, HealthController],
      providers: [
        { provide: USERS_CONFIG, useValue: config },

        // --- Adaptadores de salida: implementación de cada puerto ----------
        { provide: USER_REPOSITORY, useClass: MongoUserRepository },
        { provide: PASSWORD_HASHER, useValue: new BcryptPasswordHasher() },
        { provide: TOKEN_ISSUER, useValue: new JwtTokenIssuer(config.jwt.secret, config.jwt.expiresInSeconds) },
        { provide: VERIFICATION_CODE_GENERATOR, useValue: new CryptoVerificationCodeGenerator() },
        { provide: VERIFICATION_NOTIFIER, useValue: new SmtpVerificationNotifier(config.smtp) },
        { provide: CLOCK, useValue: new SystemClock() },
        { provide: ID_GENERATOR, useValue: new UuidIdGenerator() },

        // --- Servicios de dominio y de aplicación ---------------------------
        { provide: InstitutionalEmailPolicy, useValue: new InstitutionalEmailPolicy(config.allowedEmailDomains) },
        {
          provide: VerificationCodeIssuer,
          inject: [VERIFICATION_CODE_GENERATOR, CLOCK],
          useFactory: (generator: VerificationCodeGenerator, clock: Clock) =>
            new VerificationCodeIssuer(generator, clock, config.verificationCodeTtlMinutes),
        },

        // --- Casos de uso: implementación de cada puerto de entrada --------
        {
          provide: REGISTER_USER,
          inject: [USER_REPOSITORY, InstitutionalEmailPolicy, PASSWORD_HASHER, ID_GENERATOR, VerificationCodeIssuer, VERIFICATION_NOTIFIER, CLOCK],
          useFactory: (
            users: UserRepository,
            policy: InstitutionalEmailPolicy,
            hasher: PasswordHasher,
            ids: IdGenerator,
            issuer: VerificationCodeIssuer,
            notifier: VerificationNotifier,
            clock: Clock,
          ) => new RegisterUserUseCase(users, policy, hasher, ids, issuer, notifier, clock),
        },
        {
          provide: VERIFY_EMAIL,
          inject: [USER_REPOSITORY, CLOCK],
          useFactory: (users: UserRepository, clock: Clock) => new VerifyEmailUseCase(users, clock),
        },
        {
          provide: RESEND_VERIFICATION_CODE,
          inject: [USER_REPOSITORY, VerificationCodeIssuer, VERIFICATION_NOTIFIER],
          useFactory: (users: UserRepository, issuer: VerificationCodeIssuer, notifier: VerificationNotifier) =>
            new ResendVerificationCodeUseCase(users, issuer, notifier),
        },
        {
          provide: LOGIN,
          inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
          useFactory: (users: UserRepository, hasher: PasswordHasher, tokens: TokenIssuer) =>
            new LoginUseCase(users, hasher, tokens),
        },
        {
          provide: GET_PROFILE,
          inject: [USER_REPOSITORY],
          useFactory: (users: UserRepository) => new GetProfileUseCase(users),
        },
        {
          provide: UPDATE_PROFILE,
          inject: [USER_REPOSITORY],
          useFactory: (users: UserRepository) => new UpdateProfileUseCase(users),
        },
        {
          provide: LIST_ADDRESSES,
          inject: [USER_REPOSITORY],
          useFactory: (users: UserRepository) => new ListAddressesUseCase(users),
        },
        {
          provide: ADD_ADDRESS,
          inject: [USER_REPOSITORY, ID_GENERATOR],
          useFactory: (users: UserRepository, ids: IdGenerator) => new AddAddressUseCase(users, ids),
        },
        {
          provide: UPDATE_ADDRESS,
          inject: [USER_REPOSITORY],
          useFactory: (users: UserRepository) => new UpdateAddressUseCase(users),
        },
        {
          provide: REMOVE_ADDRESS,
          inject: [USER_REPOSITORY],
          useFactory: (users: UserRepository) => new RemoveAddressUseCase(users),
        },
        {
          provide: ENSURE_ADMIN_USER,
          inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR, CLOCK],
          useFactory: (users: UserRepository, hasher: PasswordHasher, ids: IdGenerator, clock: Clock) =>
            new EnsureAdminUserUseCase(users, hasher, ids, clock),
        },

        AdminSeeder,
      ],
    };
  }
}

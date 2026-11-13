/**
 * Infraestructura · DTOs HTTP de autenticación.
 *
 * Describen el cuerpo de cada petición. Las anotaciones de `class-validator`
 * rechazan datos mal formados antes de llegar al caso de uso (400), y las de
 * `@nestjs/swagger` documentan el contrato en /docs. Las reglas de negocio
 * (correo institucional, política de contraseña) las aplica el dominio.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Affiliation } from '../../../domain/value-objects/user-enums.js';
import { UserResponseDto } from './user.dto.js';

/** Cuerpo de `POST /auth/register`. */
export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'ana.perez@correounivalle.edu.co', description: 'Debe ser un correo institucional.' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'univalle2026', description: 'Mínimo 8 caracteres, con al menos una letra y un número.' })
  @IsString()
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: Affiliation, example: Affiliation.STUDENT })
  @IsEnum(Affiliation)
  affiliation: Affiliation;
}

/** Respuesta de `POST /auth/register`. */
export class RegisterResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ description: 'false si la cuenta se creó pero el correo no se pudo enviar.' })
  verificationEmailSent: boolean;
}

/** Cuerpo de `POST /auth/verify-email`. */
export class VerifyEmailDto {
  @ApiProperty({ example: 'ana.perez@correounivalle.edu.co' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos.' })
  code: string;
}

/** Cuerpo de `POST /auth/resend-code`. */
export class ResendCodeDto {
  @ApiProperty({ example: 'ana.perez@correounivalle.edu.co' })
  @IsEmail()
  email: string;
}

/** Cuerpo de `POST /auth/login`. */
export class LoginDto {
  @ApiProperty({ example: 'ana.perez@correounivalle.edu.co' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'univalle2026' })
  @IsString()
  password: string;
}

/** Respuesta de `POST /auth/login`. */
export class LoginResponseDto {
  @ApiProperty({ description: 'JWT para enviar en la cabecera Authorization: Bearer <token>.' })
  accessToken: string;

  @ApiProperty({ example: 3600, description: 'Segundos hasta que vence el token.' })
  expiresIn: number;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;
}

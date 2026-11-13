/**
 * Infraestructura · Adaptador de entrada HTTP: autenticación.
 *
 * Rutas públicas de registro, verificación de correo e inicio de sesión. El
 * controlador solo traduce HTTP ↔ comandos: toda la lógica está en los casos
 * de uso, que recibe por sus puertos de entrada.
 */
import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LOGIN, REGISTER_USER, RESEND_VERIFICATION_CODE, VERIFY_EMAIL } from '../../application/ports/in/auth.ports.js';
import type {
  LoginPort,
  RegisterUserPort,
  ResendVerificationCodePort,
  VerifyEmailPort,
} from '../../application/ports/in/auth.ports.js';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  ResendCodeDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';
import { UserResponseDto } from './dto/user.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USER) private readonly registerUser: RegisterUserPort,
    @Inject(VERIFY_EMAIL) private readonly verifyEmail: VerifyEmailPort,
    @Inject(RESEND_VERIFICATION_CODE) private readonly resendCode: ResendVerificationCodePort,
    @Inject(LOGIN) private readonly login: LoginPort,
  ) {}

  /** Crea una cuenta con correo institucional y envía el código de verificación. */
  @Post('register')
  @ApiOperation({ summary: 'Registrar un miembro de la comunidad Univalle' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiForbiddenResponse({ description: 'El correo no es institucional.' })
  @ApiConflictResponse({ description: 'El correo ya está registrado.' })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute(dto);
  }

  /** Verifica el correo con el código recibido. */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar el correo con el código de 6 dígitos' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  verify(@Body() dto: VerifyEmailDto): Promise<UserResponseDto> {
    return this.verifyEmail.execute(dto);
  }

  /** Envía un código nuevo (el anterior deja de servir). */
  @Post('resend-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reenviar el código de verificación' })
  @ApiResponse({ status: 204 })
  async resend(@Body() dto: ResendCodeDto): Promise<void> {
    await this.resendCode.execute(dto);
  }

  /** Comprueba las credenciales y devuelve el token de acceso. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos.' })
  @ApiForbiddenResponse({ description: 'El correo no está verificado.' })
  signIn(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.login.execute(dto);
  }
}

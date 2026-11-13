/**
 * Infraestructura · DTOs HTTP de perfil y direcciones.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { Affiliation, Role } from '../../../domain/value-objects/user-enums.js';

/** Dirección tal como se devuelve en las respuestas. */
export class AddressResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Casa' }) label: string;
  @ApiProperty({ example: 'Calle 13 # 100-00' }) street: string;
  @ApiProperty({ example: 'Cali' }) city: string;
  @ApiProperty({ example: 'Valle del Cauca' }) department: string;
  @ApiProperty({ type: String, nullable: true, example: 'Apto 301' }) additionalInfo: string | null;
  @ApiProperty() isDefault: boolean;
}

/** Usuario tal como se devuelve en las respuestas (nunca incluye la contraseña). */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Ana Pérez' }) name: string;
  @ApiProperty({ example: 'ana.perez@correounivalle.edu.co' }) email: string;
  @ApiProperty({ enum: Affiliation }) affiliation: Affiliation;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty({ type: String, nullable: true, example: '3001234567' }) phone: string | null;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty({ type: () => [AddressResponseDto] }) addresses: AddressResponseDto[];
  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' }) createdAt: string;
}

/** Cuerpo de `PATCH /users/me`. Todos los campos son opcionales. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana María Pérez' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '3001234567', description: 'null borra el teléfono.' })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

/** Cuerpo de `POST /users/me/addresses`. */
export class CreateAddressDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  @MaxLength(120)
  label: string;

  @ApiProperty({ example: 'Calle 13 # 100-00' })
  @IsString()
  @MaxLength(120)
  street: string;

  @ApiProperty({ example: 'Cali' })
  @IsString()
  @MaxLength(120)
  city: string;

  @ApiProperty({ example: 'Valle del Cauca' })
  @IsString()
  @MaxLength(120)
  department: string;

  @ApiPropertyOptional({ example: 'Apto 301, torre B' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  additionalInfo?: string | null;

  @ApiPropertyOptional({ description: 'true para que sea la dirección predeterminada.' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/** Cuerpo de `PATCH /users/me/addresses/:id`. Todos los campos son opcionales. */
export class UpdateAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) department?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(250)
  additionalInfo?: string | null;

  @ApiPropertyOptional({ description: 'true la convierte en la predeterminada.' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

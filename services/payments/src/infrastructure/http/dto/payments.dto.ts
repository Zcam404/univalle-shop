/**
 * Infraestructura · DTOs HTTP de Pagos.
 *
 * Solo validan tipos. Que la tarjeta sea correcta (Luhn, vencimiento, CVV) lo
 * decide el dominio, y si no lo es el pago queda REJECTED con el motivo.
 */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CardDto {
  @ApiProperty({ example: '4242424242424242' }) @IsString() @MaxLength(30) number: string;
  @ApiProperty({ example: 'ANA PEREZ' }) @IsString() @MaxLength(80) holderName: string;
  @ApiProperty({ example: 12 }) @IsInt() expMonth: number;
  @ApiProperty({ example: 2030 }) @IsInt() expYear: number;
  @ApiProperty({ example: '123' }) @IsString() @MaxLength(4) cvv: string;
}

export class ChargeDto {
  @ApiProperty() @IsString() @MaxLength(100) orderId: string;
  @ApiProperty() @IsString() @MaxLength(100) userId: string;
  @ApiProperty({ example: 182000, description: 'Pesos colombianos' }) @IsInt() amount: number;

  @ApiProperty({ type: CardDto })
  @ValidateNested()
  @Type(() => CardDto)
  card: CardDto;
}

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() userId: string;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'REFUNDED'] }) status: string;
  @ApiProperty({ type: String, nullable: true, enum: ['VISA', 'MASTERCARD', 'AMEX', 'OTHER'] }) cardBrand: string | null;
  @ApiProperty({ type: String, nullable: true }) cardLast4: string | null;
  @ApiProperty({ type: String, nullable: true }) reason: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty({ type: String, nullable: true }) refundedAt: string | null;
}

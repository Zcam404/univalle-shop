/**
 * Infraestructura · DTOs HTTP de carrito y pedidos.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

// --- Carrito ------------------------------------------------------------------

export class AddCartItemDto {
  @ApiProperty() @IsString() @MaxLength(100) productId: string;
  @ApiProperty({ example: 1 }) @IsInt() quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 }) @IsInt() quantity: number;
}

export class CartItemResponseDto {
  @ApiProperty() productId: string;
  @ApiProperty() name: string;
  @ApiProperty() unitPrice: number;
  @ApiProperty({ type: String, nullable: true }) imageUrl: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() subtotal: number;
}

export class CartResponseDto {
  @ApiProperty({ type: [CartItemResponseDto] }) items: CartItemResponseDto[];
  @ApiProperty() totalItems: number;
  @ApiProperty({ description: 'Total con los precios guardados; el definitivo se fija al comprar' }) estimatedTotal: number;
}

// --- Compra -------------------------------------------------------------------

export class ShippingAddressDto {
  @ApiProperty({ example: 'Ana Pérez' }) @IsString() @MaxLength(120) recipientName: string;
  @ApiProperty({ example: 'Calle 13 # 100-00' }) @IsString() @MaxLength(120) street: string;
  @ApiProperty({ example: 'Cali' }) @IsString() @MaxLength(120) city: string;
  @ApiProperty({ example: 'Valle del Cauca' }) @IsString() @MaxLength(120) department: string;
  @ApiProperty({ example: '3001234567' }) @IsString() @MaxLength(20) phone: string;
  @ApiPropertyOptional({ example: 'Apto 301' }) @IsOptional() @IsString() @MaxLength(250) additionalInfo?: string | null;
}

/** Datos de la tarjeta. Se envían a Pagos y no se guardan en Pedidos. */
export class CardDto {
  @ApiProperty({ example: '4242424242424242' })
  @Matches(/^[\d ]{12,23}$/, { message: 'El número de tarjeta debe tener solo dígitos.' })
  number: string;

  @ApiProperty({ example: 'ANA PEREZ' }) @IsString() @MaxLength(80) holderName: string;
  @ApiProperty({ example: 12 }) @IsInt() @Min(1) @Max(12) expMonth: number;
  @ApiProperty({ example: 2030 }) @IsInt() @Min(2000) @Max(2100) expYear: number;
  @ApiProperty({ example: '123' }) @Matches(/^\d{3,4}$/, { message: 'El CVV debe tener 3 o 4 dígitos.' }) cvv: string;
}

export class PlaceOrderDto {
  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ type: CardDto })
  @ValidateNested()
  @Type(() => CardDto)
  card: CardDto;
}

// --- Pedidos ------------------------------------------------------------------

export class OrderItemResponseDto {
  @ApiProperty() productId: string;
  @ApiProperty() name: string;
  @ApiProperty() unitPrice: number;
  @ApiProperty() quantity: number;
  @ApiProperty() subtotal: number;
}

export class OrderPaymentResponseDto {
  @ApiProperty({ type: String, nullable: true }) cardLast4: string | null;
  @ApiProperty({ type: String, nullable: true }) failureReason: string | null;
}

export class StatusChangeResponseDto {
  @ApiProperty({ enum: ORDER_STATUSES }) status: string;
  @ApiProperty() at: string;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ORDER_STATUSES }) status: string;
  @ApiProperty({ type: [OrderItemResponseDto] }) items: OrderItemResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty({ type: ShippingAddressDto }) shippingAddress: ShippingAddressDto;
  @ApiProperty({ type: OrderPaymentResponseDto }) payment: OrderPaymentResponseDto;
  @ApiProperty({ type: [StatusChangeResponseDto] }) history: StatusChangeResponseDto[];
  @ApiProperty() cancellable: boolean;
  @ApiProperty() createdAt: string;
}

export class OrderPageResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) items: OrderResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}

export class AdminOrdersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES }) @IsOptional() @IsIn(ORDER_STATUSES) status?: (typeof ORDER_STATUSES)[number];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['SHIPPED', 'DELIVERED'] }) @IsIn(['SHIPPED', 'DELIVERED']) status: 'SHIPPED' | 'DELIVERED';
}

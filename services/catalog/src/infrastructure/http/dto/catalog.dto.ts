/**
 * Infraestructura · DTOs HTTP del catálogo.
 *
 * Validan la forma de las peticiones (tipos, rangos básicos) y documentan el
 * contrato en Swagger. Las reglas de negocio las aplica el dominio.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// --- Categorías ---------------------------------------------------------------

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Papelería' }) name: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Papelería' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'Cuadernos, lápices y útiles' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(300)
  description?: string | null;
}

// --- Productos ----------------------------------------------------------------

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Buzo Univalle' }) name: string;
  @ApiProperty() description: string;
  @ApiProperty({ example: 85000, description: 'Pesos colombianos' }) price: number;
  @ApiProperty({ type: () => CategoryResponseDto, nullable: true }) category: CategoryResponseDto | null;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty() stock: number;
  @ApiProperty({ description: 'Activo y con stock' }) available: boolean;
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class ProductPageResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto] }) items: ProductResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}

/** Parámetros de `GET /products`. Llegan como texto en la URL y se convierten a número/booleano. */
export class ListProductsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['newest', 'price_asc', 'price_desc', 'name'], default: 'newest' })
  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'name'])
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name';

  @ApiPropertyOptional({ description: 'Solo admin: incluir productos desactivados' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Buzo Univalle' }) @IsString() @MaxLength(120) name: string;

  @ApiProperty({ example: 'Buzo con capucha, bordado oficial' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 85000 }) @IsInt() price: number;
  @ApiProperty() @IsString() categoryId: string;

  @ApiProperty({ type: [String], example: ['https://picsum.photos/seed/buzo/600/600'] })
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ example: 20, description: 'Unidades iniciales' }) @IsInt() @Min(0) stock: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'false desactiva el producto' }) @IsOptional() @IsBoolean() active?: boolean;
}

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Unidades a sumar (positivo) o restar (negativo)' })
  @IsInt()
  delta: number;
}

// --- Reservas (uso interno) -----------------------------------------------------

export class ReservationLineDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty({ example: 2 }) @IsInt() quantity: number;
}

export class ReserveStockDto {
  @ApiProperty({ description: 'Id del pedido' }) @IsString() @MaxLength(100) orderId: string;

  @ApiProperty({ type: [ReservationLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReservationLineDto)
  items: ReservationLineDto[];
}

export class ReservationItemResponseDto {
  @ApiProperty() productId: string;
  @ApiProperty() name: string;
  @ApiProperty() unitPrice: number;
  @ApiProperty() quantity: number;
}

export class ReservationResponseDto {
  @ApiProperty() orderId: string;
  @ApiProperty({ enum: ['RESERVED', 'CONFIRMED', 'RELEASED'] }) status: string;
  @ApiProperty({ type: [ReservationItemResponseDto] }) items: ReservationItemResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() createdAt: string;
}

export class ProductChangesResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto] }) items: ProductResponseDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor: string | null;
}

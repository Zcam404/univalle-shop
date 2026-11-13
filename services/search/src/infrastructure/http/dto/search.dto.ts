/**
 * Infraestructura · DTOs HTTP de Búsqueda.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

/** Parámetros de `GET /search` (llegan como texto en la URL). */
export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'cuaderno', description: 'Texto a buscar (sin importar tildes ni mayúsculas)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ example: 5000 }) @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @ApiPropertyOptional({ example: 50000 }) @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;

  @ApiPropertyOptional({ description: 'true: solo productos con stock' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ enum: ['relevance', 'price_asc', 'price_desc', 'newest'], default: 'relevance' })
  @IsOptional()
  @IsIn(['relevance', 'price_asc', 'price_desc', 'newest'])
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional({ default: 12 }) @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}

export class ProductHitDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() price: number;
  @ApiProperty({ nullable: true, type: Object, example: { id: '…', name: 'Papelería' } }) category: { id: string; name: string } | null;
  @ApiProperty({ type: String, nullable: true }) imageUrl: string | null;
  @ApiProperty() available: boolean;
}

export class SearchResultDto {
  @ApiProperty({ type: [ProductHitDto] }) items: ProductHitDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
  @ApiProperty({ type: [String], description: 'Términos buscados (normalizados)' }) terms: string[];
}

export class RecentSearchDto {
  @ApiProperty() text: string;
  @ApiProperty() at: string;
}

export class SyncStatusDto {
  @ApiProperty() indexedProducts: number;
  @ApiProperty({ type: String, nullable: true }) lastSyncAt: string | null;
}

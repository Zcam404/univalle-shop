/**
 * Infraestructura · Adaptador de entrada HTTP: productos e inventario.
 *
 * Lectura pública (los productos desactivados solo los ve un admin);
 * creación, edición y ajustes de inventario solo para administradores.
 */
import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ADJUST_STOCK,
  CREATE_PRODUCT,
  GET_PRODUCT,
  LIST_PRODUCTS,
  UPDATE_PRODUCT,
} from '../../application/ports/in/product.ports.js';
import type {
  AdjustStockPort,
  CreateProductPort,
  GetProductPort,
  ListProductsPort,
  Requester,
  UpdateProductPort,
} from '../../application/ports/in/product.ports.js';
import {
  AdjustStockDto,
  CreateProductDto,
  ListProductsQueryDto,
  ProductPageResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/catalog.dto.js';
import { AdminOnlyGuard, CurrentRequester } from './gateway-identity.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(LIST_PRODUCTS) private readonly listProducts: ListProductsPort,
    @Inject(GET_PRODUCT) private readonly getProduct: GetProductPort,
    @Inject(CREATE_PRODUCT) private readonly createProduct: CreateProductPort,
    @Inject(UPDATE_PRODUCT) private readonly updateProduct: UpdateProductPort,
    @Inject(ADJUST_STOCK) private readonly adjustStock: AdjustStockPort,
  ) {}

  /** Listado paginado con filtro por categoría y orden. */
  @Get()
  @ApiOperation({ summary: 'Listar productos' })
  @ApiResponse({ status: 200, type: ProductPageResponseDto })
  list(@Query() query: ListProductsQueryDto, @CurrentRequester() requester: Requester): Promise<ProductPageResponseDto> {
    return this.listProducts.execute({ ...query, requester });
  }

  /** Detalle de un producto. */
  @Get(':id')
  @ApiOperation({ summary: 'Ver un producto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'No existe o está desactivado.' })
  get(@Param('id') id: string, @CurrentRequester() requester: Requester): Promise<ProductResponseDto> {
    return this.getProduct.execute(id, requester);
  }

  /** Crea un producto (admin). */
  @Post()
  @UseGuards(AdminOnlyGuard)
  @ApiOperation({ summary: 'Crear producto (admin)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.createProduct.execute(dto);
  }

  /** Edita un producto o lo activa/desactiva (admin). El stock se cambia con /stock-adjustments. */
  @Patch(':id')
  @UseGuards(AdminOnlyGuard)
  @ApiOperation({ summary: 'Editar o activar/desactivar producto (admin)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    return this.updateProduct.execute({ id, ...dto });
  }

  /** Suma o resta unidades al inventario (admin). */
  @Post(':id/stock-adjustments')
  @UseGuards(AdminOnlyGuard)
  @ApiOperation({ summary: 'Ajustar inventario (admin)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiConflictResponse({ description: 'El ajuste dejaría el stock en negativo.' })
  adjust(@Param('id') id: string, @Body() dto: AdjustStockDto): Promise<ProductResponseDto> {
    return this.adjustStock.execute({ productId: id, delta: dto.delta });
  }
}

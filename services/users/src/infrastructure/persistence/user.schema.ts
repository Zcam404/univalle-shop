/**
 * Infraestructura · Esquema de MongoDB para los usuarios.
 *
 * Define cómo se guarda un usuario en la colección `users`. Las direcciones y
 * el código de verificación van embebidos en el mismo documento porque siempre
 * se leen y se modifican junto con el usuario (son parte de su agregado).
 * Este archivo es el único lugar donde existe la forma "Mongo" del usuario; el
 * resto del servicio trabaja con la entidad de dominio `User`.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Affiliation, Role } from '../../domain/value-objects/user-enums.js';

/** Dirección embebida dentro del documento del usuario. */
@Schema({ _id: false, versionKey: false })
export class AddressRecord {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: String, required: true })
  department: string;

  @Prop({ type: String, default: null })
  additionalInfo: string | null;

  @Prop({ type: Boolean, required: true })
  isDefault: boolean;
}

/** Código de verificación embebido (solo existe mientras el correo no está verificado). */
@Schema({ _id: false, versionKey: false })
export class VerificationCodeRecord {
  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Number, required: true })
  failedAttempts: number;
}

/** Documento principal de la colección `users`. */
@Schema({ collection: 'users', versionKey: false, timestamps: { createdAt: false, updatedAt: true } })
export class UserRecord {
  /** Se usa el id generado por el dominio como `_id` de MongoDB. */
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  /** Índice único: la base de datos garantiza que no haya dos cuentas con el mismo correo. */
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Object.values(Affiliation), required: true })
  affiliation: Affiliation;

  @Prop({ type: String, enum: Object.values(Role), required: true })
  role: Role;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: Boolean, required: true })
  emailVerified: boolean;

  @Prop({ type: SchemaFactory.createForClass(VerificationCodeRecord), default: null })
  verificationCode: VerificationCodeRecord | null;

  @Prop({ type: [SchemaFactory.createForClass(AddressRecord)], default: [] })
  addresses: AddressRecord[];

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserRecord);

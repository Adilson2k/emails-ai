import mongoose, { Schema, Document } from 'mongoose';

export type PlanType = 'gratuito' | 'profissional' | 'empresarial';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  plan: PlanType;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // hashed
  phone_number: { type: String },
  plan: { type: String, enum: ['gratuito', 'profissional', 'empresarial'], default: 'gratuito' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

UserSchema.pre<IUser>('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema);

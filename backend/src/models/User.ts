import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  address: string;
  publicKey: string;
  name?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true, lowercase: true },
  publicKey: { type: String, required: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);

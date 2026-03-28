import mongoose, { Schema, Document } from 'mongoose';

export interface IInheritor {
  inheritorAddress: string;
  encryptedDEK: string;
}

export interface IAsset extends Document {
  ownerAddress: string;
  name?: string;           // Optional unencrypted name for the asset
  encryptedContent: string; // Asset content encrypted with DEK
  encryptedDEK: string;     // DEK encrypted with owner's symmetric key
  inheritors: IInheritor[]; // DEK encrypted with inheritors' public keys
  createdAt: Date;
}

const AssetSchema: Schema = new Schema({
  ownerAddress: { type: String, required: true, lowercase: true },
  name: { type: String },
  encryptedContent: { type: String, required: true },
  encryptedDEK: { type: String, required: true },
  inheritors: [{
    inheritorAddress: { type: String, required: true, lowercase: true },
    encryptedDEK: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAsset>('Asset', AssetSchema);

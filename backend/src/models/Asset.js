import mongoose, { Schema, Document } from 'mongoose';
const AssetSchema = new Schema({
    ownerAddress: { type: String, required: true, lowercase: true },
    encryptedContent: { type: String, required: true },
    encryptedDEK: { type: String, required: true },
    inheritors: [{
            inheritorAddress: { type: String, required: true, lowercase: true },
            encryptedDEK: { type: String, required: true }
        }],
    createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('Asset', AssetSchema);
//# sourceMappingURL=Asset.js.map
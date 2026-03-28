import mongoose, { Schema, Document } from 'mongoose';
const UserSchema = new Schema({
    address: { type: String, required: true, unique: true, lowercase: true },
    publicKey: { type: String, required: true },
    name: { type: String },
    createdAt: { type: Date, default: Date.now }
});
export default mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map
import mongoose, { Document } from 'mongoose';
export interface IInheritor {
    inheritorAddress: string;
    encryptedDEK: string;
}
export interface IAsset extends Document {
    ownerAddress: string;
    encryptedContent: string;
    encryptedDEK: string;
    inheritors: IInheritor[];
    createdAt: Date;
}
declare const _default: mongoose.Model<IAsset, {}, {}, {}, mongoose.Document<unknown, {}, IAsset, {}, mongoose.DefaultSchemaOptions> & IAsset & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAsset>;
export default _default;
//# sourceMappingURL=Asset.d.ts.map
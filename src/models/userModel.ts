import mongoose, { Schema, Document } from 'mongoose';


export interface IUserModel extends Document {
    userId: string;
    sequenceNo: number;
    docId: string;

}

const user = new Schema({
    userId: { type: String, required: true , unique: true },
    sequenceNo: { type: Number, required: true },
    docId: { type: String, required: true },
})



export default mongoose.model<IUserModel>('userModel', user)
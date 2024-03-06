import mongoose, { Schema, Document } from 'mongoose';


export interface IUserModel extends Document {
    userId: string;
    sequence: number;
    docId: string;
    nameSpace:string

}

const user = new Schema({
    userId: { type: String, required: true , unique: true },
    sequence: { type: Number, required: true },
    docId: { type: String, required: true },
    nameSpace: { type: String, required: true },

})



export default mongoose.model<IUserModel>('user', user)
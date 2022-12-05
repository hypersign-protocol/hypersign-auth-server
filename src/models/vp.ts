import mongoose, { Schema, Document } from 'mongoose';



const vpSchema = new Schema(
    {
        "vp": {type: Object, required: true},

    })



export default mongoose.model('vp-sortner', vpSchema)
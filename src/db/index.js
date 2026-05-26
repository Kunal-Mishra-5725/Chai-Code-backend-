import express from "express";
import mongoose from "mongoose";
import { DB_NAME } from '../../constant.js';

const connectDB=async ()=>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log("Connected to MongoDB", `${connectionInstance.connection.host}`);
    }
    catch(error){
        console.log("Error:",error);
        process.exit();
    }
}
export default connectDB;

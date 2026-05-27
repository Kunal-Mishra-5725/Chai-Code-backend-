//middleware used to verify if user is there or not
//therefore we used refreshtoken and access token to logout/login user
import { ApiError } from "../utils/apierrors.js"
import { asynchandler } from "../utils/asynchandler.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.models.js"


export const verifyJWT = asynchandler(async(req,res,next)=>{
    try{
        const token = req.cookies?.accessToken || req.header           //checks if cookies have ..                                     
        ("Authorization")?.replace("Bearer","")                        //.. access data or not
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
    }

        const decodeToken=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user= await User.findById(decodeToken?._id).select
        ("-password -refreshToken")

        //if user is not found then we will throw error
        if(!user){
            throw new ApiError(401, "Invalid access token")
        }

        req.user=user;
        next()
    }
    catch(err){
        throw new ApiError(401, err?.message ||"Invalid access token")
    }
})

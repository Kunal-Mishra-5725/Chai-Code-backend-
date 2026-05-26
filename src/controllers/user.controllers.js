import { asynchandler } from "../utils/asynchandler.js"
import { ApiError } from "../utils/apierrors.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresp.js";

//to generate access token and refresh token for user 
const generateAccessAndRefreshToken=async(userId)=>{
  try{
    const user= await User.findById(userId)
    const accessToken= user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken
    await user.save({validateBeforeSave:false})
    
    return {accessToken, refreshToken}
  }
  catch(err){
    throw new ApiError(500,"Error while generating access and refresh token")
  }
}

  //adding middleware

  //adding register user controller
  //extract data from request body
const registerUser = asynchandler(async (req, res) => {
    //all this will change accoridng to the database schema
    //get use details from frontend/postman/request body
    // validate - if missing /empty
    // check if username/email already exists
    //check for images,avatar
    // upload to cloudinary
    // create obj in database
    // remove password and refresh token
    // check for user creation
    // return response
  const { fullName, email, password, username } = req.body
  // console.log(fullName, email, password, username);

  //check if any field is missing or empty
  if ([fullName, email, password, username].some(f => !f?.trim())) {
    throw new ApiError(400, "All fields are required");
  }
  // if (fullName === '') {
  //   throw new ApiError(400, 'Full name is required')
  // }
  // else if (email === '') {
  //   throw new ApiError(400, 'Email is required')
  // }
  // else if (password === '') {
  //   throw new ApiError(400, 'Password is required')
  // }
  // else if (username === '') {
  //   throw new ApiError(400, 'Username is required')
  // }


  //to find if user is already registered
  const existingUser=await User.findOne({ 
    $or: [
      { email: email },
      { username: username },
    ],
  })
  if(existingUser) {
    throw new ApiError(400, 'User already exists')
  }

  //localpath of avatar and cover image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  //to upload on cloudinary and get the url
  let coverImageLocalpath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalpath = req.files.coverImage[0].path;
  }

  //if avatar is not present throw error as its mandatory, cover image is optional
  if(!avatarLocalPath) {
    throw new ApiError(400, 'Avatar is required')
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar) { 
    throw new ApiError(400, 'Avatar is required')
  }


  //create obj and save in database
  const createdUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
    email,
    password,
    username: username.toLowerCase(),
  })


  //remove password and refresh token from the response
  const user = await User.findById(createdUser._id).select(
    '-password -refreshToken'  //type whats not needed
  )

  //if not user found throw error else return success response
  if (!user) {
    throw new ApiError(500, "user not found while registering")
  }
  return res.status(200).json(
    new ApiResponse(200, user, "user registered successfully")
  )
})

const loginUser = asynchandler(async (req, res) => {
//userbody->data
//check if user is already registered or not
//if not registered throw error
//if registered the =>
//check if password is correct or not
//if correct then generate access token and refresh token
//send cookies
//return the response

//extract data from request body
const{email,username,password}=req.body
if(!email || !password || !username) {
  throw new ApiError(400,"username,email,password are required")
}

//find user details to check in database based on email or username
  const user= await User.findOne({
    $or:[{username},{email}]
  })
  if(!user){
    throw new ApiError(404, "User does not exist, please register")
  }
  const isPasswordValid= await user.isPasswordCorrect(password)
  if(!isPasswordValide){
    throw new ApiError(401,"User credential is not correct")
  }
  //generate access token and refresh token (method created above)
  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser=User.findById(user._id).select("-password -refreshToken")

  //send data into cookies
  const options={
    httpOnly:true, //can be seen in http browser
    secure:true    //but cannot be modified in browser/frontend and only be changed by server
  }

  //send res of cookie that access,refresh token is sent
  return res.status(200)
  .cookie("accessToken",accessToken, options)
  .cookie("refreshToken",refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken,
        refreshToken
      },
      "User logged In Successfully"
    )
  )
})

const logoutUser =asynchandler(async(req,res)=>{
  //remove cookies
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{refreshToken:undefined}
    },
    {
      new:true
    }
  )

  //remove cookies from frontend
  const options={
    httpOnly:true, 
    secure:true  
  }
  return res.status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(
    new ApiResponse(200, {}, "User logged out successfully")
  )
})

export{registerUser, loginUser, logoutUser}
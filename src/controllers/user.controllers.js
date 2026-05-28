import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierrors.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiresp.js";
import jwt from "jsonwebtoken";

//to generate access token and refresh token for user
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Error while generating access and refresh token");
  }
};

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
  const { fullName, email, password, username } = req.body;
  // console.log(fullName, email, password, username);

  //check if any field is missing or empty
  if ([fullName, email, password, username].some((f) => !f?.trim())) {
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
  const existingUser = await User.findOne({
    $or: [{ email: email }, { username: username }],
  });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  //localpath of avatar and cover image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  //to upload on cloudinary and get the url
  let coverImageLocalpath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalpath = req.files.coverImage[0].path;
  }

  //if avatar is not present throw error as its mandatory, cover image is optional
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  //create obj and save in database
  const createdUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password and refresh token from the response
  const user = await User.findById(createdUser._id).select(
    "-password -refreshToken", //type whats not needed
  );

  //if not user found throw error else return success response
  if (!user) {
    throw new ApiError(500, "user not found while registering");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "user registered successfully"));
});

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
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "username oremail required");
  }

  //find user details to check in database based on email or username
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist, please register");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "User credential is not correct");
  }
  //generate access token and refresh token (method created above)
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  //send data into cookies
  const options = {
    httpOnly: true, //can be seen in http browser
    secure: true, //but cannot be modified in browser/frontend and only be changed by server
  };

  //send res of cookie that access,refresh token is sent
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully",
      ),
    );
});

const logoutUser = asynchandler(async (req, res) => {
  //remove cookies
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    },
  );

  //remove cookies from frontend
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.
    refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  //verify refresh token by jsonwebtoken
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    //now check user exists and if the refresh token given to user is valid
    const user = await User.findById(decodedToken?._id);
    
    if(!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401,'Refresh token is expired or used ')
    }
  
    //now generate new token for the user
    const options = {
      httpOnly: true,
      secure: true,
    }
    const { accessToken, newrefreshToken } = await
      generateAccessAndRefreshToken(user._id)
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(new ApiResponse(
        200,
        { accessToken, refreshToken: newrefreshToken },
        "Access token refreshed successfully",
      ));
  } catch (error) {
    throw new ApiError(401, error?.message ||"Invalid refresh token");
  }
})

const changePassword = asynchandler(async (req, res) => {
  const{oldPassword, newPassword}=req.body

  const user=await User.findById(req.user._id)
  const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
  if(!isPasswordCorrect) {
    throw new ApiError(401, "Password is incorrect")
  }

  user.password=newPassword
  await user.save({ validateBeforeSave: false })
  return res
  .status(200)
  .json(new ApiResponse(
    200, 
    {}, 
    "Password changed successfully"
  ))


})

const currentUser = asynchandler(async (req, res) => {
  return res 
  .status(200)
  .json(new ApiResponse(
    200,
    req.user,
    "Current user details fetched successfully"
  ))
})

const updateAccountDetails = asynchandler(async (req, res) => {
  const{fullName,email}=req.body

  //check if user is updating any field or not
  if(!fullName && !email) {
    throw new ApiError(400, "At least one field is required to update")
  }

  //update the details in database and return the response
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName:fullName,
        email:email
      }
    },
    { new: true }
  )
  .select("-password")  //to remove password from response

  return res
  .status(200)
  .json(new ApiResponse(
    200,
    user,
    "Account details updated successfully"
  ))
})

const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }
  const avatar= await uploadOnCloudinary(avatarLocalPath)
  
  if(!avatar) {
    throw new ApiError(500, "Error while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
      200,
      { avtarImage: avatar.url },
      "Cover image updated successfully"
    ))

})

const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required")
  }
  const coverImage= await uploadOnCloudinary(coverImageLocalPath)
  
  if(!coverImage) {
    throw new ApiError(500, "Error while uploading cover image")
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(
    200,
    { coverImage: coverImage.url },
    "Cover image updated successfully"
  ))
})

const oldAvatarDeletion= asynchandler(async (req, res) => {
  const user=await User.findById(req.user._id)
  if(user?.avatar) {
    await deleteFromCloudinary(user.avatar)
  }
  res.status(200).json(new ApiResponse(200, {}, "Old avatar deleted successfully"))
})

const getUserChannelProfile= asynchandler(async (req, res) => {

  const {username} = req.params
  if(!username?.trim) {
    throw new ApiError(400, "Username is missing")
  }
  const channel=User.aggregate([
    {$match:{
      username: username?.toLowerCase()
    }},
    {$lookup:{
      from:"subscription",
      localField:"_id",
      foreignField:"channel",
      as:"subscriber"
    }},
    {$lookup:{
      from:"subscription",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo"
    }},
    {$addFields:{
      subscriberCount:{
        $size:"$subscriber"
      },
      channelsSubscribedToCount:{
        $size:"$subscribedTo"
      },
      isSubscribed: {
        $cond:{
          if:{$in:[req.user._id,"$subscriber.subscriber"]},
          then: true,
          else: false
        }
      }
    }},
    {
      $project:{                 //this pipeline gives details of the selected things which 
        fullName:1,              //we want to show in channel profile page with value of 1
        username:1,
        subscriberCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1
      }
    }
  ])
   if(!channel?.length){
      throw new ApiError(404, "Channel doesnt exist")
    }

    return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel details fetched successfully")
    )
})

const getUserWatchHistory = asynchandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)   //get the user details based on id
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {  //to merge users with video details on watch history
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {   //to select the details we want to show in watch history page
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                },
                {         // so we use nested pipeline
                  $addFields: {
                    owner: {
                      $first: "$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    )
})

export { registerUser, loginUser, logoutUser , refreshAccessToken, currentUser , changePassword,
   updateAccountDetails, updateUserAvatar, updateUserCoverImage, oldAvatarDeletion, getUserChannelProfile
  , getUserWatchHistory}

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";
import 
{ registerUser, loginUser, logoutUser , refreshAccessToken, currentUser , changePassword,
   updateAccountDetails, updateUserAvatar, updateUserCoverImage, oldAvatarDeletion, getUserChannelProfile
  , getUserWatchHistory}
from "../controllers/user.controllers.js"
const router = Router();

//creating a route for user registration
router.route("/register").post(
  upload.fields([
    //middleware 
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  registerUser
)

//creating a route for user login
router.route("/login").post(loginUser)

//creating a route for user logout
//jwt is required to logout user because we have to verify if user is there or not
router.route("/logout").post(verifyJWT, logoutUser)

//creating a route for refreshing access token
router.route("/refresh-token").post(refreshAccessToken)

//creating a route for changing password
router.route("/change-password").post(verifyJWT, changePassword)

//creating a route for getting current user
router.route("/current-user").get(verifyJWT, currentUser)

//creating a route for updating user profile details
router.route("/update-profile").put(verifyJWT, updateAccountDetails)

//creating a route for updating user avatar
router.route("/avatar").patch(verifyJWT, upload.single('avatar'), updateUserAvatar)

//creating a route for updating user cover image
router.route("/cover-image").patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage)

//creating a route for getting user profile by username
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)  //for getting user data by username we use /c/:

//creating a route for getting to get watch history of user
router.route("/watchhistory").get(verifyJWT, getUserWatchHistory) //for searching users by username or name

export default router;

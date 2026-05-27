import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controllers.js";

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
router.route("/refresh").post(refreshAccessToken)
export default router;

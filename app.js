import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config({
  path: "./.env",
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "16kb" })); //to parse incoming JSON file requests
app.use(express.urlencoded({ limit: "16kb" })); //to parse incoming URL-encoded data
app.use(express.static("public")); //to save static files
app.use(cookieParser()); //to apply crud operation on cookies

//routes import

import userRouter from "./src/routes/user.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter);

export { app };

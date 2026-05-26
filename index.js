import dotenv from "dotenv";
dotenv.config({
  path:'./.env'
});
import { app } from "./app.js";
import connectDB from "./src/db/index.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("ERROR:", err);
  });

/*async function connectDB() {
  try {
    await mongoose.connect(`${process.env.DATABASE_URL}/${DB_NAME}`)
  }
  catch (error) {
    console.log("ERROR:",error);
    throw error;
  }
}*/

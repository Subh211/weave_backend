import connectDB from './Config/db.connection';
import app from './app';
import { v2 } from 'cloudinary';


v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//Defining PORT
const PORT = process.env.PORT || 3000;

//Listening the app to PORT with callback function
app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
  connectDB()
});

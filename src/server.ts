import connectDB from './Config/db.connection';
import app from './app';


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
  connectDB()
});

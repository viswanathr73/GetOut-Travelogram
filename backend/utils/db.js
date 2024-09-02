import mongoose from "mongoose";

const connectDB = async () =>{
    try {
      await  mongoose.connect(process.env.MONGO_URI);
      console.log('mongodb connected successfully');
      
    } catch (error) {
        console.log('db error');
        
    }
}

export default   connectDB;













//mongodb cluster  :mongodb+srv://viswanathr73:<db_password>@cluster0.szeiojs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
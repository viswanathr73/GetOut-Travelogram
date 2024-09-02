import express,{urlencoded} from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";

dotenv.config({});
const app = express();

const PORT =process.env.PORT || 8000;

app.get("/", (req,res)=>{
    return res.status(200).json({
        message: "Hello from the server!",
        success:true
    })
})
//3l0CyMHCUSQqANeR  db 
//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));

const corsOptions={
    origin: "http://localhost:5173",
    credentials: true,
}
app.use(cors(corsOptions));



app.listen(PORT,()=>{
    connectDB();
    console.log(`Server is running on port ${PORT}`);
})

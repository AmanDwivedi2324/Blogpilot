import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import blogRoutes from "./routes/blog.routes.js";

const app = express();

app.use(
    cors({
        origin:process.env.CLIENT_URL,
        credentials:true 
    })
);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.get("/", (req,res) => {
    return res.status(200).json({
        success:true,
        message:"Welcome to the API"
    })
})

app.get("/api/v1/health", (req,res) => {
    res.status(200).json({
        success:true,
        message:"BlogPilot API is running"
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/blogs", blogRoutes);

export default app;
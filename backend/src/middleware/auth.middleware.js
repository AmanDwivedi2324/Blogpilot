import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const authenticate = async (req,res,next) => {
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader?.startsWith("Bearer")){
            return res.status(401).json({
                success:false,
                message:"Authentication required" 
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET 
        );

        if(decoded.type !== "access"){
            return res.status(401).json({
                success:false, 
                message:"Invalid access token"
            });
        }

        const user = await User.findById(decoded.userId).select(
            "-password -refreshTokenHash"
        );

        if(!user){
            return res.status(401).json({
                success:false,
                message:"User no longer exists"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({
            success:false,
            message:"Invalid or expired access token"
        });
    }
};
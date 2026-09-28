import jwt from "jsonwebtoken";

export const generateAccessToken = (userId) => {
    return jwt.sign(
        {
            userId,
            type:"access"
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN 
        }
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        {
            userId,
            type:"refresh" 
        },
        process.env.REFRESH_TOKEN_SECRET, 
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN 
        }
    );
};


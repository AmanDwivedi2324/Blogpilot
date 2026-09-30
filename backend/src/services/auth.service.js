import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js"
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

const createAuthTokens = async (user) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    return {
        accessToken,
        refreshToken
    };
};

const getPublicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt
});

export const registerUser = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
        email: normalizedEmail,
    });

    if (existingUser) {
        const error = new Error("User already exists with this email");
        error.statusCode = 409;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword
    });

    const { accessToken, refreshToken } = await createAuthTokens(user);

    return {
        user: getPublicUser(user),
        accessToken,
        refreshToken
    };
};

export const loginUser = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        email: normalizedEmail,
    }).select("+password +refreshTokenHash");

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const { accessToken, refreshToken } = await createAuthTokens(user);

    return {
        user: getPublicUser(user),
        accessToken,
        refreshToken
    }
};

export const refreshUserToken = async (refreshToken) => {
    if (!refreshToken) {
        const error = new Error("Refresh token is required");
        error.statusCode = 401;
        throw error;
    }

    let decoded;

    try {
        decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch {
        const error = new Error("Invalid or expired refresh token");
        error.statusCode = 401;
        throw error;
    }

    if (decoded.type !== "refresh") {
        const error = new Error("Invalid refresh token");
        error.statusCode = 401;
        throw error;
    }

    const user = await User.findById(decoded.userId).select(
        "+refreshTokenHash"
    );

    if (!user || !user.refreshTokenHash) {
        const error = new Error("Invalid refresh token");
        error.statusCode = 401;
        throw error;
    }

    const isTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash
    );

    if (!isTokenValid) {
        const error = new Error("Invalid refresh token");
        error.statusCode = 401;
        throw error;
    }

    const tokens = await createAuthTokens(user);

    return {
        user: getPublicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    };
};

export const logoutUser = async (refreshToken) => {
    if (!refreshToken) {
        return;
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (decoded.type !== "refresh") {
            return;
        }

        await User.findByIdAndUpdate(decoded.userId, {
            $unset: {
                refreshTokenHash: 1,
            },
        });
    } catch {
        // Even if the token is invalid/expired,
        // the controller will clear the cookie.
    }
};
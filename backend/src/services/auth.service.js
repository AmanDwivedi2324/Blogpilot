import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/user.model.js"
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import { sendPasswordResetOtp } from "./mail.service.js";

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
        password: hashedPassword,
        avatar: {
            url: "",
            publicId: ""
        }
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

export const forgotPassword = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        email: normalizedEmail,
    });

    if (!user) {
        return;
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    user.resetPasswordOtpHash = otpHash;

    user.resetPasswordOtpExpires = new Date(
        Date.now() + 10 * 60 * 1000
    );

    user.resetPasswordOtpVerified = false;

    await user.save();

    await sendPasswordResetOtp({
        email: user.email,
        otp,
    });
};

export const verifyPasswordResetOtp = async ({ email, otp }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail })
        .select(
            "+resetPasswordOtpHash +resetPasswordOtpExpires +resetPasswordOtpVerified"
        );

    if (!user) {
        throw new Error("Invalid OTP");
    }

    if (
        !user.resetPasswordOtpHash ||
        !user.resetPasswordOtpExpires ||
        user.resetPasswordOtpExpires < new Date()
    ) {
        throw new Error("OTP expired or invalid");
    }

    const otpHash = hashOtp(otp);

    if (otpHash !== user.resetPasswordOtpHash) {
        throw new Error("Invalid OTP");
    }

    const resetSessionToken = crypto.randomBytes(32).toString("hex");

    const resetSessionHash = crypto
        .createHash("sha256")
        .update(resetSessionToken)
        .digest("hex");

    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordOtpVerified = true;

    user.resetPasswordSessionHash = resetSessionHash;
    user.resetPasswordSessionExpires = new Date(
        Date.now() + 10 * 60 * 1000
    );

    await user.save();

    return {
        resetSessionToken,
    };
};

const hashResetSessionToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

export const continueAfterOtp = async (resetSessionToken) => {
    const resetSessionHash = hashResetSessionToken(resetSessionToken);

    const user = await User.findOneAndUpdate(
        {
            resetPasswordSessionHash: resetSessionHash,
            resetPasswordSessionExpires: { $gt: new Date() },
            resetPasswordOtpVerified: true,
        },
        {
            $unset: {
                resetPasswordOtpHash: 1,
                resetPasswordOtpExpires: 1,
                resetPasswordOtpVerified: 1,
                resetPasswordSessionHash: 1,
                resetPasswordSessionExpires: 1,
            },
        },
        {
            new: true,
        }
    );

    if (!user) {
        throw new Error("Invalid or expired reset session");
    }

    const tokens = await createAuthTokens(user);

    return {
        user: getPublicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    };
};

export const resetPassword = async ({
    resetSessionToken,
    newPassword,
}) => {
    if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
    }

    const resetSessionHash = hashResetSessionToken(resetSessionToken);

    const user = await User.findOneAndUpdate(
        {
            resetPasswordSessionHash: resetSessionHash,
            resetPasswordSessionExpires: { $gt: new Date() },
            resetPasswordOtpVerified: true,
        },
        {
            $unset: {
                resetPasswordOtpHash: 1,
                resetPasswordOtpExpires: 1,
                resetPasswordOtpVerified: 1,
                resetPasswordSessionHash: 1,
                resetPasswordSessionExpires: 1,
            },
        },
        {
            new: true,
        }
    );

    if (!user) {
        throw new Error("Invalid or expired reset session");
    }

    user.password = newPassword;

    user.refreshTokenHash = undefined;

    await user.save();

    const tokens = await createAuthTokens(user);

    return {
        user: getPublicUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
    };
};


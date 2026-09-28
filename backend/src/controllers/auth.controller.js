import {
    registerUser,
    loginUser,
    refreshUserToken,
    logoutUser,
} from "../services/auth.service.js";

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
};

const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie(
        "refreshToken",
        refreshToken,
        refreshCookieOptions
    );
};

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const result = await registerUser({
            name,
            email,
            password,
        });

        setRefreshTokenCookie(res, result.refreshToken);

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Registration failed",
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const result = await loginUser({
            email,
            password,
        });

        setRefreshTokenCookie(res, result.refreshToken);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Login failed",
        });
    }
};

export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        const result = await refreshUserToken(refreshToken);

        setRefreshTokenCookie(res, result.refreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Token refresh failed",
        });
    }
};

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        await logoutUser(refreshToken);

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite:
                process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/api/auth",
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Logout failed",
        });
    }
};

export const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        data: {
            user: req.user,
        },
    });
};
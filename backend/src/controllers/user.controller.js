import { getCurrentUser, updateCurrentUser, } from "../services/user.service.js";

export const getMe = async (req, res) => {
    try {
        const user = await getCurrentUser(req.user._id);

        return res.status(200).json({
            success: true,
            data: {
                user,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch profile",
        });
    }
};

export const updateMe = async (req, res) => {
    try {
        console.log("========== UPDATE PROFILE ==========");
        console.log("req.body:", req.body);
        console.log("req.file:", req.file);
        console.log("req.user:", req.user);
        console.log("req.user.name:", req.user?.name);

        const { name } = req.body;

        const user = await updateCurrentUser({
            userId: req.user._id,
            name,
            avatarFile: req.file,
        });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user,
            },
        });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        console.error("STACK:", error.stack);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update profile",
        });
    }
};
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

export const getCurrentUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    return user;

}

export const updateCurrentUser = async ({ userId, name, avatarFile }) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (name !== undefined) {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            const error = new Error("Name must be at least 2 characters");
            error.statusCode = 400;
            throw error;
        }

        user.name = trimmedName;
    }

    if (avatarFile) {
        if (user.avatar?.publicId) {
            await cloudinary.uploader.destroy(
                user.avatar.publicId
            );
        }

        const uploadResult = await new Promise(
            (resolve, reject) => {
                const uploadStream =
                    cloudinary.uploader.upload_stream(
                        {
                            folder: "blogpilot/avatars",
                            resource_type: "image",
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        }
                    );

                uploadStream.end(avatarFile.buffer);
            }
        );

        user.avatar = {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
        };
    }

    await user.save();

    return user;
}
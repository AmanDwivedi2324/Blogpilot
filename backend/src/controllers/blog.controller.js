import mongoose from "mongoose";
import {
    createBlog,
    getUserBlogs,
    getBlogById,
    deleteBlog,
} from "../services/blog.service.js";

export const createBlogController = async (req, res) => {
    try {
        const {
            title,
            prompt,
            content,
            plan,
            sources,
            images,
        } = req.body;

        if (!title || !prompt || !content || !plan) {
            return res.status(400).json({
                message: "title, prompt, content and plan are required",
            });
        }

        const blog = await createBlog({
            userId: req.user._id,
            title,
            prompt,
            content,
            plan,
            sources,
            images,
        });

        return res.status(201).json({
            message: "Blog created successfully",
            blog,
        });
    } catch (error) {
        console.error("Create blog error:", error);

        return res.status(500).json({
            message: "Failed to create blog",
        });
    }
};

export const getBlogsController = async (req, res) => {
    try {
        const blogs = await getUserBlogs(req.user._id);

        return res.status(200).json({
            blogs,
        });
    } catch (error) {
        console.error("Get blogs error:", error);

        return res.status(500).json({
            message: "Failed to fetch blogs",
        });
    }
};

export const getBlogController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid blog ID",
            });
        }

        const blog = await getBlogById({
            blogId: id,
            userId: req.user._id,
        });

        if (!blog) {
            return res.status(404).json({
                message: "Blog not found",
            });
        }

        return res.status(200).json({
            blog,
        });
    } catch (error) {
        console.error("Get blog error:", error);

        return res.status(500).json({
            message: "Failed to fetch blog",
        });
    }
};

export const deleteBlogController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid blog ID",
            });
        }

        await deleteBlog({
            blogId: id,
            userId: req.user._id,
        });

        return res.status(200).json({
            message: "Blog deleted successfully",
        });
    } catch (error) {
        console.error("Delete blog error:", error);

        if (error.message === "Blog not found") {
            return res.status(404).json({
                message: error.message,
            });
        }

        return res.status(500).json({
            message: "Failed to delete blog",
        });
    }
};
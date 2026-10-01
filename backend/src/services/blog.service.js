import Blog from "../models/blog.model.js";

export const createBlog = async ({
    userId,
    title,
    prompt,
    content,
    plan,
    sources = [],
    images = [],
}) => {
    const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const slug = `${baseSlug}-${Date.now()}`;

    const blog = await Blog.create({
        userId,
        title,
        slug,
        prompt,
        content,
        plan,
        sources,
        images,
        status: "completed",
    });

    return blog;
};

export const getUserBlogs = async (userId) => {
    return Blog.find({ userId })
        .select("title slug prompt status createdAt updatedAt plan")
        .sort({ createdAt: -1 });
};

export const getBlogById = async ({ blogId, userId }) => {
    return Blog.findOne({
        _id: blogId,
        userId,
    });
};

export const deleteBlog = async ({ blogId, userId }) => {
    const blog = await Blog.findOneAndDelete({
        _id: blogId,
        userId,
    });

    if (!blog) {
        throw new Error("Blog not found");
    }

    return blog;
};
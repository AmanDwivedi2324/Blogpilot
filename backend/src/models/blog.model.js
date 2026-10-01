import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
        },
        url: {
            type: String,
            trim: true,
        },
        snippet: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const imageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
        },
        alt: {
            type: String,
            trim: true,
        },
        sectionId: {
            type: String,
            trim: true,
        },
        source: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const sectionSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        goal: {
            type: String,
            required: true,
        },
        requiresResearch: {
            type: Boolean,
            default: false,
        },
        requiresImage: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const planSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        audience: {
            type: String,
        },
        tone: {
            type: String,
        },
        sections: {
            type: [sectionSchema],
            default: [],
        },
    },
    { _id: false }
);

const blogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            trim: true,
        },

        prompt: {
            type: String,
            required: true,
            trim: true,
        },

        content: {
            type: String,
            required: true,
        },

        plan: {
            type: planSchema,
            required: true,
        },

        sources: {
            type: [sourceSchema],
            default: [],
        },

        images: {
            type: [imageSchema],
            default: [],
        },

        status: {
            type: String,
            enum: ["draft", "completed", "failed"],
            default: "completed",
        },
    },
    {
        timestamps: true,
    }
);

blogSchema.index({ userId: 1, createdAt: -1 });
blogSchema.index({ userId: 1, slug: 1 }, { unique: true });

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;
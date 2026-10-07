import express from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import {
    createBlogController,
    getBlogsController,
    getBlogController,
    deleteBlogController,
    generateBlogController
} from "../controllers/blog.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/", createBlogController);
router.post("/generate", generateBlogController);

router.get("/", getBlogsController);

router.get("/:id", getBlogController);

router.delete("/:id", deleteBlogController);


export default router;
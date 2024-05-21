import { Router } from "express";
import { createPost, getOnePost, getPost } from "../Controller/post.controller";
import upload from "../MiddleWare/multer.middleware";


const postRouter = Router();

postRouter
  .route("/")
  .post()
  .get();

postRouter
  .route("/:userId")
  .get(getPost)
  .post(upload.single('image'),createPost);

  postRouter
  .route("/postDetails/:userId")
  .get(getOnePost)

export default postRouter;

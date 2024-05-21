import { Router } from "express";
import { createPost, getOnePost, getPost } from "../Controller/post.controller";

const postRouter = Router();

postRouter
  .route("/")
  .post()
  .get();

postRouter
  .route("/:userId")
  .get(getPost)
  .post(createPost);

  postRouter
  .route("/postDetails/:userId")
  .get(getOnePost)

export default postRouter;

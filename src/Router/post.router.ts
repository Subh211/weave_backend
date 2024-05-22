import { Router } from "express";
import { createPost, deleteOnePost, getOnePost, getPost, updateOnePost } from "../controller/post.controller";
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

postRouter
  .route("/updatePost/:userId")
  .post(updateOnePost)

postRouter
  .route("/deletepost/:userId")
  .post(deleteOnePost)

export default postRouter;

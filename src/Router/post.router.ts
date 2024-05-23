import { Router } from "express";
import { createPost, deleteOnePost, getOnePost, getPost, updateOnePost } from "../controller/post.controller";
import upload from "../MiddleWare/multer.middleware";
import { jwtAuth } from "../MiddleWare/jwtAuth";



const postRouter = Router();


postRouter
  .route("/")
  .get(jwtAuth,getPost)
  .post(jwtAuth,upload.single('image'),createPost);

postRouter
  .route("/getone")
  .get(jwtAuth,getOnePost)

postRouter
  .route("/update")
  .post(jwtAuth,updateOnePost)

postRouter
  .route("/delete")
  .delete(jwtAuth,deleteOnePost)

export default postRouter;

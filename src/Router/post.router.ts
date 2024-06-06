import { Router } from "express";
import { createComment, createPost, deleteComment, deleteOnePost, getOnePost, getPost, likePost, removeLike, updateOnePost } from "../controller/post.controller";
import upload from "../MiddleWare/multer.middleware";
import { jwtAuth } from "../MiddleWare/jwtAuth";
import { savePost } from "../controller/savepost.controller";



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

postRouter
  .route("/like/:friendId")
  .post(jwtAuth,likePost)
  .delete(jwtAuth,removeLike)

postRouter
  .route("/comment/:friendId")
  .post(jwtAuth,createComment)
  .delete(jwtAuth,deleteComment)

postRouter
  .route("/savepost/:friendId")
  .get(jwtAuth,savePost)

export default postRouter;

import { Router } from "express";
import { deleteFriend, makeFriend } from "../controller/friend.controller";
import { jwtAuth } from "../MiddleWare/jwtAuth";


const friendRouter = Router();

friendRouter
    .route('/:friendId')
    .post(jwtAuth ,makeFriend)
    .delete(jwtAuth ,deleteFriend)


export default friendRouter;
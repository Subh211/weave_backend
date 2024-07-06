import { Router } from "express";
import { jwtAuth } from "../MiddleWare/jwtAuth";
import { feed, friendFeed, myFeed } from "../controller/feed.controller";

const feedRouter = Router();

feedRouter
    .route('/feed')
    .post(jwtAuth ,feed)

feedRouter
    .route('/feed/user')
    .post(jwtAuth ,myFeed)

feedRouter
    .route('/feed/:friendId')
    .post(jwtAuth,friendFeed)    

export default feedRouter;
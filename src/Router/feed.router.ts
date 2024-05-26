import { Router } from "express";
import { jwtAuth } from "../MiddleWare/jwtAuth";
import { feed } from "../controller/feed.controller";

const feedRouter = Router();

feedRouter
    .route('/feed')
    .post(jwtAuth ,feed)

    export default feedRouter;
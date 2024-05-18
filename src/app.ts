import express, { Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import errorMiddleware from './MiddleWare/error.middleware';
import AppError from './Utils/appError';

dotenv.config();


const app: Application = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Default route
app.use('/', (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(200).json({
            success: true,
            message: "Welcome to Weave"
        });
    } catch (error: any) {
        return next(new AppError("Internal Server Error", 500));
    }
});

// Routes

//if page not found
app.all('*',(req: Request, res: Response) => {
    res.status(404).send('OOPS! 404 NOT FOUND');
})


app.use(errorMiddleware)

export default app;

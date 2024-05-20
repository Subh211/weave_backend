import { Request, Response, NextFunction } from 'express';
import JWT from 'jsonwebtoken';

interface JwtPayload {
    id: string;
    email: string;
}

// Extend the Request interface to include the user property
declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
    }
}

const jwtAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = (req.cookies && req.cookies.token) || null;

    if (!token) {
        res.status(400).json({
            success: false,
            message: "Unable to authorize you"
        });
        return;
    }

    try {
        const payload = JWT.verify(token, process.env.SECRET as string) as JwtPayload;
        req.user = { id: payload.id, email: payload.email };
    } catch (error) {
        res.status(400).json({
            success: false,
            message: (error as Error).message
        });
        return;
    }

    next();
}

export { jwtAuth };

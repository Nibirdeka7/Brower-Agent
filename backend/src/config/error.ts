import { NextFunction, Request, Response } from 'express';

export function handleExpressError(err: Error, req: Request, res: Response, next: NextFunction) {
    const status = res.statusCode !== 200 ? res.statusCode : 500;
    const message = err.message || "Something went wrong!";
    res.status(status).json({ success: false, status, message });
}
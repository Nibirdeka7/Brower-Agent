import { Request, Response, NextFunction } from 'express';

export class AuthController {
    static getCurrentUser(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        return res.json(req.user);
    }

    static logout(req: Request, res: Response, next: NextFunction) {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    return next(destroyErr);
                }
                res.clearCookie('connect.sid');
                return res.json({ message: 'Logged out successfully' });
            });
        });
    }
}

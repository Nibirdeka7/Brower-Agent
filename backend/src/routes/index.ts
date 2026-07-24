import { Router, Request, Response, request, NextFunction } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.get('/', (req: Request, res: Response) => {
    res.json({ message: 'server is up' });
});

router.use('/auth', authRoutes);


export default router;

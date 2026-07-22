import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        accessType: 'offline',
        prompt: 'consent',
    })
);

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/auth/login',
        successRedirect: process.env.FRONTEND_URL,
    })
);

router.get('/me', AuthController.getCurrentUser);

router.get('/logout', AuthController.logout);

export default router;

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import session from 'express-session';
import { connectDB } from './config/db';
import { configurePassport } from './config/passport';
import { handleExpressError } from './config/error';
import mainRouter from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

async function start() {
    await connectDB();

    app.use(
        cors({
            origin: 'http://localhost:8000',
            credentials: true,
        })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/assets', express.static(path.join(process.cwd(), 'public')));

    const sess = {
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions',
        }),
        secret: process.env.COOKIE_KEY as string,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
        },
    };

    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
        sess.cookie.secure = true;
    }

    app.use(session(sess));
    app.use(passport.initialize());
    app.use(passport.session());

    configurePassport();

    app.use('/', mainRouter);

    app.use(handleExpressError);

    app.listen(PORT, () => {
        console.log(`Express server is running at http://localhost:${PORT}`);
    });
}

start();
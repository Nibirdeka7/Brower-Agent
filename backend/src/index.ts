import express, { Router } from 'express'
import dotenv from 'dotenv';
import cors from 'cors';
import { Express, NextFunction, Request, Response } from 'express';
import path from 'path';
import { handleExpressError } from './config/error';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

function start(){
    const router = Router();
    app.use(cors({
        origin: "http://localhost:8000",
        credentials: true,
    }))

    app.use(express.json())
    app.use(express.urlencoded({extended: true}))
    app.use('/assets', express.static(path.join(process.cwd(), 'public')));
    app.use(handleExpressError)

    app.get('/', async(req: Request, res: Response) => {
        res.json({message: "server is up"})
    })

    app.listen(PORT, () => {
        console.log(`Express server is running at http://localhost:${PORT}`)
    })
}

start();
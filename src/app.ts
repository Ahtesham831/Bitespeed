import express, { Express, Request, Response } from 'express';
import path from 'path';
import identifyRoutes from './routes/identify.route';

const app: Express = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/identify', identifyRoutes);

// Catch-all health route
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK' });
});

export default app;

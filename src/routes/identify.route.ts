import { Router } from 'express';
import { IdentifyController } from '../controllers/identify.controller';

const router = Router();

router.post('/', IdentifyController.identify);

export default router;

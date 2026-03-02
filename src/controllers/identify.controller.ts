import { Request, Response } from 'express';
import { IdentifyRequest } from '../types';
import { IdentityService } from '../services/identity.service';

export class IdentifyController {
    static async identify(req: Request<{}, {}, IdentifyRequest>, res: Response): Promise<void> {
        try {
            const { email, phoneNumber } = req.body;

            if (!email && !phoneNumber) {
                res.status(400).json({ error: 'At least one of email or phoneNumber must be provided.' });
                return;
            }

            // Convert phoneNumber to string if it comes as number, though schema specifies optional string
            const emailStr = email ? String(email).trim() : undefined;
            const phoneStr = phoneNumber ? String(phoneNumber).trim() : undefined;

            const result = await IdentityService.reconcile(emailStr, phoneStr);

            res.status(200).json(result);
        } catch (error) {
            console.error('Error in identify:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

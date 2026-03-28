import express, {} from 'express';
import { generateNonce, SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
router.get('/nonce', async (req, res) => {
    const nonce = generateNonce();
    res.send(nonce);
});
router.post('/verify', async (req, res) => {
    try {
        const { message, signature } = req.body;
        const siweMessage = new SiweMessage(message);
        const { data: fields } = await siweMessage.verify({ signature });
        if (!fields.nonce) {
            return res.status(422).json({ message: 'Invalid nonce' });
        }
        // Check if user exists, if not, they need to register
        let user = await User.findOne({ address: fields.address.toLowerCase() });
        const token = jwt.sign({ address: fields.address }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            address: fields.address,
            isRegistered: !!user
        });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=auth.js.map
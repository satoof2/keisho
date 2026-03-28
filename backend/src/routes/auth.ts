import express, { type Request, type Response } from 'express';
import { generateNonce, SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// In-memory nonce store with 5-minute expiry
const nonceStore = new Map<string, number>();
const NONCE_EXPIRY_MS = 5 * 60 * 1000;

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [nonce, createdAt] of nonceStore) {
    if (now - createdAt > NONCE_EXPIRY_MS) nonceStore.delete(nonce);
  }
}

router.get('/nonce', async (req: Request, res: Response) => {
  cleanExpiredNonces();
  const nonce = generateNonce();
  nonceStore.set(nonce, Date.now());
  res.send(nonce);
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { message, signature } = req.body;
    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    // Verify the nonce was actually issued by this server
    if (!fields.nonce || !nonceStore.has(fields.nonce)) {
      return res.status(422).json({ message: 'Invalid or expired nonce' });
    }
    nonceStore.delete(fields.nonce); // One-time use

    // Check if user exists, if not, they need to register
    let user = await User.findOne({ address: fields.address.toLowerCase() });
    
    const token = jwt.sign({ address: fields.address }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ 
      token, 
      address: fields.address,
      isRegistered: !!user
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

export default router;

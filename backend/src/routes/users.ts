import express, { type Response } from 'express';
import User from '../models/User.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Register/Update User
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { publicKey, name } = req.body;
    if (!publicKey) return res.status(400).json({ message: 'Public key is required' });

    let user = await User.findOne({ address: req.user!.address.toLowerCase() });
    
    if (user) {
      user.publicKey = publicKey;
      user.name = name || user.name;
      await user.save();
    } else {
      user = new User({
        address: req.user!.address.toLowerCase(),
        publicKey,
        name
      });
      await user.save();
    }

    res.json(user);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findOne({ address: req.user!.address.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// List all users
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}, 'address name publicKey');
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

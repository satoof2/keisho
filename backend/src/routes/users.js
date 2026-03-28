import express, {} from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Register/Update User
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { publicKey, name } = req.body;
        let user = await User.findOne({ address: req.user.address.toLowerCase() });
        
        if (user) {
            if (publicKey) user.publicKey = publicKey;
            if (name !== undefined) user.name = name;
            await user.save();
        }
        else {
            if (!publicKey) {
                return res.status(400).json({ message: 'Public key is required for new users' });
            }
            user = new User({
                address: req.user.address.toLowerCase(),
                publicKey,
                name
            });
            await user.save();
        }
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});
// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ address: req.user.address.toLowerCase() });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// List all users
router.get('/', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, 'address name publicKey');
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=users.js.map
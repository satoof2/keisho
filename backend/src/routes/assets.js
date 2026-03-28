import express, {} from 'express';
import Asset from '../models/Asset.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Create Asset
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { encryptedContent, encryptedDEK, name } = req.body;
        if (!encryptedContent || !encryptedDEK) {
            return res.status(400).json({ message: 'Missing encrypted content or DEK' });
        }
        const asset = new Asset({
            ownerAddress: req.user.address.toLowerCase(),
            name,
            encryptedContent,
            encryptedDEK,
            inheritors: []
        });
        await asset.save();
        res.json(asset);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get owned assets
router.get('/', authenticateToken, async (req, res) => {
    try {
        const assets = await Asset.find({ ownerAddress: req.user.address.toLowerCase() });
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get shared assets
router.get('/shared', authenticateToken, async (req, res) => {
    try {
        const assets = await Asset.find({
            'inheritors.inheritorAddress': req.user.address.toLowerCase()
        });
        res.json(assets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Add inheritor to asset
router.put('/:id/inheritor', authenticateToken, async (req, res) => {
    try {
        const { inheritorAddress, encryptedDEK } = req.body;
        const query = { ownerAddress: req.user.address.toLowerCase() };
        if (req.params.id) {
            query._id = req.params.id;
        }
        const asset = await Asset.findOne(query);
        if (!asset)
            return res.status(404).json({ message: 'Asset not found or not owner' });
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Update or add inheritor
        const existingIndex = asset.inheritors.findIndex(i => i.inheritorAddress === user.address.toLowerCase());
        if (existingIndex > -1 && asset.inheritors[existingIndex]) {
            asset.inheritors[existingIndex].encryptedDEK = encryptedDEK;
        }
        else {
            asset.inheritors.push({
                inheritorAddress: inheritorAddress.toLowerCase(),
                encryptedDEK
            });
        }
        await asset.save();
        res.json(asset);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=assets.js.map
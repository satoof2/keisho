import express, { type Response } from 'express';
import Asset from '../models/Asset.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Create Asset
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { encryptedContent, encryptedDEK, name } = req.body;
    if (!encryptedContent || !encryptedDEK) {
        return res.status(400).json({ message: 'Missing encrypted content or DEK' });
    }

    const asset = new Asset({
      ownerAddress: req.user!.address.toLowerCase(),
      encryptedContent,
      encryptedDEK,
      name,
      inheritors: []
    });

    await asset.save();
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get owned assets
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const assets = await Asset.find({ ownerAddress: req.user!.address.toLowerCase() });
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get shared assets
router.get('/shared', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const assets = await Asset.find({ 
      'inheritors.inheritorAddress': req.user!.address.toLowerCase() 
    });
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add inheritor to asset
router.put('/:id/inheritor', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { inheritorAddress, encryptedDEK } = req.body;
    if (!inheritorAddress || !encryptedDEK) {
      return res.status(400).json({ message: 'Missing inheritorAddress or encryptedDEK' });
    }

    // Prevent self-assignment
    if (inheritorAddress.toLowerCase() === req.user!.address.toLowerCase()) {
      return res.status(400).json({ message: 'Cannot assign yourself as inheritor' });
    }

    const asset = await Asset.findOne({
      _id: req.params.id as string,
      ownerAddress: req.user!.address.toLowerCase()
    });

    if (!asset) return res.status(404).json({ message: 'Asset not found or not owner' });

    // Update or add inheritor (compare against the INHERITOR's address, not owner's)
    const existingIndex = asset.inheritors.findIndex(
      i => i.inheritorAddress === inheritorAddress.toLowerCase()
    );

    if (existingIndex > -1) {
      asset.inheritors[existingIndex]!.encryptedDEK = encryptedDEK;
    } else {
      asset.inheritors.push({ 
        inheritorAddress: inheritorAddress.toLowerCase(), 
        encryptedDEK 
      });
    }

    await asset.save();
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Remove inheritor from asset
router.delete('/:id/inheritor/:address', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, address } = req.params;
    if (!id || !address) {
      return res.status(400).json({ message: 'Missing id or address' });
    }
    const asset = await Asset.findOne({
      _id: id as string,
      ownerAddress: req.user!.address.toLowerCase()
    });

    if (!asset) return res.status(404).json({ message: 'Asset not found or not owner' });

    asset.inheritors = asset.inheritors.filter(
      i => i.inheritorAddress !== (address as string).toLowerCase()
    );

    await asset.save();
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update asset name
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, ownerAddress: req.user!.address.toLowerCase() } as any,
      { name },
      { new: true }
    );
    if (!asset) return res.status(404).json({ message: 'Asset not found or not owner' });
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

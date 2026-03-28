import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import assetRoutes from './routes/assets.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 7329;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/keisho';
app.use(cors());
app.use(express.json());
// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/assets', assetRoutes);
mongoose.connect(MONGODB_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('MongoDB connection error:', err);
});
//# sourceMappingURL=index.js.map
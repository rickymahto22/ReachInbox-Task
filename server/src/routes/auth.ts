import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();

router.post('/google', async (req, res) => {
    // Receive tokens from frontend or code to exchange
    const { email, name, avatar, googleId } = req.body;

    if (!email || !googleId) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        // Upsert user
        const user = await prisma.user.upsert({
            where: { email },
            update: { name, avatar, googleId },
            create: { email, name, avatar, googleId }
        });

        res.json({ user });
    } catch (error: any) {
        console.error("Auth Error:", error);
        res.status(500).json({
            error: "Internal Server Error",
            details: error.message,
            code: error.code // Prisma error code
        });
    }
});

export default router;

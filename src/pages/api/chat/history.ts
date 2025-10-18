import { NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import connectToDatabase from '../../../lib/db';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

interface Message {
  _id: ObjectId;
  role: string;
  content: string;
  sessionId: string;
  userId: ObjectId;
  createdAt: Date;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;
    const userId = req.user!.userId;

    const { db } = await connectToDatabase();
    let messages: Message[];
    let cacheKey;

    if (sessionId && typeof sessionId === 'string') {
      // Get messages for specific session
      cacheKey = `chat_history_${userId}_${sessionId}`;
      try {
        const cachedMessages = await cacheGet(cacheKey);
        if (cachedMessages) {
          messages = JSON.parse(cachedMessages);
        } else {
          const result = await db.collection('Message').find({
            sessionId,
            userId: new ObjectId(userId),
          }).sort({ createdAt: 1 }).toArray();
          messages = result as Message[];
          await cacheSet(cacheKey, JSON.stringify(messages), 600);
        }
      } catch {
        const result = await db.collection('Message').find({
          sessionId,
          userId: new ObjectId(userId),
        }).sort({ createdAt: 1 }).toArray();
        messages = result as Message[];
      }
    } else {
      // Get all messages for user
      cacheKey = `chat_history_${userId}_all`;
      try {
        const cachedMessages = await cacheGet(cacheKey);
        if (cachedMessages) {
          messages = JSON.parse(cachedMessages);
        } else {
          const result = await db.collection('Message').find({
            userId: new ObjectId(userId),
          }).sort({ createdAt: 1 }).toArray();
          messages = result as Message[];
          await cacheSet(cacheKey, JSON.stringify(messages), 600);
        }
      } catch {
        const result = await db.collection('Message').find({
          userId: new ObjectId(userId),
        }).sort({ createdAt: 1 }).toArray();
        messages = result as Message[];
      }
    }

    res.status(200).json({
      messages: messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}export default withAuth(handler);
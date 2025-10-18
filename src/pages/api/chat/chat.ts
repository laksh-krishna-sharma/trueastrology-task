import { NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { runChatGraph } from '../../../agents/langgraphFlow';
import connectToDatabase from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;
    const userId = req.user!.userId;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    const { db } = await connectToDatabase();

    // Save user message
    await db.collection('Message').insertOne({
      _id: new ObjectId(),
      role: 'user',
      content: message,
      sessionId,
      userId: new ObjectId(userId),
      createdAt: new Date(),
    });

    const response = await runChatGraph(message);

    // Save assistant message
    await db.collection('Message').insertOne({
      _id: new ObjectId(),
      role: 'assistant',
      content: response || 'Sorry, I couldn\'t generate a response.',
      sessionId,
      userId: new ObjectId(userId),
      createdAt: new Date(),
    });

    res.status(200).json({
      response: response || 'Sorry, I couldn\'t generate a response.',
      sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
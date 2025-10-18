import { NextApiResponse } from 'next';
import { runChatGraph } from '../../../agents/langgraphFlow';
import { prisma } from '../../../lib/prisma';
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

    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        sessionId,
        userId,
      },
    });

    const response = await runChatGraph(message);

    await prisma.message.create({
      data: {
        role: 'assistant',
        content: response || 'Sorry, I couldn\'t generate a response.',
        sessionId,
        userId,
      },
    });

    res.status(200).json({
      response: response || 'Sorry, I couldn\'t generate a response.',
      sessionId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
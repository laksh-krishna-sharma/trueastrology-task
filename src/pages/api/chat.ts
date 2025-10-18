import { NextApiRequest, NextApiResponse } from 'next';
import { runChatGraph } from '../../agents/langgraphFlow';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    // Store user message
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        sessionId,
      },
    });

    // Run the LangGraph flow
    const response = await runChatGraph(message);

    // Store assistant response
    await prisma.message.create({
      data: {
        role: 'assistant',
        content: response || 'Sorry, I couldn\'t generate a response.',
        sessionId,
      },
    });

    res.status(200).json({
      response: response || 'Sorry, I couldn\'t generate a response.',
      sessionId,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
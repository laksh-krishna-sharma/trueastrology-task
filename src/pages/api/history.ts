import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { cacheGet, cacheSet } from '../../lib/redis';
import { Message } from '../../generated/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const cacheKey = `chat_history_${sessionId}`;
    let messages;

    try {
      const cachedMessages = await cacheGet(cacheKey);
      if (cachedMessages) {
        messages = JSON.parse(cachedMessages);
      } else {
        messages = await prisma.message.findMany({
          where: {
            sessionId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
        // Cache for 10 minutes
        await cacheSet(cacheKey, JSON.stringify(messages), 600);
      }
    } catch (redisError) {
      // Fallback to DB only if Redis fails
      console.warn('Redis unavailable, falling back to database:', redisError);
      messages = await prisma.message.findMany({
        where: {
          sessionId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    res.status(200).json({
      messages: messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('History API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
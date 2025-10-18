import { NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { Message } from '../../../generated/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;
    const userId = req.user!.userId;

    let messages;
    let cacheKey;

    if (sessionId && typeof sessionId === 'string') {
      // Get messages for specific session
      cacheKey = `chat_history_${userId}_${sessionId}`;
      try {
        const cachedMessages = await cacheGet(cacheKey);
        if (cachedMessages) {
          messages = JSON.parse(cachedMessages);
        } else {
          messages = await prisma.message.findMany({
            where: {
              sessionId,
              userId,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });
          await cacheSet(cacheKey, JSON.stringify(messages), 600);
        }
      } catch {
        messages = await prisma.message.findMany({
          where: {
            sessionId,
            userId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }
    } else {
      // Get all messages for user
      cacheKey = `chat_history_${userId}_all`;
      try {
        const cachedMessages = await cacheGet(cacheKey);
        if (cachedMessages) {
          messages = JSON.parse(cachedMessages);
        } else {
          messages = await prisma.message.findMany({
            where: {
              userId,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });
          await cacheSet(cacheKey, JSON.stringify(messages), 600);
        }
      } catch {
        messages = await prisma.message.findMany({
          where: {
            userId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }
    }

    res.status(200).json({
      messages: messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
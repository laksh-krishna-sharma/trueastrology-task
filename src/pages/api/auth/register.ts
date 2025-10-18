import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import connectToDatabase from '../../../lib/db';
import { hashPassword, generateToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const { db } = await connectToDatabase();

    // Check if user already exists
    const existingUser = await db.collection('User').findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

    // Create new user
    const user = {
      _id: new ObjectId(),
      fullName,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    await db.collection('User').insertOne(user);

    const token = generateToken(user._id.toString());

    res.status(201).json({
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
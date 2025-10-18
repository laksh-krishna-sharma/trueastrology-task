import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/chatbot';
const MONGODB_DB = 'chatbot';

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env');
}

if (!MONGODB_URI.includes('mongodb')) {
  throw new Error('Invalid DATABASE_URL format. Must be a MongoDB connection string.');
}

interface GlobalMongo {
  conn: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  var mongo: GlobalMongo | undefined;
}

const cached: GlobalMongo = global.mongo || { conn: null, promise: null };

if (!global.mongo) {
  global.mongo = cached;
}

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.conn) {
    return { client: cached.conn, db: cached.conn.db(MONGODB_DB) };
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = MongoClient.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return { client: cached.conn, db: cached.conn.db(MONGODB_DB) };
}

export { connectToDatabase };
export default connectToDatabase;
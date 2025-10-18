import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.DATABASE_URL!;
const MONGODB_DB = 'chatbot';

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env');
}

interface GlobalMongo {
  conn: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  // allow global reuse in dev
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
    cached.promise = MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('MongoDB connected successfully');
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection failed:', e);
    throw e;
  }

  return { client: cached.conn, db: cached.conn.db(MONGODB_DB) };
}

export { connectToDatabase };
export default connectToDatabase;

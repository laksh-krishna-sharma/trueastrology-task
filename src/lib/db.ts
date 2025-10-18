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
    const isProduction = process.env.NODE_ENV === 'production';
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // SSL/TLS configuration - more permissive for serverless
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: isProduction,
      tlsAllowInvalidHostnames: isProduction,
      // Additional options for Vercel/serverless
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: 30000,
    } as const;

    console.log('Connecting to MongoDB...', isProduction ? '(production mode)' : '(development mode)');
    cached.promise = MongoClient.connect(MONGODB_URI, opts);
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
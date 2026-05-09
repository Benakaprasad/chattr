const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db('chatapp');
  console.log('MongoDB connected');
}

function getDB() { return db; }

module.exports = { connectDB, getDB };
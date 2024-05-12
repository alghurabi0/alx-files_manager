import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;

class DBClient {
  constructor() {
    this.db = null;
    MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
      if (error) console.log(error);
      this.db = client.db(database);
      this.db.createCollection('users');
      this.db.createCollection('files');
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async findUser(email) {
    const collection = this.db.collection('users');
    const user = await collection.findOne({ email });
    if (user) {
      return user;
    }
    return false;
  }

  async createUser(email, password) {
    const collection = this.db.collection('users');
    await collection.insertOne({ email, password });
  }

  async findUserById(userId) {
    const collection = this.db.collection('users');
    const user = await collection.findOne({ _id: userId });
    if (user) {
      return user;
    }
    return false;
  }
}

const dbClient = new DBClient();
export default dbClient;

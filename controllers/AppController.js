import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export function getStatus(req, res) {
  try {
    const redis = redisClient.isAlive();
    const db = dbClient.isAlive();
    res.status(200).send({ redis, db });
  } catch (error) {
    console.log(error);
  }
}

export async function getStats(req, res) {
  try {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).send({ users, files });
  } catch (error) {
    console.log(error);
  }
}

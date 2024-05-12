import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export function getStatus(req, res) {
  res.status(200).send({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
}

export function getStats(req, res) {
  const users = dbClient.nbUsers();
  const files = dbClient.nbFiles();
  res.status(200).send({ users, files });
}

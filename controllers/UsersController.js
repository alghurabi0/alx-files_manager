import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
  }
  if (!password) {
    res.status(400).json({ error: 'Missing password' });
  }

  const hashedPassword = sha1(password);

  try {
    const user = await dbClient.findUser(email);

    if (user) {
      res.status(400).json({ error: 'Already exist' });
    } else {
      await dbClient.createUser(email, hashedPassword);
      const newUser = await dbClient.findUser(email);
      res.status(201).json({ id: newUser._id, email: newUser.email });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMe(req, res) {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  return res.status(200).send({ id: user._id, email: user.email });
}

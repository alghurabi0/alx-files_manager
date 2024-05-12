import sha1 from 'sha1';
import dbClient from '../utils/db';

export default async function postNew(req, res) {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });
    const userExists = await dbClient.getUserByEMail(email);
    if (userExists) {
      return res.status(400).send({ error: 'Already exist' });
    }
    const hashedPassword = sha1(password);
    await dbClient.createUser(email, hashedPassword);
    const user = await dbClient.getUserByEmail(email);
    return res.status(201).send({ id: user._id, email: user.email });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
}

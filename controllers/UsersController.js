import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
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
}

export default UsersController;

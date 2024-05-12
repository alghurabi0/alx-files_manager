import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default async function postUpload(req, res) {
  try {
    const { token } = req.headers;
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const {
      name, type, parentId, isPublic, data,
    } = req.body;
    if (!name) {
      return res.status(400).send({ error: 'Missing name' });
    }
    const types = ['file', 'folder', 'image'];
    if (!type || !types.includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).send({ error: 'Missing data' });
    }
    if (parentId) {
      const file = await dbClient.get(parentId);
      if (!file) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }
    const folder = {
      userId,
      name,
      type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
    };
    if (type === 'folder') {
      const add = await dbClient.addFolder(folder);
      return res.status(201).send(add);
    }
    return res.status(200).send({});
  } catch (error) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
}

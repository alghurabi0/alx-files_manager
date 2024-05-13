import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile } from 'fs';
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
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const { name, type, data } = req.body;
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
    let parentId = req.body.parentId || 0;
    parentId = parentId === '0' ? 0 : parentId;
    if (parentId) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }
    const isPublic = req.body.isPublic || false;
    const folderToUpload = {
      userId: user._id,
      name,
      type,
      parentId,
      isPublic,
    };
    if (type === 'folder') {
      await dbClient.db.collection('files').insertOne(folderToUpload);
      return res.status(201).send({
        id: folderToUpload._id,
        userId: folderToUpload.userId,
        name: folderToUpload.name,
        type: folderToUpload.type,
        isPublic: folderToUpload.isPublic,
        parentId: folderToUpload.parentId,
      });
    }
    const uid = uuidv4();
    const biData = Buffer.from(data, 'base64');
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const filePath = `${folderPath}/${uid}`;
    mkdir(folderPath, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });
    writeFile(filePath, biData, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });
    folderToUpload.localPath = filePath;
    await dbClient.db.collection('files').insertOne(folderToUpload);
    return res.status(201).send({
      id: folderToUpload._id,
      userId: folderToUpload.userId,
      name: folderToUpload.name,
      type: folderToUpload.type,
      isPublic: folderToUpload.isPublic,
      parentId: folderToUpload.parentId,
    });
  } catch (error) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
}

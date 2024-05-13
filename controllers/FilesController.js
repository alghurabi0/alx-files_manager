import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile } from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

function isValidId(id) {
  try {
    ObjectId(id);
  } catch (err) {
    return false;
  }
  return true;
}

export async function postUpload(req, res) {
  try {
    const obj = { userId: null, key: null };
    const token = req.header('X-Token');
    if (token) {
      obj.key = `auth_${token}`;
      obj.userId = await redisClient.get(obj.key);
    }
    if (!isValidId(obj.userId)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(obj.userId) });
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

export async function getShow(req, res) {
  const obj = { userId: null, key: null };
  const token = req.header('X-Token');
  if (token) {
    obj.key = `auth_${token}`;
    obj.userId = await redisClient.get(obj.key);
  }
  if (!isValidId(obj.userId)) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(obj.userId) });
  if (!user) return res.status(401).send({ error: 'Unauthorized' });

  const fileId = req.params.id;
  if (!isValidId(fileId) || !isValidId(obj.userId)) {
    return res.status(404).send({ error: 'Not found' });
  }
  let file = await dbClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(obj.userId) });
  if (!file) return res.status(404).send({ error: 'Not found' });
  file = { id: file._id, ...file };
  delete file.localPath;
  delete file._id;

  return res.status(200).send(file);
}

export async function getIndex(req, res) {
  const obj = { userId: null, key: null };
  const token = req.header('X-Token');
  if (token) {
    obj.key = `auth_${token}`;
    obj.userId = await redisClient.get(obj.key);
  }
  if (!isValidId(obj.userId)) return res.status(401).send({ error: 'Unauthorized' });
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(obj.userId) });
  if (!user) return res.status(401).send({ error: 'Unauthorized' });

  let parentId = req.query.parentId || '0';
  if (parentId === '0') parentId = 0;
  let page = Number(req.query.page) || 0;
  if (Number.isNaN(page)) page = 0;
  if (parentId !== 0 && parentId !== '0') {
    if (!isValidId(parentId)) return res.status(401).send({ error: 'Unauthorized' });
    parentId = ObjectId(parentId);
    const folder = await dbClient.db
      .collection('files')
      .findOne({ parentId: ObjectId(parentId), userId: ObjectId(obj.userId) });
    if (!folder || folder.type !== 'folder') {
      return res.status(200).send([]);
    }
  }
  const aggregate = [
    { $match: { parentId, userId: ObjectId(obj.userId) } },
    { $skip: page * 20 },
    {
      $limit: 20,
    },
  ];
  const files = await dbClient.db.collection('files').aggregate(aggregate);
  const fileList = [];
  await files.forEach((file) => {
    const processedFile = { id: file._id, ...file };
    delete processedFile.localPath;
    delete processedFile._id;
    fileList.push(processedFile);
  });
  return res.status(200).send(fileList);
}

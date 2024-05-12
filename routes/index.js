import postUpload from '../controllers/FilesController';

const express = require('express');
const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UsersController');

const router = express.Router();

router.get('/status', (req, res) => {
  AppController.getStatus(req, res);
});
router.get('/stats', (req, res) => {
  AppController.getStats(req, res);
});
router.post('/users', (req, res) => {
  UserController.postNew(req, res);
});
router.get('/connect', (req, res) => {
  AuthController.getConnect(req, res);
});
router.get('/disconnect', (req, res) => {
  AuthController.getDisconnect(req, res);
});
router.get('/users/me', (req, res) => {
  UserController.getMe(req, res);
});
router.post('/files', (req, res) => {
  postUpload(req, res);
});
module.exports = router;

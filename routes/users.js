var express = require('express');
var loginMiddleware = require('../middleware/checklogin');
var router = express.Router();
const userModel = require('../models/users');

/* GET users listing. */
router.get('/', [loginMiddleware.checkAuth, loginMiddleware.checkAdmin], async function (req, res, next) {
  result = await userModel.list(req.query);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result.users);
  }
});

/* Create User */
router.post('/create', [loginMiddleware.checkAuth, loginMiddleware.checkAdmin], async function (req, res, next) {
  try {
    let result = await userModel.create(req.body.name, req.body.email, req.body.password, req.body.user_type, req.body.is_active, req.body.clients);
    if (result.error) {
      res.sendStatus(result.error);
    } else {
      res.json(result);
    }
  } catch (e) {
    throw e;
  }
});

/* Get User By ID */
router.get('/get/:id', [loginMiddleware.checkAuth, loginMiddleware.checkAdmin], async function (req, res, next) {
  result = await userModel.get(req.params.id);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result);
  }
});

/* Update User */
router.post('/update/:id', [loginMiddleware.checkAuth, loginMiddleware.checkAdmin], async function (req, res, next) {
  try {
    let result = await userModel.update(req.params.id, req.body.name, req.body.email, req.body.password, req.body.user_type, req.body.is_active, req.body.clients);
    if (result.error) {
      res.sendStatus(result.error);
    } else {
      res.json(result);
    }
  } catch (e) {
    throw e;
  }
});

/* Delete User By ID */
router.delete('/delete/:id', [loginMiddleware.checkAuth, loginMiddleware.checkAdmin], async function (req, res, next) {
  result = await userModel.deleteUser(req.params.id);
  if (result.error) {
    res.sendStatus(token.error);
  } else {
    res.json(result);
  }
});


/* Get User. */
router.get('/clients/:user_id', [loginMiddleware.checkAuth], async function (req, res, next) {
  result = await userModel.userClients(req.params.user_id);
  if (result.error) {
    res.sendStatus(token.error);
  } else {
    res.json(result);
  }
});

module.exports = router;

const clientsModel = require('../models/clients');

const intermentRouter = require('./interment');
const assetRouter = require('./asset');

var express = require('express');
var router = express.Router();

router.use('/:clientId/interment', intermentRouter);
router.use('/:clientId/asset', assetRouter);

/* GET client listing. */
router.get('/', async function(req, res, next) {
  clients = await clientsModel.getClients();
  //console.log('clients: ' + clients);
  res.json(clients);
});

router.get('/:clientId', async function(req, res, next) {
  const id = req.params.clientId;
  result = await clientsModel.getClientById(id);
  if (result.error) {
    res.sendStatus(result.error); //TODO: Way to improve how this looks in the browser?
  } else {
    res.json(result.client);
  }
});


module.exports = router;

const assetsModel = require('../models/assets');
const clientsModel = require('../models/clients');

var express = require('express');
var router = express.Router({mergeParams: true});

/* GET asset listing. */
  router.get('/', async function(req, res, next) {
  result = await assetsModel.getAssets(req.params.clientId, req);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result.assets);
  }
});

router.get('/:intermentId', async function(req, res, next) {
  const result = await assetsModel.getAssetById(req.params.clientId, req.params.intermentId);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result.asset);
  }
});

module.exports = router;

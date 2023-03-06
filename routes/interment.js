const intermentsModel = require('../models/interments');
const clientsModel = require('../models/clients');

var express = require('express');
var router = express.Router({mergeParams: true});

/* GET interment listing. */
router.get('/', async function(req, res, next) {
  result = await intermentsModel.getInterments(req.params.clientId, req);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result.interments);
  }
});

router.get('/:intermentId', async function(req, res, next) {
  const result = await intermentsModel.getIntermentById(req.params.clientId, req.params.intermentId);
  if (result.error) {
    res.sendStatus(result.error);
  } else {
    res.json(result.interment);
  }
});

module.exports = router;

var express = require('express');
var loginMiddleware = require('../middleware/checklogin');
var router = express.Router();
const branchModel = require('../models/branches');
const clientModel = require('../models/clients');

router.get('/:prefix', [loginMiddleware.checkAuth], async function(req, res, next) {
    let result = await branchModel.getBranches(req.params.prefix)
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.branches);
    }
});

router.post('/:prefix/sections', [loginMiddleware.checkAuth], async function(req, res, next) {
    let result = await branchModel.getSections(req.params.prefix, req.body.garden)
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.sections);
    }
});

router.post('/:prefix/lots', [loginMiddleware.checkAuth], async function(req, res, next) {
    let result = await branchModel.getLots(req.params.prefix, req.body.garden, req.body.section, req.body.row_location)
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.lots);
    }
});
//getting lot info
router.post('/:prefix/lot', [loginMiddleware.checkAuth], async function(req, res, next) {
    let result = await branchModel.getLot(req.params.prefix, req.body.garden, req.body.section, req.body.lot, req.body.row_location)
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result);
    }
});

//getting first lot
router.post('/:prefix/first-lot', [loginMiddleware.checkAuth], async function(req, res, next) {
    let firstLotFound = false
    let result = {};
    let lot =  req.body.lot;
    do {
        result = await branchModel.getLot(req.params.prefix, req.body.garden, req.body.section, lot)
        if(result.lots.left_lot){
            lot = result.lots.left_lot
        }else{
            firstLotFound = true
        }
    }
    while (!firstLotFound);
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.lots);
    }
});

//getting last lot
router.post('/:prefix/last-lot', [loginMiddleware.checkAuth], async function(req, res, next) {
    let firstLotFound = false
    let result = {};
    let lot =  req.body.lot;
    do {
        result = await branchModel.getLot(req.params.prefix, req.body.garden, req.body.section, lot)
        if(result.lots.right_lot){
            lot = result.lots.right_lot
        }else{
            firstLotFound = true
        }
    }
    while (!firstLotFound);
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.lots);
    }
});

//getting grave information and client
router.post('/:prefix/grave', [loginMiddleware.checkAuth], async function(req, res, next) {
    console.log(req);   
    let result = await branchModel.getGrave(req.params.prefix, req.body)
    console.log(result); 
    
    if (result.error) {
        res.sendStatus(result.error);
    }else{
        res.json(result.lots);
    }
});
router.get('/:prefix/getGravesNotCoordinates', [loginMiddleware.checkAuth], async function (req, res, next) {
    let result = await branchModel.getGravesNotCoordinates(req.params.prefix)
    if (result.error) {
        res.sendStatus(result.error);
    } else {
        res.json(result);
    }
});
//getting grave information and client
router.post('/:prefix/getGrave', [loginMiddleware.checkAuth], async function (req, res, next) {
    let result = await branchModel.graveByKey(req.params.prefix, req.body)
    if (result.error) {
        res.sendStatus(result.error);
    } else {
        res.json(result.lots);
    }
});

//saving co-ordinates against grave information and client
router.post('/:prefix/grave/save-coordinates', [loginMiddleware.checkAuth], async function(req, res, next) {
    let prefixResult = await clientModel.getClientByPrefix(req.params.prefix)
    if(prefixResult.error){
        res.sendStatus(result.error);
    }else{
        req.body.client_id = prefixResult.client.id
        await branchModel.deleteCoordinates(req.params.prefix, req.body)
        let result = await branchModel.saveCoordinates(req.params.prefix, req.body)
        if (result.error) {
            res.sendStatus(result.error);
        }else{
            res.json(result.result);
        }
    }
});

module.exports = router;
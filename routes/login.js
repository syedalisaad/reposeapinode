const userModel = require('../models/users');
var express = require('express');
var loginMiddleware = require('../middleware/checklogin');
var router = express.Router();

/* Try Login. */
router.post('/', async function(req, res, next) {
    result = await userModel.withPwEmail(req.body.email, req.body.password);
    if (result.error) {
        res.sendStatus(result.error);
    } else { 
        let token = await userModel.generateToken(result.user)
        if (token.error) {
            res.sendStatus(token.error);
        } else {
            res.json(token.user);
        }
    }
});

/* Get User. */
router.get('/me', [loginMiddleware.checkAuth], async function(req, res, next) {
    res.json(req.user);
});

module.exports = router;

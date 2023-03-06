const userModel = require('../models/users');

async function checkAuth(req, res, next) {
    if(req.headers.authorization){
        let token = req.headers.authorization.replace('Bearer','').trim()
        let checkUser = await userModel.getUserFromToken(token)
        if (!checkUser.error) {
            req.user = checkUser.user;
            next()
        }else{
            res.status(404).send('Not Authorized');
        }
    }else{
        res.status(404).send('Not Authorized');
    }
}
async function checkAdmin(req, res, next) {
    if (req.user.user_type == 0) {
        next()
    } else {
        res.status(404).send('Not Authorized');
    }
}
const auth = {};
auth.checkAuth = checkAuth;
auth.checkAdmin = checkAdmin;

module.exports = auth;
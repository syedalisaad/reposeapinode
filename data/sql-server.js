// Get our database config directly for now.
const config = require('../config');

const sql = require('mssql');

async function getConnection() {
    var connection = null;
    try {
        connection = await sql.connect(config.sql);
    } catch (err) {
        console.log(err);
    }
    return connection;
}

async function closeConnection(connection) {
    try {
        await connection.close()
    } catch (err) {
        console.log(err);
    }
}

const db = {};
db.getConnection = getConnection;
db.closeConnection = closeConnection;
db.sql = sql;

module.exports = db;

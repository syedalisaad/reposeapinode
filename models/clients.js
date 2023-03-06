const db = require('../data/sql-server');

async function getClients()
{
    const connection = await db.getConnection();

    const request = await connection.request();

    const result = await request.query("SELECT * FROM clients");

    await db.closeConnection(connection);

    //console.dir('returning: ' + result.recordset);
    return result.recordset;
}

// Returns an object with either an 'error' child that
// holds the HTTP error code or a 'client' child
// that holds the json for the interment.
async function getClientById(clientId)
{
    const connection = await db.getConnection();

    const request = await connection.request();

    try {
        request.input("clientId", db.sql.Int, clientId);

        const result = await request.query("SELECT * FROM clients WHERE id = @clientId");
    
        await db.closeConnection(connection);
    
        if (result.recordset.length !== 1) {
            // Not found since we just didn't find a client with this id
            return { error: 404 };
        }
    
        //console.dir('returning: ' + result.recordset[0]);
        return { client: result.recordset[0] };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    }
}

async function getClientByPrefix(prefix)
{
    const connection = await db.getConnection();
    const request = await connection.request();

    try {
        request.input("prefix", db.sql.VarChar, prefix);
        const result = await request.query("SELECT * FROM clients WHERE prefix = @prefix");
        await db.closeConnection(connection);
    
        if (result.recordset.length !== 1) {
            // Not found since we just didn't find a client with this id  
            return { error: 404 };
        }
    
        //console.dir('returning: ' + result.recordset[0]);
        return { client: result.recordset[0] };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    }
}




//TODO: Seems like I've seen nicer ways to do this?
const Clients = {};
Clients.getClients = getClients;
Clients.getClientById = getClientById;
Clients.getClientByPrefix = getClientByPrefix;
module.exports = Clients;
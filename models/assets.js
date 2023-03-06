const db = require('../data/sql-server');
const clientsModel = require('../models/clients');

function getBaseQuery(client_prefix)
{
    const p_assets = client_prefix + "_assets";

    var query = "SELECT * FROM " +  p_assets;

    return query;
}

// Returns an object with either an 'error' child that
// holds the HTTP error code or an 'assets' child
// that holds the results.
async function getAssets(clientId, req)
{
    const client_result = await clientsModel.getClientById(clientId);
    if (client_result.error) {
        return { error: client_result.error };
    }
    const client = client_result.client;

    const connection = await db.getConnection();
    console.log(connection);

    const request = await connection.request();

    var queryString = getBaseQuery(client.prefix);
    //console.log(queryString);

    const result = await request.query(queryString);
    //console.log(result);
    //console.log(result.recordset);

    await db.closeConnection(connection);

    if (result.recordset.length === 0) {
        // Not found since we just didn't find the assets
        return { error: 404 };
    }

    //console.log('returning: ' + result.recordset);
    return { assets: result.recordset };
}

// Kind of a special case of the above but instead
// of a query parameter for the grave_key it's sent
// in the url as the index (it's the primary key).
//
// Returns an object with either an 'error' child that
// holds the HTTP error code or an 'asset' child
// that holds the json for the assets found.
async function getAssetById(clientId, intermentId)
{
    const client_result = await clientsModel.getClientById(clientId);
    if (client_result.error) {
        return { error: client_result.error };
    }
    const client = client_result.client;

    const connection = await db.getConnection();
    console.log(connection);

    // For a parameterized query, we'll need
    // to call request.input() to set the paramters,
    // then request.query().
    const request = await connection.request();

    var queryString = getBaseQuery(client.prefix);

    // Narrow to the given intermentId
    queryString += " WHERE grave_key = @intermentId"
    //console.log(queryString);
    try {
        request.input("intermentId", db.sql.Int, intermentId);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the interment
            return { error: 404 };
        }
        //console.log('returning: ' + result.recordset);
        return { asset: result.recordset };

    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

const Assets = {};
Assets.getAssets = getAssets;
Assets.getAssetById = getAssetById;

module.exports = Assets;
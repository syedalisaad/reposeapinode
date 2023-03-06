const db = require('../data/sql-server');
const clientsModel = require('../models/clients');

function getBaseQuery(client_prefix)
{
    const p_grave = client_prefix + "_grave";
    const p_customer = client_prefix + "_customer";

    //TODO: Is there a way to keep the customer_key columns from being combined in the result, like:
    // "customer_key": [
    //  -1450196525,
    //  -1450196525
    //],
    var query = "SELECT * FROM " +  
    p_customer + " INNER JOIN " + p_grave +
    " ON " +  p_customer + ".customer_key = " + p_grave + ".customer_key " +
    "WHERE " + p_customer + ".d_customer = 1 AND " +
    p_grave + ".to_be_assigned = 0 AND " + p_customer + ".customer_key <> 1173798471 AND " +
    "( " + p_customer + ".death_date IS NOT NULL OR " + p_customer + ".interment_date IS NOT NULL )"

    return query;
}

// Table of data for supported query parameters
const queryParams = [
    {param: 'title', table: 'customer', column: 'burial_title', type: db.sql.VarChar },
    {param: 'first_name', table: 'customer', column: 'burial_first_name', type: db.sql.VarChar },
    {param: 'middle_names', table: 'customer', column: 'burial_middle_names', type: db.sql.VarChar },
    {param: 'maiden_name', table: 'customer', column: 'burial_maiden_name', type: db.sql.VarChar },
    {param: 'last_name', table: 'customer', column: 'burial_last_name', type: db.sql.VarChar },
    {param: 'suffix', table: 'customer', column: 'burial_suffix', type: db.sql.VarChar },
    {param: 'garden', table: 'grave', column: 'garden', type: db.sql.VarChar },
    {param: 'birth_date', table: 'customer', column: 'birth_date', type: db.sql.DateTime2 },
    {param: 'death_date', table: 'customer', column: 'death_date', type: db.sql.DateTime2 },
];

// These have dependencies, etc., and are handled before the last loop
const complexParams = [
    'date_type',
    'start_date',
    'end_date',
    'order',
    'page_number',
    'page_size'
];

const dateTypes = [
    'birth_date',
    'death_date'
];

const orderParams = [
    {param: 'last_name', sql: 'ORDER BY burial_last_name, burial_first_name'},
    {param: 'first_name', sql: 'ORDER BY burial_first_name, burial_last_name'},
    {param: 'death_date', sql: 'ORDER BY death_date, burial_last_name, burial_first_name'},
    {param: 'garden', sql: 'ORDER BY garden, burial_last_name, burial_first_name'},
];

function addDate(client_prefix, params, date_param) {
    var extraSql = "";
    var value = null;
    var result = null;

    if (params[date_param]) {
        const param = params[date_param];

        // Make sure the value has format mm/dd/yyyy
        const date_regex = /^\d{2}\/\d{2}\/\d{4}$/;
    
        if (date_regex.test(param)) {
            //TODO: This allows 02/31/yyyy, so we could do more checking.
            const date_object = new Date(params[date_param]);
            if (date_object instanceof Date && !isNaN(date_object)) {
                const info = queryParams.find(obj => obj.param === params.date_type);
                const p_table = client_prefix + "_" + info.table;
                const comparison = (date_param === 'start_date') ? " >= @" : " <= @";
                extraSql += " AND " + p_table + "." + info.column + comparison + date_param;

                value = { name: date_param, type: info.type, value: date_object };

                result = { sql: extraSql, value: value };

            } else {
                console.log('Invalid ' + date_param + ' value ' + param);
                result = { error: 400 };
            }


        } else {
            console.log("invalid " + date_param + ", " + value + ", format is mm/dd/yyyy");
            result = { error: 400 };
        }
    }

    return result;
}

function parseNumber(param) {
    param_num = Number(param); // Returns NaN more strictly
    if (param_num !== NaN) {
        param_int = parseInt(param_num); // Will strip any decimal portion
        if (param_int === param_num) {
            return param_int;
        }
    }
    return NaN;
}

// Returns the extra WHERE parameters to add to the query,
// a list of objects with data to pass to request.input(),
// and the extra ORDER BY / FETCH parameters
function convertQueryParameters(params, client_prefix)
{
    var extraWhere = "";
    var orderBy = "";
    var valueList = [];
    var result = null;

    // Handle date related parameters
    // There must be a valid date_type and
    // at least one of start_date or end_date,
    // otherwise it's invalid.
    if (params.date_type) {
        if (dateTypes.includes(params.date_type)) {
            if (params.start_date || params.end_date)
            {
                // Start date
                var add_result = addDate(client_prefix, params, 'start_date');
                if (add_result) {
                    if (add_result.error) {
                        result = add_result;
                    } else if (add_result.sql != "") {
                        extraWhere += add_result.sql;
                        valueList.push(add_result.value);
                    }
                }
                
                // End date
                if (!result) {
                    add_result = addDate(client_prefix, params, 'end_date');
                    if (add_result) {
                        if (add_result.error) {
                            result = add_result;
                        } else if (add_result.sql != "") {
                            extraWhere += add_result.sql;
                            valueList.push(add_result.value);
                        }                
                    }
                }
            } else {
                console.log("date_type specified with no start or end date.");
                result = { error: 400 };
            }
        } else {
            console.log("invalid date_type, " + params['date_type']);
            result =  { error: 400 };
        }
    }

    // Handle order by parameters
    if (!result) {
        if (params.order) {
            const supported = orderParams.find(obj => obj.param === params.order);
            if (supported) {
                orderBy = supported.sql;
            } else {
                console.log("Bad order parameter: " + param);
                result = { error: 400 };
            }
        } else {
            const defaultOrder = orderParams.find(obj => obj.param === 'last_name');
            orderBy = defaultOrder.sql;
        }
    }

    // Handle page parameters
    if (!result) {
        // Need both
        if (params.page_size && params.page_number) {
            page_size = parseNumber(params.page_size);
            page_number = parseNumber(params.page_number);
            //console.log("size=" + page_size + ", num=" + page_number);
            if (isNaN(page_size) || isNaN(page_number)) {
                console.log("page_size and page_number must be numbers");
                result = { error: 400 };                            
            }
            // This seems a bit arbitrary but I do want some sort of limit
            else if ((page_size < 5) || (page_size > 1000)) {
                console.log("page_size must be >= 5 and <= 1000");
                result = { error: 400 };                            
            } else if (page_number < 1) {
                console.log("page_size must be >= 1");
                result = { error: 400 };                                            
            } else {
                const offset = (page_number-1)*page_size;
                orderBy += " OFFSET ";
                orderBy += offset;
                orderBy += " ROWS FETCH NEXT ";
                orderBy += page_size;
                orderBy += " ROWS ONLY";
            }
        } else if (params.page_size || params.page_number) {
            console.log("Both of page_size and page_number must be specified");
            result = { error: 400 };            
        }
    }

    // Handle remaining parameters
    if (!result) {
        //console.log(params);
        for (var param in params) {
            //console.log(param + " = " + params[param]);

            // Date-related parameters are handled above
            if (complexParams.includes(param)) {
                continue;
            }

            var supported = queryParams.find(obj => obj.param === param);
            if (supported) {
                const p_table = client_prefix + "_" + supported.table;
                extraWhere += " AND " + p_table + "." + supported.column + " LIKE @" + supported.param;
                // Replace any *? wildcards with %_ for SQL
                replaced = params[param].replace('*', '%');
                replaced = replaced.replace('?', '_');
                valueList.push({name: supported.param, type: supported.type, value: replaced});            
            } else {
                console.log("Bad query parameter: " + param);
                result = { error: 400 };
            }
        }

        if (!result) {
            result = { where: extraWhere, values: valueList, order: orderBy };
        }
    }

    return result;
}

// Returns an object with either an 'error' child that
// holds the HTTP error code or an 'interments' child
// that holds the results.
async function getInterments(clientId, req)
{
    const client_result = await clientsModel.getClientById(clientId);
    if (client_result.error) {
        return { error: client_result.error };
    }
    const client = client_result.client;

    const connection = await db.getConnection();
    //console.log(connection);

    const request = await connection.request();

    var queryString = getBaseQuery(client.prefix);

    // Convert any query parameters
    const params_result = convertQueryParameters(req.query, client.prefix)
    //console.log(params_result);
    if (params_result.error) {
        return { error: params_result.error };
    } else {
        if (params_result.where !== "") {
            queryString += params_result.where;
            if (params_result.values) {
                params_result.values.forEach(value => {
                    request.input(value.name, value.type, value.value);
                })
            }
        }
        if (params_result.order !== "") {
            queryString += " ";
            queryString += params_result.order;
        }
    }

    //console.log(queryString);
    const result = await request.query(queryString);
    //console.log(result);
    //console.log(result.recordset);

    await db.closeConnection(connection);

    if (result.recordset.length === 0) {
        // Not found since we just didn't find the interment
        return { error: 404 };
    }

    //console.log('returning: ' + result.recordset);
    return { interments: result.recordset };
}

// Kind of a special case of the above but instead
// of a query parameter for the grave_key it's sent
// in the url as the index (it's the primary key).
//
// Returns an object with either an 'error' child that
// holds the HTTP error code or an 'interment' child
// that holds the json for the interment.
async function getIntermentById(clientId, intermentId)
{
    const client_result = await clientsModel.getClientById(clientId);
    if (client_result.error) {
        return { error: client_result.error };
    }
    const client = client_result.client;

    const connection = await db.getConnection();
    //console.log(connection);

    // For a parameterized query, we'll need
    // to call request.input() to set the paramters,
    // then request.query().
    const request = await connection.request();

    var queryString = getBaseQuery(client.prefix);

    // Narrow to the given intermentId
    queryString += " AND grave_key = @intermentId"
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
        return { interment: result.recordset };
    
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

const Interments = {};
Interments.getInterments = getInterments;
Interments.getIntermentById = getIntermentById;

module.exports = Interments;
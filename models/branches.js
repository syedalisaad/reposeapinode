const db = require('../data/sql-server');
const clientsModel = require('../models/clients');


async function getBranches(prefix) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_grave = prefix + "_grave";
    var queryString = "select distinct garden from " + p_grave + " order by garden asc";
    try {
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        return { branches: result.recordset };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function getSections(prefix, garden) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_grave = prefix + "_grave";
    var queryString = "select distinct section from " + p_grave + " where garden=@gardenName order by section asc";
    try {
        request.input("gardenName", db.sql.VarChar, garden);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        return { sections: result.recordset };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function getLots(prefix, garden, section,row_location) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_lotinfo = prefix + "_lotinfo";
    // var queryString = "select distinct lot from " + p_lotinfo + " where garden=@gardenName and section=@sectionName ORDER BY lot ASC";

    var queryString = "select distinct lot from " + p_lotinfo + " where garden=@gardenName and section=@sectionName and (location=@rowLocation  OR location like '%both%')";
    try {
        request.input("gardenName", db.sql.VarChar, garden);
        request.input("sectionName", db.sql.VarChar, section);
        request.input("rowLocation", db.sql.VarChar, row_location);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        return { lots: result.recordset };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function getLot(prefix, garden, section, lot,row_location) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_lotinfo = prefix + "_lotinfo";
    const p_grave = prefix + "_grave";
    var queryString = `select 
    (select MIN(${p_grave}.synchronized_grave_number) as min_synchronized_grave_number from ${p_grave} where ${p_grave}.garden = @gardenName and ${p_grave}.section = @sectionName
    and ${p_grave}.lot_number = @lotNo and location_grave= @rowLocation) as min_synchronized_grave_number,
    (select MAX(${p_grave}.synchronized_grave_number) as max_synchronized_grave_number from ${p_grave} where ${p_grave}.garden = @gardenName and ${p_grave}.section = @sectionName
    and ${p_grave}.lot_number = @lotNo  and location_grave= @rowLocation) as max_synchronized_grave_number,
    ${p_lotinfo}.* from ${p_lotinfo} where garden=@gardenName and section=@sectionName and lot=@lotNo  `;
    try {
        request.input("gardenName", db.sql.VarChar, garden);
        request.input("sectionName", db.sql.VarChar, section);
        request.input("lotNo", db.sql.VarChar, lot);
        request.input("rowLocation", db.sql.VarChar, row_location);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        let res1 = await getGravesNotCoordinates(prefix, garden, section, lot);
        let res2 = await getSyncNumByLot(prefix, garden, section, lot,row_location);
        return { lots: result.recordset[0], grave_keys: res1.data, grave_num: res2.grave_num, syns_numbers: res2.data };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function getSyncNumByLot(prefix, garden, section, lot,row_location) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_grave = prefix + "_grave";
    var queryString = `select * from ${p_grave}
    where garden=@gardenName and section=@sectionName and lot_number=@lotNo and location_grave= @rowLocation order by grave_number`;
    try {
        request.input("gardenName", db.sql.VarChar, garden);
        request.input("sectionName", db.sql.VarChar, section);
        request.input("lotNo", db.sql.VarChar, lot);
        request.input("rowLocation", db.sql.VarChar, row_location);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            return { error: 404 };
        }
        let syns_numbers = [];
        let grave_numbers = [];
        for (let i = 0; i < result.recordset.length; i++) {
            syns_numbers.push(result.recordset[i].synchronized_grave_number);
            grave_numbers.push(result.recordset[i].grave_key);
        }
        return { data: syns_numbers, grave_num: grave_numbers };
    } catch (e) {
        console.log(e)
        await db.closeConnection(connection);
        return { error: e };
    } finally {
    }
}
async function getGrave(prefix, params) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_grave = prefix + "_grave";
    const p_customer = prefix + "_customer";
    var queryString = `select 
    gps.accuracy ,gps.latitude ,gps.longitude,  ${p_grave}.* from ${p_grave}
    left join gps on gps.grave_key =  ${p_grave}.grave_key
    where garden=@gardenName and section=@sectionName and lot_number=@lotNo and  synchronized_grave_number = @graveNo order by synchronized_grave_number`;
    try {
        request.input("gardenName", db.sql.VarChar, params.garden);
        request.input("sectionName", db.sql.VarChar, params.section);
        request.input("lotNo", db.sql.VarChar, params.lot);
        request.input("graveNo", db.sql.Int, params.syncronized_number);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        let names_Array = [];
        if (result.recordset.length === 0) {
            alert("No data Found");
            let names = 'No data Found';
            names_Array.push(names);
            customer_keys.push(0);
            res = { names_of_burial: names_Array, data: result.recordset[0] }
            return { lots: res };
        } else {
            let customer_keys = [];
            for (let i = 0; i < result.recordset.length; i++) {
                customer_keys.push(result.recordset[i].customer_key);
            }
            const connection2 = await db.getConnection();
            const request2 = await connection2.request();
            var queryString = `select * from ${p_customer} where customer_key in(${customer_keys})`;
            const result2 = await request2.query(queryString);
            
            console.log(result2,'test 123')

            for (let i = 0; i < result2.recordset.length; i++) {
                let burial = result2.recordset[i];
                let names = '';
                if (burial.burial_title != null) {
                    names += burial.burial_title + ' ';
                }
                if (burial.burial_first_name != null) {
                    names += burial.burial_first_name + ' ';
                }
                if (burial.burial_maiden_name != null) {
                    names += burial.burial_maiden_name + ' ';
                }
                if (burial.burial_middle_names != null) {
                    names += burial.burial_middle_names + ' ';
                }
                if (burial.burial_last_name != null) {
                    names += burial.burial_last_name + ' ';
                }
                if (burial.burial_suffix != null) {
                    names += burial.burial_suffix + ' ';
                }
                // if (result2.recordset.length - 1 !== result2.recordset.indexOf(result2.recordset[i])) {
                //     names += ' / ';
                // }
                names_Array.push(names);
            }
        }
        res = { names_of_burial: names_Array, data: result.recordset[0] }
        return { lots: res };
    } catch (e) {
        console.log(e)
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: e };
    } finally {
    }
}
async function graveByKey(prefix, params) {
    const connection = await db.getConnection();
    const request = await connection.request();
    const p_grave = prefix + "_grave";
    const p_customer = prefix + "_customer";
    var queryString = `select
  gps.accuracy ,gps.latitude ,gps.longitude,  ${p_grave}.* from ${p_grave}
    left join gps on gps.grave_key =  ${p_grave}.grave_key
    where garden=@gardenName and section=@sectionName and lot_number=@lotNo and ${p_grave}.grave_key = ${params.grave_number} order by synchronized_grave_number`;
    try {
        request.input("gardenName", db.sql.VarChar, params.garden);
        request.input("sectionName", db.sql.VarChar, params.section);
        request.input("lotNo", db.sql.VarChar, params.lot);
        // request.input("graveKey", db.sql.Int, grave_number);
        const result = await request.query(queryString);
        console.log('209-', result);
        await db.closeConnection(connection);
        let names_Array = [];
        if (result.recordset.length === 0) {
            return { error: 404 };
        } else {
            let customer_keys = [];
            for (let i = 0; i < result.recordset.length; i++) {
                customer_keys.push(result.recordset[i].customer_key);
            }
            const connection2 = await db.getConnection();
            const request2 = await connection2.request();
            var queryString = `select * from ${p_customer} where customer_key in(${customer_keys})`;
            const result2 = await request2.query(queryString);


            for (let i = 0; i < result2.recordset.length; i++) {
                let burial = result2.recordset[i];
                let names = '';
                if (burial.burial_title != null) {
                    names += burial.burial_title + ' ';
                }
                if (burial.burial_first_name != null) {
                    names += burial.burial_first_name + ' ';
                }
                if (burial.burial_maiden_name != null) {
                    names += burial.burial_maiden_name + ' ';
                }
                if (burial.burial_middle_names != null) {
                    names += burial.burial_middle_names + ' ';
                }
                if (burial.burial_last_name != null) {
                    names += burial.burial_last_name + ' ';
                }
                if (burial.burial_suffix != null) {
                    names += burial.burial_suffix + ' ';
                }
                // if (result2.recordset.length - 1 !== result2.recordset.indexOf(result2.recordset[i])) {
                //     names += ' / ';
                // }
                names_Array.push(names);
            }
        }
        res = { names_of_burial: names_Array, data: result.recordset[0] }
        return { lots: res };
    } catch (e) {
        console.log(e)
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function getGravesNotCoordinates(prefix, garden, section, lot) {
    const res = await clientsModel.getClientByPrefix(prefix);
    const p_grave = prefix + "_grave";
    try {
        const connection = await db.getConnection();
        const request = await connection.request();
        var queryString = `select * from gps where client_id =  @client_id`
        request.input("client_id", db.sql.Int, res.client.id);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            return { error: 404 };
        }

        let grave_keys = [];
        for (let i = 0; i < result.recordset.length; i++) {
            grave_keys.push(result.recordset[i].grave_key);
        }
        try {
            const connection2 = await db.getConnection();
            const request2 = await connection2.request();
            var queryString = `select * from ${p_grave} where  garden=@gardenName and section=@sectionName and lot_number=@lotNo and grave_key NOT IN  (${grave_keys}) order by grave_number`;
            request2.input("gardenName", db.sql.VarChar, garden);
            request2.input("sectionName", db.sql.VarChar, section);
            request2.input("lotNo", db.sql.VarChar, lot);
            const result2 = await request2.query(queryString);
            await db.closeConnection(connection2);
            console.log('283-', result2.recordset);
            let grave_numbers = [];
            for (let i = 0; i < result2.recordset.length; i++) {
                grave_numbers.push(result2.recordset[i].grave_key);
            }
            return { data: grave_numbers };
        } catch (ex) {
            console.log('Gaves not cordinates error :' + ex);
        }




    } catch (e) {
        console.log(e)
    }
}
async function saveCoordinates(prefix, params) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = `Insert into gps (client_id, grave_key, latitude, longitude, accuracy) VALUES (@clientId, @graveKey, @latitude, @longitude, @accuracy)`;
    try {
        request.input("latitude", db.sql.VarChar, params.latitude.toString());
        request.input("longitude", db.sql.VarChar, params.longitude.toString());
        request.input("accuracy", db.sql.VarChar, params.accuracy.toString());
        request.input("graveKey", db.sql.Int, params.grave_key);
        request.input("clientId", db.sql.Int, params.client_id);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.rowsAffected[0] === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        return { result: result.rowsAffected[0] };
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}
async function deleteCoordinates(prefix, params) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = `delete from gps where client_id=@clientId and grave_key = @graveKey`;
    try {
        request.input("graveKey", db.sql.Int, params.grave_key);
        request.input("clientId", db.sql.Int, params.client_id);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
    } catch (e) {
        await db.closeConnection(connection);
    } finally {
    }
}


const branches = {};
branches.getBranches = getBranches;
branches.getSections = getSections;
branches.getLots = getLots;
branches.getLot = getLot;
branches.getGrave = getGrave;
branches.getGravesNotCoordinates = getGravesNotCoordinates;
branches.graveByKey = graveByKey;
branches.deleteCoordinates = deleteCoordinates;
branches.saveCoordinates = saveCoordinates;

module.exports = branches;
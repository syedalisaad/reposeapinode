const db = require('../data/sql-server');
const clientsModel = require('../models/clients');
var md5 = require('md5');
var os = require('os');

async function list(params) {

    try {
        const connection = await db.getConnection();
        const request = await connection.request();

        var queryString = "Select * from coordinates_users_login";
        if (params.search != undefined && params.search) {
            queryString = `Select * from coordinates_users_login where name like '${params.search}%'`;
        }

        const result = await request.query(queryString);
        await db.closeConnection(connection);
        return { users: result.recordsets[0] };
    } catch (e) {
        await db.closeConnection(connection);
        return { error: e };
    }
}

async function create(name, email, password, user_type, is_active, clients) {
    const checkUser = await getFromEmail(email)
    if(checkUser.status==0){
        const connection = await db.getConnection();
        const request = await connection.request();
        var queryString = `Insert into coordinates_users_login (name,email,password,user_type,is_active) VALUES (@name, @email,@password,@user_type, @is_active)`;
        try {
            request.input("name", db.sql.VarChar, name);
            request.input("email", db.sql.VarChar, email);
            request.input("password", db.sql.VarChar, md5(password));
            request.input("user_type", db.sql.Int, user_type);
            request.input("is_active", db.sql.Int, is_active);
            const result = await request.query(queryString);
            if (result.rowsAffected[0] === 0) {
                return { error: 404 };
            }
            const getUser = await getFromEmail(email).then(e=>e.result.user)
            await db.closeConnection(connection);
            await deleteUserClients(getUser.ID)
            if (parseInt(user_type) == 1 && clients.length > 0) {
                const connection2 = await db.getConnection();
                const request2 = await connection2.request();
                for (let i = 0; i < clients.length; i++) {
                    const _query = `INSERT INTO coordinate_users_clients_mapping (user_id,client_id) VALUES (${getUser.ID}, ${clients[i]});`
                    await request2.query(_query);
                }
                await db.closeConnection(connection2);
            }
            return { status: 1, result: result.rowsAffected[0] };
        } catch (e) {
            console.log(e)
            await db.closeConnection(connection);
            return { status: 0, error: 400 };
        }
    }else{
        return { status: 0, error: 400 };
    }
}

async function get(id) {
    const connection = await db.getConnection();
    const request = await connection.request(); 
    var queryString = "Select * from coordinates_users_login where ID = @id"; 
    try {
        request.input("id", db.sql.Int, id);
        const userResult = await request.query(queryString);
        await db.closeConnection(connection);
        if (userResult.rowsAffected[0] === 0) {
            return { status: 0, error: 400 };
        }
        const clients = await getUserClients(userResult.recordset[0].ID)
        return { status: 1, result: { user: userResult.recordset[0], clients: clients } };
    } catch (e) {
        await db.closeConnection(connection);
        return { status: 0, error: 400 };
    }
}



async function getFromEmail(email) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "Select * from coordinates_users_login where email = @email";
    try {
        request.input("email", db.sql.VarChar, email);
        const userResult = await request.query(queryString);
        await db.closeConnection(connection);
        if (userResult.rowsAffected[0] === 0) {
            return { status: 0, error: 400 };
        }
        const clients = await getUserClients(userResult.recordset[0].ID)
        return { status: 1, result: { user: userResult.recordset[0], clients: clients } };
    } catch (e) {
        await db.closeConnection(connection);
        return { status: 0, error: 400 };
    }
}

async function getUserClients(uId) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "Select * from coordinate_users_clients_mapping where user_id = @user_id";
    try {
        request.input("user_id", db.sql.Int, uId);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        return result.recordset
    } catch (ex) {
        await db.closeConnection(connection);
        return [];
    }
}

async function deleteUserClients(uId) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "DELETE FROM coordinate_users_clients_mapping where user_id = @user_id";
    try {
        request.input("user_id", db.sql.Int, uId);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        return result.recordset
    } catch (ex) {
        await db.closeConnection(connection);
        return [];
    }
}


async function update(id, name, email, password, user_type, is_active, clients) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = `UPDATE coordinates_users_login SET name = @name, email = @email,password = @password,user_type = @user_type,is_active = @is_active WHERE ID = @id;`;
    try {
        request.input("id", db.sql.Int, id);
        request.input("name", db.sql.VarChar, name);
        request.input("email", db.sql.VarChar, email);
        request.input("password", db.sql.VarChar, md5(password));
        request.input("user_type", db.sql.Int, user_type);
        request.input("is_active", db.sql.Int, is_active);

        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.rowsAffected[0] === 0) {
            return { error: 404 };
        }
        await deleteUserClients(id)
        if (parseInt(user_type) == 1 && clients.length > 0) {
            const connection2 = await db.getConnection();
            const request2 = await connection2.request();
            for (let i = 0; i < clients.length; i++) {
                const _query = `INSERT INTO coordinate_users_clients_mapping (user_id,client_id) VALUES (${id}, ${clients[i]});`
                await request2.query(_query);
            }
            await db.closeConnection(connection2);
        }
        return { status: 1, result: result.rowsAffected[0] };
    } catch (e) {
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

async function deleteUser(id) {
    await deleteUserClients(id)
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "DELETE FROM coordinates_users_login WHERE ID = @id";
    try {
        request.input("id", db.sql.Int, id);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        return { status: 1, result: result.rowsAffected[0] };
    } catch (e) {
        await db.closeConnection(connection);
        return { status: 0, error: 400 };
    }
}

async function withPwEmail(email, pw) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "Select * from coordinates_users_login where is_active = 1 and email = @userEmail and password = @userPassword";
    try {
        request.input("userEmail", db.sql.VarChar, email);
        request.input("userPassword", db.sql.VarChar, md5(pw));
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        //console.log('returning: ' + result.recordset);
        return { user: result.recordset[0] };

    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

async function generateToken(user) {
    let token = md5(user.email + (Math.floor(Date.now() / 1000)))
    let ip = getIPAddress()
    let userId = parseInt(user.ID)
    let queryString = "Update coordinates_users_login set auth_token=@authToken, last_login_ip=@ip, last_login=GETDATE() where ID=@userId"
    try {
        const connection = await db.getConnection();
        const request = await connection.request();
        request.input("authToken", db.sql.VarChar, token);
        request.input("ip", db.sql.VarChar, ip);
        request.input("userId", db.sql.Int, userId);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.affectedRows === 0) {
            // Not found since we were unable to update the token
            return { error: 404 };
        } else {
            user.auth_token = token
            user.last_login_ip = ip
            return { user: user }
        }
    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

async function getUserFromToken(token) {
    const connection = await db.getConnection();
    const request = await connection.request();
    var queryString = "Select * from coordinates_users_login where is_active = 1 and auth_token=@authToken";
    try {
        request.input("authToken", db.sql.VarChar, token);
        const result = await request.query(queryString);
        await db.closeConnection(connection);
        if (result.recordset.length === 0) {
            // Not found since we just didn't find the user
            return { error: 404 };
        }
        //console.log('returning: ' + result.recordset);
        return { user: result.recordset[0] };

    } catch (e) {
        // Bad request because the id was likely invalid
        await db.closeConnection(connection);
        return { error: 400 };
    } finally {
    }
}

function getIPAddress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return '0.0.0.0';
}

async function userClients(id) {
    try {
        const user = await get(id);
        let result2;
        if (user.result.user.user_type == 0) {
            result2 = clientsModel.getClients();
        } else {
            const connection = await db.getConnection();
            const request = await connection.request();
            var queryString = "Select * from coordinate_users_clients_mapping where user_id = @user_id";
            request.input("user_id", db.sql.Int, id);
            const result = await request.query(queryString);
            await db.closeConnection(connection);
            let client_ids = [];
            for (let i = 0; result.recordset.length > i; i++) {
                client_ids.push(result.recordset[i].client_id)
            }
            const connection2 = await db.getConnection();
            const request2 = await connection2.request();
            const _query = `Select * from clients where id in(${client_ids})`
            res = await request2.query(_query);
            await db.closeConnection(connection2);
            result2 = res.recordset
        }
        return result2;
    } catch (ex) {
        return [];
    }
}


const login = {};
login.list = list;
login.create = create;
login.get = get;
login.userClients = userClients;
login.getFromEmail = getFromEmail;
login.getUserClients = getUserClients;
login.update = update;
login.deleteUser = deleteUser;
login.withPwEmail = withPwEmail;
login.getUserFromToken = getUserFromToken;
login.generateToken = generateToken;

module.exports = login;
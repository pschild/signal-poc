const database = require('./Database');

module.exports = class UserManager {

    constructor() {

    }

    register(data) {
        return database.createUser(data)
            .then(() => this.getByName(data.username));
    }

    getByName(name) {
        return database.getUserByName(name);
    }

    getById(id) {
        return database.getUserById(id);
    }

    getAll() {
        return database.getAllUsers();
    }

};
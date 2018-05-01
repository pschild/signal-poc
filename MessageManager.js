const database = require('./Database');

module.exports = class MessageManager {

    constructor() {

    }

    createMessage(data) {
        return database.createMessage(data);
    }

    getAllByRegistrationId(registrationId) {
        return database.getAllMessagesByRegistrationId(registrationId);
    }

};
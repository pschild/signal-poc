const database = require('./Database');

module.exports = class MessageManager {

    constructor() {

    }

    createMessage(data) {
        return database.createMessage(data);
    }

    getAllUnreadByRegistrationId(registrationId) {
        return database.getAllUnreadMessagesByRegistrationId(registrationId);
    }

    updateFetchedStatus(id) {
        return database.updateFetchedStatus(id);
    }

};
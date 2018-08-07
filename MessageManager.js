const database = require('./Database');

module.exports = class MessageManager {

    constructor() {

    }

    createMessage(data) {
        return database.createMessage(data);
    }

    getAllUnreadByRegistrationId(sourceRegistrationId, recipientRegistrationId) {
        return database.getAllUnreadMessagesByRegistrationId(sourceRegistrationId, recipientRegistrationId);
    }

    updateFetchedStatus(id) {
        return database.updateFetchedStatus(id);
    }

};
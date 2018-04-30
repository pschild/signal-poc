const database = require('./Database');

module.exports = class PreKeyManager {

    constructor() {

    }

    createPreKeys(data) {
        return database.createPreKeysForUser(data.preKeyBundle.registrationId, data.preKeyBundle.preKeys);
    }

    getFirstPreKeyByRegistrationId(registrationId) {
        let result = null;
        return database.getFirstPreKeyByRegistrationId(registrationId)
            .then((firstPreKey) => {
                if (firstPreKey) {
                    result = firstPreKey;
                    return database.removePreKey(firstPreKey.registrationId, firstPreKey.keyId);
                } else {
                    return firstPreKey;
                }
            })
            .then(() => result);
    }

};
function SignalProtocolStore() {
    this.store = localStorage;
}

SignalProtocolStore.prototype = {
    Direction: {
        SENDING: 1,
        RECEIVING: 2,
    },

    getIdentityKeyPair: function () {
        return Promise.resolve(this.get('identityKey'));
    },
    getLocalRegistrationId: function () {
        return Promise.resolve(this.get('registrationId'));
    },
    put: function (key, value) {
        if (key === undefined || value === undefined || key === null || value === null)
            throw new Error("Tried to store undefined/null");

        let valueToSave;
        if (key.startsWith(`25519KeypreKey`)) { // e.g. 25519KeypreKey0
            valueToSave = JSON.stringify({
                pubKey: signalUtil.arrayBufferToBase64(value.pubKey),
                privKey: signalUtil.arrayBufferToBase64(value.privKey)
            });
        } else if (key.startsWith(`25519KeysignedKey`)) { // e.g. 25519KeysignedKey1203
            valueToSave = JSON.stringify({
                pubKey: signalUtil.arrayBufferToBase64(value.pubKey),
                privKey: signalUtil.arrayBufferToBase64(value.privKey)
            });
        } else if (key === `identityKey`) { // identityKey
            valueToSave = JSON.stringify({
                pubKey: signalUtil.arrayBufferToBase64(value.pubKey),
                privKey: signalUtil.arrayBufferToBase64(value.privKey)
            });
        } else if (key.startsWith(`identityKey`)) { // e.g. identityKeyalice
            valueToSave = signalUtil.arrayBufferToBase64(value);
        } else if (key === `registrationId`) { // registrationId
            valueToSave = value;
        } else if (key.startsWith(`session`)) { // e.g. sessionalice.0
            valueToSave = value;
        } else {
            throw new Error(`Tried to set untreated key ${key}`);
        }

        this.store.setItem(key, valueToSave);
    },
    get: function (key, defaultValue) {
        if (key === null || key === undefined)
            throw new Error("Tried to get value for undefined/null key");
        if (key in this.store) {
            let item = this.store.getItem(key);
            let valueToReturn;
            if (key.startsWith(`25519KeypreKey`)) { // e.g. 25519KeypreKey0
                item = JSON.parse(item);
                valueToReturn = {
                    pubKey: signalUtil.base64ToArrayBuffer(item.pubKey),
                    privKey: signalUtil.base64ToArrayBuffer(item.privKey)
                };
            } else if (key.startsWith(`25519KeysignedKey`)) { // e.g. 25519KeysignedKey1203
                item = JSON.parse(item);
                valueToReturn = {
                    pubKey: signalUtil.base64ToArrayBuffer(item.pubKey),
                    privKey: signalUtil.base64ToArrayBuffer(item.privKey)
                };
            } else if (key === `identityKey`) { // identityKey
                item = JSON.parse(item);
                valueToReturn = {
                    pubKey: signalUtil.base64ToArrayBuffer(item.pubKey),
                    privKey: signalUtil.base64ToArrayBuffer(item.privKey)
                };
            } else if (key.startsWith(`identityKey`)) { // e.g. identityKeyalice
                valueToReturn = signalUtil.base64ToArrayBuffer(item);
            } else if (key === `registrationId`) { // registrationId
                valueToReturn = Number.parseInt(item);
            } else if (key.startsWith(`session`)) { // e.g. sessionalice.0
                valueToReturn = item;
            } else {
                throw new Error(`Tried to get untreated key ${key}`);
            }
            return valueToReturn;
        } else {
            return defaultValue;
        }
    },
    remove: function (key) {
        if (key === null || key === undefined)
            throw new Error("Tried to remove value for undefined/null key");
        this.store.removeItem(key);
    },

    isTrustedIdentity: function (identifier, identityKey, direction) {
        if (identifier === null || identifier === undefined) {
            throw new Error("tried to check identity key for undefined/null key");
        }
        if (!(identityKey instanceof ArrayBuffer)) {
            throw new Error("Expected identityKey to be an ArrayBuffer");
        }
        var trusted = this.get('identityKey' + identifier);
        if (trusted === undefined) {
            return Promise.resolve(true);
        }
        return Promise.resolve(signalUtil.toString(identityKey) === signalUtil.toString(trusted));
    },
    loadIdentityKey: function (identifier) {
        if (identifier === null || identifier === undefined)
            throw new Error("Tried to get identity key for undefined/null key");
        return Promise.resolve(this.get('identityKey' + identifier));
    },
    saveIdentity: function (identifier, identityKey) {
        if (identifier === null || identifier === undefined)
            throw new Error("Tried to put identity key for undefined/null key");

        var address = new libsignal.SignalProtocolAddress.fromString(identifier);

        if (!(identityKey instanceof ArrayBuffer)) {
            identityKey = signalUtil.toArrayBuffer(identityKey);
        }

        var existing = this.get('identityKey' + address.getName());
        this.put('identityKey' + address.getName(), identityKey)

        if (existing && signalUtil.toString(identityKey) !== signalUtil.toString(existing)) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve(false);
        }

    },

    /* Returns a prekeypair object or undefined */
    loadPreKey: function (keyId) {
        var res = this.get('25519KeypreKey' + keyId);
        if (res !== undefined) {
            res = {pubKey: res.pubKey, privKey: res.privKey};
        }
        return Promise.resolve(res);
    },
    storePreKey: function (keyId, keyPair) {
        return Promise.resolve(this.put('25519KeypreKey' + keyId, keyPair));
    },
    removePreKey: function (keyId) {
        return Promise.resolve(this.remove('25519KeypreKey' + keyId));
    },

    /* Returns a signed keypair object or undefined */
    loadSignedPreKey: function (keyId) {
        var res = this.get('25519KeysignedKey' + keyId);
        if (res !== undefined) {
            res = {pubKey: res.pubKey, privKey: res.privKey};
        }
        return Promise.resolve(res);
    },
    storeSignedPreKey: function (keyId, keyPair) {
        return Promise.resolve(this.put('25519KeysignedKey' + keyId, keyPair));
    },
    removeSignedPreKey: function (keyId) {
        return Promise.resolve(this.remove('25519KeysignedKey' + keyId));
    },

    loadSession: function (identifier) {
        return Promise.resolve(this.get('session' + identifier));
    },
    storeSession: function (identifier, record) {
        return Promise.resolve(this.put('session' + identifier, record));
    },
    removeSession: function (identifier) {
        return Promise.resolve(this.remove('session' + identifier));
    },
    removeAllSessions: function (identifier) {
        for (var id in this.store) {
            if (id.startsWith('session' + identifier)) {
                this.remove(id);
            }
        }
        return Promise.resolve();
    }
};
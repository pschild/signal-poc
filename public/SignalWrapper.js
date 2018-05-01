class SignalWrapper {

    constructor() {
        this.keyHelper = libsignal.KeyHelper;
    }

    generateIdentity(store) {
        return Promise.all([
            this.keyHelper.generateIdentityKeyPair(),
            this.keyHelper.generateRegistrationId(),
        ]).then(result => {
            return Promise.all([
                store.put('identityKey', result[0]),
                store.put('registrationId', result[1])
            ]);
        });
    }

    generatePreKeyBundle(store, signedPreKeyId) {
        return Promise.all([
            store.getIdentityKeyPair(),
            store.getLocalRegistrationId()
        ]).then(result => {
            let identity = result[0];
            let registrationId = result[1];

            const onetimePrekeyPromises = [];
            // important to begin at 1 instead of 0, because of libsignal-protocol.js line 36119!
            for (let keyId = 1; keyId < 6; keyId++) { // TODO: sind 5 genug?
                onetimePrekeyPromises.push(this.keyHelper.generatePreKey(keyId));
            }

            return Promise.all([
                this.keyHelper.generateSignedPreKey(identity, signedPreKeyId),
                ...onetimePrekeyPromises
            ]).then(keys => {
                let signedPreKey = keys[0];
                store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);

                let preKeys = keys.slice(1);
                let preKeysPublicOnly = preKeys.map((preKey) => {
                    return {
                        keyId: preKey.keyId,
                        publicKey: preKey.keyPair.pubKey
                    }
                });
                preKeys.forEach(preKey => store.storePreKey(preKey.keyId, preKey.keyPair));

                return {
                    identityKey: identity.pubKey,
                    registrationId: registrationId,
                    preKeys: preKeysPublicOnly,
                    signedPreKey: {
                        keyId: signedPreKeyId,
                        publicKey: signedPreKey.keyPair.pubKey,
                        signature: signedPreKey.signature
                    }
                };
            });
        });
    }

    preKeyToString(bundle) {
        bundle.identityKey = signalUtil.arrayBufferToBase64(bundle.identityKey);
        bundle.preKeys.forEach(preKey => {
            preKey.publicKey = signalUtil.arrayBufferToBase64(preKey.publicKey);
        });
        bundle.signedPreKey.publicKey = signalUtil.arrayBufferToBase64(bundle.signedPreKey.publicKey);
        bundle.signedPreKey.signature = signalUtil.arrayBufferToBase64(bundle.signedPreKey.signature);
        return bundle;
    }

    preKeyToArrayBuffer(bundle) {
        bundle.identityKey = signalUtil.base64ToArrayBuffer(bundle.identityKey);
        bundle.preKeys.forEach(preKey => {
            preKey.publicKey = signalUtil.base64ToArrayBuffer(preKey.publicKey);
        });
        bundle.signedPreKey.publicKey = signalUtil.base64ToArrayBuffer(bundle.signedPreKey.publicKey);
        bundle.signedPreKey.signature = signalUtil.base64ToArrayBuffer(bundle.signedPreKey.signature);
        return bundle;
    }

}
class Client {

    constructor() {
        this.logger = new Logger();
        this.signalWrapper = new SignalWrapper();
        this.store = new SignalProtocolStore();

        this.$registrationNameField = document.querySelector('#registration-name');
        this.$sendRegistrationButton = document.querySelector('#send-registration-btn');

        this.$userList = document.querySelector('#user-list');

        this.$chat = document.querySelector('#chat');
        this.$messageField = document.querySelector('#message');
        this.$sendMessageButton = document.querySelector('#send-message-btn');
        this.$recipientName = document.querySelector('#recipient-name');

        this.$retrieveMessagesButton = document.querySelector('#retrieve-messages-btn');

        this.$clearEverythingButton = document.querySelector('#clear-everything-btn');

        this.addEventListeners();
    }

    addEventListeners() {
        this.$clearEverythingButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });

        this.$sendRegistrationButton.addEventListener('click', () => {
            const username = this.$registrationNameField.value;
            if (username) {
                this.registerUser(username);
            }
        });

        this.$sendMessageButton.addEventListener('click', () => {
            this.encryptMessage(this.$messageField.value)
                .then(ciphertext => {
                    console.log(ciphertext);
                    return this.sendMessage(ciphertext);
                });
        });
    }

    init() {
        this.loadUserList();
    }

    loadUserList() {
        this.$userList.innerHTML = '';
        axios({method: 'get', url: `http://localhost:8081/users`})
            .then(response => {
                const users = response.data;
                users.forEach(user => {
                    let listItem = document.createElement('li');
                    let label = document.createTextNode(user.name);
                    listItem.appendChild(label);
                    listItem.dataset.id = user.id;
                    listItem.dataset.name = user.name;
                    listItem.addEventListener('click', (event) => {
                        this.openChatForUsername(event.target.dataset.id, event.target.dataset.name);
                    });
                    this.$userList.appendChild(listItem);
                });
            });
    }

    registerUser(username) {
        this.signalWrapper.generateIdentity(this.store)
            .then(() => {
                const signedKeyId = signalUtil.randomId(); // TODO: besser UUID?
                return this.signalWrapper.generatePreKeyBundle(this.store, signedKeyId);
            })
            .then((preKeyBundle) => {
                return axios({
                    method: 'post',
                    url: 'http://localhost:8081/user',
                    data: {
                        username: username,
                        preKeyBundle: this.signalWrapper.preKeyToString(preKeyBundle),
                    }
                });
            })
            .then(response => {
                const user = response.data;
                this.logger.info('registration result', user);
                this.logger.info('registrationId', user.registrationId);
                this.logger.info('identityKey', user.identityKey);
                this.loadUserList();
            });
    }

    openChatForUsername(recipientId, recipientName) {
        this.$chat.style.display = 'block';
        this.$recipientName.innerHTML = recipientName;

        this.recipientAddress = new libsignal.SignalProtocolAddress(recipientName, 0); // TODO: deviceId is always 0 atm

        this.retrieveReceiverInfo(recipientId)
            .then(user => this.createSession(user));
    }

    retrieveReceiverInfo(recipientId) {
        return axios({method: 'get', url: `http://localhost:8081/user/${recipientId}`})
            .then(response => {
                const user = response.data;
                this.logger.info('retrieve user result', user);
                this.logger.info('name', user.name);
                this.logger.info('registrationId', user.registrationId);
                this.logger.info('identityKey', user.identityKey);
                return response.data;
            });
    }

    createSession(recipient) {
        let builder = new libsignal.SessionBuilder(this.store, this.recipientAddress);

        let keyBundle = {
            identityKey: signalUtil.base64ToArrayBuffer(recipient.identityKey), // public!
            registrationId: recipient.registrationId,
            signedPreKey: {
                keyId: recipient.signedPreKeyId,
                publicKey: signalUtil.base64ToArrayBuffer(recipient.pubSignedPreKey), // public!
                signature: signalUtil.base64ToArrayBuffer(recipient.signature)
            }
        };

        if (recipient.preKey) {  // optional!
            keyBundle.preKey = {
                keyId: recipient.preKey.keyId,
                publicKey: signalUtil.base64ToArrayBuffer(recipient.preKey.pubPreKey)
            }
        }

        return builder.processPreKey(keyBundle);
    }

    encryptMessage(rawMessage) {
        let senderSessionCipher = new libsignal.SessionCipher(this.store, this.recipientAddress);
        let messageAsArrayBuffer = signalUtil.toArrayBuffer(rawMessage);
        return senderSessionCipher.encrypt(messageAsArrayBuffer);
    }

    sendMessage(ciphertext) {
        return axios({
            method: 'post',
            url: 'http://localhost:8081/message',
            data: {
                recipientRegistrationId: ciphertext.registrationId,
                ciphertext: signalUtil.stringToBase64(ciphertext.body)
            }
        });
    }

}
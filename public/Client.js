class Client {

    constructor() {
        this.socket = null;
        this.logger = new Logger();
        this.signalWrapper = new SignalWrapper();
        this.store = new SignalProtocolStore();
        this.chatPartnerAddress = undefined;
        this.chatPartnerRegistrationId = undefined;

        this.$registrationNameField = document.querySelector('#registration-name');
        this.$sendRegistrationButton = document.querySelector('#send-registration-btn');
        this.$registerAliceButton = document.querySelector('#register-alice-btn');
        this.$registerBobButton = document.querySelector('#register-bob-btn');

        this.$userList = document.querySelector('#user-list');

        this.$chat = document.querySelector('#chat');
        this.$messageField = document.querySelector('#message');
        this.$sendMessageButton = document.querySelector('#send-message-btn');
        this.$chatPartnerName = document.querySelector('#chat-partner-name');
        this.$chatHistory = document.querySelector('#chat-history');

        this.$retrieveMessagesButton = document.querySelector('#retrieve-messages-btn');

        this.$clearEverythingButton = document.querySelector('#clear-everything-btn');

        this.addEventListeners();
        this.initializeSocket();
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

        this.$retrieveMessagesButton.addEventListener('click', () => {
            this.store.getLocalRegistrationId()
                .then(myRegistrationId => this.retrieveMessages(this.chatPartnerRegistrationId, myRegistrationId))
                .then(messages => {
                    if (!messages) {
                        // TODO
                    }
                    let promises = messages.map(message => this.decryptMessage(message));
                    return Promise.all(promises);
                });
        });

        this.$registerAliceButton.addEventListener('click', () => {
            this.registerUser('alice');
        });

        this.$registerBobButton.addEventListener('click', () => {
            this.registerUser('bob');
        });
    }

    initializeSocket() {
        this.socket = io();
        this.socket.on('load-user-list', this.loadUserList.bind(this));
        this.socket.on('new-user-registered', this.loadUserList.bind(this));
    }

    setLoggedInUser(user) {
        localStorage.setItem('loggedInUser', JSON.stringify(user));
    }

    getLoggedInUser() {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    }

    loadUserList() {
        this.$userList.innerHTML = '';
        axios({method: 'get', url: `http://localhost:8081/users`})
            .then(response => {
                const users = response.data;
                const loggedInUser = this.getLoggedInUser();
                users.forEach(user => {
                    if (loggedInUser && user.name === loggedInUser.name) {
                        return;
                    }

                    let listItem = document.createElement('li');
                    let label = document.createTextNode(user.name);
                    listItem.appendChild(label);
                    listItem.dataset.id = user.id;
                    listItem.dataset.name = user.name;
                    listItem.dataset.registrationId = user.registrationId;
                    listItem.addEventListener('click', (event) => {
                        this.openChatForUsername(
                            event.target.dataset.id,
                            event.target.dataset.name,
                            event.target.dataset.registrationId
                        );
                    });
                    this.$userList.appendChild(listItem);
                });
            });
    }

    getUserByName(username) {
        return axios({method: 'get', url: `http://localhost:8081/user/name/${username}`})
            .then(response => {
                if (response.data) {
                    throw new Error(`A user with name ${username} already exists.`);
                }
            });
    }

    registerUser(username) {
        this.getUserByName(username)
            .then(() => this.signalWrapper.generateIdentity(this.store))
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
                const user = response.data.user;
                // this.logger.info('registration result', user);
                // this.logger.info('registrationId', user.registrationId);
                // this.logger.info('identityKey', user.identityKey);
                this.setLoggedInUser(user);
                this.socket.emit('set-name', username);
            })
            .catch(e => {
                alert(e);
            });
    }

    openChatForUsername(chatPartnerId, chatPartnerName, chatPartnerRegistrationId) {
        this.$chat.style.display = 'block';
        this.$chatPartnerName.innerHTML = chatPartnerName;

        this.chatPartnerAddress = new libsignal.SignalProtocolAddress(chatPartnerName, 0); // TODO: deviceId is always 0 atm
        this.chatPartnerRegistrationId = chatPartnerRegistrationId;

        this.retrieveReceiverInfo(chatPartnerId)
            .then(user => this.createSession(user));
    }

    retrieveReceiverInfo(recipientId) {
        return axios({method: 'get', url: `http://localhost:8081/user/${recipientId}`})
            .then(response => {
                const user = response.data;
                // this.logger.info('retrieve user result', user);
                // this.logger.info('name', user.name);
                // this.logger.info('registrationId', user.registrationId);
                // this.logger.info('identityKey', user.identityKey);
                return user;
            });
    }

    createSession(recipient) {
        let builder = new libsignal.SessionBuilder(this.store, this.chatPartnerAddress);

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
        // immer new? oder nur wenn nicht vorhanden
        const sessionCipher = new libsignal.SessionCipher(this.store, this.chatPartnerAddress);
        const messageAsArrayBuffer = signalUtil.toArrayBuffer(rawMessage);
        return sessionCipher.encrypt(messageAsArrayBuffer);
    }

    sendMessage(ciphertext) {
        const loggedInUser = this.getLoggedInUser();
        return axios({
            method: 'post',
            url: 'http://localhost:8081/message',
            data: {
                sourceRegistrationId: loggedInUser.registrationId,
                recipientRegistrationId: ciphertext.registrationId,
                body: signalUtil.stringToBase64(ciphertext.body),
                type: ciphertext.type
            }
        });
    }

    retrieveMessages(sourceRegistrationId, recipientRegistrationId) {
        return axios({method: 'get', url: `http://localhost:8081/messages/${sourceRegistrationId}/${recipientRegistrationId}`})
            .then(response => response.data);
    }

    decryptMessage(message) {
        const ciphertext = signalUtil.base64ToString(message.body);
        console.log('ciphertext', ciphertext);
        const messageType = message.type;
        console.log('messageType', messageType);

        const sessionCipher = new libsignal.SessionCipher(this.store, this.chatPartnerAddress);

        if (messageType === 3) { // 3 = PREKEY_BUNDLE
            console.log('decryptPreKeyWhisperMessage');
            // Decrypt a PreKeyWhisperMessage by first establishing a new session
            // The session will be set up automatically by libsignal.
            // The information to do that is delivered within the message's ciphertext.
            return sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary').then(encryptedText => {
                let plaintext = signalUtil.toString(encryptedText);
                this.$chatHistory.innerHTML += `<br/>${message.timestamp}: ${plaintext}`;
            });
        } else {
            console.log('decryptWhisperMessage');
            // Decrypt a normal message using an existing session
            return sessionCipher.decryptWhisperMessage(ciphertext, 'binary').then(encryptedText => {
                let plaintext = signalUtil.toString(encryptedText);
                this.$chatHistory.innerHTML += `<br/>${message.timestamp}: ${plaintext}`;
            });
        }
    }

}
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http').Server(app);
const io = require('socket.io')(http);

const UserManager = require('./UserManager');
const userManager = new UserManager();

const MessageManager = require('./MessageManager');
const messageManager = new MessageManager();

const PreKeyManager = require('./PreKeyManager');
const preKeyManager = new PreKeyManager();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let connectedUsers = [];

io.sockets.on('connection', socket => {
    // console.log('connection', socket.id);
    connectedUsers.push({id: socket.id, socket: socket});

    socket.on('set-name', username => {
        // console.log('set-name', username);
        connectedUsers.find(user => user.id === socket.id).name = username;
        // printConnectedSockets();
    });

    socket.on('disconnect', () => {
        // console.log('disconnect', socket.id);
        connectedUsers = connectedUsers.filter(user => user.id !== socket.id);
        // printConnectedSockets();
    });
});

function printConnectedSockets() {
    console.log(`ACTIVE USERS: ${connectedUsers.length}`);
    connectedUsers.map(user => console.log(`id=${user.id}, name=${user.name}`));
}

// register
app.post(`/user`, (req, res) => {
    let result = null;
    userManager.register(req.body)
        .then(user => {
            result = user;
            return preKeyManager.createPreKeys(req.body);
        })
        .then(() => res.json({success: true, user: result}))
        .then(() => connectedUsers.forEach(user => user.socket.emit('new-user-registered')))
        .catch(err => res.json({success: false, message: err}));
});

// connect
app.get(`/user/:id`, (req, res) => {
    let result = null;
    userManager.getById(req.params.id)
        .then(user => {
            result = user;
            return preKeyManager.getFirstPreKeyByRegistrationId(user.registrationId);
        })
        .then(firstPreKey => {
            result.preKey = firstPreKey;
            res.json(result);
        })
        .catch(err => res.json({success: false, message: err}));
});

// for registration
app.get(`/user/name/:name`, (req, res) => {
    userManager.getByName(req.params.name)
        .then(user => res.json(user))
        .catch(err => res.json({success: false, message: err}));
});

// for list in UI
app.get(`/users`, (req, res) => {
    userManager.getAll()
        .then(users => res.json(users))
        .catch(err => res.json({success: false, message: err}));
});

app.post(`/message`, (req, res) => {
    messageManager.createMessage(req.body)
        .then(() => res.json({success: true}))
        .catch(err => res.json({success: false, message: err}));
});

app.get(`/messages/:registrationId`, (req, res) => {
    let result = [];
    messageManager.getAllUnreadByRegistrationId(Number.parseInt(req.params.registrationId))
        .then(messages => {
            result = messages;
            let promises = messages.map(message => messageManager.updateFetchedStatus(message.id));
            return Promise.all(promises);
        })
        .then(() => res.json(result))
        .catch(err => res.json({success: false, message: err}));
});

http.listen(8081, function () {
    console.log(`App listening on port 8081!`);
});
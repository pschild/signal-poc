const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const UserManager = require('./UserManager');
const userManager = new UserManager();

const MessageManager = require('./MessageManager');
const messageManager = new MessageManager();

const PreKeyManager = require('./PreKeyManager');
const preKeyManager = new PreKeyManager();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// register
app.post(`/user`, (req, res) => {
    let result = null;
    userManager.register(req.body)
        .then(user => {
            result = user;
            return preKeyManager.createPreKeys(req.body);
        })
        .then(() => res.json({success: true, user: result}))
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
    messageManager.getAllByRegistrationId(Number.parseInt(req.params.registrationId))
        .then(messages => res.json(messages))
        .catch(err => res.json({success: false, message: err}));
});

app.listen(8081, function () {
    console.log(`App listening on port 8081!`);
});
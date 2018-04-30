const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const UserManager = require('./UserManager');
const userManager = new UserManager();

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
        .then(() => res.json(result))
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

// for list in UI
app.get(`/users`, (req, res) => {
    userManager.getAll()
        .then(users => res.json(users))
        .catch(err => res.json({success: false, message: err}));
});

app.post(`/message`, (req, res) => {
    res.json({success: true});
});

app.get(`/message/:userId`, (req, res) => {
    res.json({success: true});
});

app.listen(8081, function () {
    console.log(`App listening on port 8081!`);
});
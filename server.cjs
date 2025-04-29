const cors = require("cors");
var express = require("express");
const url = require('url');
const querystring = require('querystring');
const bcrypt = require("bcrypt");
var mysql = require('mysql');

// con pour connexion
/*var con = mysql.createConnection({
    host: "localhost",
    user: "projetweb",
    password: "Password1234_",
    database: "PROJET_WEB"
}); */

//fs pour file system
var fs = require("fs");
const path = require("path");

// express démarre le serveur
var app = express();
const PORT = 1956; 
app.listen(PORT);
app.use(cors());
app.use(express.json());
console.log (`Serveur démarré sur le port ${PORT}`);


app.get('/', function(req, response) {
    response.sendFile(path.resolve('.','dist','index.html'));
});

app.use('/:nom', function(req, response) {
    response.sendFile(path.resolve('.','dist',req.params.nom));
});

app.get('/assets/:nom', function(req, response) {
    response.sendFile(path.resolve('.','dist','assets',req.params.nom));
});
const cors = require("cors");
var express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require('sqlite3').verbose();
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");

var fs = require("fs");
const path = require("path");
const { register } = require("module");

// express démarre le serveur
var app = express();
const PORT = 1956; 
app.listen(PORT);
app.use(cors());
app.use(express.json());
console.log (`Serveur démarré sur le port ${PORT}`);


const db = new sqlite3.Database('ihmLunaMiguel.sqlite');



db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS User (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            password TEXT
          )`);
});
const userRegister = db.prepare("INSERT INTO user (id, name, email, password) VALUES (?, ?, ?, ?)");


app.post('/crypt', async function(req, response) {
    const clearPassword = req.body.clearPassword; // Extrait le mot de passe du corps de la requête
    const hashed = await hashedPassword(clearPassword); // Hache le mot de passe
    response.json({ hashedPassword: hashed }); // Renvoie la réponse au format JSON
});

app.post('/register', function(req,response){
    let mail = req.body.mail;
    let username = req.body.username;
    let password = req.body.password;
    let id = req.body.id;
    userRegister.run(id,username,mail,password);
    response.status(200).json("Inscription réussi");
});

app.post('/login', async function(req,response) {
  let mail = req.body.mail;
  let password = req.body.password;

  try {
    db.get('SELECT * FROM User WHERE email = ?', [mail], async (err, user) => {
        if (err) {
            return response.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
        }
        if (!user) {
            return response.status(401).json({ error: 'Utilisateur non trouvé' });
            console.log("Utilisateur non trouvé");
        }

        let match = await verifyPassword(password, user.password);
        if (match) {
            delete user.password;
            response.json(user);
        } else {
            response.status(401).json({ error: 'Mot de passe incorrect' });
            console.log("Mot de passe incorrect");
        }
    });
} catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification du mot de passe' });
}

});

async function hashedPassword(clearPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(clearPassword, salt);
    return hashedPassword;
};

async function verifyPassword(clearPassword, hashedPassword) {
  try {
      const match = await bcrypt.compare(clearPassword, hashedPassword);
      return match; // Retourne true si les mots de passe correspondent, false sinon
  } catch (error) {
      throw new Error('Erreur lors de la vérification du mot de passe');
  }
}

const rssUrls = [
  //"https://calderon.hypotheses.org/feed",
  //"https://socioargu.hypotheses.org/feed",
  "https://anthropo-ihm.hypotheses.org/feed"
];

app.get("/api/rss", async (req, response) => {
  const results = [];

  for (const url of rssUrls) {
    try {
      const xml = await fetch(url).then(r => r.text());
      const parsed = await parseStringPromise(xml);
      const channel = parsed.rss.channel[0];

      const items = channel.item.slice(0, 5).map((item) => ({
        title: item.title[0],
        link: item.link[0],
        date: item.pubDate?.[0] ?? null
      }));

      results.push({
        source: channel.title[0],
        articles: items
      });
    } catch (e) {
      console.error(e);
    }
  }

  response.json(results);
});


app.get('/', function(req, response) {
  response.sendFile(path.resolve('.','dist','index.html'));
});

app.use('/:nom', function(req, response) {
  response.sendFile(path.resolve('.','dist',req.params.nom));
});

app.get('/assets/:nom', function(req, response) {
  response.sendFile(path.resolve('.','dist','assets',req.params.nom));
});
app.get('/data/:nom', function(req, response) {
  response.sendFile(path.resolve('.','dist','data',req.params.nom));
});



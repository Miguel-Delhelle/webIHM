const cors = require("cors");
const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { parseStringPromise } = require("xml2js");
const path = require("path");

// Configuration du serveur
const app = express();
const PORT = 1956;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const db = new sqlite3.Database('ihmLunaMiguel.sqlite');

// Initialisation de la base de données
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        password TEXT
    )`);

    // Table des sujets du forum
    db.run(`CREATE TABLE IF NOT EXISTS ForumTopic (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES User(id)
    )`);

    // Table des messages du forum
    db.run(`CREATE TABLE IF NOT EXISTS ForumPost (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topicId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(topicId) REFERENCES ForumTopic(id),
        FOREIGN KEY(userId) REFERENCES User(id)
    )`);
});

// Fonctions de base de données
function dbGet(query, params) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

// Fonctions utilitaires
function hashPassword(password) {
    return bcrypt.genSalt(10)
        .then(salt => bcrypt.hash(password, salt));
}

function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// Routes
app.post('/register', async (req, res) => {
    try {
        const { mail, username, password, id } = req.body;

        // Vérifier si l'utilisateur existe
        const existingUser = await dbGet('SELECT * FROM User WHERE email = ?', [mail]);
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hacher le mot de passe
        const hashedPassword = await hashPassword(password);

        // Insérer l'utilisateur
        await dbRun(
            'INSERT INTO User (id, name, email, password) VALUES (?, ?, ?, ?)',
            [id, username, mail, hashedPassword]
        );

        res.status(200).json({ message: "Inscription réussie" });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { mail, password } = req.body;

        // Récupérer l'utilisateur
        const user = await dbGet('SELECT * FROM User WHERE email = ?', [mail]);
        if (!user) {
            console.log("Utilisateur non trouvé");
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier le mot de passe
        const match = await verifyPassword(password, user.password);
        if (match) {
            const userResponse = { ...user };
            delete userResponse.password;
            res.json(userResponse);
        } else {
            console.log("Mot de passe incorrect");
            res.status(401).json({ error: 'Mot de passe incorrect' });
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Route RSS
const rssUrls = ["https://anthropo-ihm.hypotheses.org/feed"];

app.get("/api/rss", async (req, res) => {
    const results = [];

    for (const url of rssUrls) {
        try {
            const fetchResponse = await fetch(url);
            const xml = await fetchResponse.text();
            const parsed = await parseStringPromise(xml);
            const channel = parsed.rss.channel[0];

            const items = channel.item.slice(0, 5).map((item) => ({
                title: item.title[0],
                link: item.link[0],
                date: item.pubDate?.[0] ?? null
            }));

            // Extraire l'URL de base en retirant "/feed" de l'URL du flux
            const baseUrl = url.replace('/feed', '');

            results.push({
                source: channel.title[0],
                sourceUrl: baseUrl,
                articles: items
            });
        } catch (e) {
            console.error('Erreur lors de la récupération du flux RSS:', e);
        }
    }

    res.json(results);
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
});

// Configuration des routes statiques
app.use(express.static(path.resolve('.',"dist")));

// Routes du forum
// Obtenir tous les sujets
app.get('/api/forum/topics', async (req, res) => {
    try {
        const topics = await new Promise((resolve, reject) => {
            db.all(
                `SELECT ForumTopic.*, 
                (SELECT COUNT(*) FROM ForumPost WHERE ForumPost.topicId = ForumTopic.id) as postCount,
                (SELECT MAX(createdAt) FROM ForumPost WHERE ForumPost.topicId = ForumTopic.id) as lastPostDate
                FROM ForumTopic 
                ORDER BY createdAt DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []); // Retourner un tableau vide si pas de résultats
                }
            );
        });
        res.json(topics);
    } catch (error) {
        console.error('Erreur lors de la récupération des sujets:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir un sujet et ses messages
app.get('/api/forum/topics/:id', async (req, res) => {
    try {
        const topic = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM ForumTopic WHERE id = ?', [req.params.id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const posts = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM ForumPost WHERE topicId = ? ORDER BY createdAt',
                [req.params.id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        if (!topic) {
            return res.status(404).json({ error: 'Sujet non trouvé' });
        }

        res.json({ topic, posts });
    } catch (error) {
        console.error('Erreur lors de la récupération du sujet:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un nouveau sujet avec son premier message
app.post('/api/forum/topics', async (req, res) => {
    const { title, content, userId, userName } = req.body;

    if (!title || !content || !userId || !userName) {
        return res.status(400).json({ error: 'Données manquantes' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO ForumTopic (title, userId, userName) VALUES (?, ?, ?)',
                [title, userId, userName],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });

        const topicId = result.lastID;

        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO ForumPost (topicId, userId, userName, content) VALUES (?, ?, ?, ?)',
                [topicId, userId, userName, content],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });

        res.status(201).json({ id: topicId });
    } catch (error) {
        console.error('Erreur détaillée lors de la création du sujet:', error);
        console.error('Données reçues:', req.body);
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
});

// Ajouter une réponse à un sujet
app.post('/api/forum/topics/:id/posts', async (req, res) => {
    const { content, userId, userName } = req.body;
    const topicId = req.params.id;

    if (!content || !userId || !userName) {
        return res.status(400).json({ error: 'Données manquantes' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO ForumPost (topicId, userId, userName, content) VALUES (?, ?, ?, ?)',
                [topicId, userId, userName, content],
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                }
            );
        });

        res.status(201).json({ id: result.lastID });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réponse:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});



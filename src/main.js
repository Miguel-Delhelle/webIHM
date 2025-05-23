const { Point } = require("./Point");
const { drawCopicColorWheel } = require("./Section1_ColorWheel");


let isAuthenticated = false;
let currentUser = null;
let currentTopicId = null;

// Rendre les fonctions de modal disponibles globalement
window.openModal = function(type) {
    const modal = document.getElementById(type + 'Modal');
    modal.style.display = 'block';
    // Réinitialiser les messages d'erreur et les formulaires
    const errorDiv = modal.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    }
    modal.querySelector('form').reset();
};

window.closeModal = function(type) {
    document.getElementById(type + 'Modal').style.display = 'none';
};

// Auth Handlers
async function handleLogin(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    try {
        // Désactiver le bouton et montrer le chargement
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connexion...';
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');

        const email = document.getElementById('login-mail').value;
        const password = document.getElementById('login-password').value;

        const response = await fetch('http://localhost:1956/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mail: email, password: password }),
        });

        const data = await response.json();

        if (response.ok) {
            updateUIAfterLogin(data);
            closeModal('login');
            document.getElementById('loginForm').reset();
        } else {
            errorDiv.textContent = data.error || 'Identifiants incorrects';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Erreur de connexion, veuillez réessayer';
        errorDiv.classList.add('show');
    } finally {
        // Réactiver le bouton et restaurer son texte
        submitBtn.disabled = false;
        submitBtn.textContent = 'Se connecter';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
    }
    
    try {
        // Générer un ID unique simple
        const id = Date.now().toString();
        
        const response = await fetch('http://localhost:1956/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id,
                username: name,
                mail: email,
                password: password
            })
        });

        if (response.ok) {
            alert('Inscription réussie !');
            closeModal('register');
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de l\'inscription');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la connexion au serveur');
    }
}

// Toggle du menu utilisateur
function toggleUserMenu(event) {
    event.stopPropagation();
    const dropdownMenu = document.querySelector('.dropdown-menu');
    dropdownMenu.classList.toggle('show');
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// RSS Feed Loading
async function loadRSSFeeds() {
    try {
        const response = await fetch('http://localhost:1956/api/rss');
        const feeds = await response.json();
        
        // Mettre à jour l'interface avec les flux RSS
        const rssContainer = document.querySelector('.rss-feed-container');
        if (rssContainer) {
            rssContainer.innerHTML = feeds.map(feed => `
                <div class="rss-feed">
                    <h3><a href="${feed.sourceUrl}" target="_blank" class="source-link">${feed.source}</a></h3>
                    ${feed.articles.map(article => `
                        <div class="rss-article">
                            <h4><a href="${article.link}" target="_blank">${article.title}</a></h4>
                            <p>${new Date(article.date).toLocaleDateString()}</p>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des flux RSS:', error);
    }
}

// View Toggle
function toggleView(view) {
    const mainContent = document.getElementById('main-content');
    const forumContent = document.getElementById('forum-content');
    
    if (view === 'forum') {
        mainContent.style.display = 'none';
        forumContent.style.display = 'block';
        // Charger les sujets du forum
        loadForumTopics();
        // Mettre à jour l'URL sans recharger la page
        history.pushState({view: 'forum'}, '', '#forum');
    } else {
        mainContent.style.display = 'block';
        forumContent.style.display = 'none';
        // Mettre à jour l'URL sans recharger la page
        history.pushState({view: 'main'}, '', '#');
    }
}

// Gérer la navigation avec les boutons du header
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter les écouteurs d'événements pour les liens de navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            if (target === 'forum') {
                toggleView('forum');
            } else {
                toggleView('main');
                // Faire défiler jusqu'à la section cible
                const section = document.getElementById(target);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Gérer la navigation avec le bouton retour du navigateur
    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.view === 'forum') {
            toggleView('forum');
            // Si on était sur un sujet spécifique
            if (e.state.topicId) {
                openTopic(e.state.topicId);
            } else {
                showTopicsList();
            }
        } else {
            toggleView('main');
        }
    });

    // Vérifier l'URL au chargement de la page
    if (window.location.hash === '#forum') {
        toggleView('forum');
    }

    loadRSSFeeds();

    // Gérer le clic sur le bouton utilisateur
    const userButton = document.getElementById('user-button');
    if (userButton) {
        userButton.addEventListener('click', function(event) {
            event.stopPropagation();
            const dropdownMenu = document.querySelector('.dropdown-menu');
            dropdownMenu.classList.toggle('show');
        });
    }

    // Gérer le clic sur le bouton de déconnexion
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Fermer le menu déroulant si on clique en dehors
    document.addEventListener('click', function(event) {
        const dropdownMenu = document.querySelector('.dropdown-menu');
        const userButton = document.getElementById('user-button');
        
        if (!userButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Gestionnaires pour les boutons de connexion/inscription
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const createTopicButton = document.getElementById('createTopicButton');
    
    // Ajouter les écouteurs pour ouvrir les modales
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const modal = document.getElementById('loginModal');
            modal.style.display = 'block';
            const errorDiv = modal.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.remove('show');
            }
            modal.querySelector('form').reset();
        });
    }
    
    if (registerButton) {
        registerButton.addEventListener('click', () => {
            const modal = document.getElementById('registerModal');
            modal.style.display = 'block';
            const errorDiv = modal.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.remove('show');
            }
            modal.querySelector('form').reset();
        });
    }

    if (createTopicButton) {
        createTopicButton.addEventListener('click', () => {
            const modal = document.getElementById('newTopicModal');
            modal.style.display = 'block';
            modal.querySelector('form').reset();
        });
    }

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Gestionnaires pour les boutons de fermeture des modales
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });

    // Fermeture des modales en cliquant en dehors
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Gestion du panneau latéral des ressources
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // Fermer le panneau si on clique en dehors
    document.addEventListener('click', function(event) {
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(event.target) && 
            event.target !== toggleSidebarBtn) {
            sidebar.classList.remove('open');
        }
    });

    // Ne pas fermer en cliquant dans le panneau
    sidebar.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    // Gestion de la recherche et des tags
    // Chargement initial des flux RSS
    loadRSSFeeds();
});

// Fonction de recherche dans les ressources
function initResourceSearch() {
    const searchInput = document.getElementById('resourceSearch');
    if (!searchInput) return;
    
    function filterResources() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const resourceItems = document.querySelectorAll('.resource-item');
        
        resourceItems.forEach(section => {
            const items = section.querySelectorAll('li');
            let hasVisibleItems = false;
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (searchTerm === '' || text.includes(searchTerm)) {
                    item.style.display = '';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            section.style.display = hasVisibleItems ? '' : 'none';
        });
    }
    
    searchInput.addEventListener('input', filterResources);
}

document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    initResourceSearch();
});

// Mise à jour de l'interface après connexion
function updateUIAfterLogin(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const newTopicButton = document.getElementById('newTopicButton');
    
    // Mettre à jour l'état d'authentification
    isAuthenticated = true;
    currentUser = user;
    
    // Mettre à jour les éléments de l'interface
    authButtons.style.display = 'none';
    userMenu.style.display = 'block';
    userName.textContent = user.name;
    if (newTopicButton) {
        newTopicButton.style.display = 'block';
    }

    // S'assurer que le menu dropdown est initialement caché
    dropdownMenu.classList.remove('show');
}

// Fonction pour gérer la déconnexion
function handleLogout() {
    isAuthenticated = false;
    currentUser = null;
    
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    // Cacher le menu utilisateur et montrer les boutons de connexion
    userMenu.style.display = 'none';
    authButtons.style.display = 'flex';
    
    // Réinitialiser l'état du menu dropdown
    dropdownMenu.classList.remove('show');
}

// Charger les sujets du forum
async function loadForumTopics() {
    try {
        const response = await fetch('http://localhost:1956/api/forum/topics');
        const topics = await response.json();
        const container = document.getElementById('topicsList');
        
        container.innerHTML = topics.map(topic => `
            <div class="forum-topic" onclick="openTopic(${topic.id})">
                <div class="topic-header">
                    <div>
                        <h3 class="topic-title">${topic.title}</h3>
                        <div class="topic-meta">Par ${topic.userName} • ${formatDate(topic.createdAt)}</div>
                    </div>
                    <div class="topic-stats">
                        <span><i class="fas fa-comments"></i> ${topic.postCount} messages</span>
                        ${topic.lastPostDate ? `<span>Dernier message ${formatDate(topic.lastPostDate)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Afficher/masquer le bouton "Nouveau sujet" selon l'état de connexion
        const newTopicButton = document.getElementById('newTopicButton');
        newTopicButton.style.display = isAuthenticated ? 'block' : 'none';
    } catch (error) {
        console.error('Erreur lors du chargement des sujets:', error);
    }
}

// Formater les dates
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    }
    if (days < 7) {
        return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
    return date.toLocaleDateString();
}

// Ouvrir un sujet
async function openTopic(id) {
    currentTopicId = id;
    try {
        // Mettre à jour l'historique pour le bouton retour
        history.pushState({view: 'forum', topicId: id}, '', '#forum/topic/' + id);
        
        const response = await fetch(`http://localhost:1956/api/forum/topics/${id}`);
        const { topic, posts } = await response.json();
        
        const topicContent = document.getElementById('topicContent');
        topicContent.innerHTML = `
            <div class="topic-content">
                <h2>${topic.title}</h2>
                <div class="topic-meta">Par ${topic.userName} • ${formatDate(topic.createdAt)}</div>
                <p>${posts[0].content}</p>
            </div>
        `;

        const repliesContainer = document.getElementById('topicReplies');
        repliesContainer.innerHTML = posts.slice(1).map(post => `
            <div class="topic-reply">
                <div class="reply-meta">Par ${post.userName} • ${formatDate(post.createdAt)}</div>
                <div class="reply-content">${post.content}</div>
            </div>
        `).join('');

        // Afficher le formulaire de réponse si l'utilisateur est connecté
        const replyForm = document.getElementById('replyForm');
        replyForm.style.display = isAuthenticated ? 'block' : 'none';

        // Afficher la vue détaillée et masquer la liste des sujets
        document.getElementById('forumTopicsList').style.display = 'none';
        document.getElementById('forumTopicDetails').style.display = 'block';
    } catch (error) {
        console.error('Erreur lors de l\'ouverture du sujet:', error);
    }
}

// Créer un nouveau sujet
async function createNewTopic(event) {
    event.preventDefault();
    
    if (!isAuthenticated || !currentUser) {
        alert('Vous devez être connecté pour créer un sujet');
        return;
    }

    const title = document.getElementById('topicTitle').value.trim();
    const content = document.getElementById('topicContent').value.trim();

    try {
        console.log('Tentative de création du sujet avec:', {
            title,
            content,
            userId: currentUser.id,
            userName: currentUser.name
        });

        const response = await fetch('http://localhost:1956/api/forum/topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content,
                userId: currentUser.id,
                userName: currentUser.name
            })
        });

        const data = await response.json();
        console.log('Réponse du serveur:', data);

        if (response.ok) {
            document.getElementById('newTopicModal').style.display = 'none';
            document.getElementById('newTopicForm').reset();
            loadForumTopics();
        } else {
            console.error('Erreur du serveur:', data);
            alert(data.error || 'Erreur lors de la création du sujet. Code: ' + response.status);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création du sujet');
    }
}

// Ajouter une réponse
async function addReply(event) {
    event.preventDefault();
    
    if (!isAuthenticated || !currentUser || !currentTopicId) {
        alert('Vous devez être connecté pour répondre');
        return;
    }

    const content = document.getElementById('replyContent').value.trim();

    try {
        const response = await fetch(`http://localhost:1956/api/forum/topics/${currentTopicId}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                userId: currentUser.id,
                userName: currentUser.name
            })
        });

        if (response.ok) {
            document.getElementById('replyContent').value = '';
            openTopic(currentTopicId); // Recharger le sujet pour voir la nouvelle réponse
        } else {
            const data = await response.json();
            alert(data.error || 'Erreur lors de l\'ajout de la réponse');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout de la réponse');
    }
}

// Rendre la fonction de création de sujet disponible globalement
window.openNewTopicModal = function() {
    document.getElementById('newTopicModal').style.display = 'block';
};

// Fonction pour revenir à la liste des sujets
window.showTopicsList = function() {
    document.getElementById('forumTopicsList').style.display = 'block';
    document.getElementById('forumTopicDetails').style.display = 'none';
    currentTopicId = null;
    loadForumTopics(); // Recharger la liste pour avoir les dernières mises à jour
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Gestionnaires d'événements pour le forum
    document.getElementById('newTopicForm').addEventListener('submit', createNewTopic);
    document.getElementById('newReplyForm').addEventListener('submit', addReply);

    // Charger les sujets lors de l'ouverture du forum
    document.querySelector('a[href="#forum"]').addEventListener('click', function() {
        setTimeout(loadForumTopics, 100); // Petit délai pour laisser le temps à la vue de changer
    });
});

window.addEventListener("DOMContentLoaded", () => drawCopicColorWheel(new Point(0,100),30,10,0.1))

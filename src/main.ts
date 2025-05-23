import { Point } from "./Point";
import { drawCopicColorWheel, maxColorSegment } from "./Section1_ColorWheel";

// Types et interfaces
interface User {
    id: string;
    name: string;
    mail: string;
}

interface Topic {
    id: number;
    title: string;
    userName: string;
    createdAt: string;
    postCount: number;
    lastPostDate?: string;
}

interface Post {
    id: number;
    content: string;
    userName: string;
    createdAt: string;
    userId: string;
}

interface TopicDetails {
    topic: Topic;
    posts: Post[];
}

interface RSSArticle {
    title: string;
    link: string;
    date: string;
}

interface RSSFeed {
    source: string;
    sourceUrl: string;
    articles: RSSArticle[];
}

interface LoginData {
    mail: string;
    password: string;
}

interface RegisterData {
    id: string;
    username: string;
    mail: string;
    password: string;
}

interface CreateTopicData {
    title: string;
    content: string;
    userId: string;
    userName: string;
}

interface CreatePostData {
    content: string;
    userId: string;
    userName: string;
}

//@ts-ignore
interface ApiResponse<T = any> {
    error?: string;
    [key: string]: any;
}

// Variables globales avec types
let isAuthenticated: boolean = false;
let currentUser: User | null = null;
let currentTopicId: number | null = null;

// Extension de Window pour les fonctions globales
declare global {
    interface Window {
        openModal: (type: string) => void;
        closeModal: (type: string) => void;
        openNewTopicModal: () => void;
        showTopicsList: () => void;
    }
}

// Classe principale pour gérer l'application
class ForumApp {
    private baseUrl: string = 'http://localhost:1956';

    // Fonctions de modal
    public openModal(type: string): void {
        const modal = document.getElementById(type + 'Modal') as HTMLElement;
        if (!modal) return;
        
        modal.style.display = 'block';
        
        // Réinitialiser les messages d'erreur et les formulaires
        const errorDiv = modal.querySelector('.error-message') as HTMLElement;
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
        }
        
        const form = modal.querySelector('form') as HTMLFormElement;
        if (form) {
            form.reset();
        }
    }

    public closeModal(type: string): void {
        const modal = document.getElementById(type + 'Modal') as HTMLElement;
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Gestionnaires d'authentification
    public async handleLogin(event: Event): Promise<void> {
        event.preventDefault();
        
        const form = event.target as HTMLFormElement;
        const errorDiv = document.getElementById('loginError') as HTMLElement;
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        
        if (!errorDiv || !submitBtn) return;

        try {
            // Désactiver le bouton et montrer le chargement
            submitBtn.disabled = true;
            submitBtn.textContent = 'Connexion...';
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');

            const emailInput = document.getElementById('login-mail') as HTMLInputElement;
            const passwordInput = document.getElementById('login-password') as HTMLInputElement;
            
            if (!emailInput || !passwordInput) return;

            const loginData: LoginData = {
                mail: emailInput.value,
                password: passwordInput.value
            };

            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            const data: ApiResponse<User> = await response.json();

            if (response.ok) {
                this.updateUIAfterLogin(data as User);
                this.closeModal('login');
                form.reset();
            } else {
                errorDiv.textContent = data.error || 'Identifiants incorrects';
                errorDiv.classList.add('show');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = 'Erreur de connexion, veuillez réessayer';
            errorDiv.classList.add('show');
        } finally {
            // Réactiver le bouton et restaurer son texte
            submitBtn.disabled = false;
            submitBtn.textContent = 'Se connecter';
        }
    }

    public async handleRegister(event: Event): Promise<void> {
        event.preventDefault();
        
        const nameInput = document.getElementById('registerName') as HTMLInputElement;
        const emailInput = document.getElementById('registerEmail') as HTMLInputElement;
        const passwordInput = document.getElementById('registerPassword') as HTMLInputElement;
        const confirmPasswordInput = document.getElementById('registerConfirmPassword') as HTMLInputElement;
        
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;

        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (password !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        
        try {
            const registerData: RegisterData = {
                id: Date.now().toString(),
                username: name,
                mail: email,
                password: password
            };
            
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData)
            });

            if (response.ok) {
                alert('Inscription réussie !');
                this.closeModal('register');
            } else {
                const data: ApiResponse = await response.json();
                alert(data.error || 'Erreur lors de l\'inscription');
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('Erreur lors de la connexion au serveur');
        }
    }

    public handleLogout(): void {
        isAuthenticated = false;
        currentUser = null;
        
        const authButtons = document.getElementById('auth-buttons') as HTMLElement;
        const userMenu = document.getElementById('user-menu') as HTMLElement;
        const dropdownMenu = document.querySelector('.dropdown-menu') as HTMLElement;
        
        if (authButtons && userMenu && dropdownMenu) {
            // Cacher le menu utilisateur et montrer les boutons de connexion
            userMenu.style.display = 'none';
            authButtons.style.display = 'flex';
            
            // Réinitialiser l'état du menu dropdown
            dropdownMenu.classList.remove('show');
        }
    }

    // Gestion des flux RSS
    public async loadRSSFeeds(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/api/rss`);
            const feeds: RSSFeed[] = await response.json();
            
            const rssContainer = document.querySelector('.rss-feed-container') as HTMLElement;
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

    // Gestion des vues
    public toggleView(view: 'forum' | 'main'): void {
        const mainContent = document.getElementById('main-content') as HTMLElement;
        const forumContent = document.getElementById('forum-content') as HTMLElement;
        
        if (!mainContent || !forumContent) return;
        
        if (view === 'forum') {
            mainContent.style.display = 'none';
            forumContent.style.display = 'block';
            this.loadForumTopics();
            history.pushState({view: 'forum'}, '', '#forum');
        } else {
            mainContent.style.display = 'block';
            forumContent.style.display = 'none';
            history.pushState({view: 'main'}, '', '#');
        }
    }

    // Gestion du forum
    public async loadForumTopics(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/api/forum/topics`);
            const topics: Topic[] = await response.json();
            const container = document.getElementById('topicsList') as HTMLElement;
            
            if (container) {
                container.innerHTML = topics.map(topic => `
                    <div class="forum-topic" onclick="forumApp.openTopic(${topic.id})">
                        <div class="topic-header">
                            <div>
                                <h3 class="topic-title">${topic.title}</h3>
                                <div class="topic-meta">Par ${topic.userName} • ${this.formatDate(topic.createdAt)}</div>
                            </div>
                            <div class="topic-stats">
                                <span><i class="fas fa-comments"></i> ${topic.postCount} messages</span>
                                ${topic.lastPostDate ? `<span>Dernier message ${this.formatDate(topic.lastPostDate)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            const newTopicButton = document.getElementById('newTopicButton') as HTMLElement;
            if (newTopicButton) {
                newTopicButton.style.display = isAuthenticated ? 'block' : 'none';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des sujets:', error);
        }
    }

    public async openTopic(id: number): Promise<void> {
        currentTopicId = id;
        try {
            history.pushState({view: 'forum', topicId: id}, '', `#forum/topic/${id}`);
            
            const response = await fetch(`${this.baseUrl}/api/forum/topics/${id}`);
            const data: TopicDetails = await response.json();
            
            const topicContent = document.getElementById('topicContent') as HTMLElement;
            if (topicContent && data.posts.length > 0) {
                topicContent.innerHTML = `
                    <div class="topic-content">
                        <h2>${data.topic.title}</h2>
                        <div class="topic-meta">Par ${data.topic.userName} • ${this.formatDate(data.topic.createdAt)}</div>
                        <p>${data.posts[0].content}</p>
                    </div>
                `;
            }

            const repliesContainer = document.getElementById('topicReplies') as HTMLElement;
            if (repliesContainer) {
                repliesContainer.innerHTML = data.posts.slice(1).map(post => `
                    <div class="topic-reply">
                        <div class="reply-meta">Par ${post.userName} • ${this.formatDate(post.createdAt)}</div>
                        <div class="reply-content">${post.content}</div>
                    </div>
                `).join('');
            }

            const replyForm = document.getElementById('replyForm') as HTMLElement;
            if (replyForm) {
                replyForm.style.display = isAuthenticated ? 'block' : 'none';
            }

            const forumTopicsList = document.getElementById('forumTopicsList') as HTMLElement;
            const forumTopicDetails = document.getElementById('forumTopicDetails') as HTMLElement;
            
            if (forumTopicsList && forumTopicDetails) {
                forumTopicsList.style.display = 'none';
                forumTopicDetails.style.display = 'block';
            }
        } catch (error) {
            console.error('Erreur lors de l\'ouverture du sujet:', error);
        }
    }

    public async createNewTopic(event: Event): Promise<void> {
        event.preventDefault();
        
        if (!isAuthenticated || !currentUser) {
            alert('Vous devez être connecté pour créer un sujet');
            return;
        }

        const titleInput = document.getElementById('topicTitle') as HTMLInputElement;
        const contentInput = document.getElementById('topicContent') as HTMLTextAreaElement;
        
        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            alert('Veuillez remplir tous les champs');
            return;
        }

        try {
            const topicData: CreateTopicData = {
                title,
                content,
                userId: currentUser.id,
                userName: currentUser.name
            };

            const response = await fetch(`${this.baseUrl}/api/forum/topics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(topicData)
            });

            const data: ApiResponse = await response.json();

            if (response.ok) {
                this.closeModal('newTopic');
                const form = document.getElementById('newTopicForm') as HTMLFormElement;
                if (form) form.reset();
                this.loadForumTopics();
            } else {
                console.error('Erreur du serveur:', data);
                alert(data.error || `Erreur lors de la création du sujet. Code: ${response.status}`);
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la création du sujet');
        }
    }

    public async addReply(event: Event): Promise<void> {
        event.preventDefault();
        
        if (!isAuthenticated || !currentUser || !currentTopicId) {
            alert('Vous devez être connecté pour répondre');
            return;
        }

        const contentInput = document.getElementById('replyContent') as HTMLTextAreaElement;
        if (!contentInput) return;

        const content = contentInput.value.trim();
        if (!content) {
            alert('Veuillez saisir un contenu pour votre réponse');
            return;
        }

        try {
            const postData: CreatePostData = {
                content,
                userId: currentUser.id,
                userName: currentUser.name
            };

            const response = await fetch(`${this.baseUrl}/api/forum/topics/${currentTopicId}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                contentInput.value = '';
                this.openTopic(currentTopicId);
            } else {
                const data: ApiResponse = await response.json();
                alert(data.error || 'Erreur lors de l\'ajout de la réponse');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'ajout de la réponse');
        }
    }

    public showTopicsList(): void {
        const forumTopicsList = document.getElementById('forumTopicsList') as HTMLElement;
        const forumTopicDetails = document.getElementById('forumTopicDetails') as HTMLElement;
        
        if (forumTopicsList && forumTopicDetails) {
            forumTopicsList.style.display = 'block';
            forumTopicDetails.style.display = 'none';
        }
        
        currentTopicId = null;
        this.loadForumTopics();
    }

    // Fonctions utilitaires
    public formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
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

    private updateUIAfterLogin(user: User): void {
        const authButtons = document.getElementById('auth-buttons') as HTMLElement;
        const userMenu = document.getElementById('user-menu') as HTMLElement;
        const userName = document.getElementById('user-name') as HTMLElement;
        const dropdownMenu = document.querySelector('.dropdown-menu') as HTMLElement;
        const newTopicButton = document.getElementById('newTopicButton') as HTMLElement;
        
        // Mettre à jour l'état d'authentification
        isAuthenticated = true;
        currentUser = user;
        
        // Mettre à jour les éléments de l'interface
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userName) userName.textContent = user.name;
        if (newTopicButton) newTopicButton.style.display = 'block';
        if (dropdownMenu) dropdownMenu.classList.remove('show');
    }

    public initResourceSearch(): void {
        const searchInput = document.getElementById('resourceSearch') as HTMLInputElement;
        if (!searchInput) return;
        
        const filterResources = (): void => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const resourceItems = document.querySelectorAll('.resource-item') as NodeListOf<HTMLElement>;
            
            resourceItems.forEach(section => {
                const items = section.querySelectorAll('li') as NodeListOf<HTMLElement>;
                let hasVisibleItems = false;
                
                items.forEach(item => {
                    const text = item.textContent?.toLowerCase() || '';
                    if (searchTerm === '' || text.includes(searchTerm)) {
                        item.style.display = '';
                        hasVisibleItems = true;
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                section.style.display = hasVisibleItems ? '' : 'none';
            });
        };
        
        searchInput.addEventListener('input', filterResources);
    }

    // Initialisation de l'application
    public init(): void {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupModals();
        this.setupUserMenu();
        this.setupSidebar();
        this.initResourceSearch();
        this.loadRSSFeeds();
        
        // Vérifier l'URL au chargement de la page
        if (window.location.hash === '#forum') {
            this.toggleView('forum');
        }
    }

    private setupEventListeners(): void {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const target = document.querySelector((anchor as HTMLAnchorElement).getAttribute('href') || '') as HTMLElement;
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Formulaires
        const loginForm = document.getElementById('loginForm') as HTMLFormElement;
        const registerForm = document.getElementById('registerForm') as HTMLFormElement;
        const newTopicForm = document.getElementById('newTopicForm') as HTMLFormElement;
        const newReplyForm = document.getElementById('newReplyForm') as HTMLFormElement;

        if (loginForm) loginForm.addEventListener('submit', this.handleLogin.bind(this));
        if (registerForm) registerForm.addEventListener('submit', this.handleRegister.bind(this));
        if (newTopicForm) newTopicForm.addEventListener('submit', this.createNewTopic.bind(this));
        if (newReplyForm) newReplyForm.addEventListener('submit', this.addReply.bind(this));
    }

    private setupNavigation(): void {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const href = (link as HTMLAnchorElement).getAttribute('href');
                if (!href) return;
                
                const target = href.substring(1);
                if (target === 'forum') {
                    this.toggleView('forum');
                } else {
                    this.toggleView('main');
                    const section = document.getElementById(target);
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Navigation avec le bouton retour du navigateur
        window.addEventListener('popstate', (e: PopStateEvent) => {
            if (e.state && e.state.view === 'forum') {
                this.toggleView('forum');
                if (e.state.topicId) {
                    this.openTopic(e.state.topicId);
                } else {
                    this.showTopicsList();
                }
            } else {
                this.toggleView('main');
            }
        });
    }

    private setupModals(): void {
        // Boutons d'ouverture des modales
        const loginButton = document.getElementById('loginButton');
        const registerButton = document.getElementById('registerButton');
        const createTopicButton = document.getElementById('createTopicButton');
        
        if (loginButton) {
            loginButton.addEventListener('click', () => this.openModal('login'));
        }
        
        if (registerButton) {
            registerButton.addEventListener('click', () => this.openModal('register'));
        }

        if (createTopicButton) {
            createTopicButton.addEventListener('click', () => this.openModal('newTopic'));
        }

        // Boutons de fermeture
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e: Event) => {
                const modal = (e.target as HTMLElement).closest('.modal') as HTMLElement;
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Fermeture en cliquant en dehors
        window.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('modal')) {
                target.style.display = 'none';
            }
        });
    }

    private setupUserMenu(): void {
        const userButton = document.getElementById('user-button');
        const logoutButton = document.getElementById('logout-button');
        
        if (userButton) {
            userButton.addEventListener('click', (event: Event) => {
                event.stopPropagation();
                const dropdownMenu = document.querySelector('.dropdown-menu') as HTMLElement;
                if (dropdownMenu) {
                    dropdownMenu.classList.toggle('show');
                }
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout.bind(this));
        }

        // Fermer le menu en cliquant en dehors
        document.addEventListener('click', (event: Event) => {
            const dropdownMenu = document.querySelector('.dropdown-menu') as HTMLElement;
            const userButton = document.getElementById('user-button');
            const target = event.target as HTMLElement;
            
            if (userButton && dropdownMenu && 
                !userButton.contains(target) && !dropdownMenu.contains(target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    private setupSidebar(): void {
        const toggleSidebarBtn = document.getElementById('toggleSidebar');
        const sidebar = document.querySelector('.sidebar') as HTMLElement;
        
        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Fermer le panneau si on clique en dehors
            document.addEventListener('click', (event: Event) => {
                const target = event.target as HTMLElement;
                if (sidebar.classList.contains('open') && 
                    !sidebar.contains(target) && 
                    target !== toggleSidebarBtn) {
                    sidebar.classList.remove('open');
                }
            });

            // Ne pas fermer en cliquant dans le panneau
            sidebar.addEventListener('click', (event: Event) => {
                event.stopPropagation();
            });
        }
    }
}

// Instance globale de l'application
const forumApp = new ForumApp();

// Exposition des fonctions globales
window.openModal = forumApp.openModal.bind(forumApp);
window.closeModal = forumApp.closeModal.bind(forumApp);
window.openNewTopicModal = () => forumApp.openModal('newTopic');
window.showTopicsList = forumApp.showTopicsList.bind(forumApp);

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    forumApp.init();
});

// Initialisation de la roue des couleurs
drawCopicColorWheel(new Point(0, 100), 30, 10, 0.1, maxColorSegment);
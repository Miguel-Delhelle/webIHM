import { Point } from "./Point";
import { drawCopicColorWheel, getCopicInitializationPromise } from "./Section1_ColorWheel";

// Types et interfaces (inchangées)
interface User { id: string; name: string; mail: string; }
interface Topic { id: number; title: string; userName: string; createdAt: string; postCount: number; lastPostDate?: string; }
interface Post { id: number; content: string; userName: string; createdAt: string; userId: string; }
interface TopicDetails { topic: Topic; posts: Post[]; }
interface RSSArticle { title: string; link: string; date: string; }
interface RSSFeed { source: string; sourceUrl: string; articles: RSSArticle[]; }
interface LoginData { mail: string; password: string; }
interface RegisterData { id: string; username: string; mail: string; password: string; }
interface CreateTopicData { title: string; content: string; userId: string; userName: string; }
interface CreatePostData { content: string; userId: string; userName: string; }
//@ts-ignore
interface ApiResponse<T = any> { error?: string; [key: string]: any; }

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
        toggleView: (view: 'forum' | 'main') => void;
        forumAppInstance?: ForumApp; // Pour le débogage si besoin
    }
}

// Classe principale pour gérer l'application
class ForumApp {
    private baseUrl: string = 'http://localhost:1956';

    private isClickOnColorWheelOrItsToggle(target: HTMLElement): boolean {
        const wheelContainer = document.getElementById('wheel-container'); // wheel-svg est dedans
        const wheelToggle = document.getElementById('hemisphere-toggle');
        
        if (wheelToggle && wheelToggle.contains(target)) {
            // console.log("main.ts: Click detected on color wheel toggle.");
            return true;
        }
        if (wheelContainer && wheelContainer.contains(target)) {
            // console.log("main.ts: Click detected on color wheel container.");
            return true;
        }
        return false;
    }

    public openModal(type: string): void {
        console.log(`main.ts: Opening modal: ${type}Modal`);
        const modal = document.getElementById(type + 'Modal') as HTMLElement;
        if (!modal) { console.warn(`main.ts: Modal with ID '${type}Modal' not found.`); return; }
        modal.style.display = 'block';
        const errorDiv = modal.querySelector('.error-message') as HTMLElement;
        if (errorDiv) { errorDiv.textContent = ''; errorDiv.classList.remove('show'); }
        const form = modal.querySelector('form') as HTMLFormElement;
        if (form) form.reset();
    }

    public closeModal(type: string): void {
        console.log(`main.ts: Closing modal: ${type}Modal`);
        const modal = document.getElementById(type + 'Modal') as HTMLElement;
        if (modal) modal.style.display = 'none';
        else console.warn(`main.ts: Modal with ID '${type}Modal' not found during closeModal.`);
    }

    public async handleLogin(event: Event): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        event.preventDefault();
        console.log("main.ts: handleLogin triggered");
        const form = event.target as HTMLFormElement;
        const errorDiv = document.getElementById('loginError') as HTMLElement;
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        const emailInput = document.getElementById('login-mail') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;

        if (!emailInput || !passwordInput) { console.error('main.ts: Login form inputs not found.'); if (errorDiv) { errorDiv.textContent = 'Erreur de formulaire interne.'; errorDiv.classList.add('show'); } return; }
        if (!errorDiv || !submitBtn) { console.error('main.ts: Login form error/submit elements not found.'); return; }

        try {
            submitBtn.disabled = true; submitBtn.textContent = 'Connexion...'; errorDiv.textContent = ''; errorDiv.classList.remove('show');
            const loginData: LoginData = { mail: emailInput.value, password: passwordInput.value };
            const response = await fetch(`${this.baseUrl}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData), });
            const data: ApiResponse<User> = await response.json();
            if (response.ok) { this.updateUIAfterLogin(data as User); this.closeModal('login'); form.reset(); } 
            else { errorDiv.textContent = data.error || 'Identifiants incorrects'; errorDiv.classList.add('show'); }
        } catch (error) { console.error('main.ts: Login error:', error); errorDiv.textContent = 'Erreur de connexion, veuillez réessayer'; errorDiv.classList.add('show');
        } finally { submitBtn.disabled = false; submitBtn.textContent = 'Se connecter'; }
    }
    public async handleRegister(event: Event): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        event.preventDefault();
        console.log("main.ts: handleRegister triggered");
        const nameInput = document.getElementById('registerName') as HTMLInputElement;
        const emailInput = document.getElementById('registerEmail') as HTMLInputElement;
        const passwordInput = document.getElementById('registerPassword') as HTMLInputElement;
        const confirmPasswordInput = document.getElementById('registerConfirmPassword') as HTMLInputElement;

        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) { console.error('main.ts: Register form inputs not found.'); alert('Erreur de formulaire interne.'); return; }
        const name = nameInput.value; const email = emailInput.value; const password = passwordInput.value; const confirmPassword = confirmPasswordInput.value;
        if (password !== confirmPassword) { alert('Les mots de passe ne correspondent pas'); return; }
        try {
            const registerData: RegisterData = { id: Date.now().toString(), username: name, mail: email, password: password };
            const response = await fetch(`${this.baseUrl}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerData) });
            if (response.ok) { alert('Inscription réussie !'); this.closeModal('register'); } 
            else { const data: ApiResponse = await response.json(); alert(data.error || 'Erreur lors de l\'inscription'); }
        } catch (error) { console.error('main.ts: Register error:', error); alert('Erreur lors de la connexion au serveur'); }
    }
    public handleLogout(): void { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log("main.ts: handleLogout triggered");
        isAuthenticated = false; currentUser = null;
        const authButtons = document.getElementById('auth-buttons') as HTMLElement;
        const userMenu = document.getElementById('user-menu') as HTMLElement;
        const dropdownMenu = userMenu?.querySelector('.dropdown-menu') as HTMLElement;

        if (authButtons) authButtons.style.display = 'flex'; else console.warn("main.ts: Element 'auth-buttons' not found for logout.");
        if (userMenu) userMenu.style.display = 'none'; else console.warn("main.ts: Element 'user-menu' not found for logout.");
        if (dropdownMenu) dropdownMenu.classList.remove('show');
        const newTopicButton = document.getElementById('newTopicButton') as HTMLElement;
        if (newTopicButton) newTopicButton.style.display = 'none';
    }
    public async loadRSSFeeds(): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log("main.ts: loadRSSFeeds triggered");
        try {
            const response = await fetch(`${this.baseUrl}/api/rss`); if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
            const feeds: RSSFeed[] = await response.json(); const rssContainer = document.querySelector('.rss-feed-container') as HTMLElement;
            if (rssContainer) { rssContainer.innerHTML = feeds.map(feed => ` <div class="rss-feed"><h3><a href="${feed.sourceUrl}" target="_blank" class="source-link">${feed.source}</a></h3> ${feed.articles.map(article => `<div class="rss-article"><h4><a href="${article.link}" target="_blank">${article.title}</a></h4><p>${new Date(article.date).toLocaleDateString()}</p></div>`).join('')} </div>`).join('');
            } else { console.warn("main.ts: Element '.rss-feed-container' not found."); }
        } catch (error) { console.error('main.ts: Erreur lors du chargement des flux RSS:', error); }
    }
    public toggleView(view: 'forum' | 'main'): void { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log(`main.ts: toggleView to ${view}`);
        const mainContent = document.getElementById('main-content') as HTMLElement;
        const forumContent = document.getElementById('forum-content') as HTMLElement;
        if (!mainContent || !forumContent) { console.error("main.ts: Elements 'main-content' or 'forum-content' not found for toggleView."); return; }
        if (view === 'forum') { mainContent.style.display = 'none'; forumContent.style.display = 'block'; this.loadForumTopics(); if (history.state?.view !== 'forum' || history.state?.topicId) history.pushState({ view: 'forum' }, '', '#forum');
        } else { mainContent.style.display = 'block'; forumContent.style.display = 'none'; if (history.state?.view !== 'main') history.pushState({ view: 'main' }, '', '#'); }
    }
    public async loadForumTopics(): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin et la modif pour les listeners sur topics) ... */ 
        console.log("main.ts: loadForumTopics triggered");
        try {
            const response = await fetch(`${this.baseUrl}/api/forum/topics`); if (!response.ok) throw new Error(`Topic fetch failed: ${response.status}`);
            const topics: Topic[] = await response.json(); const container = document.getElementById('topicsList') as HTMLElement;
            if (container) {
                container.innerHTML = topics.map(topic => ` <div class="forum-topic" data-topic-id="${topic.id}"> <div class="topic-header"> <div><h3 class="topic-title">${topic.title}</h3><div class="topic-meta">Par ${topic.userName} • ${this.formatDate(topic.createdAt)}</div></div> <div class="topic-stats"><span><i class="fas fa-comments"></i> ${topic.postCount} messages</span> ${topic.lastPostDate ? `<span>Dernier message ${this.formatDate(topic.lastPostDate)}</span>` : ''}</div> </div></div>`).join('');
                container.querySelectorAll('.forum-topic').forEach(el => { el.addEventListener('click', () => { const topicId = (el as HTMLElement).dataset.topicId; if (topicId) this.openTopic(parseInt(topicId)); }); });
            } else { console.warn("main.ts: Element 'topicsList' not found."); }
            const newTopicButton = document.getElementById('newTopicButton') as HTMLElement; if (newTopicButton) newTopicButton.style.display = isAuthenticated ? 'block' : 'none';
        } catch (error) { console.error('main.ts: Erreur lors du chargement des sujets:', error); }
    }
    public async openTopic(id: number): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log(`main.ts: openTopic ${id}`);
        currentTopicId = id;
        try {
            history.pushState({ view: 'forum', topicId: id }, '', `#forum/topic/${id}`);
            const response = await fetch(`${this.baseUrl}/api/forum/topics/${id}`); if (!response.ok) throw new Error(`Fetch topic ${id} failed: ${response.status}`);
            const data: TopicDetails = await response.json(); const topicContentEl = document.getElementById('topicContent') as HTMLElement;
            if (topicContentEl && data.posts.length > 0) { topicContentEl.innerHTML = `<div class="topic-view"><h2>${data.topic.title}</h2> <div class="topic-meta">Par ${data.topic.userName} • ${this.formatDate(data.topic.createdAt)}</div> <p>${data.posts[0].content}</p></div>`; } 
            else if (topicContentEl) topicContentEl.innerHTML = 'Impossible de charger le sujet.'; else console.warn("main.ts: Element 'topicContent' not found.");
            const repliesContainer = document.getElementById('topicReplies') as HTMLElement;
            if (repliesContainer) { repliesContainer.innerHTML = data.posts.slice(1).map(post => ` <div class="topic-reply"><div class="reply-meta">Par ${post.userName} • ${this.formatDate(post.createdAt)}</div> <div class="reply-content">${post.content}</div></div>`).join(''); } 
            else console.warn("main.ts: Element 'topicReplies' not found.");
            const replyForm = document.getElementById('replyForm') as HTMLElement; if (replyForm) replyForm.style.display = isAuthenticated ? 'block' : 'none';
            const forumTopicsList = document.getElementById('forumTopicsList') as HTMLElement; const forumTopicDetails = document.getElementById('forumTopicDetails') as HTMLElement;
            if (forumTopicsList && forumTopicDetails) { forumTopicsList.style.display = 'none'; forumTopicDetails.style.display = 'block'; } 
            else console.warn("main.ts: Forum list/details containers not found for openTopic.");
        } catch (error) { console.error(`main.ts: Erreur lors de l'ouverture du sujet ${id}:`, error); }
    }
    public async createNewTopic(event: Event): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        event.preventDefault();
        console.log("main.ts: createNewTopic triggered");
        if (!isAuthenticated || !currentUser) { alert('Vous devez être connecté pour créer un sujet'); return; }
        const titleInput = document.getElementById('topicTitle') as HTMLInputElement; const contentInput = document.getElementById('topicContent') as HTMLTextAreaElement;
        if (!titleInput || !contentInput) { console.error("main.ts: New topic form inputs not found."); return; }
        const title = titleInput.value.trim(); const content = contentInput.value.trim(); if (!title || !content) { alert('Veuillez remplir tous les champs'); return; }
        try {
            const topicData: CreateTopicData = { title, content, userId: currentUser.id, userName: currentUser.name };
            const response = await fetch(`${this.baseUrl}/api/forum/topics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(topicData) });
            const data: ApiResponse = await response.json();
            if (response.ok) { this.closeModal('newTopic'); const form = document.getElementById('newTopicForm') as HTMLFormElement; if (form) form.reset(); this.loadForumTopics(); } 
            else { console.error('main.ts: Erreur du serveur:', data); alert(data.error || `Erreur création sujet. Code: ${response.status}`); }
        } catch (error) { console.error('main.ts: Erreur:', error); alert('Erreur lors de la création du sujet'); }
    }
    public async addReply(event: Event): Promise<void> { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        event.preventDefault();
        console.log("main.ts: addReply triggered");
        if (!isAuthenticated || !currentUser || !currentTopicId) { alert('Vous devez être connecté pour répondre'); return; }
        const contentInput = document.getElementById('replyContent') as HTMLTextAreaElement; if (!contentInput) { console.error("main.ts: Reply content textarea not found."); return; }
        const content = contentInput.value.trim(); if (!content) { alert('Veuillez saisir un contenu pour votre réponse'); return; }
        try {
            const postData: CreatePostData = { content, userId: currentUser.id, userName: currentUser.name };
            const response = await fetch(`${this.baseUrl}/api/forum/topics/${currentTopicId}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
            if (response.ok) { contentInput.value = ''; this.openTopic(currentTopicId); } 
            else { const data: ApiResponse = await response.json(); alert(data.error || 'Erreur ajout réponse'); }
        } catch (error) { console.error('main.ts: Erreur:', error); alert('Erreur lors de l\'ajout de la réponse'); }
    }
    public showTopicsList(): void { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log("main.ts: showTopicsList triggered");
        const forumTopicsList = document.getElementById('forumTopicsList') as HTMLElement;
        const forumTopicDetails = document.getElementById('forumTopicDetails') as HTMLElement;
        if (forumTopicsList && forumTopicDetails) { forumTopicsList.style.display = 'block'; forumTopicDetails.style.display = 'none'; } 
        else console.warn("main.ts: Forum list/details containers not found for showTopicsList.");
        currentTopicId = null; history.pushState({ view: 'forum' }, '', '#forum'); this.loadForumTopics();
    }
    public formatDate(dateStr: string): string { /* ... (inchangé) ... */ const date = new Date(dateStr); const now = new Date(); const diff = now.getTime() - date.getTime(); const days = Math.floor(diff / (1000 * 60 * 60 * 24)); if (days === 0) { const hours = Math.floor(diff / (1000 * 60 * 60)); if (hours === 0) { const minutes = Math.floor(diff / (1000 * 60)); return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`; } return `il y a ${hours} heure${hours > 1 ? 's' : ''}`; } if (days < 7) { return `il y a ${days} jour${days > 1 ? 's' : ''}`; } return date.toLocaleDateString(); }
    private updateUIAfterLogin(user: User): void { /* ... (inchangé) ... */ isAuthenticated = true; currentUser = user; const authButtons = document.getElementById('auth-buttons') as HTMLElement; if (authButtons) authButtons.style.display = 'none'; const userMenu = document.getElementById('user-menu') as HTMLElement; if (userMenu) userMenu.style.display = 'block'; const userName = document.getElementById('user-name') as HTMLElement; if (userName) userName.textContent = user.name; const newTopicButton = document.getElementById('newTopicButton') as HTMLElement; if (newTopicButton) newTopicButton.style.display = 'block'; const dropdownMenu = document.querySelector('#user-menu .dropdown-menu') as HTMLElement; if (dropdownMenu) dropdownMenu.classList.remove('show'); }
    public initResourceSearch(): void { /* ... (inchangé, mais ajouter des logs si besoin) ... */ 
        console.log("main.ts: initResourceSearch triggered");
        const searchInput = document.getElementById('resourceSearch') as HTMLInputElement; if (!searchInput) { console.warn("main.ts: Resource search input not found."); return; }
        searchInput.addEventListener('input', () => { const searchTerm = searchInput.value.toLowerCase().trim(); const resourceItems = document.querySelectorAll('.resource-item') as NodeListOf<HTMLElement>; resourceItems.forEach(section => { const items = section.querySelectorAll('li') as NodeListOf<HTMLElement>; let hasVisibleItems = false; items.forEach(item => { const text = item.textContent?.toLowerCase() || ''; if (searchTerm === '' || text.includes(searchTerm)) { item.style.display = ''; hasVisibleItems = true; } else { item.style.display = 'none'; } }); section.style.display = hasVisibleItems ? '' : 'none'; }); });
    }

    private setupEventListeners(): void {
        console.log("main.ts: setupEventListeners called");
        document.querySelectorAll('a[href^="#"]:not([href="#"]):not([href^="#forum"])').forEach(anchor => {
            anchor.addEventListener('click', (e: Event) => {
                const href = (anchor as HTMLAnchorElement).getAttribute('href'); if (!href) return;
                const targetId = href.substring(1); const targetElement = document.getElementById(targetId);
                const mainContent = document.getElementById('main-content');
                if (targetElement && mainContent && mainContent.style.display !== 'none') {
                    console.log(`main.ts: Smooth scrolling to ${href}`);
                    e.preventDefault(); targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        const loginForm = document.getElementById('loginForm') as HTMLFormElement; if (loginForm) loginForm.addEventListener('submit', this.handleLogin.bind(this)); else console.warn("main.ts: Login form not found for event listener setup.");
        const registerForm = document.getElementById('registerForm') as HTMLFormElement; if (registerForm) registerForm.addEventListener('submit', this.handleRegister.bind(this)); else console.warn("main.ts: Register form not found for event listener setup.");
        const newTopicForm = document.getElementById('newTopicForm') as HTMLFormElement; if (newTopicForm) newTopicForm.addEventListener('submit', this.createNewTopic.bind(this)); else console.warn("main.ts: New topic form not found for event listener setup.");
        const newReplyForm = document.getElementById('newReplyForm') as HTMLFormElement; if (newReplyForm) newReplyForm.addEventListener('submit', this.addReply.bind(this)); else console.warn("main.ts: New reply form not found for event listener setup.");
    }

    private setupNavigation(): void {
        console.log("main.ts: setupNavigation called");
        const navLinks = document.querySelectorAll('.nav-links a');
        if (navLinks.length === 0) { console.warn("main.ts: Navigation links (.nav-links a) not found."); }
        navLinks.forEach(link => {
            link.addEventListener('click', (e: Event) => {
                const anchorElement = link as HTMLAnchorElement; const href = anchorElement.getAttribute('href'); if (!href) return;
                e.preventDefault(); const targetId = href.substring(1);
                console.log(`main.ts: Nav link clicked: ${href}`);
                if (targetId === 'forum') { this.toggleView('forum'); } 
                else { this.toggleView('main'); setTimeout(() => { const section = document.getElementById(targetId); if (section) section.scrollIntoView({ behavior: 'smooth' }); else console.warn(`main.ts: Section ID '${targetId}' not found for nav.`); }, 0); }
            });
        });
        window.addEventListener('popstate', (e: PopStateEvent) => { 
            console.log("main.ts: Popstate event:", e.state);
            if (e.state) { if (e.state.view === 'forum') { this.toggleView('forum'); if (e.state.topicId) this.openTopic(e.state.topicId); else this.showTopicsList(); } else { this.toggleView('main'); } } 
            else { if (window.location.hash === '#forum') this.toggleView('forum'); else this.toggleView('main'); }
        });
    }

    private setupModals(): void {
        console.log("main.ts: setupModals called");
        const loginButton = document.getElementById('loginButton'); if (loginButton) loginButton.addEventListener('click', (e) => { e.stopPropagation(); this.openModal('login'); }); else console.warn("main.ts: Login button not found.");
        const registerButton = document.getElementById('registerButton'); if (registerButton) registerButton.addEventListener('click', (e) => { e.stopPropagation(); this.openModal('register'); }); else console.warn("main.ts: Register button not found.");
        const actualCreateTopicBtn = document.getElementById('createTopicButton'); if (actualCreateTopicBtn) actualCreateTopicBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openModal('newTopic'); }); else console.warn("main.ts: Create topic button ('createTopicButton') not found.");

        document.querySelectorAll('.modal .close').forEach(button => {
            const modal = button.closest('.modal') as HTMLElement;
            if (modal && modal.id) {
                const modalType = modal.id.replace('Modal', '');
                if (button.getAttribute('onclick')) button.removeAttribute('onclick');
                button.addEventListener('click', (e) => { e.stopPropagation(); this.closeModal(modalType); });
            } else { console.warn("main.ts: Modal or modal ID not found for close button: ", button); }
        });
        window.addEventListener('click', (event: Event) => { // Click outside modal
            const target = event.target as HTMLElement;
            if (target.classList.contains('modal') && target.style.display === 'block') {
                if (this.isClickOnColorWheelOrItsToggle(target)) { /* console.log("main.ts: Click on modal, but it's on color wheel, not closing modal."); */ return; }
                console.log(`main.ts: Click outside detected on modal ${target.id}, closing.`);
                target.style.display = 'none';
            }
        });
    }

    private setupUserMenu(): void {
        console.log("main.ts: setupUserMenu called");
        const userButton = document.getElementById('user-button');
        const dropdownMenu = document.querySelector('#user-menu .dropdown-menu') as HTMLElement;
        const logoutButton = document.getElementById('logout-button');

        if (!userButton || !dropdownMenu) { console.warn("main.ts: User menu button or dropdown not found."); return; }
        userButton.addEventListener('click', (event: Event) => { event.stopPropagation(); dropdownMenu.classList.toggle('show'); console.log("main.ts: User menu toggled."); });
        
        document.addEventListener('click', (event: Event) => { // Click outside user menu
            const target = event.target as HTMLElement;
            if (dropdownMenu.classList.contains('show')) {
                if (!userButton.contains(target) && !dropdownMenu.contains(target)) {
                    if (this.isClickOnColorWheelOrItsToggle(target)) { /* console.log("main.ts: Click on user menu, but it's on color wheel, not closing menu."); */ return; }
                    console.log("main.ts: Click outside user menu, closing.");
                    dropdownMenu.classList.remove('show');
                }
            }
        });
        if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.stopPropagation(); this.handleLogout(); }); } 
        else console.warn("main.ts: Logout button not found.");
    }

    private setupSidebar(): void {
        console.log("main.ts: setupSidebar called");
        const toggleSidebarBtn = document.getElementById('toggleSidebar');
        const sidebar = document.querySelector('.sidebar') as HTMLElement;
        if (!toggleSidebarBtn || !sidebar) { console.warn("main.ts: Toggle sidebar button or sidebar element not found."); return; }

        toggleSidebarBtn.addEventListener('click', (event: Event) => { event.stopPropagation(); sidebar.classList.toggle('open'); console.log("main.ts: Sidebar toggled.");});
        
        document.addEventListener('click', (event: Event) => { // Click outside sidebar
            const target = event.target as HTMLElement;
            if (sidebar.classList.contains('open')) {
                if (!sidebar.contains(target) && target !== toggleSidebarBtn && !toggleSidebarBtn.contains(target)) {
                    if (this.isClickOnColorWheelOrItsToggle(target)) { /* console.log("main.ts: Click on sidebar, but it's on color wheel, not closing sidebar."); */ return; }
                    console.log("main.ts: Click outside sidebar, closing.");
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    public init(): void {
        console.log("main.ts: ForumApp.init() started.");
        this.setupEventListeners(); this.setupNavigation(); this.setupModals();
        this.setupUserMenu(); this.setupSidebar(); this.initResourceSearch();
        this.loadRSSFeeds();

        const currentHash = window.location.hash;
        console.log("main.ts: Current hash on init:", currentHash);
        if (currentHash.startsWith('#forum/topic/')) { const topicIdStr = currentHash.substring('#forum/topic/'.length); const topicId = parseInt(topicIdStr, 10); if (!isNaN(topicId)) { this.toggleView('forum'); this.openTopic(topicId); } else { this.toggleView('forum'); } } 
        else if (currentHash === '#forum') { this.toggleView('forum'); } 
        else if (currentHash && currentHash !== '#') { this.toggleView('main'); const sectionId = currentHash.substring(1); const section = document.getElementById(sectionId); if (section) setTimeout(() => section.scrollIntoView({ behavior: 'auto' }), 50); else console.warn(`main.ts: Section ID '${sectionId}' from hash not found on init.`); } 
        else { this.toggleView('main'); }
        console.log("main.ts: ForumApp.init() completed.");
    }
}

console.log("main.ts: Script start.");

const forumApp = new ForumApp();
window.forumAppInstance = forumApp; // For debugging
window.openModal = forumApp.openModal.bind(forumApp);
window.closeModal = forumApp.closeModal.bind(forumApp);
window.openNewTopicModal = () => forumApp.openModal('newTopic');
window.showTopicsList = forumApp.showTopicsList.bind(forumApp);
window.toggleView = forumApp.toggleView.bind(forumApp);

async function initializeAppAndColorWheel() {
    console.log("main.ts: initializeAppAndColorWheel called.");
    // Initialiser l'application principale
    console.log("main.ts: Initializing ForumApp via forumApp.init()...");
    try {
        forumApp.init();
        console.log("main.ts: ForumApp.init() finished successfully from initializeAppAndColorWheel.");
    } catch (e) {
        console.error("main.ts: Error during forumApp.init() from initializeAppAndColorWheel:", e);
    }

    // Ensuite, initialiser la roue des couleurs
    console.log("main.ts: Attempting to initialize Copic colors and draw wheel...");
    try {
        const resolvedMaxSegment = await getCopicInitializationPromise();
        console.log("main.ts: Copic colors initialized via promise, maxColorSegment:", resolvedMaxSegment);

        // Pas besoin d'attendre DOMContentLoaded ici si cette fonction est appelée DANS DOMContentLoaded
        drawCopicColorWheel(new Point(0,0), 30, 10, 0.1, resolvedMaxSegment);
        console.log("main.ts: drawCopicColorWheel has been called successfully.");

    } catch (error) {
        console.error("main.ts: Failed during Copic color initialization or wheel drawing:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("main.ts: EVENT - DOMContentLoaded triggered.");
    initializeAppAndColorWheel();
});

console.log("main.ts: Script execution finished (reached end of file). Event listeners are set up.");
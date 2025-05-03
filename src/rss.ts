type Article = {
   title: string;
   link: string;
   date: string | null;
 };
 
 type SourceFeed = {
   source: string;
   articles: Article[];
 };
 
 export function startRss(){
   
 async function fetchRSS(): Promise<SourceFeed[]> {
   const res = await fetch("/api/rss");
   if (!res.ok) throw new Error("Erreur lors du chargement du flux RSS");
   return await res.json();
 }
 
 function renderArticles(feeds: SourceFeed[]) {
   const container = document.getElementById("rss-container");
   if (!container) return;
 
   container.innerHTML = "";
 
   feeds.forEach(feed => {
     const sourceTitle = document.createElement("h2");
     sourceTitle.textContent = feed.source;
     container.appendChild(sourceTitle);
 
     feed.articles.forEach(article => {
       const articleDiv = document.createElement("div");
       articleDiv.className = "article";
 
       const title = document.createElement("h3");
       const link = document.createElement("a");
       link.href = article.link;
       link.target = "_blank";
       link.textContent = article.title;
 
       title.appendChild(link);
       articleDiv.appendChild(title);
 
       if (article.date) {
         const date = document.createElement("p");
         date.textContent = `Publié le : ${new Date(article.date).toLocaleDateString()}`;
         articleDiv.appendChild(date);
       }
 
       container.appendChild(articleDiv);
     });
   });
 }
 
 fetchRSS()
   .then(renderArticles)
   .catch(err => {
     console.error(err);
     document.getElementById("rss-container")!.textContent = "Impossible de charger les articles.";
   });
 }
export function initTimeline(){

   const timelineData: Record<string, { title: string; content: string }> = {
      "2020": {
        title: "2020 - Début du projet",
        content: "Lancement du projet HvMI par une petite équipe passionnée."
      },
      "2021": {
        title: "2021 - Première version",
        content: "La version bêta publique est lancée avec les fonctionnalités de base."
      },
      "2022": {
        title: "2022 - Fonctionnalité Forum",
        content: "Ajout du forum communautaire pour échanger et signaler les bugs."
      },
      "2023": {
        title: "2023 - Refonte UI",
        content: "Nouvelle interface utilisateur plus moderne et responsive."
      }
    };
    
    const nodes = document.querySelectorAll(".timeline-node");
    const detailBox = document.getElementById("timeline-details")!;
    const titleEl = document.getElementById("details-title")!;
    const contentEl = document.getElementById("details-content")!;
    
    console.log("fonction appelé")
    nodes.forEach(node => {
      node.addEventListener("click", () => {
        const year = node.getAttribute("data-year");
        if (year && timelineData[year]) {
          titleEl.textContent = timelineData[year].title;
          contentEl.textContent = timelineData[year].content;
          detailBox.classList.remove("invisible");
          console.log("fonction appelé")
        }
      });
    });
}
 
import { initConnectListener} from './connect';
import { startRss } from './rss';
import './style.css'
import { initTimeline } from './timeline';
//import { startListenerWheel } from './wheel';

// VITE

window.addEventListener('DOMContentLoaded',main)

var overlay:HTMLElement = document.getElementById("overlay")!;
var modals:NodeListOf<HTMLElement> = document.querySelectorAll('.modal')!;
const allMainPages:NodeListOf<HTMLElement> = document.querySelectorAll(".mainPage");


overlay.addEventListener("click", () => modals.forEach(element => {
    closeModal(element);
}));

function main():void{
  try{
    initConnectListener();
    //startListenerWheel();
    initTimeline();
    initListenerOnMain();
    startRss();
    console.log("start lancé");
  }catch(error){
    console.error(error);
  }

}



export function initModal(modal:HTMLElement):void{
  modal.style.visibility = "visible";
  overlay.style.visibility = "visible";
}

function closeModal(modal:HTMLElement):void{
  modal.style.visibility = "hidden";
  overlay.style.visibility = "hidden";
}

function initListenerOnMain():void{
  let accueil:HTMLElement = document.getElementById("Accueil")!;
  let forum:HTMLElement = document.getElementById("Forum")!;
  let articles:HTMLElement = document.getElementById("Articles")!; 

  let goToAccueil:HTMLElement = document.getElementById("logo")!;
  let goToForum:HTMLElement = document.getElementById("goToForum")!;
  let goToArticles:HTMLElement = document.getElementById("goToArticles")!;

  goToAccueil.addEventListener("click", () => invisibleToVisible(accueil) );
  goToForum.addEventListener("click", () => invisibleToVisible(forum));
  goToArticles.addEventListener("click", () => invisibleToVisible(articles));
}

function invisibleToVisible(mainPage:HTMLElement):void{
  allMainPages.forEach(element => {
    element.classList.toggle("invisible",true);    
  });
  mainPage.classList.toggle("invisible", false);
}
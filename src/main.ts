import { initConnectListener } from './connect';
import './style.css'
import { startListenerWheel } from './wheel';

// VITE

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
`
var overlay:HTMLElement = document.getElementById("overlay")!;
var modals:NodeListOf<HTMLElement> = document.querySelectorAll('.modal')!;

overlay.addEventListener("click", () => modals.forEach(element => {
  closeModal(element);
}));

export function initModal(modal:HTMLElement){
    modal.style.visibility = "visible";
    overlay.style.visibility = "visible";
}

function closeModal(modal:HTMLElement){
    modal.style.visibility = "hidden";
    overlay.style.visibility = "hidden";
}

initConnectListener();
startListenerWheel();
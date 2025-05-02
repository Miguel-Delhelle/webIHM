import { initConnectListener } from './connect';
import './style.css'
import { startListenerWheel } from './wheel';

// VITE

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
`

export function initModal(modal:HTMLElement){
  if (modal.style.visibility = "hidden"){
    modal.style.visibility = "visible";
  }
}

/*function closeModal(modal:HTMLElement){
  if (modal.style.visibility = "visible"){
    modal.style.visibility = "hidden"
  }
} */

initConnectListener();
startListenerWheel();
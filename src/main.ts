import { initConnectListener } from './connect';
import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'

// VITE

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
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
//import path from "path";
import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

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

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)


// Server
/*
export const app= express();

const port:number = 1956;

app.listen(port, () => {
   console.log(`http://localhost:${port}`)
 })

app.get('/', function(req, response) {
   response.sendFile(path.join(__dirname,"..","..","html","main.html"));
});

app.get('/main.js', function(req, response) {
   response.sendFile(path.join(__dirname,"main.js"));
});  */

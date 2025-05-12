import { initConnectListener } from './connect';
import './style.css'
import { drawCopicColorWheel } from './Section1_ColorWheel';
import { Point } from './Point';
//import { startListenerWheel } from './wheel';

// VITE

document.querySelector<HTMLDivElement>('#app')!.innerHTML = ``

var cssRoot = document.querySelector(':root')! as HTMLElement;

export function getCSSproperty(propertyName: string): string {
  var rs = getComputedStyle(cssRoot);
  return rs.getPropertyValue(propertyName);
}

export function setCSSProperty(propertyName: string, value: string): void {
  cssRoot.style.setProperty(propertyName, value);
}

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
drawCopicColorWheel(new Point(0,100), 30, 10, 0.1);
//drawCopicColorWheel(new Point(0,parseInt(getCSSproperty('--eth-header').replace(/\D/g,""))), 80, 30);
//startListenerWheel();
import { Point } from "./Point";

var cssRoot = document.querySelector(':root') as HTMLElement;

//@ts-ignore
function getCSSproperty(propertyName: string): string {
  var rs = getComputedStyle(cssRoot);
  return rs.getPropertyValue(propertyName);
} 

function setCSSProperty(propertyName: string, value: string): void {
  cssRoot.style.setProperty(propertyName, value);
}

interface CopicColor {
  name: string,
  link: string,
  number: string,
  imgURL: string,
  extractedColor: string,
  fileName: string,
  hex: string,
  family: string
};
export var COPICCOLOR_FAMILIES: {[k: string]: CopicColor[]} = {};

let internalMaxColorSegment: number = 0;
let copicColorsInitializedPromise: Promise<number>;

async function initCopicColorsInternal(): Promise<number> {
  async function loadCopicColors(): Promise<CopicColor[]> {
    const file: string = '/data/colors.json';
    const res: Response = await fetch(file);
    if(!res.ok) throw new Error(`Failed to load COPIC colors from '${file}'...`);
    return await res.json();
  }

  function groupAndSortColors(colors: CopicColor[]): void {
    let maxSegment = 0;
    COPICCOLOR_FAMILIES = {}; // Réinitialiser au cas où cette fonction est appelée plusieurs fois

    for(let color of colors) {
      let n: string = color.number.replace(/\W/g, "");
      const f: string = color.family;
      const s: string = n.substring(0,f.length+1);
      if(COPICCOLOR_FAMILIES[s] === undefined)
        COPICCOLOR_FAMILIES[s] = [color];
      else
        COPICCOLOR_FAMILIES[s].push(color);
    }

    for(let f in COPICCOLOR_FAMILIES) {
      maxSegment = Math.max(maxSegment, COPICCOLOR_FAMILIES[f].length);
      COPICCOLOR_FAMILIES[f].sort((a,b) => {
        const na: number = parseInt(a.number.replace(/\W/g, "").substring(f.length));
        const nb: number = parseInt(b.number.replace(/\W/g, "").substring(f.length));
        return na - nb;
      });
    }
    internalMaxColorSegment = maxSegment;
  }

  groupAndSortColors(await loadCopicColors());
  console.log("Section1_ColorWheel.ts: Copic Colors Initialized internally, max segment:", internalMaxColorSegment);
  console.log("Section1_ColorWheel.ts: COPICCOLOR_FAMILIES after init:", COPICCOLOR_FAMILIES);
  return internalMaxColorSegment;
}

copicColorsInitializedPromise = initCopicColorsInternal();

export function getCopicInitializationPromise(): Promise<number> {
    return copicColorsInitializedPromise;
}

interface RGBcolor {R: number, G: number, B: number};
interface HSLcolor {H: number, S: number, L: number};

var isDragging: boolean = false;
var lastAngle: number = 0;
var currentRotation: number = 0;
let velocity: number = 0;
let lastTimestamp: number = 0;
let movedEnoughToDrag: boolean = false;
let dragThreshold: number = 5;
let initialDragPt: DOMPoint | null = null;
let lastColorPicked: SVGPathElement|null = null;

const toggle = document.getElementById("hemisphere-toggle") as HTMLDivElement;
const wheelOuterContainer = document.getElementById("wheel-container") as HTMLDivElement; // Renommé pour clarté
var svg = document.getElementById("wheel-svg") as SVGSVGElement|null;

if (svg === null && wheelOuterContainer) {
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "wheel-svg");
  wheelOuterContainer.appendChild(svg);
} else if (!wheelOuterContainer) {
    console.error("Section1_ColorWheel.ts: 'wheel-container' not found in DOM.");
}


function RGBtoHSL(rgb: RGBcolor): HSLcolor {
  var r: number = rgb.R; var g: number = rgb.G; var b: number = rgb.B;
  const rNorm = r / 255; const gNorm = g / 255; const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm); const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min; let h = 0; let s = 0; const l = (max + min) / 2;
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
    else h = (rNorm - gNorm) / delta + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
    s = delta / (1 - Math.abs(2 * l - 1));
  }
  return { H: Math.round(h), S: Math.round(s * 100), L: Math.round(l * 100) };
}

function HEXtoRGB(hex: string): RGBcolor {
  const num: number = parseInt(hex.substring(1), 16);
  return { R: (num >> 16) & 255, G: (num >> 8) & 255, B: num & 255 };
}

let isWheelExpanded: boolean = false; // Variable d'état pour la roue, renommée pour clarté

export async function drawCopicColorWheel(
  svgTopLeftCorner: Point,
  cwRadius: number,
  cwTileWidth: number,
  cwTileSpacing: number = 0,
  cwTilenumber: number
): Promise<void> {

  const cwCenterPt: Point = new Point(); // (0,0) pour le système de coordonnées interne du SVG
  let cw: SVGElement; // Déclaré ici pour être accessible par les fonctions internes

  function createCCWfamilySegment(angStart: number, angEnd: number, fsCopicColors: CopicColor[]): SVGElement {
    function createCCWTile(color: CopicColor, i: number): void { // Ne retourne rien, ajoute directement à `cw`
      const angMid: number = (angStart+angEnd)/2;
      const srad: number = cwRadius+cwTileWidth*i+cwTileSpacing;
      const erad: number = cwRadius+cwTileWidth*(i+1)-cwTileSpacing;
      const trad: number = (srad+erad)/2;
      const ptA_0: Point = cwCenterPt.polarPt(srad,angStart);
      const ptA_1: Point = cwCenterPt.polarPt(erad,angStart);
      const ptB_0: Point = cwCenterPt.polarPt(srad,angEnd);
      const ptB_1: Point = cwCenterPt.polarPt(erad,angEnd);
      const ptT: Point = cwCenterPt.polarPt(trad,angMid);
      
      const ccfForAngle = Object.keys(COPICCOLOR_FAMILIES).filter(f => COPICCOLOR_FAMILIES[f] && COPICCOLOR_FAMILIES[f].length > 1);
      const wheelAnglePerFamily: number = (2*Math.PI) / (ccfForAngle.length > 0 ? ccfForAngle.length : 1) ;
      const largeArcFlag: number = wheelAnglePerFamily > Math.PI ? 1:0; // Basé sur l'angle d'un segment de famille
      const sweepFlag: number = 1;

      const fsTile: SVGPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const path: string = [
        `M ${ptA_0._x} ${ptA_0._y}`,
        `A ${srad} ${srad} 0 ${largeArcFlag} ${sweepFlag} ${ptB_0._x} ${ptB_0._y}`,
        `L ${ptB_1._x} ${ptB_1._y}`,
        `A ${erad} ${erad} 0 ${largeArcFlag} ${sweepFlag} ${ptA_1._x} ${ptA_1._y}`,
        `Z`
      ].join(" ");
      fsTile.setAttribute("d",path);
      fsTile.setAttribute("class","cw-tile scale");
      fsTile.setAttribute("data-code",color.number);
      fsTile.setAttribute("data-name",color.name);
      fsTile.setAttribute("fill", color.hex);
      
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", ptT._x.toFixed(2));
      label.setAttribute("y", ptT._y.toFixed(2));
      label.classList.add("cw-label");
      label.setAttribute("alignment-baseline", "middle");
      label.setAttribute("transform", `rotate(${angMid*(180/Math.PI)} ${ptT._x} ${ptT._y})`);
      label.setAttribute("font-size", `${(cwTileWidth+i)*0.08}px`);
      label.setAttribute("fill", "#000");

      const tspanCode = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspanCode.setAttribute("x", ptT._x.toFixed(2)); tspanCode.setAttribute("dy", "0");
      tspanCode.setAttribute("font-weight", "bold"); tspanCode.textContent = color.number;
      
      const tspanName = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspanName.setAttribute("x", ptT._x.toFixed(2)); tspanName.setAttribute("dy", "1.2em");
      tspanName.textContent = color.name;
      label.appendChild(tspanCode); label.appendChild(tspanName);

      if (cw) { // S'assurer que cw est défini
        cw.appendChild(fsTile);
        cw.appendChild(label);
      } else {
        console.error("Section1_ColorWheel.ts: `cw` (color wheel group) is undefined in createCCWTile.");
      }
    }

    const fsSVGgroup: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    fsCopicColors.forEach((c,i) => { createCCWTile(c,i); });
    return fsSVGgroup;
  }

  function toggleColorWheelUI(value?: boolean): void {
    isWheelExpanded = value !== undefined ? value : !isWheelExpanded;
    if (wheelOuterContainer) wheelOuterContainer.classList.toggle("expanded", isWheelExpanded);
    else console.warn("Section1_ColorWheel.ts: Wheel outer container not found for UI toggle.");
    console.log("Section1_ColorWheel.ts: Wheel expanded state:", isWheelExpanded);
  }

  setCSSProperty('--cw-x', `${svgTopLeftCorner._x}px`);
  setCSSProperty('--cw-y', `${svgTopLeftCorner._y}px`);
  if(!svg) { console.error("Section1_ColorWheel.ts: SVG element for wheel not found in drawCopicColorWheel."); return; }
  
  if (cwTilenumber === 0) {
      console.warn("Section1_ColorWheel.ts: drawCopicColorWheel called with cwTilenumber = 0.");
  }

  const maxRadius: number = cwRadius + cwTileWidth * cwTilenumber;
  console.log("Section1_ColorWheel.ts: Drawing wheel with center:", cwCenterPt, "radius:", cwRadius, "tileWidth:", cwTileWidth, "tileNumber:", cwTilenumber, "maxRadius:", maxRadius);
  svg.setAttribute("viewBox", `${cwCenterPt._x-maxRadius} ${cwCenterPt._y-maxRadius} ${maxRadius*2} ${maxRadius*2}`);
  svg.innerHTML = ''; 
  cw = document.createElementNS("http://www.w3.org/2000/svg", "g"); // Initialise `cw`
  cw.setAttribute('id', 'color-wheel');
  svg.appendChild(cw);

  const ccf: string[] = Object.keys(COPICCOLOR_FAMILIES).filter(f => COPICCOLOR_FAMILIES[f] && COPICCOLOR_FAMILIES[f].length > 1);
  if (ccf.length === 0) {
      console.warn("Section1_ColorWheel.ts: No Copic color families found with >1 color to draw wheel.");
      return;
  }
  const wheelAnglePerFamily: number = (2*Math.PI) / ccf.length;
  console.log("Section1_ColorWheel.ts: Color families for wheel:", ccf);
  
  ccf.forEach((f, i) => {
    const fsStartAngle: number = i*wheelAnglePerFamily+(cwTileSpacing*Math.PI/180);
    const fsEndAngle: number = (i+1)*wheelAnglePerFamily-(cwTileSpacing*Math.PI/180);
    const familySegment: SVGElement = createCCWfamilySegment(fsStartAngle,fsEndAngle,COPICCOLOR_FAMILIES[f]);
    cw.appendChild(familySegment);
  });

  function startDrag(e: MouseEvent): void {
    if (!svg || !isWheelExpanded) return;
    isDragging = true; movedEnoughToDrag = false;
    initialDragPt = svg.createSVGPoint(); initialDragPt.x = e.clientX; initialDragPt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) initialDragPt = initialDragPt.matrixTransform(ctm.inverse());
    else { isDragging = false; return; }
    const angle = Math.atan2(initialDragPt.y - cwCenterPt._y, initialDragPt.x - cwCenterPt._x) * (180 / Math.PI);
    lastAngle = angle; lastTimestamp = performance.now();
  }  
  
  function drag(e: MouseEvent): void {
    if (!isDragging || !svg || !cw || !initialDragPt || !isWheelExpanded) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); let cursorPt: DOMPoint;
    if (ctm) cursorPt = pt.matrixTransform(ctm.inverse()); else return;
    const dx = cursorPt.x - initialDragPt.x; const dy = cursorPt.y - initialDragPt.y;
    if (!movedEnoughToDrag && Math.sqrt(dx * dx + dy * dy) > dragThreshold) movedEnoughToDrag = true;
    if (!movedEnoughToDrag) return;
    const angle = Math.atan2(cursorPt.y - cwCenterPt._y, cursorPt.x - cwCenterPt._x) * (180 / Math.PI);
    const now = performance.now(); const deltaTime = now - lastTimestamp;
    if (deltaTime === 0) return;
    const deltaAngle = angle - lastAngle; const normDelta = ((deltaAngle + 540) % 360) - 180;
    currentRotation += normDelta; lastAngle = angle; lastTimestamp = now;
    velocity = normDelta / deltaTime;
    cw.setAttribute("transform", `rotate(${currentRotation} ${cwCenterPt._x} ${cwCenterPt._y})`);
  }
  
  function endDrag(e: MouseEvent): void {
    const wasDraggingWithIntent = isDragging && movedEnoughToDrag;
    const targetIsColorTile = e.target instanceof SVGPathElement && (e.target as SVGPathElement).closest('#color-wheel');

    if (!isDragging && !targetIsColorTile) { // If not dragging and not a click on a tile, likely irrelevant mouseup
        isDragging = false; // ensure state is reset
        initialDragPt = null;
        return;
    }
    isDragging = false; 

    if (wasDraggingWithIntent) {
      animateInertia();
      e.stopPropagation(); 
    } else if (targetIsColorTile) {
      handleColorPick(e.target as SVGPathElement);
      // toggleColorWheelUI(false); // Optionnel : fermer la roue au choix
      e.stopPropagation();
    }
    initialDragPt = null;
  }

  function animateInertia(): void {
    if (!cw) return; // cw est le groupe <g id="color-wheel">
    if (!isWheelExpanded && velocity !== 0) { // Si la roue est fermée pendant l'inertie, stopper.
        cw.setAttribute("transform", `rotate(0 ${cwCenterPt._x} ${cwCenterPt._y})`);
        velocity = 0;
        return;
    }
    if (Math.abs(velocity) < 0.01) { velocity = 0; return; } // minVelocity
    const friction = 0.95; let animationFrameId: number;
    function step() {
      if (Math.abs(velocity) < 0.01 || !isWheelExpanded) { // Vérifier aussi isWheelExpanded ici
        velocity = 0; if (animationFrameId) cancelAnimationFrame(animationFrameId); return;
      }
      currentRotation += velocity * 16; velocity *= friction;
      cw.setAttribute("transform", `rotate(${currentRotation} ${cwCenterPt._x} ${cwCenterPt._y})`);
      animationFrameId = requestAnimationFrame(step);
    }
    animationFrameId = requestAnimationFrame(step);
  }

  function handleColorPick(node: SVGPathElement): void {
    if (lastColorPicked) lastColorPicked.classList.remove('active');
    const hex = node.getAttribute('fill'); const name = node.getAttribute('data-name');
    const code = node.getAttribute('data-code');
    if(!hex || !name || !code) return;
    const rgb = HEXtoRGB(hex); const hsl = RGBtoHSL(rgb);
    setCSSProperty('--clr-hue',hsl.H.toString()); setCSSProperty('--clr-sat',hsl.S.toString()+'%');
    setCSSProperty('--clr-lum',hsl.L.toString()+'%');
    console.log(`Section1_ColorWheel.ts: CW - Picked color : ${hex}\n  ${name} (${code})\n  -> RGB: `,rgb,`\n  -> HSL: `,hsl);
    lastColorPicked = node; node.classList.add('active');
  }
  
  // Listeners pour le toggle et le SVG
  if (toggle) {
    toggle.addEventListener("click", (e) => {
        toggleColorWheelUI();
        e.stopPropagation(); // Empêche le clic sur le toggle de propager aux listeners de document (comme handleClickOutsideWheel)
    });
  } else { console.warn("Section1_ColorWheel.ts: Hemisphere toggle button #hemisphere-toggle not found."); }

  if (svg) {
    svg.addEventListener("mousedown", startDrag);
    svg.addEventListener("mousemove", drag); // Pourrait être sur document pour un meilleur UX
    svg.addEventListener("mouseup", endDrag);
    svg.addEventListener("mouseleave", (e) => { if(isDragging) { endDrag(e); } });
  } else { console.error("Section1_ColorWheel.ts: SVG element is null, cannot attach drag listeners.");}

  // Gestion du clic extérieur pour fermer la roue
  // Doit être ajouté UNE SEULE FOIS au document
  const handleClickOutsideWheel = (event: MouseEvent) => {
    if (!isWheelExpanded) return;

    const target = event.target as Node;
    const wheelSvgElement = document.getElementById("wheel-svg"); // Récupérer à chaque fois
    const wheelToggleElement = document.getElementById("hemisphere-toggle"); // Récupérer à chaque fois

    let clickedOnWheelComponent = false;
    if (wheelSvgElement && wheelSvgElement.contains(target)) clickedOnWheelComponent = true;
    if (wheelToggleElement && wheelToggleElement.contains(target)) clickedOnWheelComponent = true;

    if (!clickedOnWheelComponent) {
        console.log("Section1_ColorWheel.ts: Click outside wheel detected, closing.");
        toggleColorWheelUI(false);
        // La propagation est importante ici pour que main.ts ne réagisse pas à ce clic
        // si le clic extérieur est géré par la roue.
        event.stopPropagation(); 
        // event.preventDefault(); // Peut-être nécessaire dans certains cas
    }
  };

  // S'assurer que ce listener n'est ajouté qu'une fois globalement
  if (!(document as any)._colorWheelHandleClickOutsideAttached) {
    document.addEventListener('mousedown', handleClickOutsideWheel, true); // PHASE DE CAPTURE
    (document as any)._colorWheelHandleClickOutsideAttached = true;
    console.log("Section1_ColorWheel.ts: Attached handleClickOutsideWheel listener to document.");
  }
}
console.log("Section1_ColorWheel.ts: Script loaded and initial Copic color loading started.");
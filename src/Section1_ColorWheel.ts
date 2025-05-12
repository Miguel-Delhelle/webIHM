import { setCSSProperty } from "./main";
import { Point } from "./Point";

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
export var maxColorSegment: number = await initCopicColors();
console.log(COPICCOLOR_FAMILIES);
interface RGBcolor {R: number, G: number, B: number};
interface HSLcolor {H: number, S: number, L: number};

var isDragging: boolean = false;
var lastAngle: number = 0;
var currentRotation: number = 0;
let velocity: number = 0;           // Current angular velocity (deg/ms)
let lastTimestamp: number = 0;      // Timestamp of last mousemove
let movedEnoughToDrag: boolean = false;
let dragThreshold: number = 5; // Minimum pixels to consider as a drag
let initialDragPt: DOMPoint | null = null;

const toggle = document.getElementById("hemisphere-toggle") as HTMLDivElement;
const container = document.getElementById("wheel-container") as HTMLDivElement;
var svg = document.getElementById("wheel-svg") as SVGSVGElement|null;
if (svg === null) {
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", "wheel-svg");
  container.appendChild(svg);
}

async function initCopicColors(): Promise<number> {
  async function loadCopicColors(): Promise<CopicColor[]> {
    const file: string = '/data/colors.json';
    const res: Response = await fetch(file);
    if(!res.ok) throw new Error(`Failed to load COPIC colors from '${file}'...`);
    return await res.json();
  }

  function groupAndSortColors(colors: CopicColor[]): void {
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
      maxColorSegment = Math.max(maxColorSegment, COPICCOLOR_FAMILIES[f].length);
      COPICCOLOR_FAMILIES[f].sort((a,b) => {
        const na: number = parseInt(a.number.replace(/\W/g, "").substring(f.length));
        const nb: number = parseInt(b.number.replace(/\W/g, "").substring(f.length));
        return na - nb;
      });
    }
  }

  var maxColorSegment: number = 0;
  groupAndSortColors(await loadCopicColors());
  return maxColorSegment;
}
/*
function RGBtoHSL(rgb: RGBcolor): HSLcolor {
  var r: number = rgb.R;
  var g: number = rgb.G;
  var b: number = rgb.B;
  r /= 255, g /= 255, b /= 255;
  var max: number = Math.max(r,g,b);
  var min: number = Math.min(r,g,b);
  var h: number = (max+min)/2;
  var s: number = (max+min)/2;
  var l: number = (max+min)/2;

  if(max == min) {
    h = s = 0; // achromatic
  } else {
    var d: number = max - min;
    s = l>0.5?d/(2-max-min):d/(max+min);
    switch(max) {
      case r: h = (g-b)/d+(g<b?6:0); break;
      case g: h = (b-r)/d+2; break;
      case b: h = (r-g)/d+4; break;
    }
    h /= 6;
  }

  return {H: h, S: s, L: l};
}
*/
/**
 * Converts an RGB color to HSL.
 * @param rgb Object with r, g, b components (0–255).
 * @returns HSL object with h in degrees (0–360), s and l in percentages (0–100).
 */
function RGBtoHSL(rgb: RGBcolor): HSLcolor {
  var r: number = rgb.R;
  var g: number = rgb.G;
  var b: number = rgb.B;
  // Normalize r, g, b to [0, 1]
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    s = delta / (1 - Math.abs(2 * l - 1));
  }

  return {
    H: Math.round(h),
    S: Math.round(s * 100),
    L: Math.round(l * 100),
  };
}

function HEXtoRGB(hex: string): RGBcolor {
  const num: number = parseInt(hex.substring(1), 16);
  return {
    R: (num >> 16) & 255,
    G: (num >> 8) & 255,
    B: num & 255,
  }
}

export async function drawCopicColorWheel(
  svgTopLeftCorner: Point, 
  cwRadius: number, 
  cwTileWidth: number, 
  cwTilenumber: number = maxColorSegment
): Promise<void> {

  function createCCWfamilySegment(angStart: number, angEnd: number, fsCopicColors: CopicColor[]): SVGElement {

    function createCCWTile(color: CopicColor, i: number): SVGElement {
      const angMid: number = (angStart+angEnd)/2;
      const srad: number = cwRadius+cwTileWidth*i;
      const erad: number = cwRadius+cwTileWidth*(i+1);
      const trad: number = (srad+erad)/2;
      const ptA_0: Point = cwCenterPt.polarPt(srad,angStart);
      const ptA_1: Point = cwCenterPt.polarPt(erad,angStart);
      const ptB_0: Point = cwCenterPt.polarPt(srad,angEnd);
      const ptB_1: Point = cwCenterPt.polarPt(erad,angEnd);
      const ptT: Point = cwCenterPt.polarPt(trad,angMid);
      const largeArcFlag: number = cwAngle>Math.PI?1:0;
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
      label.setAttribute("font-size", `${cwTileWidth*0.1}px`);
      label.setAttribute("fill", "#000"); // Black text for visibility

      const tspanCode = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspanCode.setAttribute("x", ptT._x.toFixed(2));
      tspanCode.setAttribute("dy", "0");
      tspanCode.setAttribute("font-weight", "bold");
      tspanCode.textContent = color.number;
      
      const tspanName = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspanName.setAttribute("x", ptT._x.toFixed(2));
      tspanName.setAttribute("dy", "1.2em");
      tspanName.textContent = color.name;
      label.appendChild(tspanCode);
      label.appendChild(tspanName);

      const cwTile: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
      cw.appendChild(fsTile);
      cw.appendChild(label);
      return cwTile;
    }

    const fsSVGgroup: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // fsSVGgroup.setAttribute(); <- id, class, etc...
    fsCopicColors.forEach((c,i) => {
      fsSVGgroup.appendChild(createCCWTile(c,i));
    });
    return fsSVGgroup;
  }

  function toggleColorWheel(value?: boolean): void {
    isExpanded = value?value:!isExpanded;
    container.classList.toggle("expanded", isExpanded);
  }

  setCSSProperty('--cw-x', `${svgTopLeftCorner._x}px`);
  setCSSProperty('--cw-y', `${svgTopLeftCorner._y}px`);
  if(!svg) return;
  const maxRadius: number = cwRadius+cwTileWidth*cwTilenumber;
  const cwCenterPt: Point = new Point();
  svg.setAttribute("viewBox", `${cwCenterPt._x-maxRadius} ${cwCenterPt._y-maxRadius} ${maxRadius*2} ${maxRadius*2}`);
  svg.innerHTML = '';
  const cw: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
  cw.setAttribute('id', 'color-wheel');
  svg?.appendChild(cw);
  let isExpanded: boolean = false;

  const ccf: string[] = Object.keys(COPICCOLOR_FAMILIES).filter(f => COPICCOLOR_FAMILIES[f].length > 1);
  const cwAngle: number = (2*Math.PI) / ccf.length;
  console.log(ccf);
  
  ccf.forEach((f, i) => {
    const fsStartAngle: number = i * cwAngle;
    const fsEndAngle: number = (i+1) * cwAngle;
    const familySegment: SVGElement = createCCWfamilySegment(fsStartAngle,fsEndAngle,COPICCOLOR_FAMILIES[f]);
    cw.appendChild(familySegment);
  });

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleColorWheel();
  });
  
  function startDrag(e: MouseEvent): void {
    if (!svg) return;
  
    isDragging = true;
    movedEnoughToDrag = false;
    initialDragPt = svg.createSVGPoint();
    initialDragPt.x = e.clientX;
    initialDragPt.y = e.clientY;
    initialDragPt = initialDragPt.matrixTransform(svg.getScreenCTM()?.inverse());
  
    const angle = Math.atan2(initialDragPt.y, initialDragPt.x) * (180 / Math.PI);
    lastAngle = angle;
    lastTimestamp = performance.now();
  }  
  
  function drag(e: MouseEvent): void {
    if (!isDragging || !svg || !cw || !initialDragPt) return;
  
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  
    const dx = cursorPt.x - initialDragPt.x;
    const dy = cursorPt.y - initialDragPt.y;
  
    if (!movedEnoughToDrag && Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
      movedEnoughToDrag = true;
    }
  
    if (!movedEnoughToDrag) return;
  
    const angle = Math.atan2(cursorPt.y, cursorPt.x) * (180 / Math.PI);
    const now = performance.now();
    const deltaTime = now - lastTimestamp;
    const deltaAngle = angle - lastAngle;
    const normDelta = ((deltaAngle + 540) % 360) - 180;
  
    currentRotation += normDelta;
    lastAngle = angle;
    lastTimestamp = now;
  
    velocity = normDelta / deltaTime;
  
    cw.setAttribute("transform", `rotate(${currentRotation} 0 0)`);
  }
  
  function endDrag(e: MouseEvent): void {
    isDragging = false;
    const target = e.target;
    if (movedEnoughToDrag) {
      animateInertia(); // Only rotate if user actually dragged
    } else if(target instanceof SVGPathElement) {
      handleColorPick(target as SVGPathElement); // Treat as a click to pick a color
      toggleColorWheel(false);
    }
  
    initialDragPt = null;
  }

  function animateInertia(): void {
    if (!cw) return;
  
    const friction = 0.95;      // Reduce velocity over time
    const minVelocity = 0.01;   // Stop when below this
  
    function step() {
      if (Math.abs(velocity) < minVelocity) return;
  
      currentRotation += velocity * 16; // 16 ms per frame (approx)
      velocity *= friction;
  
      cw!.setAttribute("transform", `rotate(${currentRotation} 0 0)`);
      requestAnimationFrame(step);
    }
  
    requestAnimationFrame(step);
  }

  function handleColorPick(node: SVGPathElement): void {
    const hex: string|null = node.getAttribute('fill');       // hex code
    const name: string|null = node.getAttribute('data-name'); // color name
    const code: string|null = node.getAttribute('data-code'); // color copic code
    if(!hex || !name || !code) return;
    const rgb: RGBcolor = HEXtoRGB(hex);
    const hsl: HSLcolor = RGBtoHSL(rgb);
    const hue: number = hsl.H;
    setCSSProperty('--clr-hue',hue.toString());
    console.log(`CW - Picked color : ${hex}\n  ${name} (${code})\n  -> HUE: ${hue}`);
    console.log(rgb);
    console.log(hsl);
  }
  
  document.addEventListener("mousedown", (e) => {
    if (
      svg &&
      !svg.contains(e.target as Node) &&
      !toggle.contains(e.target as Node)
    ) {
      e.stopPropagation();
      toggleColorWheel(false);
    }
  }); 
  svg.addEventListener("mousedown", startDrag);
  svg.addEventListener("mousemove", drag);
  svg.addEventListener("mouseup", endDrag);
  svg.addEventListener("mouseleave", endDrag);
}
const toggle = document.getElementById("hemisphere-toggle") as HTMLDivElement;
const container = document.getElementById("wheel-container") as HTMLDivElement;
const svg = document.getElementById("color-wheel") as SVGSVGElement|null;
if (!svg) throw new Error("SVG Element #color-wheel not found");
const FAMILY_ORDER: {[k: string]: CopicColor[]} = {};
let maxColorSegment: number = 0;
let isExpanded: boolean = false;

export function startListenerWheel(){

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleColorWheel();
  });
  
  container.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleColorWheel(false);
  })
  document.addEventListener("click", () => {
    if(isExpanded) toggleColorWheel(false);
  });
  
  drawCopicWheel(200,150);

}


/*
// Draw dummy swatches
const centerX: number = 200;
const centerY: number = 200;
const radius: number = 150;
const dummyColors: string[] = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7",
  "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
  "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
  "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
  "#795548", "#9E9E9E", "#607D8B", "#B0BEC5",
  "#C2185B", "#1976D2", "#00796B", "#F57C00"
];
const swatchCount: number = dummyColors.length;

for (let i: number = 0; i < swatchCount; i++) {
  const angle: number = (2 * Math.PI / swatchCount) * i;
  const x: number = centerX + radius * Math.cos(angle);
  const y: number = centerY + radius * Math.sin(angle);

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", x.toString());
  circle.setAttribute("cy", y.toString());
  circle.setAttribute("r", "18");
  circle.setAttribute("fill", dummyColors[i % dummyColors.length]);
  circle.setAttribute("stroke", "#333");
  circle.setAttribute("stroke-width", "1");

  svg.appendChild(circle);
}
*/
function toggleColorWheel(value?: boolean): void {
  isExpanded = value?value:!isExpanded;
  container.classList.toggle("expanded", isExpanded);
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
}

async function loadCopicColors(): Promise<CopicColor[]> {
  const res = await fetch("/data/colors.json");
  if(!res.ok) throw new Error("Failed to load COPIC colors...");
  return await res.json();
}

function createColorWheelSegment(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  colors: CopicColor[]
): SVGGElement {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  const total = colors.length;
  const step = (endAngle - startAngle) / total;

  colors.forEach((color, i) => {
    const sliceStart = startAngle + i * step;
    const sliceEnd = sliceStart + step;

    const path = createArcPath(cx, cy, r, sliceStart, sliceEnd);
    path.setAttribute("fill", color.hex);
    path.setAttribute("data-name", color.name);
    path.setAttribute("data-code", color.number);
    path.style.cursor = "pointer";

    group.appendChild(path);
  });

  return group;
}

async function drawCopicWheel(center: number, radius: number): Promise<void> {
  if (!svg) throw new Error("SVG Element #color-wheel not found");
  svg.innerHTML = "";
  groupAndSortColors(await loadCopicColors());
  console.log(FAMILY_ORDER);
  const step: number = 360 / Object.keys(FAMILY_ORDER).length;
  Object.keys(FAMILY_ORDER).forEach((f, i) => {
    const start: number = i * step;
    const end: number = (i + 1) * step;
    const segment: SVGElement = createColorWheelSegment(center, center, radius, start, end, FAMILY_ORDER[f]);
    svg.appendChild(segment);
  });
}

function createArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): SVGPathElement {
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    `Z`
  ].join(" ");
  path.setAttribute("d", d);
  return path;
}

function groupAndSortColors(colors: CopicColor[]): void {
  for(let color of colors) {
    let n: string = color.number.replace(/\W/g, "");
    const f: string = color.family;
    const s: string = n.substring(0,f.length+1);
    if(FAMILY_ORDER[s] === undefined)
      FAMILY_ORDER[s] = [color];
    else
      FAMILY_ORDER[s].push(color);
  }

  for(let f in FAMILY_ORDER) {
    maxColorSegment = Math.max(maxColorSegment, FAMILY_ORDER[f].length);
    FAMILY_ORDER[f].sort((a,b) => {
      const na: number = parseInt(a.number.replace(/\W/g, "").substring(f.length));
      const nb: number = parseInt(b.number.replace(/\W/g, "").substring(f.length));
      return na - nb;
    });
  }
}
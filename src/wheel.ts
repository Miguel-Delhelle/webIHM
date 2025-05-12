import { Point } from "./Point";
import { getCSSproperty } from "./main";

export function startListenerWheel() {

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

  const toggle = document.getElementById("hemisphere-toggle") as HTMLDivElement;
  const container = document.getElementById("wheel-container") as HTMLDivElement;
  const svg = document.getElementById("wheel-svg") as SVGSVGElement|null;
  if (!svg) throw new Error("SVG Element #wheel-svg not found");

  const FAMILY_ORDER: {[k: string]: CopicColor[]} = {};
  let maxColorSegment: number = 0;
  let isExpanded: boolean = false;
  const cwCenterPt: Point = new Point(0,parseInt(getCSSproperty('--eth-header').replace(/\D/g,"")));
  const cwRadius: number = 200;

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
  
  drawCopicWheel(cwCenterPt,cwRadius);

  function toggleColorWheel(value?: boolean): void {
    isExpanded = value?value:!isExpanded;
    container.classList.toggle("expanded", isExpanded);
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

  async function drawCopicWheel(center: Point, radius: number): Promise<void> {
    if (!svg) throw new Error("SVG Element #wheel-svg not found");
    svg.innerHTML = "";
    groupAndSortColors(await loadCopicColors());
    console.log(FAMILY_ORDER);
    const step: number = 360 / Object.keys(FAMILY_ORDER).length;
    Object.keys(FAMILY_ORDER).forEach((f, i) => {
      const start: number = i * step;
      const end: number = (i + 1) * step;
      const segment: SVGElement = createColorWheelSegment(center._x, center._y, radius, start, end, FAMILY_ORDER[f]);
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
}
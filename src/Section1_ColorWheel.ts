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
}
export var COPICCOLOR_FAMILIES: {[k: string]: CopicColor[]} = {};
export var maxColorSegment: number = await initCopicColors();
console.log(COPICCOLOR_FAMILIES);

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

export async function drawCopicColorWheel(
  svgTopLeftCorner: Point, 
  cwRadius: number, 
  cwTileWidth: number, 
  cwTilenumber: number = maxColorSegment
): Promise<void> {

  function createCCWfamilySegment(angStart: number, angEnd: number, fsCopicColors: CopicColor[]): SVGElement {

    function createCCWTile(color: CopicColor, i: number): SVGPathElement {
      const srad: number = cwRadius+cwTileWidth*i;
      const erad: number = cwRadius+cwTileWidth*(i+1);
      const ptA_0: Point = cwCenterPt.polarPt(srad,angStart);
      const ptA_1: Point = cwCenterPt.polarPt(erad,angStart);
      const ptB_0: Point = cwCenterPt.polarPt(srad,angEnd);
      const ptB_1: Point = cwCenterPt.polarPt(erad,angEnd);
      const largeArcFlag: number = cwAngle>Math.PI?1:0;
      const sweepFlag: number = 0;
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
      return fsTile;
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

  const container = document.getElementById("wheel-container") as HTMLDivElement;
  var svg = document.getElementById("color-wheel") as SVGSVGElement|null;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "color-wheel");
    container.appendChild(svg);
  }
  const maxRadius: number = cwRadius+cwTileWidth*cwTilenumber;
  const cwCenterPt: Point = new Point();
  svg.setAttribute("viewBox", `${cwCenterPt._x-maxRadius} ${cwCenterPt._y-maxRadius} ${maxRadius*2} ${maxRadius*2}`);
  //svg.setAttribute("viewBox", `${svgTopLeftCorner._x} ${svgTopLeftCorner._y} ${maxRadius*2} ${maxRadius*2}`);
  svg.setAttribute("left", `${svgTopLeftCorner._x}`);
  svg.setAttribute("top", `${svgTopLeftCorner._y}`);
  //svg.setAttribute("viewBox", `0 0 ${maxRadius*2} ${maxRadius*2}`);
  svg.innerHTML = '';
  const toggle = document.getElementById("hemisphere-toggle") as HTMLDivElement;
  let isExpanded: boolean = false;

  const ccf: string[] = Object.keys(COPICCOLOR_FAMILIES).filter(f => COPICCOLOR_FAMILIES[f].length > 1);
  const cwAngle: number = (2*Math.PI) / ccf.length;
  console.log(ccf);
  
  ccf.forEach((f, i) => {
    const fsStartAngle: number = i * cwAngle;
    const fsEndAngle: number = (i+1) * cwAngle;
    const familySegment: SVGElement = createCCWfamilySegment(fsStartAngle,fsEndAngle,COPICCOLOR_FAMILIES[f]);
    svg?.appendChild(familySegment);
  });

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
}
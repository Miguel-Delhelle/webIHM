export class Point {
  private x: number;
  private y: number;

  constructor(x: number = 0.0, y: number = 0.0) {
     this.x = x;
     this.y = y;
  }

  public get _x(): number {return this.x}
  public get _y(): number {return this.y}
  public set _x(x: number) {this.x = x;}
  public set _y(y: number) {this.y = y;}

  public dXto(that: Point): number {
    return that.x - this.x;
  }

  public dXfrom(that: Point): number {
    return this.x - that.x;
  }

  public dYto(that: Point): number {
    return that.y - this.y;
  }

  public dYfrom(that: Point): number {
    return this.y - that.y;
  }

  public distanceFrom(that: Point): number {
    return Math.sqrt(Math.pow(this.dXfrom(that),2) + Math.pow(this.dYfrom(that),2));
  }

  public angleFrom(that: Point): number {
    return Math.atan(this.dYto(that)/this.dXto(that));
  }

  public polarPt(distance: number, angleRad: number): Point {
    return new Point(
      this.x + distance * Math.cos(angleRad),
      this.y + distance * Math.sin(angleRad)
    )
  }

  public relativePt(dX: number, dY: number): Point {
    return new Point(
      this.x + dX,
      this.y + dY
    );
  }

}
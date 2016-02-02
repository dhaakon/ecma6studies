// functionality
class Grid {
  constructor( canvas ) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setup();
  }

  setup () {
    this.ctx.strokeStyle = "rgba( 0, 0, 255, 0.4)";
    this.ctx.lineWidth = 0.5;
  }

  get size(){
    return{
      width: this.canvas.width,
      height: this.canvas.height
    }
  }

  draw(){
    let i = 1;

    var xSpacing = this.size.width / this.amount;
    var ySpacing = this.size.height / this.amount;

    while( i < this.amount ){
      var sx, sy;

      sx = 0;
      sy = 0;

      this.ctx.beginPath();
      this.ctx.moveTo( i * xSpacing, 0 )
      this.ctx.lineTo( i * xSpacing, this.size.height );


      this.ctx.moveTo( 0, i * ySpacing )
      this.ctx.lineTo( this.size.width, i * ySpacing );
      this.ctx.stroke();

      ++i
    }
  }
}

// properties
var _proto = Grid.prototype;
_proto.amount = 90;

export { Grid };

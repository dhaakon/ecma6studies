var json = require("../json/logo.json");

class GFXChildren{
  constructor( length ){
    this.children = [];
    console.log(this.groups);
  }

  // Add the SVG group 
  add(child){
    this.children.push(child);
  }
  
  get groups(){
    return this;
  }
}

class Group {
  constructor ( data ){
    console.log(data);
  
  }
}

class LogoRenderer {
  constructor ( canvas ){
    this.canvas = canvas;
    this.setupGraphics();
  }

  setupGraphics () {
    for( var object in json ){
      var _main = json[object];
      for( var group in _main){
        console.log('-----');
        console.log(group);
        var gfx = _main[group];
        console.log(gfx);
        var _g = new Group( gfx );

        this.graphics.add( _g );
      }
    }

    window.graphics = this.graphics;
  }
}

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);

export { LogoRenderer, Group }

var json = require("../json/logo.json");

class GFXChildren{
  constructor( length ){
    this.children = [];
    console.log(this.groups);
  }

  push(child){
    this.children.push(child);
  }
  
  get groups(){
    console.log(new Array(10).join('-'));
    console.log('children');
    console.log(this);
    console.log(new Array(10).join('-'));
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
        var gfx = _main[group];
        var _g = new Group( gfx );

        this.graphics.push( _g );
      }
    }

    console.log(this.graphics.groups);

    window.graphics = this.graphics;
  }
}

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);

export { LogoRenderer, Group }

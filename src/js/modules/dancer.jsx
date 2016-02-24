var EventEmitter = require('wolfy87-eventemitter');

class DancerComponent extends EventEmitter {
  constructor(){
    console.log('DancerComponent initiliazed');

    super();

    this.dancer = new Dancer();

    this.audio = new Audio();
    this.audio.src = './audio/track01.mp3';

    this.dancer.load( this.audio );

    let kick = this.dancer.createKick( this.kick );

    kick.on();
    this.dancer.play();
  }

  onKick(msg){
    this.emitEvent('kick');
    //console.log('kick!');
  }

  offKick(msg){
    //console.log('no kick');

  }

  get kick(){
    return {
      onKick: ()=> {this.onKick()},
      offKick: ()=> {this.offKick()},
      threshold: 0.22
    }
  }
  set kick( kick ){
    return;
  }
}

export { DancerComponent };

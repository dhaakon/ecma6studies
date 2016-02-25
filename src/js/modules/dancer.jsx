var EventEmitter = require('wolfy87-eventemitter');

class DancerComponent extends EventEmitter {
  constructor(){
    console.log('DancerComponent initiliazed');

    super();

    this.dancer = new Dancer();

    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.src = './audio/track01.mp3';

    this.dancer.load( this.audio );

    let kick = this.dancer.createKick( this.kick );

    kick.on();
    this.dancer.play();
  }

  onKick(msg){
    console.log(msg);
    this.emitEvent('kick', [msg]);
    //console.log('kick!');
  }

  offKick(msg){
    this.emitEvent('offkick');

    //console.log(this, msg);
    //console.log('no kick');

  }

  get kick(){
    return {
      onKick: (msg)=> {this.onKick(msg)},
      offKick: (msg)=> {this.offKick(msg)},
      threshold: 0.1
    }
  }
  set kick( kick ){
    return;
  }
}

export { DancerComponent };

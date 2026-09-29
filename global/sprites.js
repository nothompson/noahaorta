
const imageMap = new Map();

function loadImage(src){
  if(!imageMap.has(src)){
    imageMap.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed img : ${src}`));
      img.src = src;
    }));
  }
  return imageMap.get(src);
}

class Sprite {
  constructor({ 
    canvas,
    source,
    frameWidth,
    frameHeight,
    totalFrames,
    columns = totalFrames,
    displayed
  }){
    this.canvas = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
    this.ctx = this.canvas.getContext("2d");
    this.source = source;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.totalFrames = totalFrames;
    this.columns = columns;
    this.currentFrame = -1;
    this.image = null;
    this.#displayed = displayed;
    this.ready = this.#init();
  }

  #raf = null;
  #displayed = false;
  #playOpts = {};

  get displayed() { return this.#displayed; }

  async #init(){
    this.image = await loadImage(this.source);
    this.#resize();
    this.setFrame(0);
    return this;
  }

  #resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.round((rect.width || this.frameWidth) * dpr);
      const h = Math.round((rect.height || this.frameHeight) * dpr);
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;
  }

  setProgress(norm){
    const n = Math.min(Math.max(norm, 0), 1);
    this.setFrame(Math.round(n * (this.totalFrames - 1)));
  }

  resume() {
    if (this.#displayed) this.play(this.#playOpts);
  }

  setFrame(index){
      if(!this.image) return;
      const i = ((index % this.totalFrames) + this.totalFrames) % this.totalFrames; // was totalFrames - 1
      if(i === this.currentFrame) return;
      this.currentFrame = i;
      this.#draw();
  }

  #draw(){
    if(!this.#displayed) return;
    const {ctx, canvas, image, frameWidth: fw, frameHeight: fh, columns} = this;
    const sx = (this.currentFrame % columns) * fw;
    const sy = Math.floor(this.currentFrame / columns) * fh;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(image,sx,sy,fw,fh,0,0,canvas.width,canvas.height);
  }

  handleResize(){
    if(!this.image) return;
    console.log("resizing");
    this.#resize();
    this.#draw();
  }

  toggleDisplay(force = !this.#displayed, {clear = true} = {}) {
    if(force === this.#displayed) return force;
    this.#displayed = force;

    if(force){
      this.currentFrame = -1;
      this.setFrame(0);
      // this.play(this.#playOpts);
    }else{
      this.stop();
      if(clear) this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    return force;
  }

  play(opts = {}){
    this.stop();
    this.#playOpts = opts;
    const {fps = 24, loop = true, pingpong = false, direction = true, func = null} = opts;
    let start = null;

    const tick = (now) => {
      start ??= now;
      const frame = Math.floor(((now - start) * fps) / 1000);

      if(loop){
        if(direction == true){
          this.setFrame(frame % this.totalFrames);
        }
        else if(direction == false){
          this.setFrame(this.totalFrames - 1 - frame);
          if(frame < 0) frame = this.totalFrames - 1;
        }
      }
      else if (frame >= this.totalFrames || frame < 0){
        if(direction == true){
          this.setFrame(this.totalFrames - 1); 
        }
        else if(direction == false){
          this.setFrame(0);
        } 
        this.#raf = null;
        if(func!=null){
          func();
        }
        return;
      }
      // else if (frame <= 0){
      //   this.setFrame(0); 
      //   this.#raf = null;
      //   if(func!=null){
      //     func();
      //   }
      //   return;
      // }
      else if (direction == true){
        this.setFrame(frame);
      }
      else if (direction == false){
        this.setFrame((this.totalFrames - 1) - frame);
      }

      this.#raf = requestAnimationFrame(tick);
    }
    this.#raf = requestAnimationFrame(tick);
  }

  stop(){
    if(this.#raf !== null) cancelAnimationFrame(this.#raf);
    this.#raf = null;
  }
}

//# of curves = # of points - 1
function getCubicBezierPoint(t, p0, p1,p2,p3){
  const x = Math.pow((1-t),3)*p0[0] + 3*Math.pow((1-t),2) * t * p1[0] + 3*(1 - t) * (t * t) * p2[0] + Math.pow(t,3) * p3[0]; 

  const y = Math.pow((1-t),3)*p0[1] + 3*Math.pow((1-t),2) * t * p1[1] + 3*(1 - t) * (t * t) * p2[1] + Math.pow(t,3) * p3[1];

  return [x,y];
}

function getValueFromCubicBezier(t, p0, p1,p2,p3){
  let a = 0; let b = 1;
  for (let i = 0; i < 25; i++){
    const mid = (a + b) * 0.5;
    const [x] = getCubicBezierPoint(mid, p0,p1,p2,p3);
    if(x < t) {
      a = mid
    }
    else{
      b = mid;
    }
  }
  return getCubicBezierPoint((a + b) * 0.5, p0, p1,p2,p3)[1];
}

function getQuarticBezierPoint(t, p0,p1,p2,p3,p4){

  const x = Math.pow((1-t),4)*p0[0] + 4*Math.pow((1-t),3) * t * p1[0] + 6*Math.pow((1 - t),2) * (t * t) * p2[0] + 4 * (1 - t) * Math.pow(t,3) * p3[0] + Math.pow(t,4) * p4[0]; 

  const y = Math.pow((1-t),4)*p0[1] + 4*Math.pow((1-t),3) * t * p1[1] + 6*Math.pow((1 - t),2) * (t * t) * p2[1] + 4 * (1 - t) * Math.pow(t,3) * p3[1] + Math.pow(t,4) * p4[1];

  return [x,y];
}

function getValueFromQuarticBezier(t, p0, p1,p2,p3, p4){
  let a = 0; let b = 1;
  for (let i = 0; i < 25; i++){
    const mid = (a + b) * 0.5;
    const [x] = getQuarticBezierPoint(mid, p0,p1,p2,p3,p4);
    if(x < t) {
      a = mid
    }
    else{
      b = mid;
    }
  }
  return getQuarticBezierPoint((a + b) * 0.5, p0, p1,p2,p3,p4)[1];
}
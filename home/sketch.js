//#region WEBGL 
let canvas, gl, program, positionBuffer;

let resolution, time, rands;

let index = 0;

let start = 0.0;

let renderIndex = null;

let cursor;
let pointerListenerAdded = false;


//ensure canvas/aspect ratio fits to screen 
function resize(){
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight

    if(gl != null){
        gl.viewport(0,0,canvas.width,canvas.height);
    }

    heartbeat.handleResize();
}

async function LoadShader(url){
    //get text from fragment shader 
    let file = await fetch(url).then(
        output => output.text()
    );
    //no #includes in glsl, need to prepend text to the file 

    //currently disabled because just using one file anyway
    // file = (await fetch("Shaders/ShaderFunctions.frag").then(
    //     output => output.text()
    // )) + file;
    return file;
}

    
const Shaders = [
        {name: "LavaLamp", path: "../shaders/LavaLamp.frag"},
    ];

//probably useless
function GetRandomFloat(min, max){
    let range = max - min;
    return Math.random() * range + min;
}

function main(){

    canvas = document.getElementById("canvas");
    cursor = document.getElementById("cursor");

    if(canvas == null){
        console.error("canvas null!");
        return;
    }
    gl = canvas.getContext("webgl");
    if(gl == null){
        console.error("webgl null!!!");
        return;
    }
    //initial sizing
    window.addEventListener('resize', resize);

    //prevent duplicates.
    if(!pointerListenerAdded){
      window.addEventListener("pointermove", e=>{
        cursor.style.transform = `translate(${e.clientX + 5}px, ${e.clientY + 5}px) translate(-50%, -50%)`;
      }, {passive : true});

      pointerListenerAdded = true;
    }

    //lots of shader functions inspired/taken from inigo quilez


    //vertex shader for 2d is very simple
    const Vert = 
    `
        precision highp float;

        attribute vec2 aPosition;
        attribute vec2 aUV;

        varying vec2 vPosition;
        varying vec2 vUV;

        void main(){
            gl_Position = vec4(aPosition, 0.0, 1.0);
            vPosition = gl_Position.xy;
            vUV = aUV;
        }
    `;

    let selectedShader = Shaders[index];

    gl.useProgram(null);
    if(program != null) gl.deleteProgram(program);

    if(renderIndex != null)
    {
        cancelAnimationFrame(renderIndex)
        renderIndex = null;
    };

    console.log(renderIndex);

    //'then' calls the lambda functions after function returns. allows us to use frag returned from shader, but after its not null
    LoadShader(selectedShader.path).then(Frag =>
    {
        program = CreateShader(gl,Vert,Frag);

        gl.useProgram(program);
        InitAttributes(gl,program);

        // disabled textures 
        // InitTextures(gl,program);
        InitUniforms(gl,program);

        function render(t){
            t -= start;
            t *= 0.0001;
            resize();
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(resolution, canvas.width, canvas.height);
            gl.uniform1f(time, t);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            renderIndex = requestAnimationFrame(render);
        }

        start = performance.now();

        renderIndex = requestAnimationFrame(render);
        console.log(renderIndex);
    });
    
}
//end of main

function InitAttributes(gl, program)
{
    const position = gl.getAttribLocation(program, 'aPosition');
    const uv = gl.getAttribLocation(program, 'aUV');
    
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   0, 0,
    1, -1,   1, 0,
    -1,  1,   0, 1,

    -1,  1,   0, 1,
    1, -1,   1, 0,
    1,  1,   1, 1,
    ]), gl.STATIC_DRAW);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(
        uv,2, gl.FLOAT, false, 16, 8
    );
}

// rewrite to be more abstract ie get all png files in folder and iterate
// function InitTextures(gl, program)
// {
//     chromeTexture = loadTexture(gl, "images/chromanellesvisage.png");
//     spectraTexture = loadTexture(gl, "images/spectralmap.png");


//     const chromeLocation = gl.getUniformLocation(program, 'iChrome');
//     const texLocation = gl.getUniformLocation(program, 'iTexture');
    
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, chromeTexture);
//     gl.uniform1i(chromeLocation, 0);

//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, spectraTexture);
//     gl.uniform1i(texLocation, 1);
// }



function InitUniforms(gl, program){
    resolution = gl.getUniformLocation(program, 'iResolution');
    time = gl.getUniformLocation(program, 'iTime');
    const randomFloats = gl.getUniformLocation(program, 'iRands');
    
    gl.uniform4f(randomFloats, GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0));
}

// currently usused
function loadTexture(gl, url){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0,0,255,255]);

    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel,
    );

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image,
        );


        if(isPowerOf2(image.width) && isPowerOf2(image.height))
        {
            gl.generateMipmap(gl.TEXTURE_2D);     
        } 
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_FILTER, gl.LINEAR);
        }
    };

    image.src = url;

    return texture;
}

// helper
function isPowerOf2(value){
    return(value & (value - 1)) === 0;
}


function CreateShader(gl, vertSource, fragSource)
{
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex,vertSource);
    gl.compileShader(vertex);

    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment,fragSource);
    gl.compileShader(fragment);

    const shader = gl.createProgram();
    gl.attachShader(shader, vertex);
    gl.attachShader(shader, fragment);
    gl.linkProgram(shader);

    return shader;

}

 function NextShader(){
        index++;
        if(index > Shaders.length - 1){
            index = 0;
        };
        main();
        console.log(index);
    }
function PrevShader(){
    index--;
        if(index < 0){
            index = Shaders.length - 1;
        } 
        main();
        console.log(index);
}

function RefreshShader(){
    main();
}

document.addEventListener('DOMContentLoaded', main);

//#endregion

//#region Sprites

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
      this.play(this.#playOpts);
    }else{
      this.stop();
      if(clear) this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    return force;
  }

  play(opts = {}){
    this.stop();
    this.#playOpts = opts;
    const {fps = 24, loop = true } = opts;
    let start = null;

    const tick = (now) => {
      start ??= now;
      const frame = Math.floor(((now - start) * fps) / 1000);

      if(loop){
        this.setFrame(frame % this.totalFrames);
      }
      else if (frame >= this.totalFrames){
        this.setFrame(this.totalFrames - 1); 
        this.#raf = null;
        return;
      }
      else{
        this.setFrame(frame);
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

const cursoridle = new Sprite({
    canvas: "cursor",
    source: "../assets/sprites/cursoridle.png",
    frameWidth: 512,
    frameHeight: 512,
    totalFrames: 15,
    displayed: true,
});

const cursorhover = new Sprite({
    canvas: "cursor",
    source: "../assets/sprites/cursorpointing.png",
    frameWidth: 512,
    frameHeight: 512,
    totalFrames: 16,
    columns: 4
});

const heartbeat = new Sprite({
    canvas: "heartbeat",
    source: "../assets/sprites/heart.png",
    frameWidth: 1000,
    frameHeight: 1000,
    totalFrames: 16,
    columns: 4,
    displayed: true
});

heartbeat.ready.then(() => heartbeat.play({fps : 12}));

cursoridle.ready.then(() => cursoridle.play());
// cursorhover.ready.then(() => cursorhover.play());

function getMousePos(canvas, evt){
  var rect = canvas.getBoundingClientRect();
  return{
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

const HOVER_SELECTOR = "a, button, [data-hover]";
let pressed = false;

function setHovering(on) {
  const next = on ? cursorhover : cursoridle;
  const prev = on ? cursoridle  : cursorhover;

  if (next.displayed) return;
  if (!next.image) return;
  next.toggleDisplay(true);
  prev.toggleDisplay(false, { clear: false });
}

function isOverHoverable(e) {
  // #cursor has pointer-events: none, so this sees the real element underneath
  return !!document.elementFromPoint(e.clientX, e.clientY)?.closest(HOVER_SELECTOR);
}

document.addEventListener("pointerdown", () => {
  pressed = true;
  setHovering(true);          // no-op if already showing the hover sprite
  cursorhover.stop();         // toggleDisplay starts playback, so stop it after
  cursorhover.setFrame(0);    // hold the pressed frame
});

function release(e) {
  if (!pressed) return;
  pressed = false;

  if (isOverHoverable(e)) {
    cursorhover.resume();     // still over a link: carry on with the hover animation
  } else {
    setHovering(false);       // left the target (or clicked empty space): back to idle
  }
}

document.addEventListener("pointerup", release);
document.addEventListener("pointercancel", release); // touch/pen can get cancelled instead of released

document.addEventListener("pointerover", e => {
  if (pressed) return;        // don't fight the held frame
  if (e.target.closest?.(HOVER_SELECTOR)) setHovering(true);
});

document.addEventListener("pointerout", e => {
  if (pressed) return;
  if (!e.relatedTarget?.closest?.(HOVER_SELECTOR)) setHovering(false);
});

const cursorMQ = window.matchMedia("(hover: hover) and (pointer: fine)");

function applyCursorMode() {
  const enabled = cursorMQ.matches;
  document.documentElement.classList.toggle("custom-cursor", enabled);

  if (enabled) {
    cursoridle.ready.then(() => {
      cursoridle.handleResize();
    cursorhover.image && cursorhover.handleResize();
    if (!cursorhover.displayed) cursoridle.toggleDisplay(true);
    });
  } else {
    // stop both loops and clear the canvas so no rAF work runs on mobile
    cursoridle.toggleDisplay(false);
    cursorhover.toggleDisplay(false);
    pressed = false;
  }
}

applyCursorMode();
cursorMQ.addEventListener("change", applyCursorMode); // e.g. mouse plugged into a tablet

//#endregion
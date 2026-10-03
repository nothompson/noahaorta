//#region WEBGL 
let canvas, gl, program, positionBuffer;

let resolution, time, rands;

let index = 0;

let speed = 1.0;

let start = 0.0;

let renderIndex = null;


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

    journal.handleResize();

    spectralmap.handleResize();

    controller.handleResize();

    portfolio.handleResize();

    abouttext.handleResize();
    examplestext.handleResize();
    portfoliotext.handleResize();
    spectralmaptext.handleResize();
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

    if(canvas == null){
        console.error("canvas null!");
        return;
    }
    gl = canvas.getContext("webgl");
    if(gl == null){
        console.error("webgl null!!!");
    }
    //initial sizing
    window.addEventListener('resize', resize);

    animateScaleHeart();

    //lots of shader functions inspired/taken from inigo quilez


    if(gl != null){
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
            t*= speed;
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
    
    const a = GetRandomFloat(-1.0,1.0);
    const b = GetRandomFloat(-1.0,1.0);
    const c = GetRandomFloat(-1.0,1.0);
    const d = GetRandomFloat(-1.0,1.0);

    gl.uniform4f(randomFloats, a, b, c, d);

    console.log(Math.abs(a),Math.abs(b),Math.abs(c),Math.abs(d));
    // gl.uniform4f(randomFloats, 1.0, 1.0, 1.0, 1.0);
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

// #region Sprites

const heartbeat = new Sprite({
    canvas: "heartbeat",
    source: "../assets/sprites/heart.png",
    frameWidth: 1000,
    frameHeight: 1000,
    totalFrames: 16,
    columns: 4,
    displayed: false
});


heartbeat.ready.then(() => heartbeat.play({fps : 12}));

const journal = new Sprite({
    canvas: "aboutcanvas",
    source: "../assets/sprites/journal.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 8,
    columns: 3,
    displayed: false
})

const abouttext = new Sprite({
    canvas: "abouttitle",
    source: "../assets/image/abouttitle.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 1,
    columns: 1,
    displayed: false
})

const portfoliotext = new Sprite({
    canvas: "portfoliotitle",
    source: "../assets/image/portfoliotitle.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 1,
    columns: 1,
    displayed: false
})


const examplestext = new Sprite({
    canvas: "examplestitle",
    source: "../assets/image/examplestitle.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 1,
    columns: 1,
    displayed: false
})


const spectralmaptext = new Sprite({
    canvas: "spectralmaptitle",
    source: "../assets/image/spectralmaptitle.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 1,
    columns: 1,
    displayed: false
})




const spectralmap = new Sprite({
    canvas: "spectralmapcanvas",
    source: "../assets/sprites/sun.png",
    frameWidth: 512,
    frameHeight: 512,
    totalFrames: 7,
    columns: 3,
    displayed: false
})

// const spectralmap = new Sprite({
//     canvas: "spectralmapcanvas",
//     source: "../assets/sprites/tooth.png",
//     frameWidth: 512,
//     frameHeight: 512,
//     totalFrames: 20,
//     columns: 5,
//     displayed: false
// })

const controller = new Sprite({
    canvas: "examplescanvas",
    source: "../assets/sprites/controller.png",
    frameWidth: 512,
    frameHeight: 512,
    totalFrames: 9,
    columns: 3,
    displayed: false
})

const portfolio = new Sprite({
    canvas: "portfoliocanvas",
    source: "../assets/sprites/moldmidi.png",
    frameWidth: 1024,
    frameHeight: 512,
    totalFrames: 8,
    columns: 3,
    displayed: false
})

function test(){
    console.log("finished anim");
}
portfolio.ready.then(()=> portfolio.setFrame(8));
// journal.ready.then(() => journal.play({direction: false, loop: false, func: test}));

// journal2.ready.then(() => journal2.play({direction: true}));

// heartbeat.ready.then(() => heartbeat.play({fps : 12}));

function animateScaleHeart() {
  const start = performance.now();

  function frame(now) {
    const timeFrac = Math.min((now - start) / 1000, 1);
    const progress = getValueFromQuarticBezier(timeFrac, [0,0],[0.25,0.5],[0.5,1.5],[0.8,0.8], [1.0,1.0]);
    const scale = 0 + (1 - 0) * progress;

    if(timeFrac < 0.075) heartbeat.toggleDisplay(false);
    else{
        heartbeat.toggleDisplay(true);
    }

    heartbeat.canvas.style.transform = `translateX(-50%) translateY(-50%) scale(${scale})`;

    if (timeFrac < 1) requestAnimationFrame(frame);
    else{
        console.log(timelineforlinks());
    }
  }
  requestAnimationFrame(frame);
}

function animateScaleGeneral(sprite, duration=500, startscale= 0.0,endscale=1.0) {
  const start = performance.now();

  function frame(now) {
    const timeFrac = Math.min((now - start) / duration, 1);
    const progress = getValueFromQuarticBezier(timeFrac, [0,0],[0.25,0.5],[0.5,1.5],[0.8,0.8], [1.0,1.0]);
    const scale = startscale + (endscale - startscale) * progress;

    if(timeFrac < 0.075) sprite.toggleDisplay(false);
    else{
        sprite.toggleDisplay(true);
    }

    sprite.canvas.style.transform = `scale(${scale})`;

    if (timeFrac < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function timelineforlinks(){
    const start = performance.now();

    let a = false;
    let b = false;
    let c = false;
    
    function frame(now) {
        const timeFrac = Math.min((now - start) / 800, 1);
        const progress = getValueFromCubicBezier(timeFrac, [0,0],[0.33,0.33],[0.66,0.66],[1.0,1.0]);
        
    if(timeFrac >= 0.25 && a === false){
        console.log("quarter done");
        a = true;
        animateScaleGeneral(journal);
        animateScaleGeneral(abouttext);
    }
    
    if(timeFrac >= 0.5 && b === false){
        console.log("half done");
        b = true;
        animateScaleGeneral(portfolio);
        animateScaleGeneral(portfoliotext);
    }
    
    if(timeFrac >= 0.75 && c === false){
        console.log("3/4th done");
        c = true
        animateScaleGeneral(controller);
        animateScaleGeneral(examplestext);
    }
    
    if (timeFrac < 1) requestAnimationFrame(frame);
    else{
        console.log('finished');

                animateScaleGeneral(spectralmap);
        animateScaleGeneral(spectralmaptext);
    }
 
  }
  requestAnimationFrame(frame);
}

function OpenJournal(){
      journal.play({fps: 24, direction: true, loop: false, func: test});
}

function CloseJournal(){
      journal.play({fps: 24, direction: false, loop: false, func: test});
}

function HoverSpectral(){
      spectralmap.play({fps: 12, pingpong: true});
}

function LeaveSpectral(){
      spectralmap.stop()
}

function HoverExamples(){
      controller.play({fps: 12});
}

function LeaveExamples(){
      controller.stop()
}

function HoverPortfolio(){
      portfolio.play({fps: 12, direction: true, loop: false});
}

function LeavePortfolio(){
      portfolio.play({fps: 12, direction: false, loop: false});
}

//#endregion
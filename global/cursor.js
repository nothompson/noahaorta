let cursor;
let pointerListenerAdded = false;

    cursor = document.getElementById("cursor");

    console.log("cursor main");

    if(!pointerListenerAdded){
      window.addEventListener("pointermove", e=>{
        cursor.style.transform = `translate(${e.clientX + 5}px, ${e.clientY + 5}px) translate(-50%, -50%)`;
      }, {passive : true});

      pointerListenerAdded = true;
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
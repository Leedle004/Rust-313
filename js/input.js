// Keyboard, mouse and touch input. Exposes a simple polled state.
const Input = (() => {
  const keys = new Set();
  const state = {
    up: false, down: false, left: false, right: false,
    fire: false,
    mouseX: null, mouseY: null, useMouse: false,
  };
  let canvas = null;
  const pauseHandlers = [];

  function refresh() {
    state.up = keys.has("w") || keys.has("arrowup");
    state.down = keys.has("s") || keys.has("arrowdown");
    state.left = keys.has("a") || keys.has("arrowleft");
    state.right = keys.has("d") || keys.has("arrowright");
    state.fire = keys.has(" ") || state.mouseDown === true;
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (k === "p" || k === "escape") {
      pauseHandlers.forEach((h) => h());
      return;
    }
    // Pressing a movement key hands control back to the keyboard.
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      state.useMouse = false;
    }
    keys.add(k);
    refresh();
  }

  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
    refresh();
  }

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.mouseX = cx * scaleX;
    state.mouseY = cy * scaleY;
    state.useMouse = true;
  }

  function init(canvasEl) {
    canvas = canvasEl;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    canvas.addEventListener("mousemove", pointerPos);
    canvas.addEventListener("mousedown", (e) => {
      pointerPos(e);
      state.mouseDown = true;
      refresh();
    });
    window.addEventListener("mouseup", () => {
      state.mouseDown = false;
      refresh();
    });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      pointerPos(e);
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      pointerPos(e);
    }, { passive: false });
  }

  return {
    init,
    state,
    onPause: (fn) => pauseHandlers.push(fn),
    setFire: (v) => { state.mouseDown = v; refresh(); },
    clear: () => { keys.clear(); state.mouseDown = false; refresh(); },
  };
})();

// shared setup so I don't rewrite the same engine/canvas stuff in every scene
function setupEngineAndCanvas() {
  const canvas = document.getElementById("renderCanvas");

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  // Just focus the canvas on click – NO pointer lock.
  // This means I keep my mouse and can still click shapes/UI without pressing Esc.
  canvas.addEventListener("click", () => {
    canvas.focus();
  });

  return { canvas, engine };
}
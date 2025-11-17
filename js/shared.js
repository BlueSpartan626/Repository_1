// shared setup so I don't rewrite the same engine/canvas stuff in every scene
function setupEngineAndCanvas() {
  const canvas = document.getElementById("renderCanvas");

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  // pointer lock on click (matters most for FPS scenes, harmless elsewhere)
  canvas.addEventListener("click", () => {
    const req =
      canvas.requestPointerLock ||
      canvas.msRequestPointerLock ||
      canvas.mozRequestPointerLock ||
      canvas.webkitRequestPointerLock;

    if (req) req.call(canvas);
    canvas.focus();
  });

  return { canvas, engine };
}
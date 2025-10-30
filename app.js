App.js:
 
/*
  Babylon.js Walkable Scene (WASD + Mouse Look + Jump)
  ---------------------------------------------------
  Features:
  • UniversalCamera with collisions, gravity, pointer lock mouselook
  • WASD movement and SPACE to jump
  • Hemispheric + Directional lights, real-time shadows
  • Skybox, large ground, perimeter walls, boxes, and a ramp
  • Minimal UI crosshair + on-screen help (Babylon GUI)
 
  How to extend:
  • Replace primitives with your own GLB/GLTF: use SceneLoader.ImportMesh
  • Add more lights, post-processes, PBR materials, etc.
  • Tune camera.speed, angularSensibility, ellipsoid to your liking
*/
 
// Get the <canvas> and create the Babylon engine
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  disableWebGL2Support: false,
});
 
/**
 * Main scene factory.
 * Creates camera, lights, ground, skybox, obstacles, and basic UI.
 */
const createScene = function () {
  const scene = new BABYLON.Scene(engine);
 
  // A very dark blue-ish clear color (subtle night vibe)
  scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.05, 1.0);
 
  // Enable collisions for the whole scene and set gravity (Y-)
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
 
  // --- Camera ---------------------------------------------------------------
  // UniversalCamera supports mouse look, WASD, collisions and gravity.
  const camera = new BABYLON.UniversalCamera(
    "playerCamera",
    new BABYLON.Vector3(0, 2, -6), // start position (eye ~2m high)
    scene
  );
 
  // Attach controls: left-click to rotate, wheel to zoom. Pointer lock on click below.
  camera.attachControl(canvas, true);
 
  // Camera tuning for FPS-like feel
  camera.minZ = 0.1;              // near clipping
  camera.speed = 0.6;             // movement speed (tweak to taste)
  camera.angularSensibility = 3000; // mouse look sensitivity (higher = slower)
 
  // Make the camera a "character capsule" for collisions
  camera.ellipsoid = new BABYLON.Vector3(0.5, 1.0, 0.5); // ~1m tall + radius
  camera.checkCollisions = true;   // collide against geometry with checkCollisions=true
  camera.applyGravity = true;      // let gravity affect the camera
 
  // Standard WASD mapping (arrows already mapped by default)
  camera.keysUp.push(87);    // W
  camera.keysDown.push(83);  // S
  camera.keysLeft.push(65);  // A
  camera.keysRight.push(68); // D
 
  // Request pointer lock on click for proper mouselook
  canvas.addEventListener("click", () => {
    const req = canvas.requestPointerLock ||
                canvas.msRequestPointerLock ||
                canvas.mozRequestPointerLock ||
                canvas.webkitRequestPointerLock;
    req && req.call(canvas);
    canvas.focus();
  });
 
  // --- Lighting ------------------------------------------------------------
  // Soft ambient light from above.
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
 
  // Directional sun/moon light for dynamic shadows.
  const dir = new BABYLON.DirectionalLight(
    "dir",
    new BABYLON.Vector3(-0.5, -1.0, -0.3), // direction it points *towards*
    scene
  );
  dir.position = new BABYLON.Vector3(10, 18, 10);
  dir.intensity = 1.0;
 
  // Real-time shadows
  const shadowGen = new BABYLON.ShadowGenerator(2048, dir);
  shadowGen.useExponentialShadowMap = true;
 
  // --- Skybox --------------------------------------------------------------
  // Simple emissive skybox (solid color). Replace with a cubemap later if desired.
  const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
  const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
  skyMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.05);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
 
  // --- Ground --------------------------------------------------------------
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 120, height: 120, subdivisions: 32 },
    scene
  );
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.28);
  ground.material = groundMat;
  ground.checkCollisions = true;   // collide with camera
  ground.receiveShadows = true;
 
  // --- Perimeter walls -----------------------------------------------------
  const makeWall = (w, h, d, x, y, z, rotY = 0) => {
    const wall = BABYLON.MeshBuilder.CreateBox("wall", { width: w, height: h, depth: d }, scene);
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    wall.checkCollisions = true;
    wall.receiveShadows = true;
 
    const mat = new BABYLON.StandardMaterial("wallMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.55);
    wall.material = mat;
 
    shadowGen.addShadowCaster(wall);
    return wall;
  };
 
  // A simple 40x40 "arena"
  makeWall(2, 4, 40, -20, 2, 0);
  makeWall(2, 4, 40,  20, 2, 0);
  makeWall(40, 4, 2,   0, 2, 20);
  makeWall(40, 4, 2,   0, 2, -20);
 
  // --- Obstacles -----------------------------------------------------------
  // A few boxes to cast shadows and break up sight lines
  for (let i = 0; i < 12; i++) {
    const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
    box.position = new BABYLON.Vector3(-10 + i * 2, 1, -10 + (i % 3) * 4);
    box.checkCollisions = true;
    shadowGen.addShadowCaster(box);
  }
 
  // A small ramp to test collisions while moving/jumping
  const ramp = BABYLON.MeshBuilder.CreateGround("ramp", { width: 6, height: 12 }, scene);
  ramp.rotation.x = BABYLON.Tools.ToRadians(20);
  ramp.position = new BABYLON.Vector3(0, 0.2, -8);
  ramp.checkCollisions = true;
 
  // --- Simple Jump Logic ---------------------------------------------------
  // Babylon's Free/UniversalCamera uses collisions + applyGravity, but you'll
  // often add your own jump impulse. This is a tiny vertical velocity integrator.
  let canJump = true;   // when true, SPACE will inject a jump impulse
  let verticalVel = 0;  // integration state
  const JUMP_FORCE = 0.18; // try 0.12–0.25 to taste
  const G = -0.008;       // small gravitational acceleration per frame
 
  window.addEventListener("keydown", (ev) => {
    if ((ev.code === "Space" || ev.keyCode === 32) && canJump) {
      verticalVel = JUMP_FORCE; // jump impulse
      canJump = false;
    }
  });
 
  // Before each frame renders, apply jump/gravity and check if grounded
  scene.onBeforeRenderObservable.add(() => {
    // Raycast straight down from camera to see if we're near ground/ramp
    const ray = new BABYLON.Ray(camera.position, new BABYLON.Vector3(0, -1, 0), 1.2);
    const pick = scene.pickWithRay(ray, (m) => m === ground || m.name.includes("ramp"));
 
    if (pick?.hit && verticalVel <= 0) {
      // We hit the ground while falling or standing still: reset jump
      canJump = true;
      verticalVel = 0;
    } else {
      // In the air: integrate velocity, then apply to camera
      verticalVel += G;
      camera.cameraDirection.y += verticalVel;
    }
  });
 
  // --- Basic UI (crosshair + help) ----------------------------------------
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("HUD");
 
  // Crosshair
  const cross = new BABYLON.GUI.Ellipse();
  cross.width = "8px";
  cross.height = "8px";
  cross.thickness = 2;
  cross.color = "white";
  cross.background = "transparent";
  ui.addControl(cross);
 
  // On‑screen controls hint
  const help = new BABYLON.GUI.TextBlock();
  help.text = "WASD to move • Mouse to look • Click to lock • Space to jump";
  help.color = "white";
  help.fontSize = 14;
  help.alpha = 0.7;
  help.top = "-48%"; // near top edge
  ui.addControl(help);
 
  // Example: load a GLB model later (drop into /assets and uncomment):
  // BABYLON.SceneLoader.ImportMesh(
  //   "", "./assets/", "myModel.glb", scene,
  //   (meshes) => {
  //     meshes.forEach(m => {
  //       m.checkCollisions = true;
  //       shadowGen.addShadowCaster(m);
  //     });
  //   }
  // );
 
  return scene;
};
 
// Create the scene and start the render loop
const scene = createScene();
engine.runRenderLoop(() => scene.render());
 
// Resize the engine on window resize
window.addEventListener("resize", () => engine.resize());
 
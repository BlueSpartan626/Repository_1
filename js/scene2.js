window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  let isPaused = false;

  const createScene = async () => {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.12, 0.15, 0.20, 1.0);
    scene.collisionsEnabled = true;
    scene.gravity = new BABYLON.Vector3(0, -0.45, 0);

    // 👇 Enable pointer lock for proper FPS camera control
    canvas.addEventListener("click", () => {
      if (!isPaused) canvas.requestPointerLock();
    });

    const camera = new BABYLON.UniversalCamera("playerCam",
      new BABYLON.Vector3(0, 6, 0), scene
    );
    camera.attachControl(canvas, true);
    camera.speed = 0.35;
    camera.angularSensibility = 950;
    camera.minZ = 0.3;
    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new BABYLON.Vector3(0.5, 1.7, 0.5);

    camera.keysUp = [87]; 
    camera.keysDown = [83];
    camera.keysLeft = [65];
    camera.keysRight = [68];

    // Lights
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0,1,0), scene);
    hemi.intensity = 0.75;

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4,-1,0.35), scene);
    sun.position = new BABYLON.Vector3(30, 60, -30);
    sun.intensity = 1.1;
    const_shadowGen = new BABYLON.ShadowGenerator(1024, sun);

    // ⚠ Fix skybox warning → remove mipmap generation
    const hdr = new BABYLON.HDRCubeTexture("../assets/sky.hdr", scene, 256, false, true, false, true);
    scene.environmentTexture = hdr;
    scene.createDefaultSkybox(hdr, true, 350, 0.5);

    // Terrain
    BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "terrain", "../assets/terrain_heightmap.png",
      {
        width: 160,
        height: 160,
        subdivisions: 160,
        minHeight: -1,
        maxHeight: 28,
        onReady: ground => {
          ground.checkCollisions = true;
          ground.material = new BABYLON.StandardMaterial("gMat", scene);
          ground.material.diffuseTexture = new BABYLON.Texture("../assets/ground_diffuse.png", scene);
          ground.material.diffuseTexture.uScale = 
          ground.material.diffuseTexture.vScale = 30;

          createWalls(scene); // tighter bounds!
        }
      }
    );

    // Knight model visible + positioned in frame
// --- Load knight model (.glb) ---
try {
  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    "",
    "../assets/",
    "knight.glb",
    scene
  );

  const knight = result.meshes[0];

  knight.position = new BABYLON.Vector3(0, 5, 1.5); // move slightly in front of camera
  knight.scaling = new BABYLON.Vector3(1, 1, 1);
  knight.rotation = new BABYLON.Vector3(0, Math.PI, 0); // face camera
  knight.isVisible = true;

  result.meshes.forEach(m => {
    m.isVisible = true;
    m.receiveShadows = true;
    m.checkCollisions = true;
  });

  console.log("Knight loaded and forced visible");
} catch (e) {
  console.warn("Failed to load knight model:", e);
}

    // Jump
let grounded = false;

scene.registerBeforeRender(() => {
  const terrainHeight = 2.9;
  grounded = (camera.position.y <= terrainHeight);
});

window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "z" && grounded) {
    camera.cameraDirection.y = 0.32;
    grounded = false;
  }
  if (e.key.toLowerCase() === "p") togglePause();
});

    return scene;
  };

  const scenePromise = createScene();

  engine.runRenderLoop(async () => {
    if (!isPaused) (await scenePromise).render();
  });

  window.addEventListener("resize", () => engine.resize());

  function togglePause() {
    isPaused = !isPaused;
    document.exitPointerLock?.();
    document.getElementById("pauseOverlay").style.display =
      isPaused ? "flex" : "none";
  }

  // 🔒 Playable area walls tightened
  function createWalls(scene) {
  const size = 145;   // ⬅ reduced more
  const height = 10;
  const thick = 3;
  const mat = new BABYLON.StandardMaterial("wallMat", scene);
  mat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.12);

  [
    {x: 0, z: size/2, w: size, d: thick},
    {x: 0, z:-size/2, w: size, d: thick},
    {x: size/2, z: 0, w: thick, d: size},
    {x:-size/2, z: 0, w: thick, d: size}
  ].forEach(c => {
    const w = BABYLON.MeshBuilder.CreateBox("wall", {
      width:c.w, height, depth:c.d
    }, scene);
    w.position = new BABYLON.Vector3(c.x, height/2, c.z);
    w.checkCollisions = true;
    w.material = mat;
  });
}

});
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  let isPaused = false;

  const createScene = async () => {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.12, 0.15, 0.20, 1.0);

    // --- Player camera (first-person) ---
    const camera = new BABYLON.UniversalCamera("playerCam",
      new BABYLON.Vector3(0, 5, 0),
      scene
    );
    camera.attachControl(canvas, true);
    camera.speed = 2;
    camera.angularSensibility = 800;

    scene.collisionsEnabled = true;
    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new BABYLON.Vector3(0.5, 1.7, 0.5);
    camera.ellipsoidOffset = new BABYLON.Vector3(0, 1.0, 0);
    scene.gravity = new BABYLON.Vector3(0, -0.98, 0);

    camera.keysUp    = [87, 38]; // W, up-arrow
    camera.keysDown  = [83, 40]; // S, down-arrow
    camera.keysLeft  = [65];     // A
    camera.keysRight = [68];     // D

    camera.maxZ = 5000;

    // --- Lights ---
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0,1,0), scene);
    hemi.intensity = 0.6;
    hemi.groundColor = new BABYLON.Color3(0.2, 0.3, 0.2);

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.3,-1,0.4), scene);
    sun.position = new BABYLON.Vector3(50, 100, -50);
    sun.intensity = 1.0;
    const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
    shadowGen.useExponentialShadowMap = true;

    // --- Sky / environment ---
    try {
      const hdr = new BABYLON.HDRCubeTexture("../assets/sky.hdr", scene, 512, false, true, false, true);
      scene.environmentTexture = hdr;
      scene.createDefaultSkybox(hdr, true, 500, 0.5);
    } catch (e) {
      console.warn("Skybox load failed", e);
    }

    // --- Terrain via heightmap ---
    BABYLON.MeshBuilder.CreateGroundFromHeightMap(
      "terrain",
      "../assets/terrain_heightmap.png",
      {
        width: 200,
        height: 200,
        subdivisions: 200,
        minHeight: -5,
        maxHeight: 35,
        onReady: (ground) => {
          ground.checkCollisions = true;
          const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
          groundMat.diffuseTexture = new BABYLON.Texture("../assets/ground_diffuse.png", scene);
          groundMat.bumpTexture    = new BABYLON.Texture("../assets/ground_normal.png", scene);
          groundMat.diffuseTexture.uScale = 40;
          groundMat.diffuseTexture.vScale = 40;
          groundMat.bumpTexture.uScale    = 40;
          groundMat.bumpTexture.vScale    = 40;
          ground.material = groundMat;
          ground.receiveShadows = true;

          createBoundaryWalls(scene, shadowGen);
        }
      },
      scene
    );

    // --- Load knight model (.glb) ---
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",            // load all meshes
        "../assets/",  // folder path
        "knight.glb",  // file name
        scene
      );
      console.log("Model loaded:", result.meshes);
      const root = result.meshes[0];
      root.position = new BABYLON.Vector3(0, 5, 0);
      root.scaling  = new BABYLON.Vector3(1,1,1);
      result.meshes.forEach(m => shadowGen.addShadowCaster(m));
    } catch (e) {
      console.warn("Failed to load knight model:", e);
    }

    return scene;
  };

  const scenePromise = createScene();

  engine.runRenderLoop(async () => {
    if (!isPaused) {
      const scene = await scenePromise;
      if (scene) scene.render();
    }
  });

  window.addEventListener("resize", () => engine.resize());

  // Pause with P
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "p" || ev.key === "P") {
      isPaused = !isPaused;
      document.getElementById("pauseOverlay").style.display = isPaused ? "flex" : "none";
    }
  });

  function createBoundaryWalls(scene, shadowGen) {
    const size = 210, wallH = 20, thick = 2;
    const mat = new BABYLON.StandardMaterial("wallMat", scene);
    mat.diffuseColor = new BABYLON.Color3(0.3,0.3,0.3);

    const positions = [
      { x: 0,   z: size/2 },
      { x: 0,   z: -size/2 },
      { x: size/2, z: 0 },
      { x: -size/2, z: 0 },
    ];
    positions.forEach(pos => {
      const wall = BABYLON.MeshBuilder.CreateBox("wall", {
        width: (pos.x === 0 ? size : thick),
        height: wallH,
        depth: (pos.z === 0 ? size : thick)
      }, scene);
      wall.position = new BABYLON.Vector3(pos.x, wallH/2, pos.z);
      wall.material = mat;
      wall.checkCollisions = true;
      shadowGen.addShadowCaster(wall);
    });
  }

});
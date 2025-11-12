// Wait until the HTML page is fully loaded
window.addEventListener("DOMContentLoaded", function () {
  // Grab the canvas and the info panel from index.html
  const canvas = document.getElementById("renderCanvas");
  const infoPanel = document.getElementById("infoPanel");

  // Create Babylon engine (handles WebGL + rendering)
  const engine = new BABYLON.Engine(canvas, true);

  // This function builds and returns our 3D scene
  const createScene = function () {
    const scene = new BABYLON.Scene(engine);

    // Background colour (dark blue-ish)
    scene.clearColor = new BABYLON.Color3(0.06, 0.08, 0.12);

    // === CAMERA ============================================================
    // ArcRotateCamera = orbit camera (mouse to rotate, wheel to zoom)
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      BABYLON.Tools.ToRadians(135), // alpha (horizontal angle)
      BABYLON.Tools.ToRadians(60), // beta (vertical angle)
      20, // radius (distance from target)
      new BABYLON.Vector3(0, 1, 0), // target to look at (x, y, z)
      scene
    );

    // Attach mouse control to the canvas
    camera.attachControl(canvas, true);

    // Limit zoom so you don't go inside the ground accidentally
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 40;

    // === LIGHTING ==========================================================
    // Soft ambient light from above
    const hemiLight = new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.7;

    // Directional light for shadows (like a sun)
    const dirLight = new BABYLON.DirectionalLight(
      "dirLight",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.9;

    // Create a ShadowGenerator so meshes can cast shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGenerator.useExponentialShadowMap = true;

    // === GROUND ============================================================
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 30, height: 30 },
      scene
    );

    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.2, 0.25);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // === INTERACTIVE OBJECTS ==============================================
    // We’ll store them in a list so we can rotate them each frame
    const interactiveMeshes = [];

    /**
     * Helper function to create an interactive mesh.
     * - meshBuilder: which MeshBuilder function to use (CreateBox, CreateSphere, ...)
     * - params: options object for that builder
     * - position: BABYLON.Vector3 for placement
     * - color: initial colour
     * - label: name shown in the info panel when clicked
     */
    function createInteractiveShape({ name, meshBuilder, params, position, color, label }) {
      // Create the mesh
      const mesh = meshBuilder(name, params, scene);
      mesh.position = position;

      // Give it a simple coloured material
      const mat = new BABYLON.StandardMaterial(name + "Mat", scene);
      mat.diffuseColor = color;
      mesh.material = mat;

      // Allow the mesh to cast a shadow
      shadowGenerator.addShadowCaster(mesh);

      // Mark mesh as interactive: change colour + update text when clicked
      mesh.actionManager = new BABYLON.ActionManager(scene);
      mesh.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function () {
          // Random new colour
          const r = Math.random();
          const g = Math.random();
          const b = Math.random();
          mesh.material.diffuseColor = new BABYLON.Color3(r, g, b);

          // Update the info text
          infoPanel.textContent = `You clicked the ${label}. Its colour changed!`;
        })
      );

      // Add mesh to list so we can animate it
      interactiveMeshes.push(mesh);

      return mesh;
    }

    // --- Create 5 different interactive objects ---------------------------

    // 1) Box
    createInteractiveShape({
      name: "box",
      meshBuilder: BABYLON.MeshBuilder.CreateBox,
      params: { size: 2 },
      position: new BABYLON.Vector3(-6, 1, 0),
      color: new BABYLON.Color3(0.9, 0.4, 0.4),
      label: "Box",
    });

    // 2) Sphere
    createInteractiveShape({
      name: "sphere",
      meshBuilder: BABYLON.MeshBuilder.CreateSphere,
      params: { diameter: 2 },
      position: new BABYLON.Vector3(-3, 1, 5),
      color: new BABYLON.Color3(0.4, 0.7, 1.0),
      label: "Sphere",
    });

    // 3) Cylinder
    createInteractiveShape({
      name: "cylinder",
      meshBuilder: BABYLON.MeshBuilder.CreateCylinder,
      params: { diameter: 2, height: 2.5 },
      position: new BABYLON.Vector3(0, 1.25, 0),
      color: new BABYLON.Color3(0.6, 0.9, 0.5),
      label: "Cylinder",
    });

    // 4) Torus (donut)
    createInteractiveShape({
      name: "torus",
      meshBuilder: BABYLON.MeshBuilder.CreateTorus,
      params: { diameter: 3, thickness: 0.6, tessellation: 32 },
      position: new BABYLON.Vector3(3.5, 1.2, -4),
      color: new BABYLON.Color3(0.95, 0.8, 0.5),
      label: "Torus",
    });

    // 5) Cone (cylinder where topRadius = 0)
    createInteractiveShape({
      name: "cone",
      meshBuilder: BABYLON.MeshBuilder.CreateCylinder,
      params: { diameterTop: 0, diameterBottom: 2, height: 3, tessellation: 24 },
      position: new BABYLON.Vector3(6, 1.5, 2),
      color: new BABYLON.Color3(0.8, 0.5, 0.9),
      label: "Cone",
    });

    // === SIMPLE ANIMATION (rotate all interactive meshes) =================
    scene.registerBeforeRender(function () {
      const delta = scene.getEngine().getDeltaTime() * 0.001; // seconds since last frame
      const speed = 0.8; // rotation speed

      interactiveMeshes.forEach(function (mesh) {
        mesh.rotation.y += speed * delta;
      });
    });

    // Initial message
    infoPanel.textContent = "Use the mouse to rotate/zoom. Click any shape to interact with it.";

    return scene;
  };

  // Create the scene
  const scene = createScene();

  // Tell Babylon to render the scene repeatedly
  engine.runRenderLoop(function () {
    scene.render();
  });

  // Handle browser / window resizing
  window.addEventListener("resize", function () {
    engine.resize();
  });
});
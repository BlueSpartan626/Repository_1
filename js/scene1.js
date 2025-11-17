// Scene 1 – basic shapes, light, shadows, motion.
// This is basically the “tutorial room”.

const { canvas, engine } = setupEngineAndCanvas();

function createScene1() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.03, 0.04, 0.07, 1);

  // orbit cam so I can spin around the shapes
  const camera = new BABYLON.ArcRotateCamera(
    "cam1",
    BABYLON.Tools.ToRadians(135),
    BABYLON.Tools.ToRadians(60),
    20,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas, true);

  // basic lights – one ambient and one directional for shadows
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;

  const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
  dir.position = new BABYLON.Vector3(10, 20, 10);
  dir.intensity = 0.9;

  const shadowGen = new BABYLON.ShadowGenerator(1024, dir);
  shadowGen.useExponentialShadowMap = true;

  // ground to catch shadows
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 30, height: 30 },
    scene
  );
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.15, 0.17, 0.2);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // shapes – each slightly different material/position
  const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
  box.position = new BABYLON.Vector3(-5, 1, 0);

  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 2, segments: 24 },
    scene
  );
  sphere.position = new BABYLON.Vector3(0, 1, 3);

  const cylinder = BABYLON.MeshBuilder.CreateCylinder(
    "cyl",
    { diameter: 2, height: 3, tessellation: 32 },
    scene
  );
  cylinder.position = new BABYLON.Vector3(4, 1.5, -2);

  const torus = BABYLON.MeshBuilder.CreateTorus(
    "torus",
    { diameter: 3, thickness: 0.5, tessellation: 64 },
    scene
  );
  torus.position = new BABYLON.Vector3(-1, 2, -4);

  const plane = BABYLON.MeshBuilder.CreatePlane(
    "plane",
    { size: 3 },
    scene
  );
  plane.position = new BABYLON.Vector3(6, 2, 3);
  plane.rotation.y = BABYLON.Tools.ToRadians(30);

  // materials so it doesn’t look dead flat
  box.material = new BABYLON.StandardMaterial("matBox", scene);
  box.material.diffuseColor = new BABYLON.Color3(0.9, 0.4, 0.4);

  sphere.material = new BABYLON.StandardMaterial("matSphere", scene);
  sphere.material.diffuseColor = new BABYLON.Color3(0.4, 0.7, 1);
  sphere.material.specularColor = new BABYLON.Color3(0.9, 0.9, 1);

  cylinder.material = new BABYLON.StandardMaterial("matCyl", scene);
  cylinder.material.diffuseColor = new BABYLON.Color3(0.5, 0.9, 0.6);

  torus.material = new BABYLON.StandardMaterial("matTorus", scene);
  torus.material.emissiveColor = new BABYLON.Color3(0.9, 0.8, 0.3); // fake glow

  plane.material = new BABYLON.StandardMaterial("matPlane", scene);
  plane.material.diffuseTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor.png",
    scene
  );

  const meshes = [box, sphere, cylinder, torus, plane];
  meshes.forEach((m) => shadowGen.addShadowCaster(m));

  // tiny bit of motion so it doesn’t feel dead
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() * 0.001;
    box.rotation.y += 0.8 * dt;
    cylinder.rotation.x += 0.4 * dt;
    torus.rotation.y -= 0.6 * dt;
    plane.rotation.z += 0.3 * dt;

    // little float for the sphere
    const t = performance.now() * 0.002;
    sphere.position.y = 1 + Math.sin(t) * 0.4;
  });

  return scene;
}

const scene1 = createScene1();
engine.runRenderLoop(() => scene1.render());
window.addEventListener("resize", () => engine.resize());
// Scene 2 – environment focused on the Leartes castle.
// Idea: castle is the main star, I just add camera, lights, fog, a bit of post-process and ambience.

const s2 = setupEngineAndCanvas();
const canvas2 = s2.canvas;
const engine2 = s2.engine;

async function createScene2() {
  const scene = new BABYLON.Scene(engine2);
  scene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.05, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);

  // FPS camera for walking the space around the castle
  const camera = new BABYLON.UniversalCamera(
    "cam2",
    new BABYLON.Vector3(0, 2, -6),
    scene
  );
  camera.minZ = 0.1;
  camera.speed = 0.6; // movement speed
  camera.angularSensibility = 3000; // mouse sens
  camera.ellipsoid = new BABYLON.Vector3(0.5, 1.0, 0.5);
  camera.checkCollisions = true;
  camera.applyGravity = true;
  camera.keysUp.push(87);  // W
  camera.keysDown.push(83); // S
  camera.keysLeft.push(65); // A
  camera.keysRight.push(68); // D
  camera.attachControl(canvas2, true);

  // main lighting – enough to see the castle but not wash out baked detail
  const hemi = new BABYLON.HemisphericLight("hemi2", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.5;

  const dir = new BABYLON.DirectionalLight("dir2", new BABYLON.Vector3(-0.4, -1, -0.3), scene);
  dir.position = new BABYLON.Vector3(25, 50, 25);
  dir.intensity = 0.8;

  const shadowGen = new BABYLON.ShadowGenerator(1024, dir);
  shadowGen.useExponentialShadowMap = true;

  // soft sky background so the castle isn't floating in pure void
  const skybox = BABYLON.MeshBuilder.CreateBox("skybox2", { size: 2000 }, scene);
  const skyMat = new BABYLON.StandardMaterial("skyMat2", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.06);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;

  // simple fallback ground, in case the castle has gaps
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground2",
    { width: 400, height: 400 },
    scene
  );
  const groundMat = new BABYLON.StandardMaterial("ground2Mat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.12, 0.14, 0.17);
  ground.material = groundMat;
  ground.checkCollisions = true;
  ground.receiveShadows = true;

  // ambient audio placeholder – uses audio_wind.mp3 once I drop it into /assets
  const envSound = new BABYLON.Sound(
    "envWind",
    "assets/audio_wind.mp3",
    scene,
    null,
    {
      loop: true,
      autoplay: true,
      volume: 0.4,
    }
  );

  // import the castle environment (main star of this scene)
  await new Promise((resolve, reject) => {
    BABYLON.SceneLoader.ImportMesh(
      "",
      "assets/",
      "castle.glb", // exported from Blender into /assets
      scene,
      (meshes) => {
        meshes.forEach((m) => {
          m.checkCollisions = true;
          m.receiveShadows = true;
          shadowGen.addShadowCaster(m, true);
        });

        // auto-place camera looking at the castle bounds
        let min = new BABYLON.Vector3(+Infinity, +Infinity, +Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

        meshes.forEach((m) => {
          const bb = m.getBoundingInfo().boundingBox;
          min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
          max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
        });

        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);

        camera.position = center.add(
          new BABYLON.Vector3(0, Math.max(3, size.y * 0.25), -Math.max(12, size.z * 0.4))
        );
        camera.setTarget(center);

        resolve();
      },
      null,
      (scene, msg, err) => reject(err || new Error(msg))
    );
  });

  // jump logic so I can hop around the environment a bit
  let canJump = true;
  let vy = 0;
  const JUMP_FORCE = 0.18;
  const G = -0.008;

  window.addEventListener("keydown", (ev) => {
    if ((ev.code === "Space" || ev.keyCode === 32) && canJump) {
      vy = JUMP_FORCE;
      canJump = false;
    }
  });

  scene.onBeforeRenderObservable.add(() => {
    const ray = new BABYLON.Ray(camera.position, new BABYLON.Vector3(0, -1, 0), 1.3);
    const pick = scene.pickWithRay(ray, (m) => m.checkCollisions && m !== skybox);

    if (pick?.hit && vy <= 0) {
      vy = 0;
      canJump = true;
    } else {
      vy += G;
      camera.cameraDirection.y += vy;
    }
  });

  // fog gives atmosphere & depth for the castle
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.003;
  scene.fogColor = new BABYLON.Color3(0.02, 0.03, 0.05);

  // small post-process pipeline so it feels more like a game
  const pipeline = new BABYLON.DefaultRenderingPipeline(
    "defaultPipeline",
    true,
    scene,
    [camera]
  );
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.9;
  pipeline.bloomWeight = 0.4;
  pipeline.bloomKernel = 16;

  return scene;
}

createScene2().then((scene) => {
  engine2.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine2.resize());
});
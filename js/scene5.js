// Scene 5 – scene switching.
// Two small scenes (A and B) + GUI buttons to swap between them.
// This is the one I’ll document properly on docs.html.

const s5 = setupEngineAndCanvas();
const canvas5 = s5.canvas;
const engine5 = s5.engine;

let activeScene = null;
let sceneA = null;
let sceneB = null;

// simple “calm room”
function createSceneA() {
  const scene = new BABYLON.Scene(engine5);
  scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.06, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "cam5A",
    BABYLON.Tools.ToRadians(135),
    BABYLON.Tools.ToRadians(60),
    18,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas5, true);

  const hemi = new BABYLON.HemisphericLight("hemi5A", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground5A",
    { width: 20, height: 20 },
    scene
  );
  const gMat = new BABYLON.StandardMaterial("gMat5A", scene);
  gMat.diffuseColor = new BABYLON.Color3(0.1, 0.12, 0.18);
  ground.material = gMat;

  const sphere = BABYLON.MeshBuilder.CreateSphere("sphere5A", { diameter: 3 }, scene);
  sphere.position = new BABYLON.Vector3(0, 2, 0);
  const sMat = new BABYLON.StandardMaterial("sMat5A", scene);
  sMat.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
  sphere.material = sMat;

  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI5A", true, scene);
  const label = new BABYLON.GUI.TextBlock();
  label.text = "Scene A – Calm Room";
  label.color = "white";
  label.fontSize = 22;
  label.top = "-45%";
  ui.addControl(label);

  // tiny motion so it feels alive
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.002;
    sphere.position.y = 2 + Math.sin(t) * 0.3;
  });

  return scene;
}

// more intense / energetic room
function createSceneB() {
  const scene = new BABYLON.Scene(engine5);
  scene.clearColor = new BABYLON.Color4(0.05, 0.01, 0.01, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "cam5B",
    BABYLON.Tools.ToRadians(45),
    BABYLON.Tools.ToRadians(60),
    18,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.attachControl(canvas5, true);

  const hemi = new BABYLON.HemisphericLight("hemi5B", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.9;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground5B",
    { width: 20, height: 20 },
    scene
  );
  const gMat = new BABYLON.StandardMaterial("gMat5B", scene);
  gMat.diffuseColor = new BABYLON.Color3(0.18, 0.08, 0.1);
  ground.material = gMat;

  // a few boxes in a pattern
  const boxes = [];
  for (let i = -2; i <= 2; i++) {
    const b = BABYLON.MeshBuilder.CreateBox("box5B_" + i, { size: 1.5 }, scene);
    b.position = new BABYLON.Vector3(i * 2, 0.75, Math.abs(i) * 1.2);
    const bMat = new BABYLON.StandardMaterial("bMat5B_" + i, scene);
    bMat.emissiveColor = new BABYLON.Color3(
      0.7 + i * 0.05,
      0.2 + Math.max(0, -i) * 0.1,
      0.2 + Math.max(0, i) * 0.1
    );
    b.material = bMat;
    boxes.push(b);
  }

  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI5B", true, scene);
  const label = new BABYLON.GUI.TextBlock();
  label.text = "Scene B – Busy Room";
  label.color = "white";
  label.fontSize = 22;
  label.top = "-45%";
  ui.addControl(label);

  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.003;
    boxes.forEach((b, idx) => {
      b.rotation.y = t + idx * 0.2;
    });
  });

  return scene;
}

// attach shared GUI to both scenes so I can swap between them
function attachSwitchUI(scene) {
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("SwitchUI", true, scene);

  const panel = new BABYLON.GUI.StackPanel();
  panel.width = "220px";
  panel.isVertical = true;
  panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
  panel.paddingLeft = "20px";
  panel.paddingBottom = "20px";
  ui.addControl(panel);

  function makeButton(label, callback) {
    const btn = BABYLON.GUI.Button.CreateSimpleButton("btn" + label, label);
    btn.height = "40px";
    btn.color = "white";
    btn.fontSize = 16;
    btn.background = "#1f2937";
    btn.cornerRadius = 6;
    btn.thickness = 1;
    btn.paddingTop = "5px";
    btn.paddingBottom = "5px";
    btn.onPointerUpObservable.add(callback);
    panel.addControl(btn);
    return btn;
  }

  makeButton("Go to Scene A", () => {
    activeScene = sceneA;
  });

  makeButton("Go to Scene B", () => {
    activeScene = sceneB;
  });

  // optional: add a button to go back to Home (reload page)
  makeButton("Back to Home", () => {
    window.location.href = "index.html";
  });
}

// boot everything
sceneA = createSceneA();
sceneB = createSceneB();
attachSwitchUI(sceneA);
attachSwitchUI(sceneB);

// start with A active
activeScene = sceneA;

// single render loop – just renders whatever activeScene points at
engine5.runRenderLoop(() => {
  if (activeScene) {
    activeScene.render();
  }
});

window.addEventListener("resize", () => engine5.resize());
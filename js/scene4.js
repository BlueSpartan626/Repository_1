// Scene 4 – GUI and audio.
// Goal: show a Babylon GUI menu that controls music, colours, and night mode.

const s4 = setupEngineAndCanvas();
const canvas4 = s4.canvas;
const engine4 = s4.engine;

function createScene4() {
  const scene = new BABYLON.Scene(engine4);
  scene.clearColor = new BABYLON.Color4(0.01, 0.02, 0.04, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "cam4",
    BABYLON.Tools.ToRadians(135),
    BABYLON.Tools.ToRadians(60),
    18,
    new BABYLON.Vector3(0, 2, 0),
    scene
  );
  camera.attachControl(canvas4, true);

  const hemi = new BABYLON.HemisphericLight("hemi4", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;

  // simple "stage" mesh so there's something in the middle
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground4",
    { width: 20, height: 20 },
    scene
  );
  const gMat = new BABYLON.StandardMaterial("gMat4", scene);
  gMat.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.12);
  ground.material = gMat;

  const orb = BABYLON.MeshBuilder.CreateSphere(
    "orb4",
    { diameter: 3 },
    scene
  );
  orb.position = new BABYLON.Vector3(0, 2.5, 0);
  const orbMat = new BABYLON.StandardMaterial("orbMat4", scene);
  orbMat.emissiveColor = new BABYLON.Color3(0.3, 0.7, 1);
  orb.material = orbMat;

  // main music placeholder
  const music = new BABYLON.Sound(
    "music4",
    "assets/audio_main.mp3",
    scene,
    null,
    {
      loop: true,
      autoplay: false,
      volume: 0.5,
    }
  );

  // click SFX placeholder
  const clickSfx = new BABYLON.Sound(
    "click4",
    "assets/audio_click.mp3",
    scene,
    null,
    {
      volume: 0.7,
    }
  );

  // Babylon GUI overlay
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI4");

  // panel for menu
  const panel = new BABYLON.GUI.StackPanel();
  panel.width = "240px";
  panel.isVertical = true;
  panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  panel.paddingRight = "20px";
  ui.addControl(panel);

  // label
  const title = new BABYLON.GUI.TextBlock();
  title.text = "Scene 4 Controls";
  title.height = "40px";
  title.color = "white";
  title.fontSize = 20;
  panel.addControl(title);

  // helper to make buttons
  function makeButton(label, callback) {
    const btn = BABYLON.GUI.Button.CreateSimpleButton("btn" + label, label);
    btn.height = "40px";
    btn.color = "white";
    btn.fontSize = 16;
    btn.background = "#1f2937";
    btn.cornerRadius = 6;
    btn.thickness = 1;
    btn.paddingTop = "10px";
    btn.onPointerUpObservable.add(() => {
      clickSfx.play();
      callback();
    });
    panel.addControl(btn);
    return btn;
  }

  // 1) toggle music
  let musicOn = false;
  makeButton("Toggle Music", () => {
    musicOn = !musicOn;
    if (musicOn) {
      music.play();
    } else {
      music.pause();
    }
  });

  // 2) cycle orb colour
  makeButton("Cycle Orb Colour", () => {
    const colours = [
      new BABYLON.Color3(0.3, 0.7, 1),
      new BABYLON.Color3(0.9, 0.5, 0.6),
      new BABYLON.Color3(0.5, 0.9, 0.6),
      new BABYLON.Color3(0.9, 0.8, 0.3),
    ];
    const current = orbMat.emissiveColor;
    let idx = colours.findIndex((c) => c.equals(current));
    if (idx === -1) idx = 0;
    const next = colours[(idx + 1) % colours.length];
    orbMat.emissiveColor = next;
  });

  // 3) toggle "night mode" – darker scene, lower light
  let nightMode = false;
  makeButton("Toggle Night Mode", () => {
    nightMode = !nightMode;
    if (nightMode) {
      scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.02, 1);
      hemi.intensity = 0.3;
    } else {
      scene.clearColor = new BABYLON.Color4(0.01, 0.02, 0.04, 1);
      hemi.intensity = 0.7;
    }
  });

  // 4) volume slider
  const volumeSlider = new BABYLON.GUI.Slider();
  volumeSlider.minimum = 0;
  volumeSlider.maximum = 1;
  volumeSlider.value = 0.5;
  volumeSlider.height = "20px";
  volumeSlider.width = "200px";
  volumeSlider.color = "white";
  volumeSlider.background = "#0f172a";
  volumeSlider.borderColor = "#374151";
  volumeSlider.onValueChangedObservable.add((v) => {
    music.setVolume(v);
  });
  panel.addControl(volumeSlider);

  return scene;
}

const scene4 = createScene4();
engine4.runRenderLoop(() => scene4.render());
window.addEventListener("resize", () => engine4.resize());
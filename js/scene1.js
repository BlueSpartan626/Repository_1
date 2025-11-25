// Scene 1 – basic shapes, light, shadows, motion + click interactions.
// This is basically my "playground" room where I mess with simple behaviours.

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

  // --- SHAPES ---

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

  // --- MATERIALS ---

  const boxMat = new BABYLON.StandardMaterial("matBox", scene);
  boxMat.diffuseColor = new BABYLON.Color3(0.9, 0.4, 0.4);
  box.material = boxMat;

  const sphereMat = new BABYLON.StandardMaterial("matSphere", scene);
  sphereMat.diffuseColor = new BABYLON.Color3(0.4, 0.7, 1);
  sphereMat.specularColor = new BABYLON.Color3(0.9, 0.9, 1);
  sphere.material = sphereMat;

  const cylMat = new BABYLON.StandardMaterial("matCyl", scene);
  cylMat.diffuseColor = new BABYLON.Color3(0.5, 0.9, 0.6);
  cylinder.material = cylMat;

  const torusMat = new BABYLON.StandardMaterial("matTorus", scene);
  torusMat.emissiveColor = new BABYLON.Color3(0.9, 0.8, 0.3); // fake glow
  torus.material = torusMat;

  const planeMat = new BABYLON.StandardMaterial("matPlane", scene);
  // important: show the plane from both sides so it never vanishes when viewed from behind
  planeMat.backFaceCulling = false;
  planeMat.diffuseTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor.png",
    scene
  );
  plane.material = planeMat;

  const meshes = [box, sphere, cylinder, torus, plane];
  meshes.forEach((m) => shadowGen.addShadowCaster(m));

  // --- INTERACTION STATE ---
  // I just keep some flags per shape so I can flip behaviours on click.

  const shapeState = {
    box: {
      fastSpin: false,
    },
    sphere: {
      pulse: false,
      baseScale: sphere.scaling.clone(),
    },
    cylinder: {
      bounceTimer: 0, // counts down when I trigger a bounce
    },
    torus: {
      crazySpin: false,
    },
    plane: {
      flipped: false,
    },
  };

  // helper to randomise a colour
  function randomColor3() {
    return new BABYLON.Color3(
      0.3 + Math.random() * 0.7,
      0.3 + Math.random() * 0.7,
      0.3 + Math.random() * 0.7
    );
  }

  // what happens when I click each shape
  function handleShapeClick(mesh) {
    switch (mesh.name) {
      // BOX – toggles between chill rotation and hyper spin + random colour
      case "box": {
        const state = shapeState.box;
        state.fastSpin = !state.fastSpin;
        if (state.fastSpin) {
          boxMat.diffuseColor = randomColor3();
        } else {
          boxMat.diffuseColor = new BABYLON.Color3(0.9, 0.4, 0.4);
        }
        break;
      }

      // SPHERE – toggles a breathing/pulse effect on scale + colour shift
      case "sphere": {
        const state = shapeState.sphere;
        state.pulse = !state.pulse;
        if (state.pulse) {
          sphereMat.diffuseColor = new BABYLON.Color3(0.6, 0.9, 1.0);
        } else {
          sphereMat.diffuseColor = new BABYLON.Color3(0.4, 0.7, 1);
          sphere.scaling.copyFrom(state.baseScale);
        }
        break;
      }

      // CYLINDER – quick bounce animation whenever I click it
      case "cyl": {
        const state = shapeState.cylinder;
        state.bounceTimer = 0.7; // seconds of bounce time
        break;
      }

      // TORUS – each click randomises colour + toggles heavier rotation
      case "torus": {
        const state = shapeState.torus;
        state.crazySpin = !state.crazySpin;
        torusMat.emissiveColor = randomColor3();
        break;
      }

      // PLANE – flips around + switches between textured and flat colour
      case "plane": {
        const state = shapeState.plane;
        state.flipped = !state.flipped;

        if (state.flipped) {
          plane.rotation.y += Math.PI; // quick flip
          planeMat.diffuseTexture = null;
          planeMat.diffuseColor = new BABYLON.Color3(0.3, 0.9, 0.7);
        } else {
          plane.rotation.y -= Math.PI;
          planeMat.diffuseTexture = new BABYLON.Texture(
            "https://playground.babylonjs.com/textures/floor.png",
            scene
          );
          planeMat.diffuseColor = BABYLON.Color3.White();
        }
        break;
      }
    }
  }

  // click handling – I just pick whatever mesh I click and pass it to the function
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      const pick = pointerInfo.pickInfo;
      if (pick?.hit && pick.pickedMesh) {
        handleShapeClick(pick.pickedMesh);
      }
    }
  });

  // --- PER-FRAME ANIMATION ---

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() * 0.001; // delta in seconds
    const t = performance.now() * 0.002;

    // BOX – always rotates a bit, faster if fastSpin is on
    const boxState = shapeState.box;
    const boxSpeed = boxState.fastSpin ? 3.0 : 0.8;
    box.rotation.y += boxSpeed * dt;

    // SPHERE – gentle float + optional pulse
    const sphState = shapeState.sphere;
    sphere.position.y = 1 + Math.sin(t) * 0.4;
    if (sphState.pulse) {
      const pulse = 1 + Math.sin(t * 2.0) * 0.15;
      sphere.scaling.copyFrom(sphState.baseScale.scale(pulse));
    }

    // CYLINDER – rotates a bit and does a bounce when bounceTimer > 0
    const cylState = shapeState.cylinder;
    cylinder.rotation.x += 0.4 * dt;

    if (cylState.bounceTimer > 0) {
      cylState.bounceTimer -= dt;
      const bouncePhase = Math.max(cylState.bounceTimer, 0);
      cylinder.position.y = 1.5 + Math.sin(bouncePhase * 15) * 0.6;
    } else {
      cylinder.position.y = 1.5;
    }

    // TORUS – idle rotation + extra spin if crazySpin flag is on
    const torusState = shapeState.torus;
    const torusBaseSpeed = -0.6;
    const torusExtra = torusState.crazySpin ? -2.5 : 0;
    torus.rotation.y += (torusBaseSpeed + torusExtra) * dt;

    // PLANE – subtle wobble so it's not dead static
    plane.rotation.z += 0.3 * dt;
  });

  return scene;
}

const scene1 = createScene1();
engine.runRenderLoop(() => scene1.render());
window.addEventListener("resize", () => engine.resize());
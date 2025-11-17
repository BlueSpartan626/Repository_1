// Scene 3 – player mesh, input, simple physics and interaction.
// Goal: show I can control an actual mesh, not just the camera.

const s3 = setupEngineAndCanvas();
const canvas3 = s3.canvas;
const engine3 = s3.engine;

function createScene3() {
  const scene = new BABYLON.Scene(engine3);
  scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
  scene.collisionsEnabled = true;

  // basic ground
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground3",
    { width: 40, height: 40 },
    scene
  );
  const gMat = new BABYLON.StandardMaterial("gMat3", scene);
  gMat.diffuseColor = new BABYLON.Color3(0.12, 0.15, 0.18);
  ground.material = gMat;
  ground.checkCollisions = true;

  // player mesh – simple capsule (body + head merged)
  const body = BABYLON.MeshBuilder.CreateCylinder(
    "playerBody",
    { height: 2, diameter: 1 },
    scene
  );
  const head = BABYLON.MeshBuilder.CreateSphere(
    "playerHead",
    { diameter: 1 },
    scene
  );
  head.position.y = 1.5;
  const player = BABYLON.Mesh.MergeMeshes([body, head], true, true, undefined, false, true);
  player.position = new BABYLON.Vector3(0, 1, 0);
  player.checkCollisions = true;

  const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
  playerMat.diffuseColor = new BABYLON.Color3(0.3, 0.7, 1);
  player.material = playerMat;

  // camera follows player from behind-ish
  const camera = new BABYLON.FreeCamera(
    "cam3",
    new BABYLON.Vector3(0, 2.5, -5),
    scene
  );
  camera.attachControl(canvas3, true);
  camera.lockedTarget = player;

  // light
  const hemi = new BABYLON.HemisphericLight("hemi3", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;

  // some boxes to bump / collide with
  const box1 = BABYLON.MeshBuilder.CreateBox("box1", { size: 2 }, scene);
  box1.position = new BABYLON.Vector3(5, 1, 0);
  box1.checkCollisions = true;

  const box2 = BABYLON.MeshBuilder.CreateBox("box2", { size: 2 }, scene);
  box2.position = new BABYLON.Vector3(-4, 1, 3);
  box2.checkCollisions = true;

  // placeholder jump sound
  const jumpSound = new BABYLON.Sound(
    "jumpSound",
    "assets/audio_jump.mp3",
    scene,
    null,
    { volume: 0.6 }
  );

  // input state
  const input = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  };

  window.addEventListener("keydown", (ev) => {
    switch (ev.code) {
      case "KeyW":
        input.forward = true;
        break;
      case "KeyS":
        input.back = true;
        break;
      case "KeyA":
        input.left = true;
        break;
      case "KeyD":
        input.right = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        input.sprint = true;
        break;
      case "Space":
        input.jump = true;
        break;
    }
  });

  window.addEventListener("keyup", (ev) => {
    switch (ev.code) {
      case "KeyW":
        input.forward = false;
        break;
      case "KeyS":
        input.back = false;
        break;
      case "KeyA":
        input.left = false;
        break;
      case "KeyD":
        input.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        input.sprint = false;
        break;
      case "Space":
        input.jump = false;
        break;
    }
  });

  // simple "fake physics" movement
  let velocity = new BABYLON.Vector3(0, 0, 0);
  let onGround = false;

  const MOVE_SPEED = 0.08;
  const SPRINT_MULT = 1.8;
  const GRAVITY = -0.01;
  const JUMP_FORCE = 0.2;

  scene.onBeforeRenderObservable.add(() => {
    // gravity on y
    if (!onGround) {
      velocity.y += GRAVITY;
    }

    // ground check via ray
    const ray = new BABYLON.Ray(player.position, new BABYLON.Vector3(0, -1, 0), 1.2);
    const pick = scene.pickWithRay(ray, (m) => m === ground || m === box1 || m === box2);

    if (pick?.hit && velocity.y <= 0) {
      onGround = true;
      velocity.y = 0;
    } else {
      onGround = false;
    }

    // movement vector
    let move = new BABYLON.Vector3(0, 0, 0);
    const baseSpeed = MOVE_SPEED * (input.sprint ? SPRINT_MULT : 1);

    if (input.forward) move.z += 1;
    if (input.back) move.z -= 1;
    if (input.left) move.x -= 1;
    if (input.right) move.x += 1;

    if (!move.equals(BABYLON.Vector3.Zero())) {
      move = move.normalize().scale(baseSpeed);
    }

    // jump
    if (input.jump && onGround) {
      velocity.y = JUMP_FORCE;
      onGround = false;
      jumpSound.play();
    }

    // apply movement
    player.moveWithCollisions(new BABYLON.Vector3(move.x, velocity.y, move.z));

    // fake "animation": scale up a little while sprinting
    const targetScale = input.sprint ? 1.1 : 1.0;
    player.scaling = BABYLON.Vector3.Lerp(
      player.scaling,
      new BABYLON.Vector3(targetScale, targetScale, targetScale),
      0.15
    );
  });

  return scene;
}

const scene3 = createScene3();
engine3.runRenderLoop(() => scene3.render());
window.addEventListener("resize", () => engine3.resize());
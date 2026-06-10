// js/scene3.js
const s3 = setupEngineAndCanvas();
const canvas3 = s3.canvas;
const engine3 = s3.engine;

function createScene3() {
    const scene = new BABYLON.Scene(engine3);
    scene.clearColor = new BABYLON.Color4(0.025, 0.03, 0.045, 1);
    scene.collisionsEnabled = true;
    scene.collisionRetryCount = 8;

    const input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jumpPressed: false,
        interactPressed: false
    };

    const materials = createMaterials(scene);
    const walkableSurfaces = [];

    const player = createPlayer(scene, materials);
    const camera = createCamera(scene, player);
    const ui = createSceneUI();
    const popup = createCompletionPopup();

    const playerStart = new BABYLON.Vector3(0, 1.25, -48);
    const platformRespawn = new BABYLON.Vector3(58, 1.25, 34);

    let cameraYaw = 0;
    let cameraPitch = 0.12;
    let moveVelocity = BABYLON.Vector3.Zero();
    let verticalVelocity = 0;
    let carriedObject = null;

    let collectedCores = 0;
    let door1Open = false;
    let door2Open = false;
    let finalDoorOpen = false;
    let sceneComplete = false;
    
    //For Debug purposes delete later
    let debugFreecamEnabled = false;

    const playerHeightOffset = 1.25;
    const gravity = 11.5;
    const jumpStrength = 6.1;
    const walkSpeed = 6.8;
    const sprintSpeed = 10.5;
    const acceleration = 0.18;
    const deceleration = 0.22;

    const cameraDistance = 7.8;
    const cameraHeight = 3.1;
    const mouseSensitivity = 0.0024;

    buildFacility(scene, materials, walkableSurfaces);
    createLighting(scene, materials);

    const cores = createEnergyCores(scene, materials);
    const cube = createCarryCube(scene, materials);
    const pressurePad = createPressurePad(scene, materials);
    const doors = createDoors(scene, materials);
    const finalButton = createFinalButton(scene, materials);
    const scanner = createFinalScanner(scene, materials);

    player.position.copyFrom(playerStart);

    const clickSound = new BABYLON.Sound(
        "scene3ClickSound",
        "../assets/audio_click.wav",
        scene,
        null,
        { volume: 0.45, spatialSound: false, autoplay: false }
    );

    canvas3.addEventListener("click", () => {
        if (!sceneComplete && document.pointerLockElement !== canvas3) {
            canvas3.requestPointerLock();
        }
    });

    document.addEventListener("mousemove", (event) => {
        if (document.pointerLockElement !== canvas3) return;

        cameraYaw += event.movementX * mouseSensitivity;
        cameraPitch += event.movementY * mouseSensitivity;
        cameraPitch = BABYLON.Scalar.Clamp(cameraPitch, -1.45, 1.45);
    });

    window.addEventListener("keydown", (event) => {
        if (sceneComplete) return;

        if (event.code === "KeyW") input.forward = true;
        if (event.code === "KeyS") input.backward = true;
        if (event.code === "KeyA") input.left = true;
        if (event.code === "KeyD") input.right = true;
        if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = true;

        if (event.code === "Space") {
            input.jumpPressed = true;
            event.preventDefault();
        }

        if (event.code === "KeyE") {
            input.interactPressed = true;
            event.preventDefault();
        }

        if (event.code === "KeyN") {
            debugFreecamEnabled = !debugFreecamEnabled;
            console.log("DEBUG FREECAM:", debugFreecamEnabled);
            event.preventDefault();
        }

        if (event.code === "Escape") {
            document.exitPointerLock?.();
        }
    });

    window.addEventListener("keyup", (event) => {
        if (event.code === "KeyW") input.forward = false;
        if (event.code === "KeyS") input.backward = false;
        if (event.code === "KeyA") input.left = false;
        if (event.code === "KeyD") input.right = false;
        if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.sprint = false;
    });

    scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(engine3.getDeltaTime() / 1000, 0.033);

        if (!sceneComplete) {
            updatePlayer(dt);
            updatePickupSystem(dt);
            updateEnergyCores(dt);
            updateDoors(dt);
            updateFinalButton();
            updateFinalScanner(dt);
        }

        updateCamera(dt);
        updateUI();

        input.jumpPressed = false;
        input.interactPressed = false;
    });

    function updatePlayer(dt) {

        //For Debug purposes delete later
        if (debugFreecamEnabled) return;

        const forward = new BABYLON.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
        const right = new BABYLON.Vector3(forward.z, 0, -forward.x);

        let desiredMove = BABYLON.Vector3.Zero();

        if (input.forward) desiredMove.addInPlace(forward);
        if (input.backward) desiredMove.subtractInPlace(forward);
        if (input.right) desiredMove.addInPlace(right);
        if (input.left) desiredMove.subtractInPlace(right);

        const moving = desiredMove.lengthSquared() > 0.0001;
        const targetSpeed = input.sprint ? sprintSpeed : walkSpeed;

        if (moving) {
            desiredMove.normalize().scaleInPlace(targetSpeed * dt);
            moveVelocity = BABYLON.Vector3.Lerp(moveVelocity, desiredMove, acceleration);
            player.rotation.y = Math.atan2(moveVelocity.x, moveVelocity.z);
        } else {
            moveVelocity = BABYLON.Vector3.Lerp(moveVelocity, BABYLON.Vector3.Zero(), deceleration);
        }

        const groundY = getGroundHeightAt(player.position, walkableSurfaces);
        const targetY = groundY + playerHeightOffset;
        const grounded = Math.abs(player.position.y - targetY) < 0.08 && verticalVelocity <= 0;

        if (grounded) {
            player.position.y = targetY;
            verticalVelocity = 0;
        }

        if (input.jumpPressed && grounded) {
            verticalVelocity = jumpStrength;
            playSound(clickSound);
        }

        verticalVelocity -= gravity * dt;

        player.moveWithCollisions(new BABYLON.Vector3(moveVelocity.x, 0, moveVelocity.z));
        player.position.y += verticalVelocity * dt;

        const newGroundY = getGroundHeightAt(player.position, walkableSurfaces);
        const newTargetY = newGroundY + playerHeightOffset;

        if (player.position.y <= newTargetY && verticalVelocity <= 0) {
            player.position.y = newTargetY;
            verticalVelocity = 0;
        }

        if (player.position.x > 45 && player.position.z > 18 && player.position.y < -3) {
            player.position.copyFrom(platformRespawn);
            verticalVelocity = 0;
            moveVelocity = BABYLON.Vector3.Zero();
        }

        if (player.position.y < -10) {
            player.position.copyFrom(playerStart);
            verticalVelocity = 0;
            moveVelocity = BABYLON.Vector3.Zero();
        }

        animatePlayer(moving);
    }

    function animatePlayer(moving) {
        if (moving) {
            const bob = Math.sin(performance.now() * 0.014) * 0.025;
            const stretch = input.sprint ? 1.04 : 1.015;

            player.scaling.x = BABYLON.Scalar.Lerp(player.scaling.x, stretch, 0.12);
            player.scaling.y = BABYLON.Scalar.Lerp(player.scaling.y, 1 + Math.abs(bob), 0.18);
            player.scaling.z = BABYLON.Scalar.Lerp(player.scaling.z, stretch, 0.12);
        } else {
            player.scaling = BABYLON.Vector3.Lerp(player.scaling, new BABYLON.Vector3(1, 1, 1), 0.12);
        }
    }

    function updatePickupSystem(dt) {
        const carryPosition = player.position.add(
            new BABYLON.Vector3(
                Math.sin(cameraYaw) * 2.1,
                0.15,
                Math.cos(cameraYaw) * 2.1
            )
        );

        if (carriedObject) {
            carriedObject.position = BABYLON.Vector3.Lerp(carriedObject.position, carryPosition, 18 * dt);
            carriedObject.position.y = player.position.y + 0.15;
            carriedObject.rotation.y += 1.5 * dt;
        }

        if (!input.interactPressed) return;

        if (carriedObject) {
            const dropPosition = player.position.add(
                new BABYLON.Vector3(
                    Math.sin(cameraYaw) * 2.4,
                    0,
                    Math.cos(cameraYaw) * 2.4
                )
            );

            const dropGroundY = getGroundHeightAt(dropPosition, walkableSurfaces);
            carriedObject.position = new BABYLON.Vector3(dropPosition.x, dropGroundY + 0.9, dropPosition.z);
            carriedObject.checkCollisions = true;
            carriedObject = null;
            playSound(clickSound);
            return;
        }

        if (BABYLON.Vector3.Distance(player.position, cube.position) < 3.0) {
            carriedObject = cube;
            cube.checkCollisions = false;
            playSound(clickSound);
        }
    }

    function updateEnergyCores(dt) {
        cores.forEach((core) => {
            if (core.metadata.collected) return;

            core.rotation.y += 2.5 * dt;
            core.position.y = core.metadata.baseY + Math.sin(performance.now() * 0.003 + core.metadata.offset) * 0.22;

            if (BABYLON.Vector3.Distance(player.position, core.position) < 1.5) {
                core.metadata.collected = true;
                core.setEnabled(false);
                collectedCores += 1;
                playSound(clickSound);
            }
        });

        door1Open = collectedCores >= cores.length;
    }

    function updateDoors(dt) {
        const cubeOnPad =
            BABYLON.Vector3.Distance(
                new BABYLON.Vector3(cube.position.x, 0, cube.position.z),
                new BABYLON.Vector3(pressurePad.position.x, 0, pressurePad.position.z)
            ) < 2.4 &&
            carriedObject !== cube;

        door2Open = cubeOnPad;
        pressurePad.material = cubeOnPad ? materials.greenLight : materials.padInactive;

        animateDoor(doors.door1, door1Open, dt);
        animateDoor(doors.door2, door2Open, dt);
        animateDoor(doors.finalDoor, finalDoorOpen, dt);
    }

    function animateDoor(door, open, dt) {
        const targetY = open ? door.metadata.openY : door.metadata.closedY;

        door.position.y = BABYLON.Scalar.Lerp(door.position.y, targetY, 6 * dt);
        door.checkCollisions = !(open && door.position.y > door.metadata.closedY + 4.2);
        door.metadata.light.material = open ? materials.greenLight : materials.redLight;
    }

    function updateFinalButton() {
        const distance = BABYLON.Vector3.Distance(player.position, finalButton.position);

        if (input.interactPressed && distance < 3.0 && player.position.y > 5.2) {
            finalDoorOpen = true;
            finalButton.metadata.light.material = materials.greenLight;
            finalButton.metadata.screen.material = materials.greenLight;
            playSound(clickSound);
        }
    }

function updateFinalScanner(dt) {
    scanner.ring.rotation.y += 1.4 * dt;
    scanner.core.rotation.y -= 1.8 * dt;
    scanner.core.position.y = 1.8 + Math.sin(performance.now() * 0.0025) * 0.18;

    const distance = BABYLON.Vector3.Distance(player.position, scanner.core.position);

    if (distance < 3.2) {
        sceneComplete = true;
        document.exitPointerLock?.();
        popup.style.display = "flex";
    }
}

function updateCamera(dt) {
    if (debugFreecamEnabled) {
        const speed = input.sprint ? 26 * dt : 11 * dt;

        camera.rotation.x = cameraPitch;
        camera.rotation.y = cameraYaw;
        camera.rotation.z = 0;

        const forward = camera.getDirection(BABYLON.Axis.Z);
        const right = camera.getDirection(BABYLON.Axis.X);

        let movement = BABYLON.Vector3.Zero();

        if (input.forward) movement.addInPlace(forward);
        if (input.backward) movement.subtractInPlace(forward);
        if (input.right) movement.addInPlace(right);
        if (input.left) movement.subtractInPlace(right);
        if (input.jumpPressed) movement.y += 1;

        if (movement.lengthSquared() > 0.001) {
            movement.normalize().scaleInPlace(speed);
            camera.position.addInPlace(movement);
        }

        return;
    }

    const pitchHeight = Math.sin(cameraPitch) * 3.0;
    const horizontalDistance = cameraDistance + Math.cos(cameraPitch) * 0.5;
    const targetLookAt = player.position.add(new BABYLON.Vector3(0, 1.25, 0));

    let desiredPosition = player.position.add(
        new BABYLON.Vector3(
            -Math.sin(cameraYaw) * horizontalDistance,
            cameraHeight + pitchHeight,
            -Math.cos(cameraYaw) * horizontalDistance
        )
    );

    const ceiling = player.position.z > 30 || player.position.y > 4.5 ? 12.5 : 5.6;
    desiredPosition.y = BABYLON.Scalar.Clamp(desiredPosition.y, 1.8, ceiling - 0.45);

    const rayDirection = desiredPosition.subtract(targetLookAt);
    const rayLength = rayDirection.length();
    const ray = new BABYLON.Ray(targetLookAt, rayDirection.normalize(), rayLength);

    const hit = scene.pickWithRay(ray, (mesh) => {
        return mesh !== player &&
            mesh.checkCollisions &&
            !mesh.name.includes("floor") &&
            !mesh.name.includes("platform") &&
            !mesh.name.includes("pressurePad") &&
            !mesh.name.includes("trim") &&
            !mesh.name.includes("panelDetail");
    });

    if (hit && hit.hit && hit.pickedPoint) {
        desiredPosition = hit.pickedPoint.subtract(ray.direction.scale(0.75));
    }

    camera.position = BABYLON.Vector3.Lerp(camera.position, desiredPosition, 8 * dt);
    camera.setTarget(targetLookAt);
}

    function updateUI() {
        const lockText = document.pointerLockElement === canvas3 ? "Mouse Locked" : "Click Scene to Lock Mouse";

        let objective = "Collect the three energy cores in the first chamber";

        if (door1Open && !door2Open) {
            objective = "Carry the cube with E and place it on the pressure pad";
        }

        if (door1Open && door2Open && !finalDoorOpen) {
            objective = "Cross the platform chamber and press E at the upper console";
        }

        if (finalDoorOpen && !sceneComplete) {
            objective = "Enter the final upper room and reach the scanner";
        }

        if (sceneComplete) {
            objective = "Scene Complete";
        }

        ui.innerHTML =
            `Scene 3 – Sci-Fi Physics Test Chamber<br>` +
            `WASD = Move • Mouse = Look • Space = Jump • Shift = Sprint • E = Interact / Pick Up / Place • R = Reset • N = Debug Freecam<br>` +
            `Objective: ${objective} • Energy Cores: ${collectedCores}/${cores.length} • ${lockText}`;
    }

    function resetScene() {
        player.position.copyFrom(playerStart);
        moveVelocity = BABYLON.Vector3.Zero();
        verticalVelocity = 0;
        carriedObject = null;

        collectedCores = 0;
        door1Open = false;
        door2Open = false;
        finalDoorOpen = false;
        sceneComplete = false;

        cube.position = new BABYLON.Vector3(-7, 0.9, 0);
        cube.checkCollisions = true;

        cores.forEach((core) => {
            core.metadata.collected = false;
            core.setEnabled(true);
        });

        resetDoor(doors.door1);
        resetDoor(doors.door2);
        resetDoor(doors.finalDoor);

        finalButton.metadata.light.material = materials.redLight;
        finalButton.metadata.screen.material = materials.redLight;
        pressurePad.material = materials.padInactive;
        popup.style.display = "none";
    }

    function resetDoor(door) {
        door.position.y = door.metadata.closedY;
        door.checkCollisions = true;
        door.metadata.light.material = materials.redLight;
    }

    return scene;
}

function createMaterials(scene) {
    const ASSET_ROOT = "../assets/Modular SciFi MegaKit/Textures/";

    const wallMat = makePanelMaterial(scene, "wallMat", "#101722", "#29384f", "#05080d");
    const corridorWallMat = makePanelMaterial(scene, "corridorWallMat", "#151b24", "#3b4656", "#080b10");

    const doorWallMat = makePanelMaterial(scene, "doorWallMat", "#111824", "#2f415d", "#05080d");
    const doorwayWallLeftMat = makeDoorwayPanelMaterial(scene, "doorwayWallLeftMat", false);
    const doorwayWallRightMat = makeDoorwayPanelMaterial(scene, "doorwayWallRightMat", true);
    const doorwayWallLowerMat = makeDoorwayPanelMaterial(scene, "doorwayWallLowerMat", false);
    const doorwayWallUpperMat = makeDoorwayPanelMaterial(scene, "doorwayWallUpperMat", true);

    const floorMat = makeGridMaterial(scene, "floorMat", "#0b1119", "#26384f", "#05080d");
    const floorPanelMat = makePanelMaterial(scene, "floorPanelMat", "#182436", "#415f83", "#070b12");
    const ceilingMat = makeTextureMaterial(scene, "ceilingMat", ASSET_ROOT + "T_Trim_01_BaseColor.png", ASSET_ROOT + "T_Trim_01_Normal.png", null, 3, 2);
    const panelMat = makePanelMaterial(scene, "panelMat", "#21304a", "#5c82b5", "#0d1420");
    const columnMat = makeTextureMaterial(scene, "columnMat", ASSET_ROOT + "T_Trim_01_BaseColor.png", ASSET_ROOT + "T_Trim_01_Normal.png", null, 1, 2);

    const darkMat = makeMaterial(scene, "darkMat", new BABYLON.Color3(0.01, 0.012, 0.018));
    const trimMat = makeTextureMaterial(scene, "trimMat", ASSET_ROOT + "T_Trim_01_BaseColor.png", ASSET_ROOT + "T_Trim_01_Normal.png", null, 1, 1);

    const playerMat = makeMaterial(scene, "playerMat", new BABYLON.Color3(0.25, 0.65, 1.0));
    playerMat.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);

    const cubeMat = makePanelMaterial(scene, "cubeMat", "#3a4048", "#9aa6b5", "#151a21");

    const coreMat = makeMaterial(scene, "coreMat", new BABYLON.Color3(0.1, 1.0, 0.4));
    coreMat.emissiveColor = new BABYLON.Color3(0.02, 0.9, 0.25);

    const greenLight = makeMaterial(scene, "greenLight", new BABYLON.Color3(0.1, 1.0, 0.35));
    greenLight.emissiveColor = new BABYLON.Color3(0.02, 0.95, 0.22);

    const orangeLight = makeMaterial(scene, "orangeLight", new BABYLON.Color3(1.0, 0.45, 0.08));
    orangeLight.emissiveColor = new BABYLON.Color3(0.5, 0.16, 0.02);

    const redLight = makeMaterial(scene, "redLight", new BABYLON.Color3(1.0, 0.04, 0.02));
    redLight.emissiveColor = new BABYLON.Color3(0.85, 0.02, 0.01);

    const laserMat = makeMaterial(scene, "laserMat", new BABYLON.Color3(1.0, 0.02, 0.01));
    laserMat.emissiveColor = new BABYLON.Color3(0.95, 0.01, 0.01);
    laserMat.alpha = 0.38;

    const tealLight = makeMaterial(scene, "tealLight", new BABYLON.Color3(0.0, 0.85, 1.0));
    tealLight.emissiveColor = new BABYLON.Color3(0.0, 0.45, 0.75);

    const blueLight = makeMaterial(scene, "blueLight", new BABYLON.Color3(0.2, 0.45, 1.0));
    blueLight.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.65);

    const whiteLight = makeMaterial(scene, "whiteLight", new BABYLON.Color3(0.8, 0.9, 1.0));
    whiteLight.emissiveColor = new BABYLON.Color3(0.6, 0.75, 0.95);

    const padInactive = makeMaterial(scene, "padInactive", new BABYLON.Color3(1.0, 0.04, 0.02));
    padInactive.emissiveColor = new BABYLON.Color3(0.65, 0.02, 0.01);

    return {
        wallMat,
        corridorWallMat,
        doorWallMat,
        doorwayWallLeftMat,
        doorwayWallRightMat,
        doorwayWallLowerMat,
        doorwayWallUpperMat,
        floorMat,
        floorPanelMat,
        ceilingMat,
        panelMat,
        columnMat,
        darkMat,
        trimMat,
        playerMat,
        cubeMat,
        coreMat,
        greenLight,
        orangeLight,
        redLight,
        laserMat,
        tealLight,
        blueLight,
        whiteLight,
        padInactive
    };
}

function makeDoorwayPanelMaterial(scene, name, flipped = false) {
    const texture = new BABYLON.DynamicTexture(`${name}_texture`, { width: 1024, height: 1024 }, scene, false);
    const ctx = texture.getContext();

    ctx.fillStyle = "#121821";
    ctx.fillRect(0, 0, 1024, 1024);

    if (flipped) {
        ctx.translate(1024, 0);
        ctx.scale(-1, 1);
    }

    ctx.fillStyle = "#1d2734";
    ctx.fillRect(45, 45, 934, 934);

    ctx.strokeStyle = "#3e526d";
    ctx.lineWidth = 8;
    ctx.strokeRect(70, 70, 884, 884);

    ctx.strokeStyle = "#5f7899";
    ctx.lineWidth = 5;

    for (let y = 150; y <= 820; y += 110) {
        ctx.beginPath();
        ctx.moveTo(120, y);
        ctx.lineTo(370, y);
        ctx.lineTo(440, y + 32);
        ctx.lineTo(660, y + 32);
        ctx.lineTo(730, y);
        ctx.lineTo(900, y);
        ctx.stroke();
    }

    ctx.fillStyle = "#070a0f";

    for (let y = 125; y <= 855; y += 90) {
        ctx.fillRect(170, y, 36, 12);
        ctx.fillRect(470, y, 46, 12);
        ctx.fillRect(760, y, 36, 12);
    }

    texture.update();

    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new BABYLON.Color3(0.22, 0.24, 0.28);
    mat.emissiveColor = new BABYLON.Color3(0.01, 0.015, 0.025);

    return mat;
}

function makeTextureMaterial(scene, name, diffusePath, normalPath = null, emissivePath = null, uScale = 1, vScale = 1) {
    const mat = new BABYLON.StandardMaterial(name, scene);

    const diffuseTexture = new BABYLON.Texture(diffusePath, scene);
    diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    diffuseTexture.uScale = uScale;
    diffuseTexture.vScale = vScale;
    mat.diffuseTexture = diffuseTexture;

    if (normalPath) {
        const normalTexture = new BABYLON.Texture(normalPath, scene);
        normalTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        normalTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        normalTexture.uScale = uScale;
        normalTexture.vScale = vScale;
        mat.bumpTexture = normalTexture;
        mat.bumpTexture.level = 0.45;
    }

    if (emissivePath) {
        const emissiveTexture = new BABYLON.Texture(emissivePath, scene);
        emissiveTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        emissiveTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        emissiveTexture.uScale = uScale;
        emissiveTexture.vScale = vScale;
        mat.emissiveTexture = emissiveTexture;
        mat.emissiveColor = new BABYLON.Color3(0.35, 0.55, 0.75);
    }

    mat.specularColor = new BABYLON.Color3(0.22, 0.22, 0.26);
    return mat;
}

function makeMaterial(scene, name, colour) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = colour;
    mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.22);
    return mat;
}

function makePanelMaterial(scene, name, base, line, dark) {
    const texture = new BABYLON.DynamicTexture(`${name}_texture`, { width: 1024, height: 1024 }, scene, false);
    const ctx = texture.getContext();

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = line;
    ctx.lineWidth = 10;
    ctx.strokeRect(40, 40, 944, 944);

    ctx.strokeStyle = dark;
    ctx.lineWidth = 8;
    ctx.strokeRect(90, 90, 844, 844);

    ctx.strokeStyle = line;
    ctx.lineWidth = 5;

    for (let i = 0; i < 6; i++) {
        const y = 120 + i * 130;
        ctx.beginPath();
        ctx.moveTo(110, y);
        ctx.lineTo(320, y);
        ctx.lineTo(360, y + 24);
        ctx.lineTo(660, y + 24);
        ctx.lineTo(700, y);
        ctx.lineTo(910, y);
        ctx.stroke();
    }

    ctx.fillStyle = dark;

    for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 6; x++) {
            ctx.fillRect(70 + x * 150, 70 + y * 130, 26, 12);
        }
    }

    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.update();

    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new BABYLON.Color3(0.28, 0.28, 0.32);

    return mat;
}

function makeGridMaterial(scene, name, base, line, dark) {
    const texture = new BABYLON.DynamicTexture(`${name}_texture`, { width: 1024, height: 1024 }, scene, false);
    const ctx = texture.getContext();

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = line;
    ctx.lineWidth = 6;

    for (let i = 0; i <= 1024; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1024);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
        ctx.stroke();
    }

    ctx.fillStyle = dark;
    for (let y = 64; y < 1024; y += 128) {
        for (let x = 64; x < 1024; x += 128) {
            ctx.fillRect(x - 12, y - 12, 24, 24);
        }
    }

    texture.update();

    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.22);
    return mat;
}

function makeRibbedMaterial(scene, name, base, line, dark) {
    const texture = new BABYLON.DynamicTexture(`${name}_texture`, { width: 1024, height: 1024 }, scene, false);
    const ctx = texture.getContext();

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = line;
    ctx.lineWidth = 5;

    for (let y = 60; y < 1024; y += 90) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(944, y);
        ctx.stroke();
    }

    ctx.fillStyle = dark;
    for (let y = 35; y < 1024; y += 90) {
        ctx.fillRect(120, y, 60, 12);
        ctx.fillRect(420, y, 60, 12);
        ctx.fillRect(720, y, 60, 12);
    }

    texture.update();

    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseTexture = texture;
    mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.22);
    return mat;
}

function createScene3GapFixes(scene, materials, walkableSurfaces) {
    const room3X = 58;
    const room3Z = 78;
    const room3Depth = 100;
    const room3SouthZ = room3Z - room3Depth / 2;
    const room3NorthZ = room3Z + room3Depth / 2;

    const room4X = -52;
    const room4Z = 150;
    const room4Width = 104;
    const room4WestX = room4X - room4Width / 2;
    const room4EastX = room4X + room4Width / 2;

    const pitBottom = -7;
    const corridor2Height = 6;
    const corridor3Height = 8;
    const roomHeight = 18;
    const doorGap = 10;

    const room3SouthCapHeight = roomHeight - corridor2Height;
    const room3SouthCapY = corridor2Height + room3SouthCapHeight / 2;

    const room3NorthCapHeight = roomHeight - corridor3Height;
    const room3NorthCapY = corridor3Height + room3NorthCapHeight / 2;

    const underGapHeight = 7;
    const underGapY = pitBottom + underGapHeight / 2;

    createBox(scene, "FIX_room3SouthDoorTopGap", doorGap + 1.4, room3SouthCapHeight, 0.9, room3X, room3SouthCapY, room3SouthZ, materials.corridorWallMat, true);
    createBox(scene, "FIX_room3NorthDoorTopGap", doorGap + 1.4, room3NorthCapHeight, 0.9, room3X, room3NorthCapY, room3NorthZ, materials.corridorWallMat, true);

    createBox(scene, "FIX_room3SouthUnderGap", doorGap + 1.4, underGapHeight, 0.9, room3X, underGapY, room3SouthZ, materials.corridorWallMat, false);
    createBox(scene, "FIX_room3NorthUnderGap", doorGap + 1.4, underGapHeight, 0.9, room3X, underGapY, room3NorthZ, materials.corridorWallMat, false);

    createBox(scene, "FIX_room4EastDoorTopGap", 0.9, room3NorthCapHeight, doorGap + 1.4, room4EastX, room3NorthCapY, room4Z, materials.corridorWallMat, true);
    createBox(scene, "FIX_room4WestDoorTopGap", 0.9, room3NorthCapHeight, doorGap + 1.4, room4WestX, room3NorthCapY, room4Z, materials.corridorWallMat, true);

    createBox(scene, "FIX_room4EastUnderGap", 0.9, underGapHeight, doorGap + 1.4, room4EastX, underGapY, room4Z, materials.corridorWallMat, false);
    createBox(scene, "FIX_room4WestUnderGap", 0.9, underGapHeight, doorGap + 1.4, room4WestX, underGapY, room4Z, materials.corridorWallMat, false);

    createBox(scene, "FIX_corridor2Room3ColumnLeft", 1.25, corridor2Height, 1.25, room3X - 5.6, corridor2Height / 2, room3SouthZ - 0.6, materials.columnMat, true);
    createBox(scene, "FIX_corridor2Room3ColumnRight", 1.25, corridor2Height, 1.25, room3X + 5.6, corridor2Height / 2, room3SouthZ - 0.6, materials.columnMat, true);

    const room3FloorPatch = createBox(scene, "FIX_room3EntranceFloorPatch", 10, 0.28, 2.5, room3X, -0.12, room3SouthZ - 1.1, materials.floorPanelMat, true);
    walkableSurfaces.push(room3FloorPatch);

    const room3ExitFloorPatch = createBox(scene, "FIX_room3ExitFloorPatch", 10, 0.28, 2.5, room3X, -0.12, room3NorthZ + 1.1, materials.floorPanelMat, true);
    walkableSurfaces.push(room3ExitFloorPatch);

    const room4EntranceFloorPatch = createBox(scene, "FIX_room4EntranceFloorPatch", 2.5, 0.28, 10, room4EastX + 1.1, -0.12, room4Z, materials.floorPanelMat, true);
    walkableSurfaces.push(room4EntranceFloorPatch);

    const room4ExitFloorPatch = createBox(scene, "FIX_room4ExitFloorPatch", 2.5, 0.28, 10, room4WestX - 1.1, -0.12, room4Z, materials.floorPanelMat, true);
    walkableSurfaces.push(room4ExitFloorPatch);
}

function buildFacility(scene, materials, walkableSurfaces) {
    createRoom(scene, materials, walkableSurfaces, "coreRoom", 0, -42, 34, 28, 6, {
        north: true
    });

    createCorridor(scene, materials, walkableSurfaces, "corridorOne", 0, -21, 12, 14, 6);

    createRoom(scene, materials, walkableSurfaces, "cubeRoom", 0, 0, 34, 28, 6, {
        south: true,
        east: true
    });

    createSideCorridor(scene, materials, walkableSurfaces);
    createPlatformPitRoom(scene, materials, walkableSurfaces);
    createRoom3ToRoom4Corridor(scene, materials, walkableSurfaces);
    createScene3PlaceholderRoom4(scene, materials, walkableSurfaces);
    createStageExit(scene, materials, walkableSurfaces);
    createScene3GapFixes(scene, materials, walkableSurfaces);

    createDoorFrames(scene, materials);
    createColumns(scene, materials);
}

function createDoorWall(scene, materials, name, x, z, length, height, side, hasDoor) {
    const gap = hasDoor ? 10.2 : 0;

    if (side === "north" || side === "south") {
        if (!hasDoor) {
            createBox(scene, name, length, height, 0.8, x, height / 2, z, materials.wallMat, true);
            return;
        }

        const sideWidth = (length - gap) / 2;

        createBox(scene, `${name}_left`, sideWidth + 0.2, height, 0.8, x - gap / 2 - sideWidth / 2, height / 2, z, materials.wallMat, true);
        createBox(scene, `${name}_right`, sideWidth + 0.2, height, 0.8, x + gap / 2 + sideWidth / 2, height / 2, z, materials.wallMat, true);
        createBox(scene, `${name}_top`, gap + 1.2, 0.6, 0.8, x, height - 0.3, z, materials.corridorWallMat, true);
        return;
    }

    if (!hasDoor) {
        createBox(scene, name, 0.8, height, length, x, height / 2, z, materials.wallMat, true);
        return;
    }

    const sideDepth = (length - gap) / 2;

    createBox(scene, `${name}_lower`, 0.8, height, sideDepth + 0.2, x, height / 2, z - gap / 2 - sideDepth / 2, materials.wallMat, true);
    createBox(scene, `${name}_upper`, 0.8, height, sideDepth + 0.2, x, height / 2, z + gap / 2 + sideDepth / 2, materials.wallMat, true);
    createBox(scene, `${name}_top`, 0.8, 0.6, gap + 1.2, x, height - 0.3, z, materials.corridorWallMat, true);
}

function createRoom(scene, materials, walkableSurfaces, name, x, z, width, depth, height, doors) {
    const floor = createBox(scene, `${name}_floor`, width, 0.25, depth, x, -0.125, z, materials.floorMat, true);
    walkableSurfaces.push(floor);

    createBox(scene, `${name}_ceiling`, width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    createDoorWall(scene, materials, `${name}_north`, x, z + depth / 2, width, height, "north", doors.north);
    createDoorWall(scene, materials, `${name}_south`, x, z - depth / 2, width, height, "south", doors.south);
    createDoorWall(scene, materials, `${name}_east`, x + width / 2, z, depth, height, "east", doors.east);
    createDoorWall(scene, materials, `${name}_west`, x - width / 2, z, depth, height, "west", doors.west);

    createRoomDecor(scene, materials, x, z, width, depth, height, name);
}

function createCorridor(scene, materials, walkableSurfaces, name, x, z, width, depth, height) {
    const floor = createBox(scene, `${name}_floor`, width, 0.25, depth, x, -0.125, z, materials.floorMat, true);
    walkableSurfaces.push(floor);

    createBox(scene, `${name}_ceiling`, width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    createBox(scene, `${name}_leftWall`, 0.8, height, depth, x - width / 2, height / 2, z, materials.corridorWallMat, true);
    createBox(scene, `${name}_rightWall`, 0.8, height, depth, x + width / 2, height / 2, z, materials.corridorWallMat, true);

    const topY = height - 0.45;
    const bottomY = 0.35;
    const midY = (topY + bottomY) / 2;
    const lineDepth = depth;

    createBox(scene, `${name}_leftTopTeal`, 0.12, 0.08, lineDepth, x - width / 2 + 0.5, topY, z, materials.tealLight, false);
    createBox(scene, `${name}_rightTopTeal`, 0.12, 0.08, lineDepth, x + width / 2 - 0.5, topY, z, materials.tealLight, false);

    createBox(scene, `${name}_leftMidBlue`, 0.12, 0.08, lineDepth, x - width / 2 + 0.5, midY, z, materials.blueLight, false);
    createBox(scene, `${name}_rightMidBlue`, 0.12, 0.08, lineDepth, x + width / 2 - 0.5, midY, z, materials.blueLight, false);

    createBox(scene, `${name}_leftBottomTeal`, 0.12, 0.08, lineDepth, x - width / 2 + 0.5, bottomY, z, materials.tealLight, false);
    createBox(scene, `${name}_rightBottomTeal`, 0.12, 0.08, lineDepth, x + width / 2 - 0.5, bottomY, z, materials.tealLight, false);

    createBox(scene, `${name}_backJoinPlate`, width, 0.28, 1.0, x, 0.02, z - depth / 2, materials.floorPanelMat, false);
    createBox(scene, `${name}_frontJoinPlate`, width, 0.28, 1.0, x, 0.02, z + depth / 2, materials.floorPanelMat, false);
}

function createSideCorridor(scene, materials, walkableSurfaces) {
    const height = 6;

    const startX = 17;
    const bendX = 58;
    const corridorWidth = 12;
    const halfWidth = corridorWidth / 2;

    const horizontalZ = 0;
    const horizontalStartX = startX;
    const horizontalEndX = bendX + halfWidth;
    const horizontalLength = horizontalEndX - horizontalStartX;
    const horizontalCentreX = horizontalStartX + horizontalLength / 2;

    const verticalX = bendX;
    const verticalStartZ = -halfWidth;
    const verticalEndZ = 27.45;
    const verticalLength = verticalEndZ - verticalStartZ;
    const verticalCentreZ = verticalStartZ + verticalLength / 2;

    const floorA = createBox(scene, "sideCorridor_floorA", horizontalLength, 0.25, corridorWidth, horizontalCentreX, -0.125, horizontalZ, materials.floorMat, true);
    walkableSurfaces.push(floorA);

    const floorB = createBox(scene, "sideCorridor_floorB", corridorWidth, 0.25, verticalLength, verticalX, -0.125, verticalCentreZ, materials.floorMat, true);
    walkableSurfaces.push(floorB);

    const cornerFloor = createBox(scene, "sideCorridor_cornerFloor", corridorWidth, 0.25, corridorWidth, bendX, -0.12, horizontalZ, materials.floorMat, true);
    walkableSurfaces.push(cornerFloor);

    const room3BridgeFloor = createBox(scene, "sideCorridor_room3BridgeFloor", corridorWidth, 0.25, 4.8, verticalX, -0.125, 29.85, materials.floorMat, true);
    walkableSurfaces.push(room3BridgeFloor);

    createBox(scene, "sideCorridor_ceilingA", horizontalLength, 0.35, corridorWidth, horizontalCentreX, height, horizontalZ, materials.ceilingMat, true);
    createBox(scene, "sideCorridor_ceilingB", corridorWidth, 0.35, verticalLength, verticalX, height, verticalCentreZ, materials.ceilingMat, true);

    createBox(scene, "sideCorridor_southWall", horizontalLength, height, 0.8, horizontalCentreX, height / 2, horizontalZ - halfWidth, materials.corridorWallMat, true);
    createBox(scene, "sideCorridor_eastWall", 0.8, height, verticalLength, verticalX + halfWidth, height / 2, verticalCentreZ, materials.corridorWallMat, true);

    createBox(scene, "sideCorridor_northWall", horizontalLength - corridorWidth, height, 0.8, horizontalStartX + (horizontalLength - corridorWidth) / 2, height / 2, horizontalZ + halfWidth, materials.corridorWallMat, true);
    createBox(scene, "sideCorridor_westWall", 0.8, height, verticalLength - corridorWidth, verticalX - halfWidth, height / 2, horizontalZ + halfWidth + (verticalLength - corridorWidth) / 2, materials.corridorWallMat, true);

    const topY = height - 0.45;
    const bottomY = 0.35;
    const midY = (topY + bottomY) / 2;

    createBox(scene, "sideCorridor_southTopTeal", horizontalLength, 0.08, 0.12, horizontalCentreX, topY, horizontalZ - halfWidth + 0.55, materials.tealLight, false);
    createBox(scene, "sideCorridor_southMidBlue", horizontalLength, 0.08, 0.12, horizontalCentreX, midY, horizontalZ - halfWidth + 0.55, materials.blueLight, false);
    createBox(scene, "sideCorridor_southBottomTeal", horizontalLength, 0.08, 0.12, horizontalCentreX, bottomY, horizontalZ - halfWidth + 0.55, materials.tealLight, false);

    createBox(scene, "sideCorridor_eastTopTeal", 0.12, 0.08, verticalLength, verticalX + halfWidth - 0.55, topY, verticalCentreZ, materials.tealLight, false);
    createBox(scene, "sideCorridor_eastMidBlue", 0.12, 0.08, verticalLength, verticalX + halfWidth - 0.55, midY, verticalCentreZ, materials.blueLight, false);
    createBox(scene, "sideCorridor_eastBottomTeal", 0.12, 0.08, verticalLength, verticalX + halfWidth - 0.55, bottomY, verticalCentreZ, materials.tealLight, false);

    createBox(scene, "sideCorridor_northTopTeal", horizontalLength - corridorWidth, 0.08, 0.12, horizontalStartX + (horizontalLength - corridorWidth) / 2, topY, horizontalZ + halfWidth - 0.55, materials.tealLight, false);
    createBox(scene, "sideCorridor_northMidBlue", horizontalLength - corridorWidth, 0.08, 0.12, horizontalStartX + (horizontalLength - corridorWidth) / 2, midY, horizontalZ + halfWidth - 0.55, materials.blueLight, false);
    createBox(scene, "sideCorridor_northBottomTeal", horizontalLength - corridorWidth, 0.08, 0.12, horizontalStartX + (horizontalLength - corridorWidth) / 2, bottomY, horizontalZ + halfWidth - 0.55, materials.tealLight, false);

    createBox(scene, "sideCorridor_westTopTeal", 0.12, 0.08, verticalLength - corridorWidth, verticalX - halfWidth + 0.55, topY, horizontalZ + halfWidth + (verticalLength - corridorWidth) / 2, materials.tealLight, false);
    createBox(scene, "sideCorridor_westMidBlue", 0.12, 0.08, verticalLength - corridorWidth, verticalX - halfWidth + 0.55, midY, horizontalZ + halfWidth + (verticalLength - corridorWidth) / 2, materials.blueLight, false);
    createBox(scene, "sideCorridor_westBottomTeal", 0.12, 0.08, verticalLength - corridorWidth, verticalX - halfWidth + 0.55, bottomY, horizontalZ + halfWidth + (verticalLength - corridorWidth) / 2, materials.tealLight, false);

    createBox(scene, "sideCorridor_column_room2_south", 1.1, height, 1.1, 17.75, height / 2, -5.45, materials.columnMat, true);
    createBox(scene, "sideCorridor_column_room2_north", 1.1, height, 1.1, 17.75, height / 2, 5.45, materials.columnMat, true);
    createBox(scene, "sideCorridor_column_outerCorner", 1.1, height, 1.1, bendX + halfWidth - 0.55, height / 2, horizontalZ - halfWidth + 0.55, materials.columnMat, true);
    createBox(scene, "sideCorridor_column_innerCorner", 1.1, height, 1.1, bendX - halfWidth + 0.55, height / 2, horizontalZ + halfWidth - 0.55, materials.columnMat, true);
    createBox(scene, "sideCorridor_column_room3_left", 1.1, height, 1.1, bendX - halfWidth + 0.55, height / 2, verticalEndZ, materials.columnMat, true);
    createBox(scene, "sideCorridor_column_room3_right", 1.1, height, 1.1, bendX + halfWidth - 0.55, height / 2, verticalEndZ, materials.columnMat, true);
}

function createPlatformPitRoom(scene, materials, walkableSurfaces) {
    const x = 58;
    const z = 78;
    const width = 58;
    const depth = 100;
    const height = 18;
    const pitBottom = -7.0;
    const doorGap = 10;
    const wallHeight = height - pitBottom;
    const wallCentreY = pitBottom + wallHeight / 2;

    createBox(scene, "platformRoom_pitFloor", width, 0.25, depth, x, pitBottom, z, materials.darkMat, false);
    createBox(scene, "platformRoom_ceiling", width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    createBox(scene, "platformRoom_westWall", 0.8, wallHeight, depth, x - width / 2, wallCentreY, z, materials.wallMat, true);
    createBox(scene, "platformRoom_eastWall", 0.8, wallHeight, depth, x + width / 2, wallCentreY, z, materials.wallMat, true);

    const sideWidth = (width - doorGap) / 2;

    createBox(scene, "platformRoom_northWallLeft", sideWidth, wallHeight, 0.8, x - doorGap / 2 - sideWidth / 2, wallCentreY, z + depth / 2, materials.wallMat, true);
    createBox(scene, "platformRoom_northWallRight", sideWidth, wallHeight, 0.8, x + doorGap / 2 + sideWidth / 2, wallCentreY, z + depth / 2, materials.wallMat, true);
    createBox(scene, "platformRoom_northDoorTop", doorGap + 1.2, 10, 0.8, x, 13, z + depth / 2, materials.corridorWallMat, true);
    createBox(scene, "platformRoom_northDoorBottomFill", doorGap + 1.2, 1.0, 0.8, x, pitBottom + 0.5, z + depth / 2, materials.corridorWallMat, true);

    createBox(scene, "platformRoom_southWallLeft", sideWidth, wallHeight, 0.8, x - doorGap / 2 - sideWidth / 2, wallCentreY, z - depth / 2, materials.wallMat, true);
    createBox(scene, "platformRoom_southWallRight", sideWidth, wallHeight, 0.8, x + doorGap / 2 + sideWidth / 2, wallCentreY, z - depth / 2, materials.wallMat, true);
    createBox(scene, "platformRoom_southDoorTop", doorGap + 1.2, 10, 0.8, x, 13, z - depth / 2, materials.corridorWallMat, true);
    createBox(scene, "platformRoom_southDoorBottomFill", doorGap + 1.2, 1.0, 0.8, x, pitBottom + 0.5, z - depth / 2, materials.corridorWallMat, true);

    const entranceDeck = createBox(scene, "platformRoom_entranceDeck", 18, 0.25, 8, x, -0.125, 32, materials.floorPanelMat, true);
    walkableSurfaces.push(entranceDeck);

    const tempBridge = createBox(scene, "TEMP_DELETE_THIS_room3Bridge", 10, 0.25, 88, x, -0.125, 78, materials.floorPanelMat, true);
    walkableSurfaces.push(tempBridge);

    const farDeck = createBox(scene, "platformRoom_farDeck", 12, 0.25, 8, x, -0.125, 124, materials.floorPanelMat, true);
    walkableSurfaces.push(farDeck);

    for (let i = -46; i <= 46; i += 1.6) {
        createBox(scene, `platformRoom_laser_${i.toFixed(1)}`, width - 3, 0.045, 0.08, x, pitBottom + 0.45, z + i, materials.laserMat, false);
    }

    createPlatformRoomDecor(scene, materials, x, z, width, depth, height, pitBottom);
}

function createPlatformRoomDecor(scene, materials, x, z, width, depth, height, pitBottom = -7.0) {
    const bottomY = 0.9;
    const midY = height * 0.5;
    const topY = height - 0.75;

    createBox(scene, "platformRoom_leftTopTeal", 0.12, 0.12, depth - 2, x - width / 2 + 0.55, topY, z, materials.tealLight, false);
    createBox(scene, "platformRoom_rightTopTeal", 0.12, 0.12, depth - 2, x + width / 2 - 0.55, topY, z, materials.tealLight, false);

    createBox(scene, "platformRoom_leftMidBlue", 0.12, 0.12, depth - 2, x - width / 2 + 0.55, midY, z, materials.blueLight, false);
    createBox(scene, "platformRoom_rightMidBlue", 0.12, 0.12, depth - 2, x + width / 2 - 0.55, midY, z, materials.blueLight, false);

    createBox(scene, "platformRoom_leftBottomTeal", 0.12, 0.12, depth - 2, x - width / 2 + 0.55, bottomY, z, materials.tealLight, false);
    createBox(scene, "platformRoom_rightBottomTeal", 0.12, 0.12, depth - 2, x + width / 2 - 0.55, bottomY, z, materials.tealLight, false);
}

function createStageExit(scene, materials, walkableSurfaces) {
    const height = 8;
    const corridorWidth = 10;
    const halfWidth = corridorWidth / 2;

    const startX = -104;
    const endX = -166;
    const z = 150;
    const length = Math.abs(endX - startX);
    const centreX = (startX + endX) / 2;

    const corridorFloor = createBox(scene, "scene3ExitCorridorFloor", length, 0.25, corridorWidth, centreX, -0.125, z, materials.floorMat, true);
    walkableSurfaces.push(corridorFloor);

    const room4ExitThreshold = createBox(scene, "scene3ExitRoom4Threshold", 2.5, 0.28, 10, startX + 1.1, -0.12, z, materials.floorPanelMat, true);
    walkableSurfaces.push(room4ExitThreshold);

    createBox(scene, "scene3ExitCorridorCeiling", length, 0.35, corridorWidth, centreX, height, z, materials.ceilingMat, true);
    createBox(scene, "scene3ExitCorridorNorthWall", length, height, 0.8, centreX, height / 2, z + halfWidth, materials.corridorWallMat, true);
    createBox(scene, "scene3ExitCorridorSouthWall", length, height, 0.8, centreX, height / 2, z - halfWidth, materials.corridorWallMat, true);

    createBox(scene, "scene3Exit_room4TopFill", 0.8, 10, 12, startX, 13, z, materials.corridorWallMat, true);

    createBox(scene, "scene3Exit_room4ColumnLower", 1.2, height, 1.2, startX, height / 2, z - halfWidth, materials.columnMat, true);
    createBox(scene, "scene3Exit_room4ColumnUpper", 1.2, height, 1.2, startX, height / 2, z + halfWidth, materials.columnMat, true);

    createBox(scene, "scene3Exit_endColumnLower", 1.2, height, 1.2, endX, height / 2, z - halfWidth, materials.columnMat, true);
    createBox(scene, "scene3Exit_endColumnUpper", 1.2, height, 1.2, endX, height / 2, z + halfWidth, materials.columnMat, true);

    const topY = height - 0.7;
    const bottomY = 0.7;
    const midY = (topY + bottomY) / 2;

    createBox(scene, "scene3ExitCorridorNorthTopTeal", length, 0.08, 0.12, centreX, topY, z + halfWidth - 0.55, materials.tealLight, false);
    createBox(scene, "scene3ExitCorridorNorthMidBlue", length, 0.08, 0.12, centreX, midY, z + halfWidth - 0.55, materials.blueLight, false);
    createBox(scene, "scene3ExitCorridorNorthBottomTeal", length, 0.08, 0.12, centreX, bottomY, z + halfWidth - 0.55, materials.tealLight, false);

    createBox(scene, "scene3ExitCorridorSouthTopTeal", length, 0.08, 0.12, centreX, topY, z - halfWidth + 0.55, materials.tealLight, false);
    createBox(scene, "scene3ExitCorridorSouthMidBlue", length, 0.08, 0.12, centreX, midY, z - halfWidth + 0.55, materials.blueLight, false);
    createBox(scene, "scene3ExitCorridorSouthBottomTeal", length, 0.08, 0.12, centreX, bottomY, z - halfWidth + 0.55, materials.tealLight, false);

    const finalX = -177;
    const finalWidth = 22;
    const finalDepth = 18;

    const finalFloor = createBox(scene, "scene3ExitFinalFloor", finalWidth, 0.25, finalDepth, finalX, -0.125, z, materials.floorPanelMat, true);
    walkableSurfaces.push(finalFloor);

    createBox(scene, "scene3ExitFinalCeiling", finalWidth, 0.35, finalDepth, finalX, height, z, materials.ceilingMat, true);

    createBox(scene, "scene3ExitFinalNorthWall", finalWidth, height, 0.8, finalX, height / 2, z + finalDepth / 2, materials.wallMat, true);
    createBox(scene, "scene3ExitFinalSouthWall", finalWidth, height, 0.8, finalX, height / 2, z - finalDepth / 2, materials.wallMat, true);
    createBox(scene, "scene3ExitFinalWestWall", 0.8, height, finalDepth, finalX - finalWidth / 2, height / 2, z, materials.wallMat, true);

    createBox(scene, "scene3ExitFinalEastWallLower", 0.8, height, 4, finalX + finalWidth / 2, height / 2, z - 7, materials.wallMat, true);
    createBox(scene, "scene3ExitFinalEastWallUpper", 0.8, height, 4, finalX + finalWidth / 2, height / 2, z + 7, materials.wallMat, true);
    createBox(scene, "scene3ExitFinalEastWallTop", 0.8, 2, finalDepth, finalX + finalWidth / 2, height - 1, z, materials.wallMat, true);

    createBox(scene, "scene3ExitScannerLight", 0.12, 0.12, 10, finalX - finalWidth / 2 + 0.45, height - 1.2, z, materials.whiteLight, false);
}

function createTemporaryScene3Route(scene, materials, walkableSurfaces) {
}

function createRoom3ToRoom4Corridor(scene, materials, walkableSurfaces) {
    const height = 8;
    const corridorWidth = 10;
    const halfWidth = corridorWidth / 2;

    const startX = 58;
    const startZ = 128;
    const bendZ = 150;
    const room4EntranceX = 0;

    const xLeft = startX - halfWidth;
    const xRight = startX + halfWidth;
    const zLow = bendZ - halfWidth;
    const zHigh = bendZ + halfWidth;

    const verticalLength = bendZ - startZ;
    const verticalCentreZ = startZ + verticalLength / 2;

    const horizontalLength = startX - room4EntranceX;
    const horizontalCentreX = room4EntranceX + horizontalLength / 2;

    const outerVerticalLength = zHigh - startZ;
    const outerVerticalCentreZ = startZ + outerVerticalLength / 2;

    const innerVerticalLength = zLow - startZ;
    const innerVerticalCentreZ = startZ + innerVerticalLength / 2;

    const outerHorizontalLength = xRight - room4EntranceX;
    const outerHorizontalCentreX = room4EntranceX + outerHorizontalLength / 2;

    const innerHorizontalLength = xLeft - room4EntranceX;
    const innerHorizontalCentreX = room4EntranceX + innerHorizontalLength / 2;

    const floorA = createBox(scene, "room3ToRoom4_floorA", corridorWidth, 0.25, verticalLength, startX, -0.125, verticalCentreZ, materials.floorMat, true);
    walkableSurfaces.push(floorA);

    const floorB = createBox(scene, "room3ToRoom4_floorB", horizontalLength, 0.25, corridorWidth, horizontalCentreX, -0.125, bendZ, materials.floorMat, true);
    walkableSurfaces.push(floorB);

    const cornerFloor = createBox(scene, "room3ToRoom4_cornerFloor", corridorWidth, 0.26, corridorWidth, startX, -0.12, bendZ, materials.floorMat, true);
    walkableSurfaces.push(cornerFloor);

    const room3Threshold = createBox(scene, "room3ToRoom4_room3Threshold", corridorWidth, 0.28, 2.4, startX, -0.12, startZ - 1.0, materials.floorPanelMat, true);
    walkableSurfaces.push(room3Threshold);

    const room4Threshold = createBox(scene, "room3ToRoom4_room4Threshold", 2.4, 0.28, corridorWidth, room4EntranceX - 1.0, -0.12, bendZ, materials.floorPanelMat, true);
    walkableSurfaces.push(room4Threshold);

    createBox(scene, "room3ToRoom4_ceilingA", corridorWidth, 0.35, verticalLength, startX, height, verticalCentreZ, materials.ceilingMat, true);
    createBox(scene, "room3ToRoom4_ceilingB", horizontalLength, 0.35, corridorWidth, horizontalCentreX, height, bendZ, materials.ceilingMat, true);
    createBox(scene, "room3ToRoom4_cornerCeiling", corridorWidth, 0.36, corridorWidth, startX, height, bendZ, materials.ceilingMat, true);

    createBox(scene, "room3ToRoom4_leftVerticalWall", 0.8, height, innerVerticalLength, xLeft, height / 2, innerVerticalCentreZ, materials.corridorWallMat, true);
    createBox(scene, "room3ToRoom4_rightVerticalWall", 0.8, height, outerVerticalLength, xRight, height / 2, outerVerticalCentreZ, materials.corridorWallMat, true);
    createBox(scene, "room3ToRoom4_leftHorizontalWall", innerHorizontalLength, height, 0.8, innerHorizontalCentreX, height / 2, zLow, materials.corridorWallMat, true);
    createBox(scene, "room3ToRoom4_rightHorizontalWall", outerHorizontalLength, height, 0.8, outerHorizontalCentreX, height / 2, zHigh, materials.corridorWallMat, true);

    createBox(scene, "room3ToRoom4_room3TopFill", 12, 10, 0.8, startX, 13, startZ, materials.corridorWallMat, true);
    createBox(scene, "room3ToRoom4_room4TopFill", 0.8, 10, 12, room4EntranceX, 13, bendZ, materials.corridorWallMat, true);

    createBox(scene, "room3ToRoom4_column_room3Left", 1.2, height, 1.2, xLeft, height / 2, startZ, materials.columnMat, true);
    createBox(scene, "room3ToRoom4_column_room3Right", 1.2, height, 1.2, xRight, height / 2, startZ, materials.columnMat, true);
    createBox(scene, "room3ToRoom4_column_cornerLeft", 1.2, height, 1.2, xLeft, height / 2, zLow, materials.columnMat, true);
    createBox(scene, "room3ToRoom4_column_cornerRight", 1.2, height, 1.2, xRight, height / 2, zHigh, materials.columnMat, true);
    createBox(scene, "room3ToRoom4_column_room4Left", 1.2, height, 1.2, room4EntranceX, height / 2, zLow, materials.columnMat, true);
    createBox(scene, "room3ToRoom4_column_room4Right", 1.2, height, 1.2, room4EntranceX, height / 2, zHigh, materials.columnMat, true);

    const topY = height - 0.7;
    const bottomY = 0.7;
    const midY = (topY + bottomY) / 2;

    createBox(scene, "room3ToRoom4_leftVerticalTopTeal", 0.12, 0.08, innerVerticalLength, xLeft + 0.55, topY, innerVerticalCentreZ, materials.tealLight, false);
    createBox(scene, "room3ToRoom4_leftVerticalMidBlue", 0.12, 0.08, innerVerticalLength, xLeft + 0.55, midY, innerVerticalCentreZ, materials.blueLight, false);
    createBox(scene, "room3ToRoom4_leftVerticalBottomTeal", 0.12, 0.08, innerVerticalLength, xLeft + 0.55, bottomY, innerVerticalCentreZ, materials.tealLight, false);

    createBox(scene, "room3ToRoom4_rightVerticalTopTeal", 0.12, 0.08, outerVerticalLength, xRight - 0.55, topY, outerVerticalCentreZ, materials.tealLight, false);
    createBox(scene, "room3ToRoom4_rightVerticalMidBlue", 0.12, 0.08, outerVerticalLength, xRight - 0.55, midY, outerVerticalCentreZ, materials.blueLight, false);
    createBox(scene, "room3ToRoom4_rightVerticalBottomTeal", 0.12, 0.08, outerVerticalLength, xRight - 0.55, bottomY, outerVerticalCentreZ, materials.tealLight, false);

    createBox(scene, "room3ToRoom4_leftHorizontalTopTeal", innerHorizontalLength, 0.08, 0.12, innerHorizontalCentreX, topY, zLow + 0.55, materials.tealLight, false);
    createBox(scene, "room3ToRoom4_leftHorizontalMidBlue", innerHorizontalLength, 0.08, 0.12, innerHorizontalCentreX, midY, zLow + 0.55, materials.blueLight, false);
    createBox(scene, "room3ToRoom4_leftHorizontalBottomTeal", innerHorizontalLength, 0.08, 0.12, innerHorizontalCentreX, bottomY, zLow + 0.55, materials.tealLight, false);

    createBox(scene, "room3ToRoom4_rightHorizontalTopTeal", outerHorizontalLength, 0.08, 0.12, outerHorizontalCentreX, topY, zHigh - 0.55, materials.tealLight, false);
    createBox(scene, "room3ToRoom4_rightHorizontalMidBlue", outerHorizontalLength, 0.08, 0.12, outerHorizontalCentreX, midY, zHigh - 0.55, materials.blueLight, false);
    createBox(scene, "room3ToRoom4_rightHorizontalBottomTeal", outerHorizontalLength, 0.08, 0.12, outerHorizontalCentreX, bottomY, zHigh - 0.55, materials.tealLight, false);
}

function createScene3PlaceholderRoom4(scene, materials, walkableSurfaces) {
    const x = -52;
    const z = 150;
    const width = 104;
    const depth = 72;
    const height = 18;
    const pitBottom = -7;
    const doorGap = 10;
    const sideDepth = (depth - doorGap) / 2;

    createBox(scene, "room4Placeholder_pitFloor", width, 0.25, depth, x, pitBottom, z, materials.darkMat, false);

    const walkway = createBox(scene, "room4Placeholder_centreWalkway", width - 12, 0.25, 10, x, -0.125, z, materials.floorPanelMat, true);
    walkableSurfaces.push(walkway);

    createBox(scene, "room4Placeholder_ceiling", width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    const wallHeight = height - pitBottom;
    const wallCentreY = pitBottom + wallHeight / 2;

    createBox(scene, "room4Placeholder_eastWallLower", 0.8, wallHeight, sideDepth, x + width / 2, wallCentreY, z - doorGap / 2 - sideDepth / 2, materials.wallMat, true);
    createBox(scene, "room4Placeholder_eastWallUpper", 0.8, wallHeight, sideDepth, x + width / 2, wallCentreY, z + doorGap / 2 + sideDepth / 2, materials.wallMat, true);
    createBox(scene, "room4Placeholder_eastDoorTop", 0.8, 10, doorGap + 1.2, x + width / 2, 13, z, materials.corridorWallMat, true);
    createBox(scene, "room4Placeholder_eastDoorBottomFill", 0.8, 1.0, doorGap + 1.2, x + width / 2, pitBottom + 0.5, z, materials.corridorWallMat, true);

    createBox(scene, "room4Placeholder_westWallLower", 0.8, wallHeight, sideDepth, x - width / 2, wallCentreY, z - doorGap / 2 - sideDepth / 2, materials.wallMat, true);
    createBox(scene, "room4Placeholder_westWallUpper", 0.8, wallHeight, sideDepth, x - width / 2, wallCentreY, z + doorGap / 2 + sideDepth / 2, materials.wallMat, true);
    createBox(scene, "room4Placeholder_westDoorTop", 0.8, 10, doorGap + 1.2, x - width / 2, 13, z, materials.corridorWallMat, true);
    createBox(scene, "room4Placeholder_westDoorBottomFill", 0.8, 1.0, doorGap + 1.2, x - width / 2, pitBottom + 0.5, z, materials.corridorWallMat, true);

    createBox(scene, "room4Placeholder_southWall", width, wallHeight, 0.8, x, wallCentreY, z - depth / 2, materials.wallMat, true);
    createBox(scene, "room4Placeholder_northWall", width, wallHeight, 0.8, x, wallCentreY, z + depth / 2, materials.wallMat, true);

    createBox(scene, "room4Placeholder_columnSW", 1.4, wallHeight, 1.4, x - width / 2 + 0.7, wallCentreY, z - depth / 2 + 0.7, materials.columnMat, true);
    createBox(scene, "room4Placeholder_columnSE", 1.4, wallHeight, 1.4, x + width / 2 - 0.7, wallCentreY, z - depth / 2 + 0.7, materials.columnMat, true);
    createBox(scene, "room4Placeholder_columnNW", 1.4, wallHeight, 1.4, x - width / 2 + 0.7, wallCentreY, z + depth / 2 - 0.7, materials.columnMat, true);
    createBox(scene, "room4Placeholder_columnNE", 1.4, wallHeight, 1.4, x + width / 2 - 0.7, wallCentreY, z + depth / 2 - 0.7, materials.columnMat, true);

    for (let i = -50; i <= 50; i += 1.8) {
        createBox(scene, `room4Placeholder_laser_${i.toFixed(1)}`, 0.08, 0.045, depth - 3, x + i, pitBottom + 0.45, z, materials.laserMat, false);
    }
}

function createDoorFrames(scene, materials) {
    createBox(scene, "doorFrameBeam_door1", 13, 0.6, 1.1, 0, 5.7, -28, materials.corridorWallMat, true);
    createBox(scene, "doorFrameBeam_door2", 1.1, 0.6, 13, 17, 5.7, 0, materials.corridorWallMat, true);
}

function createDoorFrame(scene, materials, x, z, axis, height) {
    const isRoom3Door = x === 58 && z === 28;
    const sideOffset = isRoom3Door ? 5.55 : 6.1;
    const topLength = isRoom3Door ? 11.4 : 13;

    if (axis === "z") {
        createBox(scene, `doorColumnLeft_${x}_${z}`, 1.15, height, 1.25, x - sideOffset, height / 2, z, materials.columnMat, true);
        createBox(scene, `doorColumnRight_${x}_${z}`, 1.15, height, 1.25, x + sideOffset, height / 2, z, materials.columnMat, true);
        createBox(scene, `doorTopBeam_${x}_${z}`, topLength, 0.85, 1.25, x, height - 0.425, z, materials.corridorWallMat, true);

        createBox(scene, `doorLeftWhiteLight_${x}_${z}`, 0.16, 2.4, 0.08, x - sideOffset, height / 2, z - 0.66, materials.whiteLight, false);
        createBox(scene, `doorRightWhiteLight_${x}_${z}`, 0.16, 2.4, 0.08, x + sideOffset, height / 2, z - 0.66, materials.whiteLight, false);
        return;
    }

    if (axis === "x") {
        createBox(scene, `doorColumnLower_${x}_${z}`, 1.25, height, 1.15, x, height / 2, z - sideOffset, materials.columnMat, true);
        createBox(scene, `doorColumnUpper_${x}_${z}`, 1.25, height, 1.15, x, height / 2, z + sideOffset, materials.columnMat, true);
        createBox(scene, `doorTopBeam_${x}_${z}`, 1.25, 0.85, topLength, x, height - 0.425, z, materials.corridorWallMat, true);

        createBox(scene, `doorLowerWhiteLight_${x}_${z}`, 0.08, 2.4, 0.16, x - 0.66, height / 2, z - sideOffset, materials.whiteLight, false);
        createBox(scene, `doorUpperWhiteLight_${x}_${z}`, 0.08, 2.4, 0.16, x - 0.66, height / 2, z + sideOffset, materials.whiteLight, false);
    }
}

function createRoomDecor(scene, materials, x, z, width, depth, height, label) {
}

    function createSplitWallTrim(scene, materials, label, side, x, z, depth, height) {
        const cubeDoorway = label === "cubeRoom" && side === "right";

        if (!cubeDoorway) {
            createBox(scene, `${label}_${side}GreenTrim`, 0.08, 0.12, depth - 2, x, 1.2, z, materials.greenLight, false);
            createBox(scene, `${label}_${side}OrangeTrim`, 0.08, 0.12, depth - 2, x, height - 1.2, z, materials.orangeLight, false);
            return;
        }

        createBox(scene, `${label}_${side}GreenTrimA`, 0.08, 0.12, 7, x, 1.2, z - 10.5, materials.greenLight, false);
        createBox(scene, `${label}_${side}GreenTrimB`, 0.08, 0.12, 7, x, 1.2, z + 10.5, materials.greenLight, false);

        createBox(scene, `${label}_${side}OrangeTrimA`, 0.08, 0.12, 7, x, height - 1.2, z - 10.5, materials.orangeLight, false);
        createBox(scene, `${label}_${side}OrangeTrimB`, 0.08, 0.12, 7, x, height - 1.2, z + 10.5, materials.orangeLight, false);
    }

function createHorizontalWallTrims(scene, materials, label, x, z, width, depth, height, doors = {}) {
    const bottomY = 0.35;
    const topY = height - 0.45;
    const midY = (topY + bottomY) / 2;

    const eastX = x + width / 2 - 0.52;
    const westX = x - width / 2 + 0.52;
    const northZ = z + depth / 2 - 0.52;
    const southZ = z - depth / 2 + 0.52;

    createSideTrimZ(scene, materials, `${label}_west`, westX, z, depth, topY, midY, bottomY);

    if (doors.eastDoor) {
        createSideTrimZSplit(scene, materials, `${label}_east`, eastX, z, depth, topY, midY, bottomY);
    } else {
        createSideTrimZ(scene, materials, `${label}_east`, eastX, z, depth, topY, midY, bottomY);
    }

    if (doors.northDoor) {
        createSideTrimXSplit(scene, materials, `${label}_north`, x, northZ, width, topY, midY, bottomY);
    } else {
        createSideTrimX(scene, materials, `${label}_north`, x, northZ, width, topY, midY, bottomY);
    }

    if (doors.southDoor) {
        createSideTrimXSplit(scene, materials, `${label}_south`, x, southZ, width, topY, midY, bottomY);
    } else {
        createSideTrimX(scene, materials, `${label}_south`, x, southZ, width, topY, midY, bottomY);
    }
}

function createSideTrimZ(scene, materials, name, x, z, length, topY, midY, bottomY) {
    createBox(scene, `${name}_topTeal`, 0.12, 0.1, length, x, topY, z, materials.tealLight, false);
    createBox(scene, `${name}_midBlue`, 0.12, 0.1, length, x, midY, z, materials.blueLight, false);
    createBox(scene, `${name}_bottomTeal`, 0.12, 0.1, length, x, bottomY, z, materials.tealLight, false);
}

function createSideTrimX(scene, materials, name, x, z, length, topY, midY, bottomY) {
    createBox(scene, `${name}_topTeal`, length, 0.1, 0.12, x, topY, z, materials.tealLight, false);
    createBox(scene, `${name}_midBlue`, length, 0.1, 0.12, x, midY, z, materials.blueLight, false);
    createBox(scene, `${name}_bottomTeal`, length, 0.1, 0.12, x, bottomY, z, materials.tealLight, false);
}

function createSideTrimZSplit(scene, materials, name, x, z, depth, topY, midY, bottomY) {
    const doorGap = 12.4;
    const segmentLength = (depth - doorGap) / 2;

    const zA = z - doorGap / 2 - segmentLength / 2;
    const zB = z + doorGap / 2 + segmentLength / 2;

    createSideTrimZ(scene, materials, `${name}A`, x, zA, segmentLength, topY, midY, bottomY);
    createSideTrimZ(scene, materials, `${name}B`, x, zB, segmentLength, topY, midY, bottomY);
}

function createSideTrimXSplit(scene, materials, name, x, z, width, topY, midY, bottomY) {
    const doorGap = 12.4;
    const segmentLength = (width - doorGap) / 2;

    const xA = x - doorGap / 2 - segmentLength / 2;
    const xB = x + doorGap / 2 + segmentLength / 2;

    createSideTrimX(scene, materials, `${name}A`, xA, z, segmentLength, topY, midY, bottomY);
    createSideTrimX(scene, materials, `${name}B`, xB, z, segmentLength, topY, midY, bottomY);
}

function createRoomFloorPanels(scene, materials, x, z, width, depth, label, sparse = false) {
    const panelSize = sparse ? 7.2 : 5.2;
    const targetGap = sparse ? 3.2 : 1.2;

    const usableWidth = width - 5;
    const usableDepth = depth - 5;

    const columns = Math.max(1, Math.floor((usableWidth + targetGap) / (panelSize + targetGap)));
    const rows = Math.max(1, Math.floor((usableDepth + targetGap) / (panelSize + targetGap)));

    const totalGridWidth = columns * panelSize + (columns - 1) * targetGap;
    const totalGridDepth = rows * panelSize + (rows - 1) * targetGap;

    const startX = x - totalGridWidth / 2 + panelSize / 2;
    const startZ = z - totalGridDepth / 2 + panelSize / 2;

    let panelIndex = 0;

    for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows; row++) {
            const px = startX + col * (panelSize + targetGap);
            const pz = startZ + row * (panelSize + targetGap);

            const panel = createBox(
                scene,
                `${label}_floorPanel_${panelIndex}`,
                panelSize,
                0.08,
                panelSize,
                px,
                0.035,
                pz,
                materials.floorPanelMat,
                false
            );

            panel.rotation.y = panelIndex % 2 === 0 ? 0 : Math.PI / 2;
            panelIndex++;
        }
    }
}

function createColumns(scene, materials) {
    const roomColumns = [
        [-16.6, -55.6, 0, 6],
        [16.6, -55.6, 0, 6],
        [-16.6, -28.4, 0, 6],
        [16.6, -28.4, 0, 6],

        [-16.6, -13.6, 0, 6],
        [16.6, -13.6, 0, 6],
        [-16.6, 13.6, 0, 6],
        [16.6, 13.6, 0, 6],

        [29.2, 28.2, -7, 18],
        [86.8, 28.2, -7, 18],
        [29.2, 127.8, -7, 18],
        [86.8, 127.8, -7, 18]
    ];

    roomColumns.forEach(([x, z, bottomY, topY], index) => {
        const height = topY - bottomY;
        const centreY = bottomY + height / 2;

        createBox(scene, `supportColumn_${index}`, 1.4, height, 1.4, x, centreY, z, materials.columnMat, true);
    });
}

function createObjectivePanels(scene, materials) {
    // Removed for now.
    // The old objective panels were large floating coloured bars on the walls,
    // which no longer fit the cleaner Room 3 layout.
}

function createPlatformingRoute(scene, materials, walkableSurfaces) {
    return;
}

function createLighting(scene, materials) {
    const hemi = new BABYLON.HemisphericLight("scene3Hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.78;

    const lightPositions = [
        [0, 5.7, -50],
        [0, 5.7, -38],
        [0, 5.7, -21],
        [0, 5.7, 0],

        [38, 5.7, 0],
        [58, 5.7, 15],

        [58, 17.2, 44],
        [58, 17.2, 64],
        [58, 17.2, 84],
        [58, 17.2, 104],
        [58, 17.2, 122]
    ];

    lightPositions.forEach(([x, y, z], index) => {
        createBox(scene, `ceilingLightStrip_${index}`, 6.5, 0.12, 0.35, x, y, z, materials.whiteLight, false);

        const light = new BABYLON.PointLight(`ceilingLight_${index}`, new BABYLON.Vector3(x, y - 0.6, z), scene);
        light.intensity = 0.85;
        light.range = 18;
        light.diffuse = new BABYLON.Color3(0.6, 0.78, 1.0);
    });

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.0016;
    scene.fogColor = new BABYLON.Color3(0.025, 0.03, 0.045);
}

function createPlayer(scene, materials) {
    const body = BABYLON.MeshBuilder.CreateCylinder("scene3PlayerBody", { height: 2.1, diameter: 0.9, tessellation: 18 }, scene);
    const head = BABYLON.MeshBuilder.CreateSphere("scene3PlayerHead", { diameter: 0.85, segments: 18 }, scene);
    head.position.y = 1.45;

    const player = BABYLON.Mesh.MergeMeshes([body, head], true, true, undefined, false, true);
    player.name = "scene3Player";
    player.material = materials.playerMat;
    player.checkCollisions = true;
    player.ellipsoid = new BABYLON.Vector3(0.45, 1.1, 0.45);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 0.7, 0);

    return player;
}

function createCamera(scene, player) {
    const camera = new BABYLON.FreeCamera("scene3Camera", player.position.add(new BABYLON.Vector3(0, 3.4, -8.2)), scene);
    camera.minZ = 0.1;
    camera.fov = 0.9;
    return camera;
}

function createEnergyCores(scene, materials) {
    const positions = [
        new BABYLON.Vector3(-10, 1.5, -51),
        new BABYLON.Vector3(10, 1.5, -47),
        new BABYLON.Vector3(0, 1.5, -37)
    ];

    return positions.map((pos, index) => {
        const core = BABYLON.MeshBuilder.CreatePolyhedron(`energyCore_${index}`, { type: 1, size: 0.8 }, scene);
        core.position.copyFrom(pos);
        core.material = materials.coreMat;
        core.metadata = { collected: false, baseY: pos.y, offset: index * 1.7 };

        const light = new BABYLON.PointLight(`energyCoreLight_${index}`, pos, scene);
        light.intensity = 0.85;
        light.range = 7;
        light.diffuse = new BABYLON.Color3(0.2, 1.0, 0.4);
        light.parent = core;

        return core;
    });
}

function createCarryCube(scene, materials) {
    return createBox(scene, "carryCube", 1.8, 1.8, 1.8, -7, 0.9, 0, materials.cubeMat, true);
}

function createPressurePad(scene, materials) {
    const pad = BABYLON.MeshBuilder.CreateCylinder("pressurePad", { diameter: 3.5, height: 0.18, tessellation: 32 }, scene);
    pad.position = new BABYLON.Vector3(7, 0.12, 8);
    pad.material = materials.padInactive;
    return pad;
}

function createDoors(scene, materials) {
    const finalDoor = createDoor(scene, materials, "finalDoor", new BABYLON.Vector3(9999, -9999, 9999), -9999, -9999, "z");
    finalDoor.setEnabled(false);
    finalDoor.metadata.light.setEnabled(false);

    return {
        door1: createDoor(scene, materials, "door1", new BABYLON.Vector3(0, 2.35, -28), 2.35, 7.4, "z"),
        door2: createDoor(scene, materials, "door2", new BABYLON.Vector3(17, 2.35, 0), 2.35, 7.4, "x"),
        finalDoor
    };
}

function createDoor(scene, materials, name, position, closedY, openY, axis) {
    const door = axis === "z"
        ? createBox(scene, name, 10.9, 6.1, 0.95, position.x, position.y + 0.7, position.z, materials.panelMat, true)
        : createBox(scene, name, 0.95, 6.1, 10.9, position.x, position.y + 0.7, position.z, materials.panelMat, true);

    const light = axis === "z"
        ? createBox(scene, `${name}_statusLight`, 7.2, 0.18, 0.1, position.x, position.y + 3.0, position.z - 0.55, materials.orangeLight, false)
        : createBox(scene, `${name}_statusLight`, 0.1, 0.18, 7.2, position.x - 0.55, position.y + 3.0, position.z, materials.orangeLight, false);

    door.metadata = { light, closedY, openY };
    return door;
}

function createFinalButton(scene, materials) {
    const base = createBox(scene, "finalButtonBase", 1, 1, 1, 0, -100, 0, materials.darkMat, false);
    const screen = createBox(scene, "finalButtonScreen", 1, 1, 1, 0, -100, 0, materials.orangeLight, false);

    base.setEnabled(false);
    screen.setEnabled(false);

    base.metadata = { screen, light: null };
    return base;
}

function createFinalScanner(scene, materials) {
    const ring = BABYLON.MeshBuilder.CreateTorus("finalScannerRing", { diameter: 5.5, thickness: 0.22, tessellation: 48 }, scene);
    ring.position = new BABYLON.Vector3(-183, 2.0, 150);
    ring.rotation.z = Math.PI / 2;
    ring.material = materials.greenLight;

    const core = BABYLON.MeshBuilder.CreatePolyhedron("finalScannerCore", { type: 1, size: 1.1 }, scene);
    core.position = new BABYLON.Vector3(-183, 1.8, 150);
    core.material = materials.coreMat;

    return { ring, core };
}

function createBox(scene, name, width, height, depth, x, y, z, material, collides) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position = new BABYLON.Vector3(x, y, z);
    mesh.material = material;
    mesh.checkCollisions = collides;
    return mesh;
}

function getGroundHeightAt(position, surfaces) {
    let bestY = -100;

    surfaces.forEach((surface) => {
        surface.computeWorldMatrix(true);

        const box = surface.getBoundingInfo().boundingBox;
        const min = box.minimumWorld;
        const max = box.maximumWorld;

        const insideX = position.x >= min.x && position.x <= max.x;
        const insideZ = position.z >= min.z && position.z <= max.z;
        const topY = max.y;

        if (insideX && insideZ && position.y >= topY - 0.55 && topY > bestY) {
            bestY = topY;
        }
    });

    return bestY === -100 ? -100 : bestY;
}

function playSound(sound) {
    if (sound && sound.isReady()) sound.play();
}

function createSceneUI() {
    const existingUI = document.querySelector(".scene-ui");
    if (existingUI) return existingUI;

    const ui = document.createElement("div");
    ui.className = "scene-ui";
    document.body.appendChild(ui);
    return ui;
}

function createCompletionPopup() {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.inset = "0";
    popup.style.zIndex = "50";
    popup.style.display = "none";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";
    popup.style.background = "rgba(0, 0, 0, 0.72)";
    popup.style.color = "white";
    popup.style.fontFamily = "system-ui, sans-serif";

    popup.innerHTML = `
        <div style="
            width: min(540px, 90vw);
            padding: 2rem;
            border: 1px solid rgba(120, 255, 170, 0.75);
            border-radius: 16px;
            background: rgba(12, 18, 24, 0.96);
            box-shadow: 0 0 35px rgba(80, 255, 130, 0.35);
            text-align: center;
        ">
            <h2 style="margin-bottom: 0.75rem;">Scene Complete</h2>
            <p style="margin-bottom: 1.5rem;">Sci-fi test facility cleared.</p>
            <button id="scene3ToScene4" style="
                padding: 0.75rem 1.25rem;
                border: none;
                border-radius: 10px;
                background: #52ff8a;
                color: #07100a;
                font-weight: 700;
                cursor: pointer;
            ">
                Continue to Scene 4
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector("#scene3ToScene4").addEventListener("click", () => {
        window.location.href = "scene4.html";
    });

    return popup;
}

const scene3 = createScene3();

engine3.runRenderLoop(() => {
    scene3.render();
});

window.addEventListener("resize", () => {
    engine3.resize();
});
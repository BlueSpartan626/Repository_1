// js/scene3.js
const s3 = setupEngineAndCanvas();
const canvas3 = s3.canvas;
const engine3 = s3.engine;

function createScene3() {
    const scene = new BABYLON.Scene(engine3);
    scene.clearColor = new BABYLON.Color4(0.025, 0.03, 0.04, 1);
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

    const playerStart = new BABYLON.Vector3(0, 1.25, -42);
    const pitRespawn = new BABYLON.Vector3(0, 1.25, 24);

    const bounds = {
        minX: -18.5,
        maxX: 18.5,
        minZ: -49,
        maxZ: 84
    };

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

    const playerHeightOffset = 1.25;
    const gravity = 7.2;
    const jumpStrength = 5.8;
    const walkSpeed = 6.8;
    const sprintSpeed = 10.5;
    const acceleration = 0.16;
    const deceleration = 0.20;

    const cameraDistance = 8.2;
    const cameraHeight = 3.2;
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
        cameraPitch = BABYLON.Scalar.Clamp(cameraPitch, -0.35, 0.72);
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

        if (event.code === "KeyR") {
            resetScene();
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

        player.position.x = BABYLON.Scalar.Clamp(player.position.x, bounds.minX, bounds.maxX);
        player.position.z = BABYLON.Scalar.Clamp(player.position.z, bounds.minZ, bounds.maxZ);

        if (player.position.z > 20 && player.position.y < -2) {
            player.position.copyFrom(pitRespawn);
            verticalVelocity = 0;
            moveVelocity = BABYLON.Vector3.Zero();
        }

        if (player.position.y < -8) {
            player.position.copyFrom(playerStart);
            verticalVelocity = 0;
            moveVelocity = BABYLON.Vector3.Zero();
        }

        animatePlayer(moving);
    }

    function animatePlayer(moving) {
        if (moving) {
            const bob = Math.sin(performance.now() * 0.014) * 0.03;
            const stretch = input.sprint ? 1.055 : 1.02;

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
            core.position.y =
                core.metadata.baseY +
                Math.sin(performance.now() * 0.003 + core.metadata.offset) * 0.22;

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
            Math.abs(cube.position.x - pressurePad.position.x) < 1.8 &&
            Math.abs(cube.position.z - pressurePad.position.z) < 1.8 &&
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
        door.checkCollisions = !open;
        door.metadata.light.material = open ? materials.greenLight : materials.orangeLight;
    }

    function updateFinalButton() {
        const distance = BABYLON.Vector3.Distance(player.position, finalButton.position);

        if (input.interactPressed && distance < 2.8 && player.position.y > 5.0) {
            finalDoorOpen = true;
            finalButton.metadata.light.material = materials.greenLight;
            finalButton.metadata.screen.material = materials.greenLight;
            playSound(clickSound);
        }
    }

    function updateFinalScanner(dt) {
        scanner.ring.rotation.y += 1.4 * dt;
        scanner.core.rotation.y -= 1.8 * dt;
        scanner.core.position.y = 7.05 + Math.sin(performance.now() * 0.0025) * 0.18;

        const distance = BABYLON.Vector3.Distance(player.position, scanner.core.position);

        if (distance < 3.0 && player.position.z > 74 && player.position.y > 5.7) {
            sceneComplete = true;
            document.exitPointerLock?.();
            popup.style.display = "flex";
        }
    }

    function updateCamera(dt) {
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

        desiredPosition.x = BABYLON.Scalar.Clamp(desiredPosition.x, bounds.minX, bounds.maxX);
        desiredPosition.z = BABYLON.Scalar.Clamp(desiredPosition.z, bounds.minZ, bounds.maxZ);

        const currentCeiling = player.position.z > 20 ? 11.2 : 5.6;
        desiredPosition.y = BABYLON.Scalar.Clamp(desiredPosition.y, 1.8, currentCeiling - 0.45);

        const rayDirection = desiredPosition.subtract(targetLookAt);
        const rayLength = rayDirection.length();
        const ray = new BABYLON.Ray(targetLookAt, rayDirection.normalize(), rayLength);

        const hit = scene.pickWithRay(ray, (mesh) => {
            return mesh !== player &&
                mesh.checkCollisions &&
                !mesh.name.includes("floor") &&
                !mesh.name.includes("platform") &&
                !mesh.name.includes("pressurePad");
        });

        if (hit && hit.hit) {
            desiredPosition = hit.pickedPoint.subtract(ray.direction.scale(0.35));
        }

        camera.position = BABYLON.Vector3.Lerp(camera.position, desiredPosition, 8 * dt);
        camera.setTarget(targetLookAt);
    }

    function updateUI() {
        const lockText = document.pointerLockElement === canvas3 ? "Mouse Locked" : "Click Scene to Lock Mouse";

        let objective = "Collect the three energy cores in this room";

        if (door1Open && !door2Open) {
            objective = "Pick up the cube with E and place it on the pressure pad";
        }

        if (door1Open && door2Open && !finalDoorOpen) {
            objective = "Climb the platforms and press E at the console";
        }

        if (finalDoorOpen && !sceneComplete) {
            objective = "Enter the upper scanner room and reach the beacon";
        }

        if (sceneComplete) {
            objective = "Scene Complete";
        }

        ui.innerHTML =
            `Scene 3 – Sci-Fi Physics Test Chamber<br>` +
            `WASD = Move • Mouse = Look • Space = Jump • Shift = Sprint • E = Interact / Pick Up / Place • R = Reset<br>` +
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

        cube.position = new BABYLON.Vector3(-8, 0.9, 8);
        cube.checkCollisions = true;

        cores.forEach((core) => {
            core.metadata.collected = false;
            core.setEnabled(true);
        });

        resetDoor(doors.door1);
        resetDoor(doors.door2);
        resetDoor(doors.finalDoor);

        finalButton.metadata.light.material = materials.orangeLight;
        finalButton.metadata.screen.material = materials.orangeLight;
        pressurePad.material = materials.padInactive;
        popup.style.display = "none";
    }

    function resetDoor(door) {
        door.position.y = door.metadata.closedY;
        door.checkCollisions = true;
        door.metadata.light.material = materials.orangeLight;
    }

    return scene;
}

function createMaterials(scene) {
    const wallMat = makeMaterial(scene, "wallMat", new BABYLON.Color3(0.18, 0.21, 0.26));
    const floorMat = makeMaterial(scene, "floorMat", new BABYLON.Color3(0.08, 0.09, 0.11));
    const floorPanelMat = makeMaterial(scene, "floorPanelMat", new BABYLON.Color3(0.23, 0.27, 0.33));
    const ceilingMat = makeMaterial(scene, "ceilingMat", new BABYLON.Color3(0.04, 0.045, 0.055));
    const darkMat = makeMaterial(scene, "darkMat", new BABYLON.Color3(0.005, 0.007, 0.012));
    const trimMat = makeMaterial(scene, "trimMat", new BABYLON.Color3(0.015, 0.018, 0.024));

    const playerMat = makeMaterial(scene, "playerMat", new BABYLON.Color3(0.25, 0.65, 1.0));
    playerMat.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);

    const cubeMat = makeMaterial(scene, "cubeMat", new BABYLON.Color3(0.48, 0.52, 0.58));

    const coreMat = makeMaterial(scene, "coreMat", new BABYLON.Color3(0.1, 1.0, 0.4));
    coreMat.emissiveColor = new BABYLON.Color3(0.02, 0.9, 0.25);

    const greenLight = makeMaterial(scene, "greenLight", new BABYLON.Color3(0.1, 1.0, 0.35));
    greenLight.emissiveColor = new BABYLON.Color3(0.02, 0.95, 0.22);

    const orangeLight = makeMaterial(scene, "orangeLight", new BABYLON.Color3(1.0, 0.45, 0.08));
    orangeLight.emissiveColor = new BABYLON.Color3(0.5, 0.16, 0.02);

    const whiteLight = makeMaterial(scene, "whiteLight", new BABYLON.Color3(0.8, 0.9, 1.0));
    whiteLight.emissiveColor = new BABYLON.Color3(0.6, 0.75, 0.95);

    const padInactive = makeMaterial(scene, "padInactive", new BABYLON.Color3(0.11, 0.12, 0.14));

    return {
        wallMat,
        floorMat,
        floorPanelMat,
        ceilingMat,
        darkMat,
        trimMat,
        playerMat,
        cubeMat,
        coreMat,
        greenLight,
        orangeLight,
        whiteLight,
        padInactive
    };
}

function makeMaterial(scene, name, colour) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = colour;
    mat.specularColor = new BABYLON.Color3(0.18, 0.18, 0.2);
    return mat;
}

function buildFacility(scene, materials, walkableSurfaces) {
    createRoom(scene, materials, walkableSurfaces, "coreRoom", 0, -34, 40, 29.5, 6, true, false);
    createRoom(scene, materials, walkableSurfaces, "cubeRoom", 0, 4, 40, 36, 6, false, false);

    createTallPlatformPit(scene, materials, walkableSurfaces);
    createUpperFinalRoom(scene, materials, walkableSurfaces);

    createDividerWithDoorGap(scene, materials, -18, 6);
    createDividerWithDoorGap(scene, materials, 18, 6);
    createFinalDivider(scene, materials);

    createFloorPanelPattern(scene, materials);
    createColumns(scene, materials);
    createObjectivePanels(scene, materials);
    createPlatformingRoom(scene, materials, walkableSurfaces);
}

function createRoom(scene, materials, walkableSurfaces, name, x, z, width, depth, height, hasBackWall, hasFrontWall) {
    const floor = createBox(scene, `${name}_floor`, width, 0.25, depth, x, -0.125, z, materials.floorMat, true);
    walkableSurfaces.push(floor);

    createBox(scene, `${name}_ceiling`, width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    createBox(scene, `${name}_leftWall`, 0.8, height, depth, x - width / 2, height / 2, z, materials.wallMat, true);
    createBox(scene, `${name}_rightWall`, 0.8, height, depth, x + width / 2, height / 2, z, materials.wallMat, true);

    createTrimBands(scene, materials, x - width / 2 + 0.42, z, height, depth, `${name}_left`);
    createTrimBands(scene, materials, x + width / 2 - 0.42, z, height, depth, `${name}_right`);

    if (hasBackWall) {
        createBox(scene, `${name}_backWall`, width, height, 0.8, x, height / 2, z - depth / 2, materials.wallMat, true);
    }

    if (hasFrontWall) {
        createBox(scene, `${name}_frontWall`, width, height, 0.8, x, height / 2, z + depth / 2, materials.wallMat, true);
    }
}

function createTrimBands(scene, materials, x, z, height, depth, label) {
    const lowTrim = createBox(
        scene,
        `trimLow_${label}_${z}`,
        0.08,
        0.12,
        Math.max(depth - 2, 1),
        x,
        1.2,
        z,
        materials.greenLight,
        false
    );

    const highTrim = createBox(
        scene,
        `trimHigh_${label}_${z}`,
        0.08,
        0.12,
        Math.max(depth - 2, 1),
        x,
        height - 1.2,
        z,
        materials.orangeLight,
        false
    );

    lowTrim.isPickable = false;
    highTrim.isPickable = false;
}

function createTallPlatformPit(scene, materials, walkableSurfaces) {
    const width = 40;
    const depth = 50;
    const height = 12;
    const x = 0;
    const z = 44;

    createBox(scene, "pitRoom_leftWall", 0.8, height, depth, -20, height / 2, z, materials.wallMat, true);
    createBox(scene, "pitRoom_rightWall", 0.8, height, depth, 20, height / 2, z, materials.wallMat, true);
    createBox(scene, "pitRoom_backWall", width, height, 0.8, x, height / 2, 19, materials.wallMat, true);
    createBox(scene, "pitRoom_frontWall", width, height, 0.8, x, height / 2, 69, materials.wallMat, true);
    createBox(scene, "pitRoom_ceiling", width, 0.35, depth, x, height, z, materials.ceilingMat, true);

    const entryFloor = createBox(scene, "pitRoom_entryFloor", 40, 0.25, 8, 0, -0.125, 23, materials.floorMat, true);
    walkableSurfaces.push(entryFloor);

    createTrimBands(scene, materials, -19.58, z, height, depth, "pitLeft");
    createTrimBands(scene, materials, 19.58, z, height, depth, "pitRight");
}

function createUpperFinalRoom(scene, materials, walkableSurfaces) {
    const floor = createBox(scene, "upperFinalFloor", 16, 0.5, 18, 0, 6.0, 76, materials.floorPanelMat, true);
    walkableSurfaces.push(floor);

    createBox(scene, "upperFinalBackWall", 16, 5, 0.8, 0, 8.5, 85, materials.wallMat, true);
    createBox(scene, "upperFinalLeftWall", 0.8, 5, 18, -8, 8.5, 76, materials.wallMat, true);
    createBox(scene, "upperFinalRightWall", 0.8, 5, 18, 8, 8.5, 76, materials.wallMat, true);
    createBox(scene, "upperFinalRoof", 16, 0.4, 18, 0, 11.0, 76, materials.ceilingMat, true);
}

function createDividerWithDoorGap(scene, materials, z, height) {
    createBox(scene, `dividerLeft_${z}`, 15.75, height, 0.8, -12.125, height / 2, z, materials.wallMat, true);
    createBox(scene, `dividerRight_${z}`, 15.75, height, 0.8, 12.125, height / 2, z, materials.wallMat, true);
    createBox(scene, `dividerTop_${z}`, 10.5, 1.2, 0.8, 0, height - 0.6, z, materials.wallMat, true);
}

function createFinalDivider(scene, materials) {
    createBox(scene, "finalDividerLeft", 14.75, 6, 0.9, -12.375, 9, 66, materials.wallMat, true);
    createBox(scene, "finalDividerRight", 14.75, 6, 0.9, 12.375, 9, 66, materials.wallMat, true);
    createBox(scene, "finalDividerTop", 11, 1.2, 0.9, 0, 11.4, 66, materials.wallMat, true);
}

function createPlatformingRoom(scene, materials, walkableSurfaces) {
    const platformData = [
        { pos: new BABYLON.Vector3(-11, 1.1, 29), size: new BABYLON.Vector3(7, 0.45, 4) },
        { pos: new BABYLON.Vector3(-2, 2.1, 36), size: new BABYLON.Vector3(6, 0.45, 4) },
        { pos: new BABYLON.Vector3(9, 3.2, 43), size: new BABYLON.Vector3(6, 0.45, 4) },
        { pos: new BABYLON.Vector3(1, 4.4, 51), size: new BABYLON.Vector3(7, 0.45, 4) },
        { pos: new BABYLON.Vector3(-8, 5.5, 59), size: new BABYLON.Vector3(7, 0.45, 4) },
        { pos: new BABYLON.Vector3(0, 6.0, 66), size: new BABYLON.Vector3(10, 0.45, 5) }
    ];

    platformData.forEach((data, index) => {
        const platform = createBox(
            scene,
            `platform_${index}`,
            data.size.x,
            data.size.y,
            data.size.z,
            data.pos.x,
            data.pos.y,
            data.pos.z,
            materials.floorPanelMat,
            true
        );

        walkableSurfaces.push(platform);

        createBox(
            scene,
            `platformTrim_${index}`,
            data.size.x,
            0.12,
            0.2,
            data.pos.x,
            data.pos.y + 0.32,
            data.pos.z - data.size.z / 2,
            materials.greenLight,
            false
        );
    });
}

function createFloorPanelPattern(scene, materials) {
    for (let z = -44; z <= 16; z += 6) {
        for (let x = -15; x <= 15; x += 10) {
            const panel = createBox(scene, `floorPanel_${x}_${z}`, 5.5, 0.035, 3.5, x, 0.02, z, materials.floorPanelMat, false);
            panel.isPickable = false;
        }
    }
}

function createLighting(scene, materials) {
    const hemi = new BABYLON.HemisphericLight("scene3Hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.95;

    for (let z = -46; z <= 82; z += 8) {
        const y = z > 20 ? 11.7 : 5.82;

        createBox(scene, `ceilingLightStrip_${z}`, 6.5, 0.12, 0.35, 0, y, z, materials.whiteLight, false);

        const light = new BABYLON.PointLight(`ceilingLight_${z}`, new BABYLON.Vector3(0, y - 0.6, z), scene);
        light.intensity = 0.95;
        light.range = 17;
        light.diffuse = new BABYLON.Color3(0.6, 0.78, 1.0);
    }

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.0025;
    scene.fogColor = new BABYLON.Color3(0.045, 0.055, 0.075);
}

function createColumns(scene, materials) {
    const columns = [
        [-17, -34, 6],
        [17, -34, 6],
        [-17, 4, 6],
        [17, 4, 6],
        [-17, 44, 12],
        [17, 44, 12]
    ];

    columns.forEach(([x, z, height]) => {
        createBox(scene, `supportColumn_${x}_${z}`, 1.1, height, 1.1, x, height / 2, z, materials.darkMat, true);
    });
}

function createObjectivePanels(scene, materials) {
    const panels = [
        { z: -40, y: 3.4, material: materials.orangeLight },
        { z: -24, y: 3.4, material: materials.greenLight },
        { z: 8, y: 3.4, material: materials.orangeLight },
        { z: 38, y: 7.5, material: materials.greenLight }
    ];

    panels.forEach((cfg, index) => {
        createBox(scene, `objectivePanel_${index}`, 0.12, 0.8, 5, -19.58, cfg.y, cfg.z, cfg.material, false);
    });
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
        new BABYLON.Vector3(-10, 1.5, -41),
        new BABYLON.Vector3(10, 1.5, -38),
        new BABYLON.Vector3(0, 1.5, -27)
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
    return createBox(scene, "carryCube", 1.8, 1.8, 1.8, -8, 0.9, 8, materials.cubeMat, true);
}

function createPressurePad(scene, materials) {
    const pad = BABYLON.MeshBuilder.CreateCylinder("pressurePad", { diameter: 3.5, height: 0.18, tessellation: 32 }, scene);
    pad.position = new BABYLON.Vector3(0, 0.12, 14);
    pad.material = materials.padInactive;
    return pad;
}

function createDoors(scene, materials) {
    return {
        door1: createDoor(scene, materials, "door1", new BABYLON.Vector3(0, 3, -18), 3, 8.2),
        door2: createDoor(scene, materials, "door2", new BABYLON.Vector3(0, 3, 18), 3, 8.2),
        finalDoor: createDoor(scene, materials, "finalDoor", new BABYLON.Vector3(0, 8.5, 66), 8.5, 12.0)
    };
}

function createDoor(scene, materials, name, position, closedY, openY) {
    const door = createBox(scene, name, 11, 6.2, 1.2, position.x, position.y, position.z, materials.darkMat, true);

    const light = createBox(
        scene,
        `${name}_statusLight`,
        7,
        0.18,
        0.1,
        position.x,
        position.y + 2.9,
        position.z - 0.65,
        materials.orangeLight,
        false
    );

    door.metadata = { light, closedY, openY };
    return door;
}

function createFinalButton(scene, materials) {
    const base = createBox(scene, "finalButtonBase", 1.4, 2.2, 0.8, -8, 6.35, 59.4, materials.darkMat, true);

    const screen = createBox(scene, "finalButtonScreen", 1.0, 0.55, 0.08, -8, 6.95, 58.95, materials.orangeLight, false);

    const light = new BABYLON.PointLight("finalButtonLight", new BABYLON.Vector3(-8, 6.9, 59), scene);
    light.intensity = 1.2;
    light.range = 7;
    light.diffuse = new BABYLON.Color3(1.0, 0.45, 0.08);

    base.metadata = { screen, light };
    return base;
}

function createFinalScanner(scene, materials) {
    const ring = BABYLON.MeshBuilder.CreateTorus("finalScannerRing", { diameter: 5.5, thickness: 0.22, tessellation: 48 }, scene);
    ring.position = new BABYLON.Vector3(0, 7.25, 78);
    ring.rotation.x = Math.PI / 2;
    ring.material = materials.greenLight;

    const core = BABYLON.MeshBuilder.CreatePolyhedron("finalScannerCore", { type: 1, size: 1.1 }, scene);
    core.position = new BABYLON.Vector3(0, 7.0, 78);
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
    let bestY = 0;

    surfaces.forEach((surface) => {
        surface.computeWorldMatrix(true);

        const box = surface.getBoundingInfo().boundingBox;
        const min = box.minimumWorld;
        const max = box.maximumWorld;
        const insideX = position.x >= min.x && position.x <= max.x;
        const insideZ = position.z >= min.z && position.z <= max.z;
        const topY = max.y;

        if (insideX && insideZ && position.y >= topY - 0.45 && topY > bestY) {
            bestY = topY;
        }
    });

    return bestY;
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
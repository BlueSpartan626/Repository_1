//Scene 5 - Midgard Realm

//Standalone BabylonJS realm scene for the Scene 5 realm-switching demo.
//This file builds the Midgard area, including player movement, third-person camera control, jumping, collision, skybox loading, terrain, path, mountain boundary, cave entrance, temple portal, UI prompts, and the transition to the Yggdrasil realm page.

const midgardSetup = setupEngineAndCanvas();
const canvas = midgardSetup.canvas;
const engine = midgardSetup.engine;

let scene = null;
let player = null;
let camera = null;
let ui = null;
let debugCameraEnabled = false;
let interactTarget = null;
let interactLocked = false;

const keys = {};
const blockers = [];
const interactables = [];

const ASSET_ROOT = "../../assets/Scene%205%20Assets/";

function createMidgardScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.035, 0.04, 0.035, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.1, 0.11, 0.095);
    scene.fogDensity = 0.0065;

    camera = new BABYLON.UniversalCamera("midgardCamera", new BABYLON.Vector3(0, 5, -10), scene);
    camera.inputs.clear();
    camera.minZ = 0.1;
    camera.maxZ = 2000;
    camera.fov = 0.9;
    camera.yaw = 0;
    camera.pitch = BABYLON.Tools.ToRadians(18);
    camera.distance = 7.0;
    camera.height = 2.0;
    scene.activeCamera = camera;

    const hemi = new BABYLON.HemisphericLight("midgardHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;

    const sun = new BABYLON.DirectionalLight("midgardSun", new BABYLON.Vector3(-0.45, -1, 0.35), scene);
    sun.position = new BABYLON.Vector3(25, 35, -25);
    sun.intensity = 1.35;

    const fill = new BABYLON.PointLight("midgardPortalFill", new BABYLON.Vector3(0, 4, 23), scene);
    fill.diffuse = new BABYLON.Color3(0.3, 1, 0.9);
    fill.intensity = 0.7;
    fill.range = 18;

    setMidgardSky();
    buildMidgardWorld();
    player = createPlayer();
    ui = createUI();

    setupInput();

    scene.onBeforeRenderObservable.add(() => {
        if (debugCameraEnabled) {
            updateDebugCamera();
        } else {
            updatePlayer();
            updateCamera();
            updateInteraction();

            if (keys.e && !interactLocked && interactTarget && interactTarget.action) {
                interactLocked = true;
                interactTarget.action();
            }
        }
    });

    return scene;
}

function setupInput() {
    canvas.addEventListener("click", () => {
        canvas.requestPointerLock();
        canvas.focus();
    });

    window.addEventListener("mousemove", (event) => {
        if (document.pointerLockElement !== canvas) return;

        camera.yaw += event.movementX * 0.003;

        if (debugCameraEnabled) {
            camera.pitch += event.movementY * 0.002;
            camera.pitch = BABYLON.Scalar.Clamp(
                camera.pitch,
                BABYLON.Tools.ToRadians(-89),
                BABYLON.Tools.ToRadians(89)
            );
        } else {
            camera.pitch += event.movementY * 0.002;
            camera.pitch = BABYLON.Scalar.Clamp(
                camera.pitch,
                BABYLON.Tools.ToRadians(8),
                BABYLON.Tools.ToRadians(48)
            );
        }
    });

    window.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();

        if (["w", "a", "s", "d", "e", "q", "n"].includes(key) || event.code === "Space") {
            event.preventDefault();
        }

        if (key === "n") {
            debugCameraEnabled = !debugCameraEnabled;
            ui.prompt.text = debugCameraEnabled ? "Debug camera enabled\nWASD = fly • Q = down • E = up • Shift = fast • N = exit" : "";
            ui.prompt.isVisible = debugCameraEnabled;
            return;
        }

        keys[event.code === "Space" ? "space" : key] = true;
    });

    window.addEventListener("keyup", (event) => {
        const key = event.key.toLowerCase();

        if (["w", "a", "s", "d", "e", "q", "n"].includes(key) || event.code === "Space") {
            event.preventDefault();
        }

        keys[event.code === "Space" ? "space" : key] = false;

        if (key === "e") {
            interactLocked = false;
        }
    });
}

function buildMidgardWorld() {
    const materials = createMaterials();

    createGround(materials);
    createPath(materials);
    createMountainBoundary(materials);
    createCaveEntrance(materials);
    createTemple(materials);
    createForest(materials);
    createLandscapeDecor(materials);
    createPortalEffects(materials);

    addInteractable("Enter the Yggdrasil Realm Travel Room", new BABYLON.Vector3(0, 0, 21.1), 3.0, () => {
        window.location.href = "yggdrasil.html";
    });
}

function createMaterials() {
    return {
        grass: makePbrMat("midgardGrass", "Midgard/Grass", "#26331f", 8),
        dirt: makePbrMat("midgardDirt", "Midgard/Dirt Path", "#5a432d", 1.6),
        rock: makePbrMat("midgardNaturalRock", "Midgard/Cliff Rock", "#505952", 3.5),
        mountainRock: makePbrMat("midgardMountainRock", "Midgard/Cliff Rock", "#39413b", 6),
        stone: makePbrMat("midgardTempleStone", "Midgard/Temple Stone", "#7a7d73", 2.5),
        darkStone: makePbrMat("midgardDarkStone", "Midgard/Temple Stone", "#343934", 2.5),
        moss: makePbrMat("midgardMoss", "Midgard/Moss", "#2f4f29", 5),
        bark: makePbrMat("midgardBark", "Midgard/Bark", "#4a2b18", 2.5),
        deadWood: makePbrMat("midgardDeadWood", "Midgard/Bark", "#2b1b12", 2.5),
        burntBark: makePbrMat("midgardBurntBark", "Midgard/Bark", "#161310", 2.5),
        cloth: makePbrMat("midgardCloth", "Midgard/Cloth", "#5a1414", 1.5),
        leaves: makePbrMat("midgardLeaves", "Midgard/Moss", "#0b2b13", 4),
        rune: makeMat("midgardRune", "#5eead4", "#14b8a6", "#14b8a6"),
        ember: makeMat("midgardEmber", "#f97316", "#ea580c", "#f97316"),
        black: makeMat("midgardBlack", "#030303", "#000000"),
        cave: makeMat("midgardCaveDark", "#010201", "#000000")
    };
}

function createGround(materials) {
    const ground = BABYLON.MeshBuilder.CreateGround("midgardGround", {
        width: 58,
        height: 64,
        subdivisions: 140
    }, scene);

    const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        let y =
            Math.sin(x * 0.11) * 0.035 +
            Math.cos(z * 0.09) * 0.03 +
            Math.sin((x + z) * 0.075) * 0.025;

        if (z > 9 && z < 25 && Math.abs(x) < 10) {
            y = -0.02;
        }

        positions[i + 1] = y;
    }

    ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    ground.material = materials.grass;
}

function createPath(materials) {
    const vertices = [];
    const indices = [];
    const uvs = [];
    const normals = [];

    const points = [];
    let distance = 0;

    for (let i = 0; i <= 44; i++) {
        const t = i / 44;
        const z = -28.5 + t * 37.5;
        const x = Math.sin((z + 18) * 0.09) * 0.45;
        const width = 2.05 + Math.sin(i * 0.45) * 0.12;

        if (i > 0) {
            const previous = points[i - 1];
            const dx = x - previous.x;
            const dz = z - previous.z;
            distance += Math.sqrt(dx * dx + dz * dz);
        }

        points.push({ x, z, width, distance });
    }

    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const previous = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];

        const dirX = next.x - previous.x;
        const dirZ = next.z - previous.z;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

        const nx = -dirZ / len;
        const nz = dirX / len;

        vertices.push(current.x + nx * current.width, 0.095, current.z + nz * current.width);
        vertices.push(current.x - nx * current.width, 0.095, current.z - nz * current.width);

        uvs.push(0, current.distance * 0.18);
        uvs.push(1.4, current.distance * 0.18);
    }

    for (let i = 0; i < points.length - 1; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;

        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    const path = new BABYLON.Mesh("midgardDirtRoad", scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = vertices;
    vertexData.indices = indices;
    vertexData.uvs = uvs;

    BABYLON.VertexData.ComputeNormals(vertices, indices, normals);
    vertexData.normals = normals;
    vertexData.applyToMesh(path);

    path.material = materials.dirt;
}

function createMountainBoundary(materials) {
    const innerRadiusX = 28.5;
    const innerRadiusZ = 31.0;
    const outerRadiusX = 34.0;
    const outerRadiusZ = 36.5;
    const total = 120;

    const positions = [];
    const indices = [];
    const normals = [];
    const colors = [];

    const rand = seededRandom;

    for (let i = 0; i <= total; i++) {
        const t = i / total;
        const angle = t * Math.PI * 2;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const caveOpening = Math.abs(sin * innerRadiusX) < 5.8 && cos * innerRadiusZ < -28.0;

        let innerX = sin * innerRadiusX;
        let innerZ = cos * innerRadiusZ;
        let outerX = sin * outerRadiusX;
        let outerZ = cos * outerRadiusZ;

        const wobble = (rand(i * 19) - 0.5) * 1.1;
        const sideWobble = (rand(i * 31) - 0.5) * 0.7;

        innerX += sin * wobble + cos * sideWobble;
        innerZ += cos * wobble - sin * sideWobble;
        outerX += sin * (wobble + 0.8) + cos * sideWobble;
        outerZ += cos * (wobble + 0.8) - sin * sideWobble;

        const baseHeight = caveOpening ? 0.2 : 5.5 + rand(i * 43) * 4.8;
        const topInnerHeight = baseHeight + rand(i * 59) * 2.2;
        const topOuterHeight = baseHeight + rand(i * 71) * 3.0;

        positions.push(innerX, 0, innerZ);
        positions.push(innerX, topInnerHeight, innerZ);
        positions.push(outerX, 0, outerZ);
        positions.push(outerX, topOuterHeight, outerZ);

        const shade = 0.34 + rand(i * 97) * 0.14;

        for (let c = 0; c < 4; c++) {
            colors.push(shade, shade + 0.035, shade, 1);
        }
    }

    for (let i = 0; i < total; i++) {
        const a = i * 4;
        const b = a + 4;

        indices.push(a, b, a + 1);
        indices.push(a + 1, b, b + 1);

        indices.push(a + 2, a + 3, b + 2);
        indices.push(a + 3, b + 3, b + 2);

        indices.push(a + 1, b + 1, a + 3);
        indices.push(a + 3, b + 1, b + 3);

        indices.push(a, a + 2, b);
        indices.push(a + 2, b + 2, b);
    }

    const cliff = new BABYLON.Mesh("midgardContinuousCliffWall", scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;
    vertexData.applyToMesh(cliff);

    cliff.material = materials.mountainRock;
    cliff.convertToFlatShadedMesh();

    const ridgeCount = 70;

    for (let i = 0; i < ridgeCount; i++) {
        const angle = (Math.PI * 2 / ridgeCount) * i;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const caveOpening = Math.abs(sin * innerRadiusX) < 5.8 && cos * innerRadiusZ < -28.0;

        if (caveOpening) continue;

        const x = sin * (innerRadiusX - 0.8 + rand(i * 13) * 1.2);
        const z = cos * (innerRadiusZ - 0.8 + rand(i * 17) * 1.2);
        const height = 1.8 + rand(i * 23) * 2.4;
        const width = 1.4 + rand(i * 29) * 1.2;
        const depth = 1.2 + rand(i * 37) * 1.1;

        const rock = BABYLON.MeshBuilder.CreatePolyhedron(`midgardInnerRockFace_${i}`, {
            type: 2,
            size: 1
        }, scene);

        rock.position = new BABYLON.Vector3(x, height * 0.5 - 0.05, z);
        rock.scaling = new BABYLON.Vector3(width, height, depth);
        rock.rotation.x = BABYLON.Tools.ToRadians(rand(i * 41) * 10 - 5);
        rock.rotation.y = BABYLON.Tools.ToRadians(rand(i * 47) * 360);
        rock.rotation.z = BABYLON.Tools.ToRadians(rand(i * 53) * 10 - 5);
        rock.material = materials.rock;
        rock.convertToFlatShadedMesh();
    }

    addCollisionBox(-28.8, 0, 1.4, 62);
    addCollisionBox(28.8, 0, 1.4, 62);
    addCollisionBox(0, 30.9, 55, 1.4);
    addCollisionBox(-10.5, -30.2, 13.5, 1.4);
    addCollisionBox(10.5, -30.2, 13.5, 1.4);
}

function createCaveEntrance(materials) {
    const rearMountain = BABYLON.MeshBuilder.CreatePolyhedron("midgardEntranceRearMountain", {
        type: 2,
        size: 1
    }, scene);

    rearMountain.position = new BABYLON.Vector3(0, 8.4, -34.2);
    rearMountain.scaling = new BABYLON.Vector3(15.5, 10.8, 6.2);
    rearMountain.rotation.y = BABYLON.Tools.ToRadians(8);
    rearMountain.material = materials.mountainRock;
    rearMountain.convertToFlatShadedMesh();

    const leftMass = BABYLON.MeshBuilder.CreatePolyhedron("midgardEntranceLeftMass", {
        type: 2,
        size: 1
    }, scene);

    leftMass.position = new BABYLON.Vector3(-8.6, 4.9, -29.6);
    leftMass.scaling = new BABYLON.Vector3(5.0, 7.0, 3.1);
    leftMass.rotation.y = BABYLON.Tools.ToRadians(-18);
    leftMass.material = materials.mountainRock;
    leftMass.convertToFlatShadedMesh();

    const rightMass = BABYLON.MeshBuilder.CreatePolyhedron("midgardEntranceRightMass", {
        type: 2,
        size: 1
    }, scene);

    rightMass.position = new BABYLON.Vector3(8.6, 4.9, -29.6);
    rightMass.scaling = new BABYLON.Vector3(5.0, 7.0, 3.1);
    rightMass.rotation.y = BABYLON.Tools.ToRadians(18);
    rightMass.material = materials.mountainRock;
    rightMass.convertToFlatShadedMesh();

    const upperArch = BABYLON.MeshBuilder.CreatePolyhedron("midgardEntranceUpperArch", {
        type: 2,
        size: 1
    }, scene);

    upperArch.position = new BABYLON.Vector3(0, 6.15, -27.9);
    upperArch.scaling = new BABYLON.Vector3(6.4, 2.1, 1.5);
    upperArch.rotation.y = BABYLON.Tools.ToRadians(-5);
    upperArch.material = materials.rock;
    upperArch.convertToFlatShadedMesh();

    const tunnelShadow = BABYLON.MeshBuilder.CreateBox("midgardTunnelShadow", {
        width: 7.6,
        height: 4.45,
        depth: 0.38
    }, scene);

    tunnelShadow.position = new BABYLON.Vector3(0, 2.2, -26.65);
    tunnelShadow.material = materials.black;

    const tunnelLower = BABYLON.MeshBuilder.CreateBox("midgardTunnelLower", {
        width: 7.6,
        height: 2.3,
        depth: 0.4
    }, scene);

    tunnelLower.position = new BABYLON.Vector3(0, 1.12, -26.45);
    tunnelLower.material = materials.black;

    const leftPost = BABYLON.MeshBuilder.CreateCylinder("midgardTunnelLeftPost", {
        diameterTop: 0.3,
        diameterBottom: 0.42,
        height: 4.35,
        tessellation: 12
    }, scene);

    leftPost.position = new BABYLON.Vector3(-3.65, 2.18, -25.95);
    leftPost.rotation.z = BABYLON.Tools.ToRadians(-2);
    leftPost.material = materials.bark;

    const rightPost = BABYLON.MeshBuilder.CreateCylinder("midgardTunnelRightPost", {
        diameterTop: 0.3,
        diameterBottom: 0.42,
        height: 4.35,
        tessellation: 12
    }, scene);

    rightPost.position = new BABYLON.Vector3(3.65, 2.18, -25.95);
    rightPost.rotation.z = BABYLON.Tools.ToRadians(2);
    rightPost.material = materials.bark;

    const topBeam = BABYLON.MeshBuilder.CreateCylinder("midgardTunnelTopBeam", {
        diameter: 0.38,
        height: 7.8,
        tessellation: 12
    }, scene);

    topBeam.position = new BABYLON.Vector3(0, 4.25, -25.9);
    topBeam.rotation.z = Math.PI / 2;
    topBeam.material = materials.bark;

    const leftBrace = BABYLON.MeshBuilder.CreateCylinder("midgardTunnelLeftBrace", {
        diameter: 0.15,
        height: 3.6,
        tessellation: 10
    }, scene);

    leftBrace.position = new BABYLON.Vector3(-2.2, 2.6, -25.82);
    leftBrace.rotation.z = BABYLON.Tools.ToRadians(-35);
    leftBrace.material = materials.bark;

    const rightBrace = BABYLON.MeshBuilder.CreateCylinder("midgardTunnelRightBrace", {
        diameter: 0.15,
        height: 3.6,
        tessellation: 10
    }, scene);

    rightBrace.position = new BABYLON.Vector3(2.2, 2.6, -25.82);
    rightBrace.rotation.z = BABYLON.Tools.ToRadians(35);
    rightBrace.material = materials.bark;

    const leftSideRock = BABYLON.MeshBuilder.CreatePolyhedron("midgardTunnelLeftSideRock", {
        type: 2,
        size: 1
    }, scene);

    leftSideRock.position = new BABYLON.Vector3(-5.45, 2.4, -26.7);
    leftSideRock.scaling = new BABYLON.Vector3(1.9, 4.8, 1.3);
    leftSideRock.rotation.y = BABYLON.Tools.ToRadians(-8);
    leftSideRock.material = materials.rock;
    leftSideRock.convertToFlatShadedMesh();

    const rightSideRock = BABYLON.MeshBuilder.CreatePolyhedron("midgardTunnelRightSideRock", {
        type: 2,
        size: 1
    }, scene);

    rightSideRock.position = new BABYLON.Vector3(5.45, 2.4, -26.7);
    rightSideRock.scaling = new BABYLON.Vector3(1.9, 4.8, 1.3);
    rightSideRock.rotation.y = BABYLON.Tools.ToRadians(8);
    rightSideRock.material = materials.rock;
    rightSideRock.convertToFlatShadedMesh();

    addCollisionBox(0, -26.5, 7.8, 1.4);
    addCollisionBox(-3.65, -25.95, 0.55, 0.55);
    addCollisionBox(3.65, -25.95, 0.55, 0.55);
    addCollisionBox(-5.45, -26.7, 1.9, 1.4);
    addCollisionBox(5.45, -26.7, 1.9, 1.4);
    addCollisionBox(0, -31.6, 19.0, 2.4);
}

function createTemple(materials) {
    const root = new BABYLON.TransformNode("midgardTempleRoot", scene);
    root.position = new BABYLON.Vector3(0, 0, 18);

    const foundation = BABYLON.MeshBuilder.CreateBox("midgardTempleFoundation", {
        width: 15.5,
        height: 0.5,
        depth: 12.5
    }, scene);
    foundation.position = new BABYLON.Vector3(0, 0.25, 0);
    foundation.material = materials.darkStone;
    foundation.parent = root;

    const floor = BABYLON.MeshBuilder.CreateBox("midgardTempleFloor", {
        width: 13.5,
        height: 0.16,
        depth: 9.5
    }, scene);
    floor.position = new BABYLON.Vector3(0, 0.6, 1.1);
    floor.material = materials.stone;
    floor.parent = root;

    for (let i = 0; i < 5; i++) {
        const step = BABYLON.MeshBuilder.CreateBox(`midgardTempleStep_${i}`, {
            width: 11.8 - i * 0.55,
            height: 0.12,
            depth: 0.55
        }, scene);

        step.position = new BABYLON.Vector3(0, 0.08 + i * 0.06, -7.7 + i * 0.5);
        step.material = i % 2 === 0 ? materials.stone : materials.darkStone;
        step.parent = root;
    }

    const backWall = BABYLON.MeshBuilder.CreateBox("midgardTempleBackWall", {
        width: 12.5,
        height: 3.8,
        depth: 0.75
    }, scene);
    backWall.position = new BABYLON.Vector3(0, 2.55, 5.8);
    backWall.material = materials.stone;
    backWall.parent = root;

    const brokenGap = BABYLON.MeshBuilder.CreateBox("midgardTempleBackWallGap", {
        width: 3.2,
        height: 3.2,
        depth: 0.82
    }, scene);
    brokenGap.position = new BABYLON.Vector3(0, 2.85, 5.75);
    brokenGap.material = materials.black;
    brokenGap.parent = root;

    const lintel = BABYLON.MeshBuilder.CreateBox("midgardTempleLintel", {
        width: 5.0,
        height: 0.45,
        depth: 0.85
    }, scene);
    lintel.position = new BABYLON.Vector3(0, 4.55, 5.8);
    lintel.rotation.z = BABYLON.Tools.ToRadians(-2);
    lintel.material = materials.darkStone;
    lintel.parent = root;

    const columns = [
        [-5.4, -2.7, 3.0],
        [-5.4, 0.1, 3.2],
        [-5.4, 2.9, 2.8],
        [5.4, -2.7, 3.1],
        [5.4, 0.1, 2.9],
        [5.4, 2.9, 3.2]
    ];

    columns.forEach((column, index) => {
        createColumn(root, column[0], column[1], column[2], materials, index);
        addCollisionCircle(column[0], 18 + column[1], 0.42);
    });

    const altar = BABYLON.MeshBuilder.CreateCylinder("midgardTempleAltar", {
        diameter: 2.2,
        height: 0.65,
        tessellation: 48
    }, scene);
    altar.position = new BABYLON.Vector3(0, 0.98, 3.1);
    altar.material = materials.darkStone;
    altar.parent = root;

    const floorRuneOne = BABYLON.MeshBuilder.CreateTorus("midgardFloorRuneOne", {
        diameter: 5.7,
        thickness: 0.045,
        tessellation: 96
    }, scene);
    floorRuneOne.position = new BABYLON.Vector3(0, 0.78, 21.1);
    floorRuneOne.rotation.x = Math.PI / 2;
    floorRuneOne.material = materials.rune;

    const floorRuneTwo = BABYLON.MeshBuilder.CreateTorus("midgardFloorRuneTwo", {
        diameter: 4.0,
        thickness: 0.05,
        tessellation: 96
    }, scene);
    floorRuneTwo.position = new BABYLON.Vector3(0, 0.81, 21.1);
    floorRuneTwo.rotation.x = Math.PI / 2;
    floorRuneTwo.material = materials.rune;

    const portalRing = BABYLON.MeshBuilder.CreateTorus("midgardPortalRing", {
        diameter: 3.0,
        thickness: 0.12,
        tessellation: 96
    }, scene);
    portalRing.position = new BABYLON.Vector3(0, 2.85, 21.1);
    portalRing.rotation.x = Math.PI / 2;
    portalRing.material = materials.rune;

    const portalCore = BABYLON.MeshBuilder.CreateSphere("midgardPortalCore", {
        diameter: 1.35,
        segments: 40
    }, scene);
    portalCore.position = new BABYLON.Vector3(0, 2.85, 21.1);
    portalCore.material = materials.rune;

    const portalLight = new BABYLON.PointLight("midgardPortalLight", new BABYLON.Vector3(0, 3.4, 21.1), scene);
    portalLight.diffuse = new BABYLON.Color3(0.2, 1, 0.88);
    portalLight.intensity = 3.0;
    portalLight.range = 13;

    addCollisionBox(-7.75, 18, 0.6, 12.5);
    addCollisionBox(7.75, 18, 0.6, 12.5);
    addCollisionBox(0, 23.9, 12.5, 0.75);
    addCollisionCircle(0, 21.1, 1.1);
}

function createColumn(root, x, z, height, materials, index) {
    const base = BABYLON.MeshBuilder.CreateCylinder(`midgardColumnBase_${index}`, {
        diameter: 0.9,
        height: 0.28,
        tessellation: 40
    }, scene);
    base.position = new BABYLON.Vector3(x, 0.86, z);
    base.material = materials.darkStone;
    base.parent = root;

    const shaft = BABYLON.MeshBuilder.CreateCylinder(`midgardColumnShaft_${index}`, {
        diameter: 0.54,
        height,
        tessellation: 40
    }, scene);
    shaft.position = new BABYLON.Vector3(x, 1.0 + height * 0.5, z);
    shaft.rotation.z = BABYLON.Tools.ToRadians(index % 2 === 0 ? 1.5 : -1.5);
    shaft.material = materials.stone;
    shaft.parent = root;

    const cap = BABYLON.MeshBuilder.CreateCylinder(`midgardColumnCap_${index}`, {
        diameter: 0.9,
        height: 0.24,
        tessellation: 40
    }, scene);
    cap.position = new BABYLON.Vector3(x, 1.12 + height, z);
    cap.material = materials.darkStone;
    cap.parent = root;
}

function createForest(materials) {
    const trees = [];
    const rand = seededRandom;

    const blocked = (x, z) => {
        if (Math.abs(x) < 6 && z > -25 && z < 10) return true;
        if (Math.abs(x) < 11 && z > 8 && z < 25) return true;
        if (Math.abs(x) < 10 && z < -22) return true;
        if (Math.abs(x) > 26 || z > 29 || z < -25) return true;

        const avoid = [
            [-18, -14, 5],
            [18, -14, 5],
            [-20, 3, 5],
            [20, 3, 5],
            [-17, 18, 5],
            [17, 18, 5],
            [0, -17, 5],
            [-15, -8, 4],
            [15, 4, 4],
            [-12, 18, 4]
        ];

        return avoid.some((spot) => {
            const dx = x - spot[0];
            const dz = z - spot[1];
            return Math.sqrt(dx * dx + dz * dz) < spot[2];
        });
    };

    for (let i = 0; i < 95; i++) {
        const angle = rand(i * 17) * Math.PI * 2;
        const radiusX = 16 + rand(i * 23) * 10.5;
        const radiusZ = 17 + rand(i * 29) * 10.5;

        const x = Math.sin(angle) * radiusX;
        const z = Math.cos(angle) * radiusZ;

        if (blocked(x, z)) continue;

        const tooClose = trees.some((tree) => {
            const dx = tree[0] - x;
            const dz = tree[1] - z;
            return Math.sqrt(dx * dx + dz * dz) < 3.0;
        });

        if (tooClose) continue;

        const scale = 1.1 + rand(i * 37) * 0.95;
        trees.push([x, z, scale]);
    }

    trees.forEach((tree, index) => {
        createPine(tree[0], tree[1], tree[2], materials, index);
        addCollisionCircle(tree[0], tree[1], 0.55 * tree[2]);
    });
}

function createPine(x, z, scale, materials, index) {
    const root = new BABYLON.TransformNode(`midgardPineRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = BABYLON.Tools.ToRadians(index * 47);

    const trunk = BABYLON.MeshBuilder.CreateCylinder(`midgardPineTrunk_${index}`, {
        diameterTop: 0.22 * scale,
        diameterBottom: 0.46 * scale,
        height: 4.15 * scale,
        tessellation: 14
    }, scene);

    trunk.position.y = 2.075 * scale;
    trunk.rotation.z = BABYLON.Tools.ToRadians(seededRandom(index * 19) * 2.5 - 1.25);
    trunk.material = materials.bark;
    trunk.parent = root;

    const foliageData = [
        [0.0, 2.45, 1.75, 0.78],
        [0.0, 2.95, 1.55, 0.72],
        [0.0, 3.42, 1.32, 0.66],
        [0.0, 3.86, 1.08, 0.58],
        [0.0, 4.25, 0.78, 0.48]
    ];

    foliageData.forEach((layer, layerIndex) => {
        const foliage = BABYLON.MeshBuilder.CreateCylinder(`midgardPineFoliage_${index}_${layerIndex}`, {
            diameterTop: 0.18 * scale,
            diameterBottom: layer[2] * scale,
            height: layer[3] * scale,
            tessellation: 20
        }, scene);

        foliage.position = new BABYLON.Vector3(
            Math.sin(layerIndex * 1.7 + index) * 0.04 * scale,
            layer[1] * scale,
            Math.cos(layerIndex * 1.3 + index) * 0.04 * scale
        );

        foliage.scaling.z = 0.82 + seededRandom(index * 31 + layerIndex) * 0.12;
        foliage.rotation.y = BABYLON.Tools.ToRadians(index * 13 + layerIndex * 23);
        foliage.material = materials.leaves;
        foliage.parent = root;
    });
}

function createRuinsAndDetails(materials) {
    createRuinedWall(-14, 7, 24, 4, materials, 0);
    createRuinedWall(14, -6, -22, 4, materials, 1);
    createRuinedWall(-13, 19, -10, 3, materials, 2);
    createRuinedWall(13, 19, 10, 3, materials, 3);

    createBanner(-9.5, 12, materials);
    createCampfire(13, 16, materials);
    createCairns(materials);
    createRoots(materials);
}

function createRuinedWall(x, z, rotation, length, materials, index) {
    const root = new BABYLON.TransformNode(`midgardRuinedWallRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = BABYLON.Tools.ToRadians(rotation);

    for (let i = 0; i < length; i++) {
        const block = BABYLON.MeshBuilder.CreateBox(`midgardRuinedWallBlock_${index}_${i}`, {
            width: 0.95 + (i % 2) * 0.18,
            height: 0.5 + (i % 3) * 0.2,
            depth: 0.4
        }, scene);

        block.position = new BABYLON.Vector3(-length * 0.48 + i * 0.95, 0.27 + (i % 3) * 0.1, 0);
        block.rotation.z = BABYLON.Tools.ToRadians(Math.sin(i) * 2);
        block.material = i % 2 === 0 ? materials.stone : materials.darkStone;
        block.parent = root;
    }

    addCollisionCircle(x, z, 1.45);
}

function createBanner(x, z, materials) {
    const pole = BABYLON.MeshBuilder.CreateCylinder("midgardStandingBannerPole", {
        diameter: 0.09,
        height: 2.8,
        tessellation: 10
    }, scene);
    pole.position = new BABYLON.Vector3(x, 1.4, z);
    pole.rotation.z = BABYLON.Tools.ToRadians(-6);
    pole.material = materials.deadWood;

    const banner = BABYLON.MeshBuilder.CreateBox("midgardStandingBannerCloth", {
        width: 0.08,
        height: 1.5,
        depth: 0.85
    }, scene);
    banner.position = new BABYLON.Vector3(x + 0.15, 1.9, z + 0.05);
    banner.rotation.z = BABYLON.Tools.ToRadians(-6);
    banner.material = materials.cloth;
}

function createWallBanner(x, z, materials) {
    const pole = BABYLON.MeshBuilder.CreateCylinder("midgardWallBannerPole", {
        diameter: 0.08,
        height: 1.8,
        tessellation: 10
    }, scene);
    pole.position = new BABYLON.Vector3(x, 3.2, z + 0.35);
    pole.rotation.z = Math.PI / 2;
    pole.material = materials.deadWood;

    const banner = BABYLON.MeshBuilder.CreateBox("midgardWallBannerCloth", {
        width: 1.15,
        height: 1.7,
        depth: 0.08
    }, scene);
    banner.position = new BABYLON.Vector3(x, 2.3, z);
    banner.material = materials.cloth;
}

function createCampfire(x, z, materials) {
    const root = new BABYLON.TransformNode("midgardCampfireRoot", scene);
    root.position = new BABYLON.Vector3(x, 0, z);

    const firePit = BABYLON.MeshBuilder.CreateCylinder("midgardCampFirePit", {
        diameter: 1.05,
        height: 0.16,
        tessellation: 28
    }, scene);
    firePit.position.y = 0.1;
    firePit.material = materials.darkStone;
    firePit.parent = root;

    for (let i = 0; i < 4; i++) {
        const log = BABYLON.MeshBuilder.CreateCylinder(`midgardCampLog_${i}`, {
            diameter: 0.1,
            height: 1.25,
            tessellation: 10
        }, scene);

        log.position = new BABYLON.Vector3(Math.sin(i * 1.4) * 0.45, 0.18, Math.cos(i * 1.4) * 0.45);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = BABYLON.Tools.ToRadians(i * 45);
        log.material = materials.deadWood;
        log.parent = root;
    }

    for (let i = 0; i < 7; i++) {
        const spark = BABYLON.MeshBuilder.CreateSphere(`midgardCampSpark_${i}`, {
            diameter: 0.08 + (i % 2) * 0.025,
            segments: 8
        }, scene);

        spark.position = new BABYLON.Vector3(Math.sin(i) * 0.22, 0.34 + (i % 3) * 0.12, Math.cos(i) * 0.22);
        spark.material = materials.ember;
        spark.parent = root;
    }

    addCollisionCircle(x, z, 1.0);
}

function createCairns(materials) {
    const cairns = [
        [-13, -9],
        [13, -3],
        [-13, 12],
        [13, 14],
        [-6, 25],
        [6, 25],
        [-19, 2],
        [19, 2]
    ];

    cairns.forEach((pos, index) => {
        for (let i = 0; i < 4; i++) {
            const stone = BABYLON.MeshBuilder.CreateIcoSphere(`midgardCairnStone_${index}_${i}`, {
                radius: 0.2 - i * 0.018,
                subdivisions: 1
            }, scene);

            stone.position = new BABYLON.Vector3(
                pos[0] + Math.sin(i * 2.0) * 0.13,
                0.1 + i * 0.14,
                pos[1] + Math.cos(i * 2.0) * 0.13
            );

            stone.scaling = new BABYLON.Vector3(1.15, 0.55, 0.9);
            stone.rotation.y = BABYLON.Tools.ToRadians(i * 37);
            stone.material = i % 2 === 0 ? materials.stone : materials.darkStone;
            stone.convertToFlatShadedMesh();
        }
    });
}

function createRoots(materials) {
    const rootLines = [
        [-4, -20, 24],
        [4, -15, -18],
        [-4, -2, 12],
        [4, 5, -8],
        [-3, 15, 19],
        [3, 21, -22],
        [-6, 8, 34],
        [6, -2, -30]
    ];

    rootLines.forEach((line, index) => {
        const root = BABYLON.MeshBuilder.CreateCylinder(`midgardGroundRoot_${index}`, {
            diameter: 0.07,
            height: 2.0,
            tessellation: 8
        }, scene);

        root.position = new BABYLON.Vector3(line[0], 0.08, line[1]);
        root.rotation.z = Math.PI / 2;
        root.rotation.y = BABYLON.Tools.ToRadians(line[2]);
        root.material = materials.deadWood;
    });
}

function createLandscapeDecor(materials) {
    createAbandonedCamps(materials);
    createOldBanners(materials);
    createRuinStones(materials);
    createMossOnCliffs(materials);
    createGroundClutter(materials);
}

function createPortalEffects(materials) {
    const particles = [];

    for (let i = 0; i < 30; i++) {
        const particle = BABYLON.MeshBuilder.CreateSphere(`midgardPortalParticle_${i}`, {
            diameter: 0.055 + (i % 3) * 0.018,
            segments: 8
        }, scene);

        particle.material = i % 5 === 0 ? materials.ember : materials.rune;
        particle.metadata = {
            angle: i * 0.5,
            radius: 0.85 + (i % 6) * 0.09,
            height: 2.05 + (i % 10) * 0.11,
            speed: 0.7 + (i % 5) * 0.08
        };

        particles.push(particle);
    }

    scene.onBeforeRenderObservable.add(() => {
        const delta = engine.getDeltaTime() / 1000;

        particles.forEach((particle) => {
            particle.metadata.angle += delta * particle.metadata.speed;
            particle.metadata.height += delta * 0.15;

            if (particle.metadata.height > 3.85) {
                particle.metadata.height = 2.05;
            }

            particle.position.x = Math.sin(particle.metadata.angle) * particle.metadata.radius;
            particle.position.y = particle.metadata.height;
            particle.position.z = 21.1 + Math.cos(particle.metadata.angle) * 0.22;
        });
    });
}

function createAbandonedCamps(materials) {
    const camps = [
        [-15, -8, -18],
        [15, 4, 22],
        [-12, 18, 8]
    ];

    camps.forEach((camp, campIndex) => {
        const pit = BABYLON.MeshBuilder.CreateCylinder(`midgardOldCampPit_${campIndex}`, {
            diameter: 1.3,
            height: 0.12,
            tessellation: 28
        }, scene);

        pit.position = new BABYLON.Vector3(camp[0], 0.08, camp[1]);
        pit.material = materials.black;

        for (let i = 0; i < 9; i++) {
            const stone = createBoulder(
                `midgardCampStone_${campIndex}_${i}`,
                camp[0] + Math.sin(i * 0.7) * 0.72,
                camp[1] + Math.cos(i * 0.7) * 0.72,
                0.16,
                0.1,
                0.15,
                materials.rock,
                5000 + campIndex * 30 + i
            );

            stone.position.y = 0.07;
        }

        for (let i = 0; i < 12; i++) {
            const log = BABYLON.MeshBuilder.CreateCylinder(`midgardBurntCampLog_${campIndex}_${i}`, {
                diameter: 0.055 + seededRandom(campIndex * 50 + i) * 0.045,
                height: 0.65 + seededRandom(campIndex * 60 + i) * 0.75,
                tessellation: 8
            }, scene);

            log.position = new BABYLON.Vector3(
                camp[0] + Math.sin(i * 1.2) * 0.28,
                0.14,
                camp[1] + Math.cos(i * 1.2) * 0.28
            );

            log.rotation.z = Math.PI / 2;
            log.rotation.y = BABYLON.Tools.ToRadians(camp[2] + i * 29);
            log.material = i % 3 === 0 ? materials.black : materials.burntBark;
        }

        const ash = BABYLON.MeshBuilder.CreateDisc(`midgardCampAsh_${campIndex}`, {
            radius: 0.58,
            tessellation: 28
        }, scene);

        ash.position = new BABYLON.Vector3(camp[0], 0.095, camp[1]);
        ash.rotation.x = Math.PI / 2;
        ash.scaling = new BABYLON.Vector3(1.2, 0.75, 1);
        ash.material = materials.black;

        addCollisionCircle(camp[0], camp[1], 0.9);
    });
}

function createOldBanners(materials) {
    const banners = [
        [-8.5, -13, -8],
        [9.5, -7, 6],
        [-10.5, 12, -14],
        [10.5, 17, 16]
    ];

    banners.forEach((banner, index) => {
        const pole = BABYLON.MeshBuilder.CreateCylinder(`midgardOldBannerPole_${index}`, {
            diameter: 0.1,
            height: 2.7,
            tessellation: 10
        }, scene);

        pole.position = new BABYLON.Vector3(banner[0], 1.25, banner[1]);
        pole.rotation.z = BABYLON.Tools.ToRadians(banner[2]);
        pole.material = materials.bark;

        const cloth = BABYLON.MeshBuilder.CreateBox(`midgardOldBannerCloth_${index}`, {
            width: 0.08,
            height: 1.1,
            depth: 0.62
        }, scene);

        cloth.position = new BABYLON.Vector3(banner[0] + 0.18, 1.72, banner[1] + 0.04);
        cloth.rotation.z = BABYLON.Tools.ToRadians(banner[2]);
        cloth.material = materials.cloth;

        addCollisionCircle(banner[0], banner[1], 0.35);
    });
}

function createRuinStones(materials) {
    createMidgardRuinHouse(-20, -10, materials, 0);
    createMidgardBrokenTower(20, -12, materials, 1);
    createMidgardCollapsedGate(-22, 5, materials, 2);
    createMidgardOldShrine(22, 6, materials, 3);
    createMidgardHalfHall(-18, 19, materials, 4);
    createMidgardFallenObelisk(18, 19, materials, 5);
    createMidgardBuriedFoundation(-11, -20, materials, 6);
}

function createRuinedFoundation(x, z, rotation, materials, index) {
    const root = new BABYLON.TransformNode(`midgardRuinedFoundationRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = BABYLON.Tools.ToRadians(rotation);

    const layout = [
        [-1.8, -1.0, 1.5, 0.45, 0.45],
        [-0.6, -1.0, 1.1, 0.36, 0.42],
        [0.7, -1.0, 1.4, 0.5, 0.45],
        [1.8, -1.0, 1.1, 0.42, 0.45],
        [-1.8, 0.0, 0.8, 0.55, 0.45],
        [1.8, 0.0, 0.9, 0.5, 0.45],
        [-1.8, 1.0, 1.2, 0.45, 0.45],
        [-0.5, 1.0, 1.0, 0.35, 0.45],
        [0.8, 1.0, 1.3, 0.46, 0.45],
        [1.8, 1.0, 1.0, 0.35, 0.45]
    ];

    layout.forEach((blockData, blockIndex) => {
        const block = BABYLON.MeshBuilder.CreateBox(`midgardFoundationBlock_${index}_${blockIndex}`, {
            width: blockData[2],
            height: blockData[3],
            depth: blockData[4]
        }, scene);

        block.position = new BABYLON.Vector3(blockData[0], blockData[3] * 0.5, blockData[1]);
        block.rotation.y = BABYLON.Tools.ToRadians(seededRandom(index * 100 + blockIndex) * 10 - 5);
        block.material = blockIndex % 2 === 0 ? materials.stone : materials.darkStone;
        block.parent = root;
    });

    const fallenSlab = BABYLON.MeshBuilder.CreateBox(`midgardFoundationFallenSlab_${index}`, {
        width: 2.2,
        height: 0.18,
        depth: 0.75
    }, scene);

    fallenSlab.position = new BABYLON.Vector3(0.1, 0.14, 0.1);
    fallenSlab.rotation.y = BABYLON.Tools.ToRadians(18);
    fallenSlab.rotation.z = BABYLON.Tools.ToRadians(4);
    fallenSlab.material = materials.stone;
    fallenSlab.parent = root;

    addCollisionCircle(x, z, 1.7);
}

function createRuinedArch(x, z, rotation, materials, index) {
    const root = new BABYLON.TransformNode(`midgardRuinedArchRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = BABYLON.Tools.ToRadians(rotation);

    const leftPost = BABYLON.MeshBuilder.CreateBox(`midgardArchLeftPost_${index}`, {
        width: 0.55,
        height: 2.2,
        depth: 0.55
    }, scene);

    leftPost.position = new BABYLON.Vector3(-1.15, 1.1, 0);
    leftPost.material = materials.stone;
    leftPost.parent = root;

    const rightPost = BABYLON.MeshBuilder.CreateBox(`midgardArchRightPost_${index}`, {
        width: 0.55,
        height: 1.65,
        depth: 0.55
    }, scene);

    rightPost.position = new BABYLON.Vector3(1.15, 0.825, 0);
    rightPost.rotation.z = BABYLON.Tools.ToRadians(3);
    rightPost.material = materials.darkStone;
    rightPost.parent = root;

    const topStone = BABYLON.MeshBuilder.CreateBox(`midgardArchTopStone_${index}`, {
        width: 2.8,
        height: 0.38,
        depth: 0.65
    }, scene);

    topStone.position = new BABYLON.Vector3(0, 2.28, 0);
    topStone.rotation.z = BABYLON.Tools.ToRadians(-5);
    topStone.material = materials.stone;
    topStone.parent = root;

    const fallenStone = BABYLON.MeshBuilder.CreateBox(`midgardArchFallenStone_${index}`, {
        width: 1.1,
        height: 0.3,
        depth: 0.5
    }, scene);

    fallenStone.position = new BABYLON.Vector3(0.5, 0.18, 1.0);
    fallenStone.rotation.y = BABYLON.Tools.ToRadians(28);
    fallenStone.material = materials.darkStone;
    fallenStone.parent = root;

    addCollisionCircle(x, z, 1.4);
}

function createCollapsedWall(x, z, rotation, materials, index) {
    const root = new BABYLON.TransformNode(`midgardCollapsedWallRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = BABYLON.Tools.ToRadians(rotation);

    for (let i = 0; i < 7; i++) {
        const block = BABYLON.MeshBuilder.CreateBox(`midgardCollapsedWallBlock_${index}_${i}`, {
            width: 0.75 + seededRandom(index * 41 + i) * 0.55,
            height: 0.3 + seededRandom(index * 43 + i) * 0.55,
            depth: 0.45 + seededRandom(index * 47 + i) * 0.35
        }, scene);

        block.position = new BABYLON.Vector3(
            -2.3 + i * 0.75,
            0.2 + seededRandom(index * 53 + i) * 0.2,
            Math.sin(i * 1.2) * 0.35
        );

        block.rotation.x = BABYLON.Tools.ToRadians(seededRandom(index * 59 + i) * 12 - 6);
        block.rotation.y = BABYLON.Tools.ToRadians(seededRandom(index * 61 + i) * 20 - 10);
        block.rotation.z = BABYLON.Tools.ToRadians(seededRandom(index * 67 + i) * 10 - 5);
        block.material = i % 2 === 0 ? materials.stone : materials.darkStone;
        block.parent = root;
    }

    const upright = BABYLON.MeshBuilder.CreateBox(`midgardCollapsedWallUpright_${index}`, {
        width: 0.65,
        height: 1.7,
        depth: 0.55
    }, scene);

    upright.position = new BABYLON.Vector3(-2.7, 0.85, 0);
    upright.rotation.z = BABYLON.Tools.ToRadians(-4);
    upright.material = materials.darkStone;
    upright.parent = root;

    addCollisionCircle(x, z, 1.7);
}

function createMidgardRuinHouse(x, z, materials, index) {
    createStoneBox(`midgardRuinHouseFloor_${index}`, x, z, 4.4, 0.22, 3.2, materials.darkStone);
    createStoneBox(`midgardRuinHouseBackWall_${index}`, x, z + 1.55, 4.4, 1.6, 0.42, materials.stone);
    createStoneBox(`midgardRuinHouseLeftWall_${index}`, x - 2.1, z, 0.42, 1.1, 2.8, materials.stone);
    createStoneBox(`midgardRuinHouseRightStub_${index}`, x + 2.1, z - 0.7, 0.42, 0.75, 1.2, materials.darkStone);
    createStoneBox(`midgardRuinHouseFallenBeam_${index}`, x + 0.4, z - 0.4, 3.2, 0.2, 0.28, materials.deadWood, 18);
}

function createMidgardBrokenTower(x, z, materials, index) {
    const base = BABYLON.MeshBuilder.CreateCylinder(`midgardBrokenTowerBase_${index}`, {
        diameter: 3.6,
        height: 0.45,
        tessellation: 32
    }, scene);

    base.position = new BABYLON.Vector3(x, 0.23, z);
    base.material = materials.darkStone;

    const positions = [
        [-1.2, -1.0, 1.8],
        [1.1, -0.9, 1.25],
        [-0.9, 1.1, 1.45],
        [1.0, 1.0, 0.9]
    ];

    positions.forEach((pos, pillarIndex) => {
        const pillar = BABYLON.MeshBuilder.CreateCylinder(`midgardBrokenTowerPillar_${index}_${pillarIndex}`, {
            diameter: 0.48,
            height: pos[2],
            tessellation: 18
        }, scene);

        pillar.position = new BABYLON.Vector3(x + pos[0], pos[2] * 0.5 + 0.45, z + pos[1]);
        pillar.rotation.z = BABYLON.Tools.ToRadians(pillarIndex % 2 === 0 ? 2 : -3);
        pillar.material = pillarIndex % 2 === 0 ? materials.stone : materials.darkStone;
    });

    createStoneBox(`midgardBrokenTowerFallenTop_${index}`, x + 0.6, z + 1.7, 2.4, 0.28, 0.55, materials.stone, -12);
    addCollisionCircle(x, z, 1.8);
}

function createMidgardCollapsedGate(x, z, materials, index) {
    createStoneBox(`midgardCollapsedGateLeftPost_${index}`, x - 1.4, z, 0.7, 2.4, 0.7, materials.stone);
    createStoneBox(`midgardCollapsedGateRightPost_${index}`, x + 1.4, z, 0.7, 1.55, 0.7, materials.darkStone);
    createStoneBox(`midgardCollapsedGateFallenLintel_${index}`, x + 0.25, z + 0.95, 3.4, 0.35, 0.65, materials.stone, -16);
    createStoneBox(`midgardCollapsedGateStep_${index}`, x, z - 0.85, 3.7, 0.18, 0.7, materials.darkStone);
}

function createMidgardOldShrine(x, z, materials, index) {
    const base = BABYLON.MeshBuilder.CreateCylinder(`midgardOldShrineBase_${index}`, {
        diameter: 3.2,
        height: 0.32,
        tessellation: 32
    }, scene);

    base.position = new BABYLON.Vector3(x, 0.16, z);
    base.material = materials.darkStone;

    createStoneBox(`midgardOldShrineBackStone_${index}`, x, z + 0.8, 1.5, 2.1, 0.5, materials.stone);
    createStoneBox(`midgardOldShrineLeftOffering_${index}`, x - 1.0, z - 0.6, 0.7, 0.45, 0.7, materials.darkStone);
    createStoneBox(`midgardOldShrineRightOffering_${index}`, x + 1.0, z - 0.6, 0.7, 0.35, 0.7, materials.darkStone);
    addCollisionCircle(x, z, 1.45);
}

function createMidgardHalfHall(x, z, materials, index) {
    createStoneBox(`midgardHalfHallFloor_${index}`, x, z, 5.4, 0.2, 2.8, materials.darkStone);
    createStoneBox(`midgardHalfHallBackWall_${index}`, x, z + 1.3, 5.4, 1.45, 0.42, materials.stone);
    createStoneBox(`midgardHalfHallLeftPillar_${index}`, x - 2.4, z - 0.1, 0.55, 1.85, 0.55, materials.stone);
    createStoneBox(`midgardHalfHallRightPillar_${index}`, x + 2.4, z - 0.2, 0.55, 1.2, 0.55, materials.darkStone);
    createStoneBox(`midgardHalfHallBrokenRoof_${index}`, x - 0.7, z + 0.25, 2.6, 0.22, 0.55, materials.stone, 9);
    createStoneBox(`midgardHalfHallFallenBeam_${index}`, x + 0.6, z - 1.0, 3.0, 0.18, 0.25, materials.deadWood, -20);
}

function createMidgardFallenObelisk(x, z, materials, index) {
    createStoneBox(`midgardObeliskBase_${index}`, x, z, 1.4, 0.45, 1.4, materials.darkStone);
    createStoneBox(`midgardObeliskStandingShard_${index}`, x - 0.55, z + 0.25, 0.45, 1.8, 0.45, materials.stone, -4);
    createStoneBox(`midgardObeliskFallenShard_${index}`, x + 0.85, z - 0.2, 2.9, 0.38, 0.45, materials.stone, 24);
    createStoneBox(`midgardObeliskRubbleOne_${index}`, x + 1.6, z + 0.8, 0.7, 0.35, 0.6, materials.darkStone, 10);
    createStoneBox(`midgardObeliskRubbleTwo_${index}`, x - 1.3, z - 0.7, 0.6, 0.28, 0.5, materials.darkStone, -18);
}

function createMidgardBuriedFoundation(x, z, materials, index) {
    createStoneBox(`midgardBuriedFoundationNorth_${index}`, x, z + 1.7, 5.4, 0.38, 0.55, materials.stone);
    createStoneBox(`midgardBuriedFoundationSouth_${index}`, x, z - 1.7, 4.2, 0.32, 0.5, materials.darkStone);
    createStoneBox(`midgardBuriedFoundationWest_${index}`, x - 2.35, z, 0.5, 0.4, 3.4, materials.stone);
    createStoneBox(`midgardBuriedFoundationEast_${index}`, x + 2.35, z - 0.3, 0.5, 0.25, 2.1, materials.darkStone);
    createStoneBox(`midgardBuriedFoundationCenter_${index}`, x + 0.2, z, 1.8, 0.16, 1.0, materials.stone, 12);
}

function createStoneBox(name, x, z, width, height, depth, material, rotation = 0) {
    const box = BABYLON.MeshBuilder.CreateBox(name, {
        width,
        height,
        depth
    }, scene);

    box.position = new BABYLON.Vector3(x, height * 0.5, z);
    box.rotation.y = BABYLON.Tools.ToRadians(rotation);
    box.material = material;

    if (Math.abs(rotation) < 1) {
        addCollisionBox(x, z, width, depth);
    } else {
        addCollisionCircle(x, z, Math.max(width, depth) * 0.45);
    }

    return box;
}

function createMossOnCliffs(materials) {
    const total = 58;
    const radiusX = 26.3;
    const radiusZ = 28.7;

    for (let i = 0; i < total; i++) {
        const angle = seededRandom(i * 67) * Math.PI * 2;
        const x = Math.sin(angle) * (radiusX + seededRandom(i * 71) * 1.6 - 0.8);
        const z = Math.cos(angle) * (radiusZ + seededRandom(i * 73) * 1.6 - 0.8);

        if (Math.abs(x) < 7 && z < -23) continue;
        if (Math.abs(x) < 12 && z > 8 && z < 25) continue;

        createOrganicMossPatch(
            `midgardCliffOrganicMoss_${i}`,
            x,
            z,
            0.8 + seededRandom(i * 79) * 1.1,
            0.45 + seededRandom(i * 83) * 0.75,
            seededRandom(i * 89) * 360,
            materials.moss,
            i * 97
        );
    }
}

function createOrganicMossPatch(name, x, z, width, depth, rotation, material, seed) {
    const segments = 18;
    const positions = [0, 0, 0];
    const indices = [];
    const normals = [];
    const uvs = [0.5, 0.5];

    for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 / segments) * i;
        const wobble = 0.65 + seededRandom(seed + i * 13) * 0.55;

        positions.push(
            Math.sin(angle) * width * wobble,
            0,
            Math.cos(angle) * depth * wobble
        );

        uvs.push(
            0.5 + Math.sin(angle) * 0.5 * wobble,
            0.5 + Math.cos(angle) * 0.5 * wobble
        );
    }

    for (let i = 1; i <= segments; i++) {
        const next = i === segments ? 1 : i + 1;
        indices.push(0, i, next);
    }

    const patch = new BABYLON.Mesh(name, scene);
    const vertexData = new BABYLON.VertexData();

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;
    vertexData.applyToMesh(patch);

    patch.position = new BABYLON.Vector3(x, 0.105, z);
    patch.rotation.y = BABYLON.Tools.ToRadians(rotation);
    patch.material = material;

    return patch;
}

function createGroundClutter(materials) {
    const twigCount = 30;

    for (let i = 0; i < twigCount; i++) {
        const x = -21 + seededRandom(i * 101) * 42;
        const z = -20 + seededRandom(i * 103) * 44;

        if (Math.abs(x) < 5 && z > -24 && z < 10) continue;
        if (Math.abs(x) < 11 && z > 9 && z < 26) continue;

        const twig = BABYLON.MeshBuilder.CreateCylinder(`midgardGroundTwig_${i}`, {
            diameter: 0.045,
            height: 0.9 + seededRandom(i * 107) * 0.8,
            tessellation: 8
        }, scene);

        twig.position = new BABYLON.Vector3(x, 0.08, z);
        twig.rotation.z = Math.PI / 2;
        twig.rotation.y = BABYLON.Tools.ToRadians(seededRandom(i * 109) * 360);
        twig.material = materials.bark;
    }

    const pebbleCount = 48;

    for (let i = 0; i < pebbleCount; i++) {
        const x = -22 + seededRandom(i * 127) * 44;
        const z = -22 + seededRandom(i * 131) * 48;

        if (Math.abs(x) < 3.2 && z > -28 && z < 10) continue;
        if (Math.abs(x) < 10 && z > 9 && z < 26) continue;

        createBoulder(
            `midgardSmallPebble_${i}`,
            x,
            z,
            0.12 + seededRandom(i * 137) * 0.18,
            0.07 + seededRandom(i * 139) * 0.12,
            0.12 + seededRandom(i * 149) * 0.18,
            materials.rock,
            8000 + i
        );
    }
}

function chooseBestAnimation(groups, keywords) {
    const matches = groups.filter((group) => {
        const name = group.name.toLowerCase();
        return keywords.some((keyword) => name.includes(keyword));
    });

    if (matches.length === 0) return null;

    matches.sort((a, b) => {
        const aCount = a.targetedAnimations ? a.targetedAnimations.length : 0;
        const bCount = b.targetedAnimations ? b.targetedAnimations.length : 0;
        return bCount - aCount;
    });

    return matches[0];
}

function stopPlayerAnimations() {
    if (!player) return;

    [player.idleAnim, player.walkAnim, player.runAnim].forEach((anim) => {
        if (anim && anim.isPlaying) {
            anim.stop();
        }
    });
}

function playPlayerAnimation(name) {
    if (!player || player.currentAnim === name) return;

    stopPlayerAnimations();

    if (name === "idle" && player.idleAnim) {
        player.idleAnim.start(true, 1.0, player.idleAnim.from, player.idleAnim.to, false);
        player.currentAnim = "idle";
        return;
    }

    if (name === "walk" && player.walkAnim) {
        player.walkAnim.start(true, 0.95, player.walkAnim.from, player.walkAnim.to, false);
        player.currentAnim = "walk";
        return;
    }

    if (name === "run") {
        if (player.runAnim) {
            player.runAnim.start(true, 1.0, player.runAnim.from, player.runAnim.to, false);
            player.currentAnim = "run";
            return;
        }

        if (player.walkAnim) {
            player.walkAnim.start(true, 1.2, player.walkAnim.from, player.walkAnim.to, false);
            player.currentAnim = "run";
            return;
        }
    }

    if (player.idleAnim) {
        player.idleAnim.start(true, 1.0, player.idleAnim.from, player.idleAnim.to, false);
        player.currentAnim = "idle";
    }
}

function updatePlayerModelAnimation(isMoving, isSprinting) {
    if (!player || !player.modelLoaded) return;

    if (isMoving) {
        playPlayerAnimation(isSprinting ? "run" : "walk");
    } else {
        playPlayerAnimation("idle");
    }
}

function zeroOutPlayerRootMotion() {
    if (!player || !player.animationNodes) return;

    player.animationNodes.forEach((node) => {
        node.position.x = 0;
        node.position.z = 0;
    });
}

function loadSolusPlayerModel(playerRef) {
    BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "../../assets/",
        "Solus_the_knight.gltf",
        scene
    ).then((result) => {
        const importedRoot = result.meshes.find((mesh) => mesh.name === "__root__");

        if (importedRoot) {
            importedRoot.parent = playerRef.visualRoot;
            importedRoot.position = BABYLON.Vector3.Zero();
            importedRoot.rotation = BABYLON.Vector3.Zero();
            importedRoot.scaling = new BABYLON.Vector3(1, 1, 1);
        }

        result.meshes.forEach((mesh) => {
            if (mesh.name === "__root__") return;

            if (mesh.parent === null || mesh.parent.name === "__root__") {
                mesh.parent = playerRef.visualRoot;
            }

            mesh.isVisible = true;
            mesh.alwaysSelectAsActiveMesh = true;

            if (mesh instanceof BABYLON.Mesh) {
                mesh.receiveShadows = true;
            }
        });

        if (result.transformNodes && result.transformNodes.length > 0) {
            playerRef.animationNodes = result.transformNodes.filter((node) => node.name !== "__root__");
        }

        if (result.animationGroups && result.animationGroups.length > 0) {
            playerRef.idleAnim = chooseBestAnimation(result.animationGroups, ["idle"]);
            playerRef.walkAnim = chooseBestAnimation(result.animationGroups, ["walk", "move"]);
            playerRef.runAnim = chooseBestAnimation(result.animationGroups, ["run", "sprint"]);
        }

        playerRef.modelLoaded = true;
        playPlayerAnimation("idle");
    }).catch((error) => {
        console.warn("Failed to load Solus player model:", error);
    });
}

function createPlayer() {
    const root = new BABYLON.TransformNode("midgardPlayerRoot", scene);
    root.position = new BABYLON.Vector3(0, 0, -20);

    const visualRoot = new BABYLON.TransformNode("midgardPlayerVisualRoot", scene);
    visualRoot.parent = root;
    visualRoot.position = new BABYLON.Vector3(0, 0.03, 0);
    visualRoot.rotation = new BABYLON.Vector3(0, 0, 0);
    visualRoot.scaling = new BABYLON.Vector3(1.15, 1.15, 1.15);

    const playerData = {
        root,
        visualRoot,
        speed: 7,
        sprintSpeed: 10.8,
        verticalVelocity: 0,
        isGrounded: true,
        jumpPower: 7.5,
        gravity: 18,
        modelLoaded: false,
        animationNodes: [],
        idleAnim: null,
        walkAnim: null,
        runAnim: null,
        currentAnim: ""
    };

    loadSolusPlayerModel(playerData);

    return playerData;
}

function updatePlayer() {
    const delta = engine.getDeltaTime() / 1000;
    const forward = camera.getForwardRay().direction.clone();
    forward.y = 0;

    if (forward.lengthSquared() < 0.001) {
        forward.copyFromFloats(0, 0, 1);
    }

    forward.normalize();

    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
    const move = BABYLON.Vector3.Zero();

    if (keys.w) move.addInPlace(forward);
    if (keys.s) move.subtractInPlace(forward);
    if (keys.a) move.subtractInPlace(right);
    if (keys.d) move.addInPlace(right);

    const isMovingForAnimation = move.lengthSquared() > 0.001;
    const isSprintingForAnimation = isMovingForAnimation && keys.shift;

    if (keys.space && player.isGrounded) {
        player.verticalVelocity = player.jumpPower;
        player.isGrounded = false;
    }

    if (isMovingForAnimation) {
        move.normalize();

        const speed = isSprintingForAnimation ? player.sprintSpeed : player.speed;

        player.root.position.addInPlace(move.scale(speed * delta));
        player.root.rotation.y = Math.atan2(move.x, move.z);
    }

    const walkHeight = getWalkHeight(player.root.position.x, player.root.position.z);

    player.verticalVelocity -= player.gravity * delta;
    player.root.position.y += player.verticalVelocity * delta;

    if (player.root.position.y <= walkHeight) {
        player.root.position.y = walkHeight;
        player.verticalVelocity = 0;
        player.isGrounded = true;
    } else {
        player.isGrounded = false;
    }

    resolveCollisions();

    updatePlayerModelAnimation(isMovingForAnimation, isSprintingForAnimation);
    zeroOutPlayerRootMotion();

    player.root.position.x = BABYLON.Scalar.Clamp(player.root.position.x, -27, 27);
    player.root.position.z = BABYLON.Scalar.Clamp(player.root.position.z, -30, 32);
}

function updateCamera() {
    const target = player.root.position.add(new BABYLON.Vector3(0, camera.height, 0));
    const horizontalDistance = Math.cos(camera.pitch) * camera.distance;
    const verticalDistance = Math.sin(camera.pitch) * camera.distance;

    const desiredPosition = new BABYLON.Vector3(
        target.x - Math.sin(camera.yaw) * horizontalDistance,
        target.y + verticalDistance,
        target.z - Math.cos(camera.yaw) * horizontalDistance
    );

    const xLimit = 27.0;
    const zLimit = 29.0;
    const ellipse = (desiredPosition.x * desiredPosition.x) / (xLimit * xLimit) + (desiredPosition.z * desiredPosition.z) / (zLimit * zLimit);

    if (ellipse > 1) {
        const scale = 1 / Math.sqrt(ellipse);
        desiredPosition.x *= scale;
        desiredPosition.z *= scale;
    }

    camera.position = BABYLON.Vector3.Lerp(camera.position, desiredPosition, 0.14);
    camera.setTarget(target);
}

function updateDebugCamera() {
    const delta = engine.getDeltaTime() / 1000;
    const speed = keys.shift ? 22 : 10;

    camera.rotation.x = camera.pitch;
    camera.rotation.y = camera.yaw;

    const forward = camera.getForwardRay().direction.clone();
    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
    const move = BABYLON.Vector3.Zero();

    if (keys.w) move.addInPlace(forward);
    if (keys.s) move.subtractInPlace(forward);
    if (keys.a) move.subtractInPlace(right);
    if (keys.d) move.addInPlace(right);
    if (keys.e) move.y += 1;
    if (keys.q) move.y -= 1;

    if (move.lengthSquared() > 0.001) {
        move.normalize();
        camera.position.addInPlace(move.scale(speed * delta));
    }

    ui.prompt.text = "Debug camera enabled\nWASD = fly • Q = down • E = up • Shift = fast • N = exit";
    ui.prompt.isVisible = true;
}

function getWalkHeight(x, z) {
    const templeZ = z - 18;

    if (Math.abs(x) <= 6.3 && templeZ >= -8.0 && templeZ <= -5.4) {
        const stepProgress = BABYLON.Scalar.Clamp((templeZ + 8.0) / 2.6, 0, 1);
        return 0.08 + stepProgress * 0.48;
    }

    if (Math.abs(x) <= 7.5 && templeZ > -5.7 && templeZ <= 6.4) {
        return 0.55;
    }

    const portalDx = x;
    const portalDz = z - 21.1;

    if (Math.sqrt(portalDx * portalDx + portalDz * portalDz) < 3.4) {
        return 0.72;
    }

    return 0;
}

function updateInteraction() {
    interactTarget = null;
    let closest = 999;

    interactables.forEach((item) => {
        const distance = BABYLON.Vector3.Distance(player.root.position, item.position);

        if (distance < item.radius && distance < closest) {
            interactTarget = item;
            closest = distance;
        }
    });

    if (interactTarget) {
        ui.prompt.text = `Press E: ${interactTarget.label}`;
        ui.prompt.isVisible = true;
    } else if (!debugCameraEnabled) {
        ui.prompt.isVisible = false;
    }
}

function resolveCollisions() {
    blockers.forEach((blocker) => {
        const position = player.root.position;

        if (blocker.type === "circle") {
            const dx = position.x - blocker.x;
            const dz = position.z - blocker.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const minDistance = blocker.radius + 0.35;

            if (distance > 0.001 && distance < minDistance) {
                const push = (minDistance - distance) / distance;
                position.x += dx * push;
                position.z += dz * push;
            }
        }

        if (blocker.type === "box") {
            const withinX = position.x > blocker.x - blocker.width * 0.5 - 0.35 && position.x < blocker.x + blocker.width * 0.5 + 0.35;
            const withinZ = position.z > blocker.z - blocker.depth * 0.5 - 0.35 && position.z < blocker.z + blocker.depth * 0.5 + 0.35;

            if (withinX && withinZ) {
                const left = Math.abs(position.x - (blocker.x - blocker.width * 0.5));
                const right = Math.abs(position.x - (blocker.x + blocker.width * 0.5));
                const front = Math.abs(position.z - (blocker.z - blocker.depth * 0.5));
                const back = Math.abs(position.z - (blocker.z + blocker.depth * 0.5));
                const min = Math.min(left, right, front, back);

                if (min === left) position.x = blocker.x - blocker.width * 0.5 - 0.36;
                if (min === right) position.x = blocker.x + blocker.width * 0.5 + 0.36;
                if (min === front) position.z = blocker.z - blocker.depth * 0.5 - 0.36;
                if (min === back) position.z = blocker.z + blocker.depth * 0.5 + 0.36;
            }
        }
    });

    const xLimit = 25.3;
    const zLimit = 27.2;
    const x = player.root.position.x;
    const z = player.root.position.z;
    const ellipse = (x * x) / (xLimit * xLimit) + (z * z) / (zLimit * zLimit);

    if (ellipse > 1) {
        const scale = 1 / Math.sqrt(ellipse);
        player.root.position.x = x * scale;
        player.root.position.z = z * scale;
    }
}

function addCollisionCircle(x, z, radius) {
    blockers.push({ type: "circle", x, z, radius });
}

function addCollisionBox(x, z, width, depth) {
    blockers.push({ type: "box", x, z, width, depth });
}

function addInteractable(label, position, radius, action) {
    interactables.push({ label, position, radius, action });
}

function setMidgardSky() {
    const modelFile = "Skyboxes/Midgard/source/Midgard.glb";
    const textureFile = "Skyboxes/Midgard/textures/Midgard.png";

    const modelParts = modelFile.split("/");
    const sceneFile = encodeURIComponent(modelParts.pop());
    const modelPath = ASSET_ROOT + modelParts.map(part => encodeURIComponent(part)).join("/") + "/";
    const texturePath = ASSET_ROOT + textureFile.split("/").map(part => encodeURIComponent(part)).join("/");

    const skyRoot = new BABYLON.TransformNode("midgardSkyRoot", scene);

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, sceneFile, scene).then((result) => {
        const skyTexture = new BABYLON.Texture(texturePath, scene, false, true);

        const skyMat = new BABYLON.StandardMaterial("midgardSkyMat", scene);
        skyMat.backFaceCulling = false;
        skyMat.disableLighting = true;
        skyMat.fogEnabled = false;
        skyMat.diffuseTexture = skyTexture;
        skyMat.emissiveTexture = skyTexture;
        skyMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        skyMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        skyMat.specularColor = new BABYLON.Color3(0, 0, 0);

        result.meshes.forEach((mesh) => {
            mesh.parent = skyRoot;
            mesh.material = skyMat;
            mesh.isPickable = false;
            mesh.infiniteDistance = true;
            mesh.alwaysSelectAsActiveMesh = true;
            mesh.applyFog = false;
        });

        skyRoot.scaling = new BABYLON.Vector3(600, 600, 600);

        scene.onBeforeRenderObservable.add(() => {
            if (scene.activeCamera) {
                skyRoot.position.copyFrom(scene.activeCamera.position);
            }
        });
    }).catch((error) => {
        console.error("Midgard sky failed to load:", error);
    });
}

function makePbrMat(name, folder, fallbackHex = "#777777", tiling = 3, emissiveHex = null) {
    const basePath = ASSET_ROOT + "Textures/";
    const folderPath = basePath + folder.split("/").map(part => encodeURIComponent(part)).join("/") + "/";

    const texturePaths = {
        "Midgard/Grass": {
            albedo: "textures/albedo.png",
            normal: "textures/normal.png",
            roughness: "textures/roughness.png",
            ao: "textures/ao.png"
        },
        "Midgard/Dirt Path": {
            albedo: "textures/albedo.png",
            normal: "textures/normal.png",
            roughness: "textures/roughness.png",
            ao: "textures/ao.png"
        },
        "Midgard/Cliff Rock": {
            albedo: "textures/albedo.png",
            normal: "textures/normal.png",
            roughness: "textures/roughness.png",
            ao: "textures/ao.png"
        },
        "Midgard/Temple Stone": {
            albedo: "textures/albedo.png",
            normal: "textures/normal.png",
            roughness: "textures/roughness.png",
            ao: "textures/ao.png"
        },
        "Midgard/Cloth": {
            albedo: "textures/albedo.png",
            normal: "textures/normal.png",
            roughness: "textures/roughness.png",
            ao: "textures/ao.png"
        },
        "Midgard/Bark": {
            albedo: "albedo.png",
            normal: "normal.png",
            roughness: "roughness.png",
            ao: "ao.png"
        },
        "Midgard/Moss": {
            albedo: "albedo.png",
            normal: "normal.png",
            roughness: "roughness.png",
            ao: "ao.png"
        }
    };

    const mat = new BABYLON.PBRMaterial(name, scene);
    mat.albedoColor = BABYLON.Color3.FromHexString(fallbackHex);
    mat.metallic = 0;
    mat.roughness = 0.88;
    mat.environmentIntensity = 0.35;

    const paths = texturePaths[folder];

    const loadTexture = (type, apply) => {
        if (!paths || !paths[type]) return;

        const texturePath = folderPath + paths[type].split("/").map(part => encodeURIComponent(part)).join("/");

        const texture = new BABYLON.Texture(
            texturePath,
            scene,
            false,
            true,
            BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
            () => {
                texture.uScale = tiling;
                texture.vScale = tiling;
                apply(texture);
            },
            () => {
                console.warn("Texture missing:", texturePath);
            }
        );
    };

    loadTexture("albedo", (texture) => {
        mat.albedoTexture = texture;
    });

    loadTexture("normal", (texture) => {
        mat.bumpTexture = texture;
    });

    loadTexture("roughness", (texture) => {
        mat.metallicTexture = texture;
        mat.useMetallicFromMetallicTextureBlue = false;
        mat.useRoughnessFromMetallicTextureGreen = true;
        mat.useAmbientOcclusionFromMetallicTextureRed = false;
    });

    loadTexture("ao", (texture) => {
        mat.ambientTexture = texture;
    });

    if (emissiveHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex);
        mat.emissiveIntensity = 0.65;
    }

    return mat;
}

function makeMat(name, baseHex, darkHex, emissiveHex = null) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(baseHex);
    mat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);

    if (emissiveHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.55);
    } else {
        mat.emissiveColor = BABYLON.Color3.FromHexString(darkHex).scale(0.12);
    }

    return mat;
}

function createCliffShard(name, x, z, width, height, depth, mat, seed) {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron(name, {
        type: 2,
        size: 1
    }, scene);

    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (seededRandom(seed + i + 1) - 0.5) * 0.28;
        positions[i + 1] += (seededRandom(seed + i + 2) - 0.5) * 0.18;
        positions[i + 2] += (seededRandom(seed + i + 3) - 0.5) * 0.28;
    }

    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    mesh.convertToFlatShadedMesh();

    mesh.position = new BABYLON.Vector3(x, height * 0.5 - 0.05, z);
    mesh.scaling = new BABYLON.Vector3(width, height, depth);
    mesh.rotation.x = BABYLON.Tools.ToRadians(seededRandom(seed + 10) * 10 - 5);
    mesh.rotation.y = BABYLON.Tools.ToRadians(seededRandom(seed + 20) * 360);
    mesh.rotation.z = BABYLON.Tools.ToRadians(seededRandom(seed + 30) * 10 - 5);
    mesh.material = mat;

    return mesh;
}

function createBoulder(name, x, z, width, height, depth, mat, seed) {
    const rock = BABYLON.MeshBuilder.CreateIcoSphere(name, {
        radius: 1,
        subdivisions: 1
    }, scene);

    const positions = rock.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (seededRandom(seed + i + 1) - 0.5) * 0.08;
        positions[i + 1] += (seededRandom(seed + i + 2) - 0.5) * 0.06;
        positions[i + 2] += (seededRandom(seed + i + 3) - 0.5) * 0.08;
    }

    rock.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    rock.convertToFlatShadedMesh();
    rock.position = new BABYLON.Vector3(x, height * 0.5 - 0.05, z);
    rock.scaling = new BABYLON.Vector3(width, height, depth);
    rock.rotation.x = BABYLON.Tools.ToRadians(seededRandom(seed + 10) * 10 - 5);
    rock.rotation.y = BABYLON.Tools.ToRadians(seededRandom(seed + 20) * 360);
    rock.rotation.z = BABYLON.Tools.ToRadians(seededRandom(seed + 30) * 8 - 4);
    rock.material = mat;

    return rock;
}

function seededRandom(seed) {
    return Math.abs(Math.sin(seed * 91.17) * 10000) % 1;
}

function getObjectiveText() {
    return "Objective: Follow the road through Midgard, enter the stone temple, and activate the Yggdrasil portal.";
}

function createUI() {
    const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("scene5RealmUI", true, scene);

    const prompt = new BABYLON.GUI.TextBlock();
    prompt.text = "";
    prompt.color = "#fef3c7";
    prompt.fontSize = 16;
    prompt.fontWeight = "bold";
    prompt.height = "95px";
    prompt.width = "820px";
    prompt.textWrapping = true;
    prompt.isVisible = false;
    prompt.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    prompt.top = "-126px";
    gui.addControl(prompt);

    const objective = new BABYLON.GUI.TextBlock();
    objective.text = getObjectiveText();
    objective.color = "#dbeafe";
    objective.fontSize = 14;
    objective.height = "42px";
    objective.width = "850px";
    objective.textWrapping = true;
    objective.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    objective.top = "-72px";
    gui.addControl(objective);

    const controls = new BABYLON.GUI.TextBlock();
    controls.text = "WASD = move • Space = jump • E = interact • Shift = sprint • N = debug camera";
    controls.color = "#67e8f9";
    controls.fontSize = 13;
    controls.height = "28px";
    controls.width = "850px";
    controls.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    controls.top = "-32px";
    gui.addControl(controls);

    return {
        gui,
        prompt,
        objective,
        controls
    };
}

scene = createMidgardScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
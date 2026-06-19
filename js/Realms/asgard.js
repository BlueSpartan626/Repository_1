//Scene 5 - Asgard Remnants

//Standalone BabylonJS realm scene for the Scene 5 realm-switching demo.
//The player enters the broken remains of Asgard from the Yggdrasil hub, explores a collapsed floating platform, retrieves the shard of Mjolnir, and returns to Yggdrasil.
//This script includes third-person movement, jumping, debug camera movement, collision, a temporary return portal, localStorage progression, floating debris, ruined architecture, and a small interactive narrative route.

const asgardSetup = setupEngineAndCanvas();
const canvas = asgardSetup.canvas;
const engine = asgardSetup.engine;

let scene = null;
let camera = null;
let player = null;
let ui = null;
let keys = {};
let blockers = [];
let interactables = [];
let interactTarget = null;
let interactLocked = false;
let debugCameraEnabled = false;
let skyModelRoot = null;
let shardMesh = null;
let portalCore = null;
let returnPortalRoot = null;

const progress = {
    hasShard: localStorage.getItem("scene5HasMjolnirShard") === "true"
};

function createAsgardScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.015, 0.014, 0.026, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.08, 0.075, 0.105);
    scene.fogDensity = 0.0045;

    camera = new BABYLON.FreeCamera("asgardCamera", new BABYLON.Vector3(0, 4.5, -11), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.05;
    camera.maxZ = 1000;
    camera.yaw = 0;
    camera.pitch = BABYLON.Tools.ToRadians(22);
    camera.distance = 8.7;
    camera.height = 2.15;

    const hemi = new BABYLON.HemisphericLight("asgardHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.48;
    hemi.diffuse = new BABYLON.Color3(0.78, 0.76, 1);
    hemi.groundColor = new BABYLON.Color3(0.08, 0.055, 0.09);

    const portalLight = new BABYLON.PointLight("asgardPortalLight", new BABYLON.Vector3(0, 3.5, -13.5), scene);
    portalLight.intensity = 2.7;
    portalLight.range = 18;
    portalLight.diffuse = new BABYLON.Color3(0.36, 0.42, 1);

    const shardLight = new BABYLON.PointLight("asgardShardLight", new BABYLON.Vector3(0, 2.2, 13.4), scene);
    shardLight.intensity = progress.hasShard ? 0.35 : 2.5;
    shardLight.range = 14;
    shardLight.diffuse = new BABYLON.Color3(0.55, 0.95, 1);

    const throneLight = new BABYLON.PointLight("asgardThroneLight", new BABYLON.Vector3(0, 5.5, 16), scene);
    throneLight.intensity = 1.45;
    throneLight.range = 18;
    throneLight.diffuse = new BABYLON.Color3(1, 0.78, 0.38);

    setAsgardSky();

    const materials = createMaterials();

    ui = createUI();
    player = createPlayer(materials);

    buildAsgardWorld(materials);
    setupInput();

    scene.onBeforeRenderObservable.add(() => {
        updatePlayer();
        updateCamera();
        updateInteractables();
        updateAnimatedObjects();
    });

    return scene;
}

function createMaterials() {
    return {
        platform: makePbrMat("asgardPlatformStone", "Midgard/Temple Stone", "#797a75", 2.8),
        darkPlatform: makePbrMat("asgardDarkStone", "Midgard/Temple Stone", "#34363a", 3.2),
        paleStone: makePbrMat("asgardPaleStone", "Midgard/Temple Stone", "#9a978b", 2.2),
        crackedStone: makePbrMat("asgardCrackedStone", "Midgard/Cliff Rock", "#545a5d", 3.8),
        gold: makeMat("asgardOldGold", "#b58a2a", "#3f2b0b", "#a66f14"),
        dimGold: makeMat("asgardDimGold", "#71551d", "#1d1305"),
        bark: makePbrMat("asgardBark", "Midgard/Bark", "#3a2214", 2.4),
        cloth: makePbrMat("asgardCloth", "Midgard/Cloth", "#513047", 1.6),
        runeBlue: makeMat("asgardRuneBlue", "#8ea4ff", "#4f46e5", "#818cf8"),
        runeCyan: makeMat("asgardRuneCyan", "#67e8f9", "#0891b2", "#22d3ee"),
        runeGold: makeMat("asgardRuneGold", "#facc15", "#a16207", "#f59e0b"),
        shard: makeMat("asgardMjolnirShard", "#dffaff", "#67e8f9", "#67e8f9"),
        portal: makeMat("asgardPortal", "#7c83ff", "#312e81", "#818cf8"),
        black: makeMat("asgardBlack", "#020204", "#000000"),
        shadow: makeMat("asgardShadow", "#090814", "#03030a"),
        player: makeMat("asgardPlayerBlack", "#020202", "#000000"),
        playerEye: makeMat("asgardPlayerEye", "#67e8f9", "#22d3ee", "#67e8f9")
    };
}

function buildAsgardWorld(materials) {
    createMainIsland(materials);
    createArrivalPortal(materials);
    createBrokenBridge(materials);
    createThronePlatform(materials);
    createMjolnirShard(materials);
    createCollapsedPalace(materials);
    createFloatingDebris(materials);
    createAsgardRunes(materials);
    createFallenBanners(materials);
    createAmbientParticles(materials);
}

function createMainIsland(materials) {
    const island = BABYLON.MeshBuilder.CreateCylinder("asgardMainIsland", {
        diameter: 34,
        height: 1.0,
        tessellation: 96
    }, scene);

    island.position.y = -0.52;
    island.scaling.z = 1.15;
    island.material = materials.darkPlatform;

    const floor = BABYLON.MeshBuilder.CreateCylinder("asgardMainFloor", {
        diameter: 30.5,
        height: 0.22,
        tessellation: 96
    }, scene);

    floor.position.y = 0.03;
    floor.scaling.z = 1.08;
    floor.material = materials.platform;

    for (let i = 0; i < 32; i++) {
        const angle = (Math.PI * 2 / 32) * i;
        const radius = 16.2 + seededRandom(i * 41) * 1.7;

        const edgeRock = BABYLON.MeshBuilder.CreatePolyhedron(`asgardEdgeRock_${i}`, {
            type: 2,
            size: 1
        }, scene);

        edgeRock.position = new BABYLON.Vector3(
            Math.sin(angle) * radius,
            0.25 + seededRandom(i * 43) * 0.55,
            Math.cos(angle) * radius * 1.1
        );

        edgeRock.scaling = new BABYLON.Vector3(
            0.85 + seededRandom(i * 47) * 1.6,
            0.45 + seededRandom(i * 53) * 1.1,
            0.75 + seededRandom(i * 59) * 1.4
        );

        edgeRock.rotation.x = seededRandom(i * 61) * Math.PI;
        edgeRock.rotation.y = seededRandom(i * 67) * Math.PI;
        edgeRock.material = i % 2 === 0 ? materials.crackedStone : materials.darkPlatform;
        edgeRock.convertToFlatShadedMesh();
    }
}

function createArrivalPortal(materials) {
    returnPortalRoot = new BABYLON.TransformNode("asgardReturnPortalRoot", scene);
    returnPortalRoot.position = new BABYLON.Vector3(0, 0, -13.2);

    const platform = BABYLON.MeshBuilder.CreateCylinder("asgardPortalPlatform", {
        diameter: 5.4,
        height: 0.35,
        tessellation: 64
    }, scene);

    platform.position = new BABYLON.Vector3(0, 0.22, 0);
    platform.material = materials.darkPlatform;
    platform.parent = returnPortalRoot;

    const brokenLeft = BABYLON.MeshBuilder.CreateBox("asgardPortalBrokenLeft", {
        width: 0.55,
        height: 4.2,
        depth: 0.55
    }, scene);

    brokenLeft.position = new BABYLON.Vector3(-2.15, 2.45, 0);
    brokenLeft.rotation.z = BABYLON.Tools.ToRadians(-7);
    brokenLeft.material = materials.paleStone;
    brokenLeft.parent = returnPortalRoot;

    const brokenRight = BABYLON.MeshBuilder.CreateBox("asgardPortalBrokenRight", {
        width: 0.55,
        height: 3.4,
        depth: 0.55
    }, scene);

    brokenRight.position = new BABYLON.Vector3(2.15, 2.05, 0);
    brokenRight.rotation.z = BABYLON.Tools.ToRadians(8);
    brokenRight.material = materials.paleStone;
    brokenRight.parent = returnPortalRoot;

    const brokenTop = BABYLON.MeshBuilder.CreateBox("asgardPortalBrokenTop", {
        width: 4.4,
        height: 0.42,
        depth: 0.55
    }, scene);

    brokenTop.position = new BABYLON.Vector3(0, 4.55, 0);
    brokenTop.rotation.z = BABYLON.Tools.ToRadians(-4);
    brokenTop.material = materials.darkPlatform;
    brokenTop.parent = returnPortalRoot;

    const outerRing = BABYLON.MeshBuilder.CreateTorus("asgardReturnPortalOuterRing", {
        diameter: 3.1,
        thickness: 0.075,
        tessellation: 96
    }, scene);

    outerRing.position = new BABYLON.Vector3(0, 2.55, -0.18);
    outerRing.material = materials.portal;
    outerRing.parent = returnPortalRoot;

    const innerRing = BABYLON.MeshBuilder.CreateTorus("asgardReturnPortalInnerRing", {
        diameter: 2.1,
        thickness: 0.045,
        tessellation: 96
    }, scene);

    innerRing.position = new BABYLON.Vector3(0, 2.55, -0.22);
    innerRing.rotation.z = Math.PI / 5;
    innerRing.material = materials.runeCyan;
    innerRing.parent = returnPortalRoot;

    portalCore = BABYLON.MeshBuilder.CreateSphere("asgardReturnPortalCore", {
        diameter: 1.05,
        segments: 32
    }, scene);

    portalCore.position = new BABYLON.Vector3(0, 2.55, -0.28);
    portalCore.material = materials.portal;
    portalCore.parent = returnPortalRoot;

    for (let i = 0; i < 18; i++) {
        const shard = BABYLON.MeshBuilder.CreatePolyhedron(`asgardPortalStoneShard_${i}`, {
            type: 2,
            size: 1
        }, scene);

        const angle = (Math.PI * 2 / 18) * i;
        shard.position = new BABYLON.Vector3(Math.sin(angle) * (2.2 + (i % 3) * 0.18), 2.55 + Math.cos(angle * 1.4) * 1.1, Math.cos(angle) * 0.45);
        shard.scaling = new BABYLON.Vector3(0.14 + (i % 3) * 0.1, 0.12 + (i % 4) * 0.08, 0.12 + (i % 2) * 0.08);
        shard.rotation.y = angle;
        shard.material = i % 2 === 0 ? materials.paleStone : materials.darkPlatform;
        shard.parent = returnPortalRoot;
        shard.convertToFlatShadedMesh();
    }

    addCollisionCircle(-2.15, -13.2, 0.55);
    addCollisionCircle(2.15, -13.2, 0.55);
    addCollisionCircle(0, -13.2, 1.2);

    addInteractable(getPortalText(), new BABYLON.Vector3(0, 0, -10.8), 3.0, () => {
        if (progress.hasShard) {
            localStorage.setItem("scene5HasMjolnirShard", "true");
        }

        window.location.href = "yggdrasil.html";
    });
}

function getPortalText() {
    if (progress.hasShard) {
        return "Yggdrasil Bridge: The shard is yours.\nPress E to return before the bridge collapses.";
    }

    return "Yggdrasil Bridge: The unstable portal back to the hub still holds.\nFind the shard before returning.";
}

function createBrokenBridge(materials) {
    const pathPieces = [
        [0, -8.4, 3.2, 0.18, 1.45, 0],
        [0.45, -5.7, 2.8, 0.16, 1.3, 5],
        [-0.35, -3.1, 2.6, 0.15, 1.2, -8],
        [0.25, -0.8, 2.35, 0.14, 1.1, 4],
        [-0.15, 1.55, 2.25, 0.14, 1.0, -4],
        [0.2, 4.0, 2.1, 0.13, 1.0, 7],
        [-0.1, 6.6, 2.0, 0.13, 0.95, -6]
    ];

    pathPieces.forEach((piece, index) => {
        const slab = BABYLON.MeshBuilder.CreateBox(`asgardBrokenBridgeSlab_${index}`, {
            width: piece[2],
            height: piece[3],
            depth: piece[4]
        }, scene);

        slab.position = new BABYLON.Vector3(piece[0], 0.2, piece[1]);
        slab.rotation.y = BABYLON.Tools.ToRadians(piece[5]);
        slab.material = index % 2 === 0 ? materials.platform : materials.paleStone;
    });

    for (let i = 0; i < 18; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = -7.8 + Math.floor(i / 2) * 1.6;
        const rail = BABYLON.MeshBuilder.CreateCylinder(`asgardBrokenRail_${i}`, {
            diameter: 0.09,
            height: 1.2 + seededRandom(i * 14) * 0.55,
            tessellation: 10
        }, scene);

        rail.position = new BABYLON.Vector3(side * (1.35 + seededRandom(i * 17) * 0.2), 0.65, z);
        rail.rotation.z = BABYLON.Tools.ToRadians(side * (8 + seededRandom(i * 21) * 12));
        rail.material = materials.gold;
    }
}

function createThronePlatform(materials) {
    const base = BABYLON.MeshBuilder.CreateBox("asgardThronePlatformBase", {
        width: 11.2,
        height: 0.55,
        depth: 8.8
    }, scene);

    base.position = new BABYLON.Vector3(0, 0.32, 12.7);
    base.material = materials.darkPlatform;

    const top = BABYLON.MeshBuilder.CreateBox("asgardThronePlatformTop", {
        width: 9.4,
        height: 0.25,
        depth: 7.0
    }, scene);

    top.position = new BABYLON.Vector3(0, 0.78, 12.7);
    top.material = materials.platform;

    const steps = [
        [0, 8.0, 8.8, 0.2, 0.7],
        [0, 8.65, 9.4, 0.2, 0.7],
        [0, 9.3, 10.0, 0.2, 0.7]
    ];

    steps.forEach((step, index) => {
        const stair = BABYLON.MeshBuilder.CreateBox(`asgardThroneStep_${index}`, {
            width: step[2],
            height: step[3],
            depth: step[4]
        }, scene);

        stair.position = new BABYLON.Vector3(step[0], 0.14 + index * 0.18, step[1]);
        stair.material = index % 2 === 0 ? materials.paleStone : materials.platform;
    });

    const throneBack = BABYLON.MeshBuilder.CreateBox("asgardBrokenThroneBack", {
        width: 3.4,
        height: 4.5,
        depth: 0.5
    }, scene);

    throneBack.position = new BABYLON.Vector3(0, 3.05, 15.5);
    throneBack.material = materials.darkPlatform;

    const throneSeat = BABYLON.MeshBuilder.CreateBox("asgardBrokenThroneSeat", {
        width: 3.2,
        height: 0.55,
        depth: 2.0
    }, scene);

    throneSeat.position = new BABYLON.Vector3(0, 1.08, 14.55);
    throneSeat.material = materials.paleStone;

    const leftArm = BABYLON.MeshBuilder.CreateBox("asgardThroneLeftArm", {
        width: 0.55,
        height: 1.0,
        depth: 2.2
    }, scene);

    leftArm.position = new BABYLON.Vector3(-1.95, 1.35, 14.55);
    leftArm.material = materials.darkPlatform;

    const rightArm = BABYLON.MeshBuilder.CreateBox("asgardThroneRightArm", {
        width: 0.55,
        height: 0.7,
        depth: 1.6
    }, scene);

    rightArm.position = new BABYLON.Vector3(1.95, 1.18, 14.3);
    rightArm.rotation.z = BABYLON.Tools.ToRadians(8);
    rightArm.material = materials.darkPlatform;

    for (let i = 0; i < 8; i++) {
        const angle = BABYLON.Tools.ToRadians(45 * i);
        const pillar = BABYLON.MeshBuilder.CreateCylinder(`asgardThronePillar_${i}`, {
            diameter: 0.42,
            height: 2.3 + (i % 3) * 0.45,
            tessellation: 18
        }, scene);

        pillar.position = new BABYLON.Vector3(Math.sin(angle) * 5.0, 1.6, 12.7 + Math.cos(angle) * 3.5);
        pillar.material = i % 2 === 0 ? materials.paleStone : materials.darkPlatform;

        const cap = BABYLON.MeshBuilder.CreateCylinder(`asgardThronePillarCap_${i}`, {
            diameter: 0.62,
            height: 0.16,
            tessellation: 18
        }, scene);

        cap.position = new BABYLON.Vector3(pillar.position.x, pillar.position.y + 1.22 + (i % 3) * 0.22, pillar.position.z);
        cap.material = materials.gold;

        addCollisionCircle(pillar.position.x, pillar.position.z, 0.45);
    }

    addCollisionBox(0, 14.7, 4.4, 2.4);
    addCollisionBox(-5.5, 12.7, 0.6, 8.8);
    addCollisionBox(5.5, 12.7, 0.6, 8.8);
}

function createMjolnirShard(materials) {
    if (progress.hasShard) {
        const emptyGlow = BABYLON.MeshBuilder.CreateTorus("asgardEmptyShardGlow", {
            diameter: 1.5,
            thickness: 0.035,
            tessellation: 64
        }, scene);

        emptyGlow.position = new BABYLON.Vector3(0, 1.35, 12.1);
        emptyGlow.rotation.x = Math.PI / 2;
        emptyGlow.material = materials.runeCyan;

        addInteractable("Mjolnir Shard Pedestal: The shard has already been recovered.\nReturn to Yggdrasil.", new BABYLON.Vector3(0, 0, 12.1), 2.4, () => {});
        return;
    }

    const pedestal = BABYLON.MeshBuilder.CreateCylinder("asgardShardPedestal", {
        diameter: 1.4,
        height: 0.7,
        tessellation: 36
    }, scene);

    pedestal.position = new BABYLON.Vector3(0, 1.1, 12.1);
    pedestal.material = materials.darkPlatform;

    const ring = BABYLON.MeshBuilder.CreateTorus("asgardShardPedestalRing", {
        diameter: 1.75,
        thickness: 0.045,
        tessellation: 64
    }, scene);

    ring.position = new BABYLON.Vector3(0, 1.5, 12.1);
    ring.rotation.x = Math.PI / 2;
    ring.material = materials.runeCyan;

    shardMesh = BABYLON.MeshBuilder.CreatePolyhedron("asgardMjolnirShard", {
        type: 2,
        size: 1
    }, scene);

    shardMesh.position = new BABYLON.Vector3(0, 1.86, 12.1);
    shardMesh.scaling = new BABYLON.Vector3(0.18, 0.42, 0.14);
    shardMesh.rotation.y = BABYLON.Tools.ToRadians(28);
    shardMesh.material = materials.shard;
    shardMesh.convertToFlatShadedMesh();

    for (let i = 0; i < 4; i++) {
        const arc = BABYLON.MeshBuilder.CreateTorus(`asgardShardEnergyArc_${i}`, {
            diameter: 1.4 + i * 0.32,
            thickness: 0.02,
            tessellation: 72,
            arc: 0.45
        }, scene);

        arc.position = new BABYLON.Vector3(0, 2.05, 12.1);
        arc.rotation.x = BABYLON.Tools.ToRadians(55 + i * 12);
        arc.rotation.y = BABYLON.Tools.ToRadians(i * 55);
        arc.material = i % 2 === 0 ? materials.runeCyan : materials.runeBlue;
    }

    addCollisionCircle(0, 12.1, 1.1);

    addInteractable("Shard of Mjolnir: A broken fragment of Thor's hammer.\nPress E to take it.", new BABYLON.Vector3(0, 0, 12.1), 2.5, () => {
        localStorage.setItem("scene5HasMjolnirShard", "true");
        progress.hasShard = true;

        if (shardMesh) {
            shardMesh.dispose();
            shardMesh = null;
        }

        ui.prompt.text = "The shard is yours. Return to Yggdrasil before the bridge collapses.";
        ui.prompt.isVisible = true;
        ui.objective.text = getObjectiveText();
    });
}

function createCollapsedPalace(materials) {
    const wallPieces = [
        [-7.2, 11.7, 0.5, 3.2, 3.0, -8],
        [7.2, 11.9, 0.5, 2.6, 3.0, 7],
        [-5.8, 16.5, 3.2, 2.2, 0.5, 5],
        [5.6, 16.3, 3.1, 1.6, 0.5, -6],
        [-8.5, 5.2, 3.1, 1.1, 0.45, 20],
        [8.4, 4.6, 3.0, 0.9, 0.45, -18]
    ];

    wallPieces.forEach((piece, index) => {
        const wall = BABYLON.MeshBuilder.CreateBox(`asgardCollapsedWall_${index}`, {
            width: piece[2],
            height: piece[3],
            depth: piece[4]
        }, scene);

        wall.position = new BABYLON.Vector3(piece[0], piece[3] * 0.5, piece[1]);
        wall.rotation.y = BABYLON.Tools.ToRadians(piece[5]);
        wall.material = index % 2 === 0 ? materials.paleStone : materials.darkPlatform;

        addCollisionCircle(piece[0], piece[1], Math.max(piece[2], piece[4]) * 0.55);
    });

    for (let i = 0; i < 34; i++) {
        const angle = seededRandom(i * 11) * Math.PI * 2;
        const radius = 4 + seededRandom(i * 13) * 11;

        const rubble = BABYLON.MeshBuilder.CreatePolyhedron(`asgardRubble_${i}`, {
            type: 2,
            size: 1
        }, scene);

        rubble.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.18, 2 + Math.cos(angle) * radius);
        rubble.scaling = new BABYLON.Vector3(
            0.2 + seededRandom(i * 17) * 0.65,
            0.14 + seededRandom(i * 19) * 0.38,
            0.18 + seededRandom(i * 23) * 0.6
        );

        rubble.rotation.x = seededRandom(i * 29) * Math.PI;
        rubble.rotation.y = seededRandom(i * 31) * Math.PI;
        rubble.material = i % 3 === 0 ? materials.darkPlatform : materials.crackedStone;
        rubble.convertToFlatShadedMesh();

        if (i % 5 === 0) {
            addCollisionCircle(rubble.position.x, rubble.position.z, 0.35);
        }
    }
}

function createFloatingDebris(materials) {
    for (let i = 0; i < 42; i++) {
        const angle = seededRandom(i * 71) * Math.PI * 2;
        const radius = 10 + seededRandom(i * 73) * 19;

        const debris = BABYLON.MeshBuilder.CreatePolyhedron(`asgardFloatingDebris_${i}`, {
            type: 2,
            size: 1
        }, scene);

        debris.position = new BABYLON.Vector3(Math.sin(angle) * radius, 2.5 + seededRandom(i * 79) * 7.5, Math.cos(angle) * radius);
        debris.scaling = new BABYLON.Vector3(
            0.22 + seededRandom(i * 83) * 0.9,
            0.15 + seededRandom(i * 89) * 0.6,
            0.2 + seededRandom(i * 97) * 0.9
        );

        debris.rotation.x = seededRandom(i * 101) * Math.PI;
        debris.rotation.y = seededRandom(i * 103) * Math.PI;
        debris.rotation.z = seededRandom(i * 107) * Math.PI;
        debris.material = i % 2 === 0 ? materials.paleStone : materials.crackedStone;
        debris.convertToFlatShadedMesh();

        debris.metadata = {
            baseY: debris.position.y,
            speed: 0.24 + seededRandom(i * 109) * 0.5,
            offset: seededRandom(i * 113) * Math.PI * 2
        };
    }
}

function createAsgardRunes(materials) {
    const runeData = [
        ["ᚨ", 0, -7.6, 1.1, "#818cf8"],
        ["ᛊ", -2.6, -3.6, 0.8, "#67e8f9"],
        ["ᚷ", 2.6, -3.2, 0.8, "#facc15"],
        ["ᚱ", -3.7, 6.2, 0.9, "#818cf8"],
        ["ᛞ", 3.5, 6.6, 0.9, "#67e8f9"],
        ["ᛏ", -4.2, 13.6, 0.8, "#facc15"],
        ["ᛗ", 4.2, 13.4, 0.8, "#67e8f9"]
    ];

    runeData.forEach((data, index) => {
        createGroundRune(`asgardGroundRune_${index}`, data[0], data[1], data[2], data[3], data[4], BABYLON.Tools.ToRadians(index * 26));
    });
}

function createGroundRune(name, text, x, z, size, colour, rotation) {
    const texture = new BABYLON.DynamicTexture(`${name}Texture`, {
        width: 512,
        height: 256
    }, scene, true);

    texture.hasAlpha = true;

    const context = texture.getContext();
    context.clearRect(0, 0, 512, 256);
    context.font = "bold 96px serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = colour;
    context.shadowColor = colour;
    context.shadowBlur = 18;
    context.fillText(text, 256, 128);
    texture.update();

    const mat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
    mat.diffuseTexture = texture;
    mat.emissiveTexture = texture;
    mat.opacityTexture = texture;
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.specularColor = new BABYLON.Color3(0, 0, 0);

    const plane = BABYLON.MeshBuilder.CreatePlane(name, {
        width: size,
        height: size * 0.45
    }, scene);

    plane.position = new BABYLON.Vector3(x, 0.18, z);
    plane.rotation.x = Math.PI / 2;
    plane.rotation.z = rotation;
    plane.material = mat;
    plane.isPickable = false;
}

function createFallenBanners(materials) {
    const banners = [
        [-6.8, 8.2, 18],
        [6.9, 7.5, -16],
        [-8.6, 15.2, -8],
        [8.2, 14.6, 9]
    ];

    banners.forEach((banner, index) => {
        const pole = BABYLON.MeshBuilder.CreateCylinder(`asgardBannerPole_${index}`, {
            diameter: 0.08,
            height: 2.6,
            tessellation: 10
        }, scene);

        pole.position = new BABYLON.Vector3(banner[0], 0.42, banner[1]);
        pole.rotation.z = Math.PI / 2;
        pole.rotation.y = BABYLON.Tools.ToRadians(banner[2]);
        pole.material = materials.bark;

        const cloth = BABYLON.MeshBuilder.CreateBox(`asgardBannerCloth_${index}`, {
            width: 0.05,
            height: 1.05,
            depth: 0.62
        }, scene);

        cloth.position = new BABYLON.Vector3(banner[0] + 0.25, 0.2, banner[1] + 0.12);
        cloth.rotation.y = BABYLON.Tools.ToRadians(banner[2]);
        cloth.material = materials.cloth;
    });
}

function createAmbientParticles(materials) {
    for (let i = 0; i < 100; i++) {
        const particle = BABYLON.MeshBuilder.CreateSphere(`asgardAmbientParticle_${i}`, {
            diameter: 0.035 + seededRandom(i * 7) * 0.05,
            segments: 8
        }, scene);

        const angle = seededRandom(i * 11) * Math.PI * 2;
        const radius = seededRandom(i * 13) * 18;
        particle.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.9 + seededRandom(i * 17) * 7.5, Math.cos(angle) * radius);
        particle.material = i % 4 === 0 ? materials.runeGold : materials.runeCyan;
        particle.metadata = {
            angle,
            radius,
            baseY: particle.position.y,
            speed: 0.13 + seededRandom(i * 19) * 0.3,
            offset: seededRandom(i * 23) * Math.PI * 2
        };
    }
}

function getScene5PlayerSpawn() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("yggdrasil")) {
        return new BABYLON.Vector3(0, 0, -8.5);
    }

    if (path.includes("asgard")) {
        return new BABYLON.Vector3(0, 0, -9.2);
    }

    if (path.includes("muspelheim")) {
        return new BABYLON.Vector3(0, 0, -9.2);
    }

    if (path.includes("midgard")) {
        return new BABYLON.Vector3(0, 0, -8.5);
    }

    return new BABYLON.Vector3(0, 0, -8.5);
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

function createPlayer(materials) {
    const root = new BABYLON.TransformNode("scene5PlayerRoot", scene);
    root.position = getScene5PlayerSpawn();

    const visualRoot = new BABYLON.TransformNode("scene5PlayerVisualRoot", scene);
    visualRoot.parent = root;
    visualRoot.position = new BABYLON.Vector3(0, 0.03, 0);
    visualRoot.rotation = new BABYLON.Vector3(0, 0, 0);
    visualRoot.scaling = new BABYLON.Vector3(1.15, 1.15, 1.15);

    const playerData = {
        root,
        visualRoot,
        velocity: new BABYLON.Vector3(0, 0, 0),
        grounded: true,
        speed: 7.4,
        sprintSpeed: 11.2,
        jumpPower: 8.8,
        gravity: 24,
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

function updatePlayer() {
    const delta = engine.getDeltaTime() / 1000;

    if (debugCameraEnabled) {
        updateDebugCamera(delta);
        return;
    }

    const forward = camera.getForwardRay().direction.clone();
    forward.y = 0;

    if (forward.lengthSquared() < 0.001) {
        forward.copyFromFloats(0, 0, 1);
    }

    forward.normalize();

    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();

    const movement = BABYLON.Vector3.Zero();

    if (keys.w) movement.addInPlace(forward);
    if (keys.s) movement.subtractInPlace(forward);
    if (keys.d) movement.addInPlace(right);
    if (keys.a) movement.subtractInPlace(right);

    if (movement.lengthSquared() > 0.001) {
        movement.normalize();
        const speed = keys.shift ? player.sprintSpeed : player.speed;

        player.root.position.x += movement.x * speed * delta;
        player.root.position.z += movement.z * speed * delta;

        const targetYaw = Math.atan2(movement.x, movement.z);
        player.root.rotation.y = BABYLON.Scalar.LerpAngle(player.root.rotation.y, targetYaw, 0.22);
    }

    if (keys.space && player.grounded) {
        player.velocity.y = player.jumpPower;
        player.grounded = false;
    }

    player.velocity.y -= player.gravity * delta;
    player.root.position.y += player.velocity.y * delta;

    const groundHeight = getWalkHeight(player.root.position.x, player.root.position.z);

    if (player.root.position.y <= groundHeight) {
        player.root.position.y = groundHeight;
        player.velocity.y = 0;
        player.grounded = true;
    }

    resolveCollisions();

    const isMovingForAnimation = movement.lengthSquared() > 0.001;
    updatePlayerModelAnimation(isMovingForAnimation, isMovingForAnimation && keys.shift);
    zeroOutPlayerRootMotion();
}

function updateDebugCamera(delta) {
    const forward = camera.getForwardRay().direction.clone();
    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
    const speed = keys.shift ? 28 : 13;
    const movement = BABYLON.Vector3.Zero();

    if (keys.w) movement.addInPlace(forward);
    if (keys.s) movement.subtractInPlace(forward);
    if (keys.d) movement.addInPlace(right);
    if (keys.a) movement.subtractInPlace(right);
    if (keys.e) movement.y += 1;
    if (keys.q) movement.y -= 1;

    if (movement.lengthSquared() > 0.001) {
        movement.normalize();
        camera.position.addInPlace(movement.scale(speed * delta));
    }

    camera.rotation.x = camera.pitch;
    camera.rotation.y = camera.yaw;
}

function updateCamera() {
    if (debugCameraEnabled) {
        return;
    }

    const target = player.root.position.add(new BABYLON.Vector3(0, camera.height, 0));
    const horizontalDistance = Math.cos(camera.pitch) * camera.distance;
    const verticalDistance = Math.sin(camera.pitch) * camera.distance;

    const desiredPosition = new BABYLON.Vector3(
        target.x - Math.sin(camera.yaw) * horizontalDistance,
        target.y + verticalDistance,
        target.z - Math.cos(camera.yaw) * horizontalDistance
    );

    camera.position = BABYLON.Vector3.Lerp(camera.position, desiredPosition, 0.14);
    camera.setTarget(target);
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

    const xLimit = 14.0;
    const zLimit = 17.0;
    const x = player.root.position.x;
    const z = player.root.position.z;
    const ellipse = (x * x) / (xLimit * xLimit) + ((z - 2) * (z - 2)) / (zLimit * zLimit);

    if (ellipse > 1) {
        const scale = 1 / Math.sqrt(ellipse);
        player.root.position.x = x * scale;
        player.root.position.z = 2 + (z - 2) * scale;
    }
}

function updateInteractables() {
    interactTarget = null;

    let nearest = null;
    let nearestDistance = Infinity;

    interactables.forEach((item) => {
        const distance = BABYLON.Vector3.Distance(player.root.position, item.position);

        if (distance < item.radius && distance < nearestDistance) {
            nearest = item;
            nearestDistance = distance;
        }
    });

    if (nearest) {
        interactTarget = nearest;
        ui.prompt.text = nearest.text;
        ui.prompt.isVisible = true;

        if (keys.e && !interactLocked) {
            interactLocked = true;
            nearest.action();
        }
    } else if (!debugCameraEnabled) {
        ui.prompt.isVisible = false;
    }
}

function updateAnimatedObjects() {
    const time = performance.now() * 0.001;

    scene.meshes.forEach((mesh) => {
        if (mesh.name.includes("asgardReturnPortalOuterRing")) {
            mesh.rotation.z += 0.009;
        }

        if (mesh.name.includes("asgardReturnPortalInnerRing")) {
            mesh.rotation.z -= 0.013;
        }

        if (mesh.name.includes("asgardShardPedestalRing")) {
            mesh.rotation.z += 0.012;
        }

        if (mesh.name.includes("asgardShardEnergyArc")) {
            mesh.rotation.y += 0.008;
        }

        if (mesh.name.includes("asgardFloatingDebris") && mesh.metadata) {
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.3;
            mesh.rotation.y += 0.002 * mesh.metadata.speed;
        }

        if (mesh.name.includes("asgardAmbientParticle") && mesh.metadata) {
            mesh.metadata.angle += 0.002 * mesh.metadata.speed;
            mesh.position.x = Math.sin(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.z = Math.cos(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.28;
        }
    });

    if (portalCore) {
        portalCore.scaling.setAll(1 + Math.sin(time * 5) * 0.08);
    }

    if (shardMesh) {
        shardMesh.rotation.y += 0.015;
        shardMesh.position.y = 2.05 + Math.sin(time * 3) * 0.08;
    }
}

function getWalkHeight(x, z) {
    if (Math.abs(x) < 5.8 && z > 8.0 && z < 17.0) {
        return 0.9;
    }

    return 0;
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

function getObjectiveText() {
    if (progress.hasShard) {
        return "Objective: Return to Yggdrasil with the shard of Mjolnir.";
    }

    return "Objective: Reach the broken throne platform and recover the shard of Mjolnir.";
}

function addInteractable(text, position, radius, action) {
    interactables.push({
        text,
        position,
        radius,
        action
    });
}

function addCollisionCircle(x, z, radius) {
    blockers.push({
        type: "circle",
        x,
        z,
        radius
    });
}

function addCollisionBox(x, z, width, depth) {
    blockers.push({
        type: "box",
        x,
        z,
        width,
        depth
    });
}

function makeMat(name, diffuseHex, emissiveHex = null, glowHex = null) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
    mat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);

    if (glowHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(glowHex).scale(0.55);
    } else if (emissiveHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.12);
    }

    return mat;
}

function makePbrMat(name, folder, fallbackHex, tiling = 1) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(fallbackHex);
    mat.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);

    const basePath = "../../assets/Scene%205%20Assets/Textures/";
    const folderPath = folder.split("/").map((part) => encodeURIComponent(part)).join("/");

    const directFolders = [
        "Midgard/Bark",
        "Midgard/Moss"
    ];

    const textureBase = directFolders.includes(folder)
        ? `${basePath}${folderPath}/`
        : `${basePath}${folderPath}/textures/`;

    const albedo = new BABYLON.Texture(`${textureBase}albedo.png`, scene, false, true);
    albedo.uScale = tiling;
    albedo.vScale = tiling;
    mat.diffuseTexture = albedo;

    const bump = new BABYLON.Texture(`${textureBase}normal.png`, scene, false, true);
    bump.uScale = tiling;
    bump.vScale = tiling;
    mat.bumpTexture = bump;

    return mat;
}

function setAsgardSky() {
    if (skyModelRoot) {
        skyModelRoot.dispose();
        skyModelRoot = null;
    }

    const basePath = "../../assets/Scene%205%20Assets/Skyboxes/";
    const modelPath = `${basePath}Asgard/source/`;
    const texturePath = `${basePath}Asgard/textures/Asgard.png`;

    skyModelRoot = new BABYLON.TransformNode("asgardSkyRoot", scene);

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, "Asgard.glb", scene).then((result) => {
        const skyTexture = new BABYLON.Texture(texturePath, scene, false, true);
        skyTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        skyTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        const skyMat = new BABYLON.StandardMaterial("asgardSkyMat", scene);
        skyMat.backFaceCulling = false;
        skyMat.disableLighting = true;
        skyMat.fogEnabled = false;
        skyMat.diffuseTexture = skyTexture;
        skyMat.emissiveTexture = skyTexture;
        skyMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        skyMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        skyMat.specularColor = new BABYLON.Color3(0, 0, 0);

        result.meshes.forEach((mesh) => {
            mesh.parent = skyModelRoot;
            mesh.material = skyMat;
            mesh.isPickable = false;
            mesh.infiniteDistance = true;
            mesh.alwaysSelectAsActiveMesh = true;
            mesh.applyFog = false;
        });

        skyModelRoot.scaling = new BABYLON.Vector3(500, 500, 500);

        scene.onBeforeRenderObservable.add(() => {
            if (skyModelRoot && scene.activeCamera) {
                skyModelRoot.position.copyFrom(scene.activeCamera.position);
                skyModelRoot.rotation.y += 0.00022;
            }
        });
    }).catch((error) => {
        console.error("Asgard sky failed to load:", error);
    });
}

function seededRandom(seed) {
    const x = Math.sin(seed * 999.123) * 10000;
    return x - Math.floor(x);
}

scene = createAsgardScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());
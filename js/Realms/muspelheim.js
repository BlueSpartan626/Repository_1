//Scene 5 - Muspelheim

//Standalone BabylonJS realm scene for the Scene 5 realm-switching demo.
//The player enters Muspelheim after powering Yggdrasil with the shard of Mjolnir, explores a volcanic arena, crosses cooled basalt paths, reaches Surtr's Forge, and can return to the Yggdrasil Realm Travel Room.
//This script includes third-person movement, jumping, debug camera movement, collision, lava materials, animated ember particles, volcanic rock walls, rune markings, a sword field, forge structures, and return portal logic.

const muspelSetup = setupEngineAndCanvas();
const canvas = muspelSetup.canvas;
const engine = muspelSetup.engine;

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
let returnPortalCore = null;
let forgeCore = null;
let lavaMats = [];

const progress = {
    muspelUnlocked: localStorage.getItem("scene5MuspelheimUnlocked") === "true" || localStorage.getItem("scene5ShardSlotted") === "true",
    demoComplete: localStorage.getItem("scene5DemoComplete") === "true"
};

function createMuspelheimScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.035, 0.012, 0.006, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.12, 0.045, 0.025);
    scene.fogDensity = 0.006;

    camera = new BABYLON.FreeCamera("muspelheimCamera", new BABYLON.Vector3(0, 4.5, -11), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.05;
    camera.maxZ = 1000;
    camera.yaw = 0;
    camera.pitch = BABYLON.Tools.ToRadians(22);
    camera.distance = 8.9;
    camera.height = 2.15;

    const hemi = new BABYLON.HemisphericLight("muspelheimHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.35;
    hemi.diffuse = new BABYLON.Color3(1, 0.55, 0.28);
    hemi.groundColor = new BABYLON.Color3(0.16, 0.035, 0.015);

    const lavaLight = new BABYLON.PointLight("muspelheimLavaLight", new BABYLON.Vector3(0, 2.5, 2), scene);
    lavaLight.intensity = 3.2;
    lavaLight.range = 38;
    lavaLight.diffuse = new BABYLON.Color3(1, 0.22, 0.06);

    const forgeLight = new BABYLON.PointLight("muspelheimForgeLight", new BABYLON.Vector3(0, 4.2, 14.5), scene);
    forgeLight.intensity = 4.1;
    forgeLight.range = 22;
    forgeLight.diffuse = new BABYLON.Color3(1, 0.42, 0.08);

    const portalLight = new BABYLON.PointLight("muspelheimPortalLight", new BABYLON.Vector3(0, 3.2, -13.6), scene);
    portalLight.intensity = 2.0;
    portalLight.range = 16;
    portalLight.diffuse = new BABYLON.Color3(0.38, 0.78, 1);

    setMuspelheimSky();

    const materials = createMaterials();

    ui = createUI();
    player = createPlayer(materials);

    buildMuspelheimWorld(materials);
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
        basalt: makePbrMat("muspelheimBasalt", "Midgard/Cliff Rock", "#1f2420", 4.2),
        basaltDark: makePbrMat("muspelheimDarkBasalt", "Midgard/Cliff Rock", "#0c0f0e", 4.8),
        cooledStone: makePbrMat("muspelheimCooledStone", "Midgard/Temple Stone", "#3f3f3b", 3.4),
        forgeStone: makePbrMat("muspelheimForgeStone", "Midgard/Temple Stone", "#5a4a3c", 2.8),
        bark: makePbrMat("muspelheimBark", "Midgard/Bark", "#2d180d", 2.2),
        cloth: makePbrMat("muspelheimCloth", "Midgard/Cloth", "#631818", 1.4),
        lava: makeLavaMat("muspelheimLava", "Muspelheim/Lava", "#ff4a12", 2.8),
        lavaHot: makeLavaMat("muspelheimHotLava", "Muspelheim/Lava", "#ff7a16", 4.4),
        ember: makeMat("muspelheimEmber", "#ff7a18", "#9a2208", "#ff5a12"),
        forgeGlow: makeMat("muspelheimForgeGlow", "#ffb020", "#7f1d1d", "#ff6b00"),
        runeRed: makeMat("muspelheimRuneRed", "#ef4444", "#7f1d1d", "#ef4444"),
        runeOrange: makeMat("muspelheimRuneOrange", "#fb923c", "#9a3412", "#f97316"),
        runeGold: makeMat("muspelheimRuneGold", "#facc15", "#a16207", "#f59e0b"),
        runeCyan: makeMat("muspelheimRuneCyan", "#67e8f9", "#0891b2", "#22d3ee"),
        black: makeMat("muspelheimBlack", "#020202", "#000000"),
        shadow: makeMat("muspelheimShadow", "#090302", "#010000"),
        player: makeMat("muspelheimPlayerBlack", "#020202", "#000000"),
        playerEye: makeMat("muspelheimPlayerEye", "#67e8f9", "#22d3ee", "#67e8f9")
    };
}

function buildMuspelheimWorld(materials) {
    createVolcanicIsland(materials);
    createReturnPortal(materials);
    createLavaRivers(materials);
    createBasaltPath(materials);
    createForgeArena(materials);
    createSurtrsForge(materials);
    createSwordField(materials);
    createVolcanicWalls(materials);
    createRubbleAndObsidian(materials);
    createRunes(materials);
    createBanners(materials);
    createEmbersAndAsh(materials);
}

function createVolcanicIsland(materials) {
    const base = BABYLON.MeshBuilder.CreateCylinder("muspelheimIslandBase", {
        diameter: 36,
        height: 1.0,
        tessellation: 128
    }, scene);

    base.position.y = -0.56;
    base.scaling.z = 1.08;
    base.material = materials.basaltDark;

    const ground = BABYLON.MeshBuilder.CreateCylinder("muspelheimWalkableGround", {
        diameter: 32,
        height: 0.22,
        tessellation: 128
    }, scene);

    ground.position.y = 0.02;
    ground.scaling.z = 1.04;
    ground.material = materials.basalt;

    const innerGlow = BABYLON.MeshBuilder.CreateTorus("muspelheimInnerLavaGlow", {
        diameter: 31.2,
        thickness: 0.09,
        tessellation: 160
    }, scene);

    innerGlow.position.y = 0.15;
    innerGlow.rotation.x = Math.PI / 2;
    innerGlow.material = materials.lavaHot;
}

function createReturnPortal(materials) {
    const root = new BABYLON.TransformNode("muspelheimReturnPortalRoot", scene);
    root.position = new BABYLON.Vector3(0, 0, -13.4);

    const platform = BABYLON.MeshBuilder.CreateCylinder("muspelheimPortalPlatform", {
        diameter: 5.2,
        height: 0.35,
        tessellation: 64
    }, scene);

    platform.position = new BABYLON.Vector3(0, 0.24, 0);
    platform.material = materials.cooledStone;
    platform.parent = root;

    const leftPillar = BABYLON.MeshBuilder.CreateBox("muspelheimPortalLeftPillar", {
        width: 0.55,
        height: 4.2,
        depth: 0.65
    }, scene);

    leftPillar.position = new BABYLON.Vector3(-2.15, 2.4, 0);
    leftPillar.rotation.z = BABYLON.Tools.ToRadians(-4);
    leftPillar.material = materials.forgeStone;
    leftPillar.parent = root;

    const rightPillar = BABYLON.MeshBuilder.CreateBox("muspelheimPortalRightPillar", {
        width: 0.55,
        height: 4.2,
        depth: 0.65
    }, scene);

    rightPillar.position = new BABYLON.Vector3(2.15, 2.4, 0);
    rightPillar.rotation.z = BABYLON.Tools.ToRadians(4);
    rightPillar.material = materials.forgeStone;
    rightPillar.parent = root;

    const cap = BABYLON.MeshBuilder.CreateBox("muspelheimPortalCap", {
        width: 4.8,
        height: 0.45,
        depth: 0.7
    }, scene);

    cap.position = new BABYLON.Vector3(0, 4.55, 0);
    cap.material = materials.cooledStone;
    cap.parent = root;

    const outerRing = BABYLON.MeshBuilder.CreateTorus("muspelheimReturnPortalOuterRing", {
        diameter: 3.1,
        thickness: 0.08,
        tessellation: 96
    }, scene);

    outerRing.position = new BABYLON.Vector3(0, 2.55, -0.2);
    outerRing.material = materials.runeCyan;
    outerRing.parent = root;

    const fireRing = BABYLON.MeshBuilder.CreateTorus("muspelheimReturnPortalFireRing", {
        diameter: 2.25,
        thickness: 0.055,
        tessellation: 96
    }, scene);

    fireRing.position = new BABYLON.Vector3(0, 2.55, -0.25);
    fireRing.rotation.z = Math.PI / 5;
    fireRing.material = materials.runeOrange;
    fireRing.parent = root;

    returnPortalCore = BABYLON.MeshBuilder.CreateSphere("muspelheimReturnPortalCore", {
        diameter: 1.05,
        segments: 32
    }, scene);

    returnPortalCore.position = new BABYLON.Vector3(0, 2.55, -0.3);
    returnPortalCore.material = materials.runeCyan;
    returnPortalCore.parent = root;

    for (let i = 0; i < 12; i++) {
        const tick = BABYLON.MeshBuilder.CreateBox(`muspelheimPortalRuneTick_${i}`, {
            width: 0.08,
            height: 0.42,
            depth: 0.04
        }, scene);

        const angle = (Math.PI * 2 / 12) * i;
        tick.position = new BABYLON.Vector3(Math.sin(angle) * 1.75, 2.55 + Math.cos(angle) * 1.75, -0.35);
        tick.rotation.z = -angle;
        tick.material = i % 2 === 0 ? materials.runeCyan : materials.runeOrange;
        tick.parent = root;
    }

    addCollisionCircle(-2.15, -13.4, 0.55);
    addCollisionCircle(2.15, -13.4, 0.55);
    addCollisionCircle(0, -13.4, 1.25);

    addInteractable("Yggdrasil Return Gate: The root-path is still open.\nPress E to return to the Realm Travel Room.", new BABYLON.Vector3(0, 0, -10.9), 3.1, () => {
        window.location.href = "yggdrasil.html";
    });
}

function createLavaRivers(materials) {
    const rivers = [
        ["muspelheimLavaRiverLeft", -8.4, 1.8, 2.2, 18.4, -15, "vertical"],
        ["muspelheimLavaRiverRight", 8.4, 1.4, 2.2, 17.2, 15, "vertical"],
        ["muspelheimLavaCrossLeft", -7.3, 6.2, 6.6, 1.55, 0, "cross"],
        ["muspelheimLavaCrossRight", 7.3, 6.2, 6.6, 1.55, 0, "cross"],
        ["muspelheimForgeLavaPool", 0, 15.7, 8.6, 4.3, 0, "pool"],
        ["muspelheimSpawnLavaCrack", -4.2, -8.1, 1.1, 6.6, 27, "crack"],
        ["muspelheimSideCrack", 4.6, -2.8, 0.9, 6.2, -34, "crack"]
    ];

    rivers.forEach((river) => {
        const lava = BABYLON.MeshBuilder.CreateBox(river[0], {
            width: river[3],
            height: 0.055,
            depth: river[4]
        }, scene);

        lava.position = new BABYLON.Vector3(river[1], 0.205, river[2]);
        lava.rotation.y = BABYLON.Tools.ToRadians(river[5]);
        lava.material = river[6] === "pool" ? materials.lavaHot : materials.lava;

        const glowUnderlay = BABYLON.MeshBuilder.CreateBox(`${river[0]}UnderGlow`, {
            width: river[3] + 0.45,
            height: 0.025,
            depth: river[4] + 0.45
        }, scene);

        glowUnderlay.position = new BABYLON.Vector3(river[1], 0.15, river[2]);
        glowUnderlay.rotation.y = BABYLON.Tools.ToRadians(river[5]);
        glowUnderlay.material = river[6] === "pool" ? materials.runeOrange : materials.runeRed;

        const rimA = BABYLON.MeshBuilder.CreateBox(`${river[0]}RimA`, {
            width: river[6] === "vertical" || river[6] === "crack" ? 0.32 : river[3] + 0.35,
            height: 0.08,
            depth: river[6] === "vertical" || river[6] === "crack" ? river[4] + 0.45 : 0.24
        }, scene);

        const rimB = BABYLON.MeshBuilder.CreateBox(`${river[0]}RimB`, {
            width: river[6] === "vertical" || river[6] === "crack" ? 0.32 : river[3] + 0.35,
            height: 0.08,
            depth: river[6] === "vertical" || river[6] === "crack" ? river[4] + 0.45 : 0.24
        }, scene);

        if (river[6] === "vertical" || river[6] === "crack") {
            rimA.position = new BABYLON.Vector3(river[1] - river[3] * 0.5 - 0.18, 0.24, river[2]);
            rimB.position = new BABYLON.Vector3(river[1] + river[3] * 0.5 + 0.18, 0.24, river[2]);
        } else {
            rimA.position = new BABYLON.Vector3(river[1], 0.24, river[2] - river[4] * 0.5 - 0.18);
            rimB.position = new BABYLON.Vector3(river[1], 0.24, river[2] + river[4] * 0.5 + 0.18);
        }

        rimA.rotation.y = BABYLON.Tools.ToRadians(river[5]);
        rimB.rotation.y = BABYLON.Tools.ToRadians(river[5]);
        rimA.material = materials.basaltDark;
        rimB.material = materials.basaltDark;
    });

    addCollisionBox(-8.4, 1.8, 2.6, 18.8);
    addCollisionBox(8.4, 1.4, 2.6, 17.6);
    addCollisionBox(-7.3, 6.2, 6.9, 1.9);
    addCollisionBox(7.3, 6.2, 6.9, 1.9);
    addCollisionBox(0, 15.7, 8.9, 4.7);
    addCollisionBox(-4.2, -8.1, 1.45, 6.9);
    addCollisionBox(4.6, -2.8, 1.25, 6.5);
}

function createBasaltPath(materials) {
    const pathPieces = [
        [0, -9.0, 3.4, 0.18, 1.5, 0],
        [0.15, -6.6, 3.1, 0.18, 1.4, 4],
        [-0.15, -4.2, 3.0, 0.18, 1.4, -5],
        [0.1, -1.8, 2.85, 0.18, 1.35, 3],
        [0.0, 0.7, 2.75, 0.18, 1.35, -2],
        [-0.1, 3.0, 2.6, 0.18, 1.25, 4],
        [0.0, 4.9, 3.4, 0.22, 1.25, -2],
        [0.0, 6.25, 4.3, 0.28, 1.35, 0],
        [0.0, 7.6, 3.4, 0.22, 1.25, 2],
        [0.15, 9.2, 3.2, 0.2, 1.55, 0],
        [0, 10.9, 3.55, 0.22, 1.65, 0]
    ];

    pathPieces.forEach((piece, index) => {
        const slab = BABYLON.MeshBuilder.CreateBox(`muspelheimBasaltPathSlab_${index}`, {
            width: piece[2],
            height: piece[3],
            depth: piece[4]
        }, scene);

        slab.position = new BABYLON.Vector3(piece[0], 0.23, piece[1]);
        slab.rotation.y = BABYLON.Tools.ToRadians(piece[5]);
        slab.material = index === 7 ? materials.forgeStone : index % 2 === 0 ? materials.cooledStone : materials.basaltDark;
    });

    const bridgeLeftRail = BABYLON.MeshBuilder.CreateBox("muspelheimLavaBridgeLeftRail", {
        width: 0.18,
        height: 0.26,
        depth: 2.1
    }, scene);

    bridgeLeftRail.position = new BABYLON.Vector3(-2.3, 0.5, 6.25);
    bridgeLeftRail.material = materials.basaltDark;

    const bridgeRightRail = BABYLON.MeshBuilder.CreateBox("muspelheimLavaBridgeRightRail", {
        width: 0.18,
        height: 0.26,
        depth: 2.1
    }, scene);

    bridgeRightRail.position = new BABYLON.Vector3(2.3, 0.5, 6.25);
    bridgeRightRail.material = materials.basaltDark;

    for (let i = 0; i < 7; i++) {
        const rune = BABYLON.MeshBuilder.CreateBox(`muspelheimBridgeRune_${i}`, {
            width: 0.08,
            height: 0.035,
            depth: 0.42
        }, scene);

        rune.position = new BABYLON.Vector3(-1.5 + i * 0.5, 0.41, 6.25);
        rune.rotation.y = Math.PI / 2;
        rune.material = i % 2 === 0 ? materials.runeOrange : materials.runeGold;
    }
}

function createForgeArena(materials) {
    const arena = BABYLON.MeshBuilder.CreateCylinder("muspelheimForgeArena", {
        diameter: 11.8,
        height: 0.46,
        tessellation: 96
    }, scene);

    arena.position = new BABYLON.Vector3(0, 0.32, 13.7);
    arena.material = materials.forgeStone;

    const inner = BABYLON.MeshBuilder.CreateCylinder("muspelheimForgeArenaInner", {
        diameter: 8.2,
        height: 0.12,
        tessellation: 96
    }, scene);

    inner.position = new BABYLON.Vector3(0, 0.63, 13.7);
    inner.material = materials.basaltDark;

    const runicRing = BABYLON.MeshBuilder.CreateTorus("muspelheimForgeRunicRing", {
        diameter: 9.4,
        thickness: 0.08,
        tessellation: 128
    }, scene);

    runicRing.position = new BABYLON.Vector3(0, 0.72, 13.7);
    runicRing.rotation.x = Math.PI / 2;
    runicRing.material = materials.runeOrange;

    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        const pillar = BABYLON.MeshBuilder.CreateCylinder(`muspelheimForgePillar_${i}`, {
            diameter: 0.42,
            height: 2.6 + (i % 3) * 0.55,
            tessellation: 16
        }, scene);

        pillar.position = new BABYLON.Vector3(Math.sin(angle) * 5.3, 1.65, 13.7 + Math.cos(angle) * 5.3);
        pillar.material = i % 2 === 0 ? materials.forgeStone : materials.basaltDark;

        const cap = BABYLON.MeshBuilder.CreateCylinder(`muspelheimForgePillarCap_${i}`, {
            diameter: 0.7,
            height: 0.18,
            tessellation: 16
        }, scene);

        cap.position = new BABYLON.Vector3(pillar.position.x, pillar.position.y + 1.38 + (i % 3) * 0.26, pillar.position.z);
        cap.material = materials.runeOrange;

        addCollisionCircle(pillar.position.x, pillar.position.z, 0.45);
    }
}

function createSurtrsForge(materials) {
    const forgeBase = BABYLON.MeshBuilder.CreateBox("muspelheimSurtrForgeBase", {
        width: 4.6,
        height: 1.0,
        depth: 2.8
    }, scene);

    forgeBase.position = new BABYLON.Vector3(0, 1.1, 15.1);
    forgeBase.material = materials.basaltDark;

    const anvil = BABYLON.MeshBuilder.CreateBox("muspelheimAnvilBody", {
        width: 2.6,
        height: 0.75,
        depth: 1.2
    }, scene);

    anvil.position = new BABYLON.Vector3(0, 1.95, 15.1);
    anvil.material = materials.cooledStone;

    const anvilTop = BABYLON.MeshBuilder.CreateBox("muspelheimAnvilTop", {
        width: 3.3,
        height: 0.22,
        depth: 1.5
    }, scene);

    anvilTop.position = new BABYLON.Vector3(0, 2.38, 15.1);
    anvilTop.material = materials.forgeStone;

    forgeCore = BABYLON.MeshBuilder.CreateSphere("muspelheimForgeCore", {
        diameter: 1.25,
        segments: 32
    }, scene);

    forgeCore.position = new BABYLON.Vector3(0, 3.25, 15.1);
    forgeCore.material = materials.forgeGlow;

    for (let i = 0; i < 5; i++) {
        const arc = BABYLON.MeshBuilder.CreateTorus(`muspelheimForgeArc_${i}`, {
            diameter: 1.8 + i * 0.32,
            thickness: 0.024,
            tessellation: 72,
            arc: 0.5
        }, scene);

        arc.position = forgeCore.position.clone();
        arc.rotation.x = BABYLON.Tools.ToRadians(48 + i * 11);
        arc.rotation.y = BABYLON.Tools.ToRadians(i * 42);
        arc.material = i % 2 === 0 ? materials.runeOrange : materials.runeGold;
    }

    const hammerHandle = BABYLON.MeshBuilder.CreateCylinder("muspelheimForgeHammerHandle", {
        diameter: 0.16,
        height: 3.2,
        tessellation: 12
    }, scene);

    hammerHandle.position = new BABYLON.Vector3(-1.9, 2.4, 15.3);
    hammerHandle.rotation.z = BABYLON.Tools.ToRadians(58);
    hammerHandle.rotation.y = BABYLON.Tools.ToRadians(-18);
    hammerHandle.material = materials.bark;

    const hammerHead = BABYLON.MeshBuilder.CreateBox("muspelheimForgeHammerHead", {
        width: 1.2,
        height: 0.48,
        depth: 0.62
    }, scene);

    hammerHead.position = new BABYLON.Vector3(-2.55, 3.35, 15.3);
    hammerHead.rotation.z = BABYLON.Tools.ToRadians(58);
    hammerHead.rotation.y = BABYLON.Tools.ToRadians(-18);
    hammerHead.material = materials.cooledStone;

    addCollisionBox(0, 15.1, 4.9, 3.2);

    addInteractable("Surtr's Forge: The fire realm's forge still burns beneath the dead sky.\nPress E to mark the realm route complete.", new BABYLON.Vector3(0, 0, 12.4), 3.4, () => {
        localStorage.setItem("scene5DemoComplete", "true");
        progress.demoComplete = true;
        ui.prompt.text = "Realm route complete. Muspelheim has been reached.";
        ui.prompt.isVisible = true;
        ui.objective.text = getObjectiveText();
    });
}

function createSwordField(materials) {
    for (let i = 0; i < 44; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        const z = -2 + row * 0.55;
        const x = side * (4.2 + seededRandom(i * 17) * 2.8);

        const blade = BABYLON.MeshBuilder.CreateBox(`muspelheimSwordBlade_${i}`, {
            width: 0.08,
            height: 1.35 + seededRandom(i * 21) * 0.85,
            depth: 0.035
        }, scene);

        blade.position = new BABYLON.Vector3(x, 0.85, z);
        blade.rotation.z = BABYLON.Tools.ToRadians(side * (6 + seededRandom(i * 23) * 18));
        blade.rotation.y = BABYLON.Tools.ToRadians(seededRandom(i * 27) * 360);
        blade.material = materials.cooledStone;

        const hilt = BABYLON.MeshBuilder.CreateBox(`muspelheimSwordHilt_${i}`, {
            width: 0.35,
            height: 0.06,
            depth: 0.08
        }, scene);

        hilt.position = new BABYLON.Vector3(x, 0.22, z);
        hilt.rotation.y = blade.rotation.y;
        hilt.material = i % 3 === 0 ? materials.gold : materials.dimGold;
    }
}

function createVolcanicWalls(materials) {
    for (let i = 0; i < 64; i++) {
        const angle = (Math.PI * 2 / 64) * i;
        const radius = 17.0 + seededRandom(i * 31) * 1.4;

        const wallRock = BABYLON.MeshBuilder.CreatePolyhedron(`muspelheimWallRock_${i}`, {
            type: 2,
            size: 1
        }, scene);

        wallRock.position = new BABYLON.Vector3(
            Math.sin(angle) * radius,
            1.15 + seededRandom(i * 37) * 1.8,
            Math.cos(angle) * radius * 1.08
        );

        wallRock.scaling = new BABYLON.Vector3(
            1.2 + seededRandom(i * 41) * 2.4,
            1.6 + seededRandom(i * 43) * 3.2,
            1.0 + seededRandom(i * 47) * 2.1
        );

        wallRock.rotation.x = seededRandom(i * 53) * Math.PI;
        wallRock.rotation.y = angle + seededRandom(i * 59) * 0.8;
        wallRock.rotation.z = seededRandom(i * 61) * Math.PI;
        wallRock.material = i % 2 === 0 ? materials.basaltDark : materials.basalt;
        wallRock.convertToFlatShadedMesh();
    }
}

function createRubbleAndObsidian(materials) {
    for (let i = 0; i < 58; i++) {
        const angle = seededRandom(i * 13) * Math.PI * 2;
        const radius = 3.5 + seededRandom(i * 17) * 11.5;
        const zBias = seededRandom(i * 19) * 3 - 1.5;

        const rock = BABYLON.MeshBuilder.CreatePolyhedron(`muspelheimGroundRock_${i}`, {
            type: 2,
            size: 1
        }, scene);

        rock.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.18, Math.cos(angle) * radius + zBias);
        rock.scaling = new BABYLON.Vector3(
            0.22 + seededRandom(i * 23) * 0.75,
            0.14 + seededRandom(i * 29) * 0.48,
            0.2 + seededRandom(i * 31) * 0.7
        );

        rock.rotation.x = seededRandom(i * 37) * Math.PI;
        rock.rotation.y = seededRandom(i * 41) * Math.PI;
        rock.material = i % 3 === 0 ? materials.basaltDark : materials.cooledStone;
        rock.convertToFlatShadedMesh();

        if (i % 7 === 0) {
            addCollisionCircle(rock.position.x, rock.position.z, 0.38);
        }
    }

    for (let i = 0; i < 22; i++) {
        const crack = BABYLON.MeshBuilder.CreateBox(`muspelheimGlowingCrack_${i}`, {
            width: 0.08,
            height: 0.025,
            depth: 1.2 + seededRandom(i * 47) * 1.6
        }, scene);

        const angle = seededRandom(i * 51) * Math.PI * 2;
        const radius = 4.5 + seededRandom(i * 53) * 10.2;

        crack.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.22, Math.cos(angle) * radius);
        crack.rotation.y = seededRandom(i * 57) * Math.PI * 2;
        crack.material = i % 2 === 0 ? materials.runeOrange : materials.runeRed;
    }
}

function createRunes(materials) {
    const outerRunes = ["ᛗ", "ᚢ", "ᛊ", "ᛈ", "ᛖ", "ᛚ", "ᚺ", "ᛖ", "ᛁ", "ᛗ"];

    for (let i = 0; i < outerRunes.length; i++) {
        const angle = (Math.PI * 2 / outerRunes.length) * i;
        const radius = 10.4;

        createGroundRune(
            `muspelheimOuterRune_${i}`,
            outerRunes[i],
            Math.sin(angle) * radius,
            Math.cos(angle) * radius,
            1.0,
            i % 2 === 0 ? "#f97316" : "#ef4444",
            -angle
        );
    }

    createGroundRune("muspelheimForgeNameRune", "ᛊᚢᚱᛏᚱ", 0, 10.5, 1.8, "#facc15", 0);
    createGroundRune("muspelheimGateRune", "ᚱᛖᛏᚢᚱᚾ", 0, -9.2, 1.55, "#67e8f9", 0);
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

    plane.position = new BABYLON.Vector3(x, 0.26, z);
    plane.rotation.x = Math.PI / 2;
    plane.rotation.z = rotation;
    plane.material = mat;
    plane.isPickable = false;
}

function createBanners(materials) {
    const banners = [
        [-5.2, -6.8, 8],
        [5.5, -5.4, -12],
        [-6.5, 9.2, -8],
        [6.4, 8.8, 10]
    ];

    banners.forEach((banner, index) => {
        const pole = BABYLON.MeshBuilder.CreateCylinder(`muspelheimBannerPole_${index}`, {
            diameter: 0.1,
            height: 3.0,
            tessellation: 10
        }, scene);

        pole.position = new BABYLON.Vector3(banner[0], 1.35, banner[1]);
        pole.rotation.z = BABYLON.Tools.ToRadians(banner[2]);
        pole.material = materials.bark;

        const cloth = BABYLON.MeshBuilder.CreateBox(`muspelheimBannerCloth_${index}`, {
            width: 0.06,
            height: 1.2,
            depth: 0.74
        }, scene);

        cloth.position = new BABYLON.Vector3(banner[0] + 0.22, 1.92, banner[1] + 0.05);
        cloth.rotation.z = BABYLON.Tools.ToRadians(banner[2]);
        cloth.material = materials.cloth;

        addCollisionCircle(banner[0], banner[1], 0.35);
    });
}

function createEmbersAndAsh(materials) {
    for (let i = 0; i < 130; i++) {
        const particle = BABYLON.MeshBuilder.CreateSphere(`muspelheimEmberParticle_${i}`, {
            diameter: 0.035 + seededRandom(i * 7) * 0.06,
            segments: 8
        }, scene);

        const angle = seededRandom(i * 11) * Math.PI * 2;
        const radius = seededRandom(i * 13) * 17.5;

        particle.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.8 + seededRandom(i * 17) * 8.4, Math.cos(angle) * radius);
        particle.material = i % 5 === 0 ? materials.runeGold : materials.ember;
        particle.metadata = {
            angle,
            radius,
            baseY: particle.position.y,
            speed: 0.18 + seededRandom(i * 19) * 0.42,
            offset: seededRandom(i * 23) * Math.PI * 2
        };
    }

    for (let i = 0; i < 36; i++) {
        const ash = BABYLON.MeshBuilder.CreateBox(`muspelheimAshFlake_${i}`, {
            width: 0.08,
            height: 0.012,
            depth: 0.16
        }, scene);

        const angle = seededRandom(i * 31) * Math.PI * 2;
        const radius = seededRandom(i * 37) * 16;

        ash.position = new BABYLON.Vector3(Math.sin(angle) * radius, 1.0 + seededRandom(i * 41) * 7, Math.cos(angle) * radius);
        ash.rotation.x = seededRandom(i * 43) * Math.PI;
        ash.rotation.y = seededRandom(i * 47) * Math.PI;
        ash.material = materials.cooledStone;
        ash.metadata = {
            angle,
            radius,
            baseY: ash.position.y,
            speed: 0.08 + seededRandom(i * 53) * 0.14,
            offset: seededRandom(i * 59) * Math.PI * 2
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

    const xLimit = 14.2;
    const zLimit = 16.0;
    const x = player.root.position.x;
    const z = player.root.position.z;
    const ellipse = (x * x) / (xLimit * xLimit) + ((z - 1.6) * (z - 1.6)) / (zLimit * zLimit);

    if (ellipse > 1) {
        const scale = 1 / Math.sqrt(ellipse);
        player.root.position.x = x * scale;
        player.root.position.z = 1.6 + (z - 1.6) * scale;
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

    lavaMats.forEach((mat, index) => {
        if (mat.diffuseTexture) {
            mat.diffuseTexture.uOffset += 0.0008 + index * 0.0002;
            mat.diffuseTexture.vOffset += 0.0005 + index * 0.00015;
        }

        if (mat.emissiveTexture) {
            mat.emissiveTexture.uOffset += 0.0008 + index * 0.0002;
            mat.emissiveTexture.vOffset += 0.0005 + index * 0.00015;
        }
    });

    scene.meshes.forEach((mesh) => {
        if (mesh.name.includes("muspelheimReturnPortalOuterRing")) {
            mesh.rotation.z += 0.009;
        }

        if (mesh.name.includes("muspelheimReturnPortalFireRing")) {
            mesh.rotation.z -= 0.013;
        }

        if (mesh.name.includes("muspelheimForgeRunicRing")) {
            mesh.rotation.z += 0.006;
        }

        if (mesh.name.includes("muspelheimForgeArc")) {
            mesh.rotation.y += 0.009;
        }

        if (mesh.name.includes("muspelheimEmberParticle") && mesh.metadata) {
            mesh.metadata.angle += 0.0018 * mesh.metadata.speed;
            mesh.position.x = Math.sin(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.z = Math.cos(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.45;
        }

        if (mesh.name.includes("muspelheimAshFlake") && mesh.metadata) {
            mesh.metadata.angle += 0.001 * mesh.metadata.speed;
            mesh.position.x = Math.sin(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.z = Math.cos(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.35;
            mesh.rotation.y += 0.004;
        }
    });

    if (returnPortalCore) {
        returnPortalCore.scaling.setAll(1 + Math.sin(time * 5) * 0.07);
    }

    if (forgeCore) {
        forgeCore.scaling.setAll(1 + Math.sin(time * 4.2) * 0.1);
    }
}

function getWalkHeight(x, z) {
    if (Math.sqrt(x * x + (z - 13.7) * (z - 13.7)) < 5.9) {
        return 0.65;
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
    if (progress.demoComplete) {
        return "Objective: Realm route complete. Return to Yggdrasil when ready.";
    }

    return "Objective: Cross the volcanic arena and inspect Surtr's Forge.";
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
        "Midgard/Moss",
        "Muspelheim/Lava"
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

function makeLavaMat(name, folder, fallbackHex, tiling = 1) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(fallbackHex);
    mat.emissiveColor = BABYLON.Color3.FromHexString("#ff3b0a").scale(0.75);
    mat.specularColor = new BABYLON.Color3(0.2, 0.09, 0.02);

    const basePath = "../../assets/Scene%205%20Assets/Textures/";
    const folderPath = folder.split("/").map((part) => encodeURIComponent(part)).join("/");
    const textureBase = `${basePath}${folderPath}/`;

    const albedo = new BABYLON.Texture(`${textureBase}albedo.png`, scene, false, true);
    albedo.uScale = tiling;
    albedo.vScale = tiling;
    mat.diffuseTexture = albedo;

    const emissive = new BABYLON.Texture(`${textureBase}albedo.png`, scene, false, true);
    emissive.uScale = tiling;
    emissive.vScale = tiling;
    mat.emissiveTexture = emissive;

    const bump = new BABYLON.Texture(`${textureBase}normal.png`, scene, false, true);
    bump.uScale = tiling;
    bump.vScale = tiling;
    mat.bumpTexture = bump;

    lavaMats.push(mat);

    return mat;
}

function setMuspelheimSky() {
    if (skyModelRoot) {
        skyModelRoot.dispose();
        skyModelRoot = null;
    }

    const basePath = "../../assets/Scene%205%20Assets/Skyboxes/";
    const modelPath = `${basePath}Muspelheim/source/`;
    const texturePath = `${basePath}Muspelheim/textures/Muspelheim.png`;

    skyModelRoot = new BABYLON.TransformNode("muspelheimSkyRoot", scene);

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, "Muspelheim.glb", scene).then((result) => {
        const skyTexture = new BABYLON.Texture(texturePath, scene, false, true);
        skyTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        skyTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        const skyMat = new BABYLON.StandardMaterial("muspelheimSkyMat", scene);
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
                skyModelRoot.rotation.y += 0.00018;
            }
        });
    }).catch((error) => {
        console.error("Muspelheim sky failed to load:", error);
    });
}

function seededRandom(seed) {
    const x = Math.sin(seed * 999.123) * 10000;
    return x - Math.floor(x);
}

scene = createMuspelheimScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());
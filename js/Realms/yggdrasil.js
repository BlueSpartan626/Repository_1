
//Scene 5 - Yggdrasil Realm Hub

//Standalone BabylonJS realm hub scene for the Scene 5 realm-switching demo.
//This scene acts as the central travel room between Midgard, Asgard, Muspelheim, and the sealed remaining realms.
//It includes third-person movement, jumping, debug camera movement, collision, realm gates, rune labels, interactive flavour text, localStorage progress tracking, a Mjolnir shard socket, animated portals, particles, floating stone debris, and a large central Yggdrasil tree using the Midgard bark texture.

const yggSetup = setupEngineAndCanvas();
const canvas = yggSetup.canvas;
const engine = yggSetup.engine;

let scene = null;
let player = null;
let camera = null;
let ui = null;
let keys = {};
let blockers = [];
let interactables = [];
let interactTarget = null;
let interactLocked = false;
let debugCameraEnabled = false;
let skyModelRoot = null;
let realmGateRecords = [];
let shardSocketRecord = null;

const progress = {
    hasShard: localStorage.getItem("scene5HasMjolnirShard") === "true",
    muspelUnlocked: localStorage.getItem("scene5MuspelheimUnlocked") === "true" || localStorage.getItem("scene5ShardSlotted") === "true"
};

function createYggdrasilScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.012, 0.025, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.02, 0.035, 0.06);
    scene.fogDensity = 0.006;

    camera = new BABYLON.FreeCamera("yggdrasilCamera", new BABYLON.Vector3(0, 5, -11), scene);
    camera.attachControl(canvas, false);
    camera.minZ = 0.05;
    camera.maxZ = 1000;
    camera.yaw = 0;
    camera.pitch = BABYLON.Tools.ToRadians(22);
    camera.distance = 9.4;
    camera.height = 2.2;

    const hemi = new BABYLON.HemisphericLight("yggdrasilHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.45;
    hemi.diffuse = new BABYLON.Color3(0.55, 0.8, 1);
    hemi.groundColor = new BABYLON.Color3(0.02, 0.025, 0.04);

    const treeLight = new BABYLON.PointLight("yggdrasilTreeLight", new BABYLON.Vector3(0, 9, 0), scene);
    treeLight.intensity = 3.8;
    treeLight.range = 34;
    treeLight.diffuse = new BABYLON.Color3(0.25, 1, 0.85);

    const asgardLight = new BABYLON.PointLight("yggdrasilAsgardLight", new BABYLON.Vector3(0, 5.8, -15.5), scene);
    asgardLight.intensity = progress.hasShard ? 0.35 : 2.6;
    asgardLight.range = 22;
    asgardLight.diffuse = new BABYLON.Color3(0.38, 0.42, 1);

    const muspelLight = new BABYLON.PointLight("yggdrasilMuspelLight", new BABYLON.Vector3(0, 3.2, 17.5), scene);
    muspelLight.intensity = progress.muspelUnlocked ? 2.5 : 0.45;
    muspelLight.range = 18;
    muspelLight.diffuse = new BABYLON.Color3(1, 0.18, 0.08);

    setYggdrasilSky();

    const materials = createMaterials();

    ui = createUI();

    player = createPlayer(materials);

    createHubWorld(materials);
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
        platform: makePbrMat("yggPlatformStone", "Midgard/Temple Stone", "#6d736d", 2.8),
        darkPlatform: makePbrMat("yggDarkPlatformStone", "Midgard/Temple Stone", "#333c38", 2.8),
        bark: makePbrMat("yggBark", "Midgard/Bark", "#4a2b18", 2.4),
        rootDark: makePbrMat("yggRootDark", "Midgard/Bark", "#26150d", 3.4),
        moss: makePbrMat("yggMoss", "Midgard/Moss", "#2b5635", 5),
        rock: makePbrMat("yggRock", "Midgard/Cliff Rock", "#4d5654", 3.5),
        runeCyan: makeMat("yggRuneCyan", "#5eead4", "#14b8a6", "#14b8a6"),
        runeBlue: makeMat("yggRuneBlue", "#60a5fa", "#1d4ed8", "#2563eb"),
        runeGold: makeMat("yggRuneGold", "#facc15", "#a16207", "#eab308"),
        runeGreen: makeMat("yggRuneGreen", "#22c55e", "#166534", "#22c55e"),
        runeRed: makeMat("yggRuneRed", "#ef4444", "#7f1d1d", "#ef4444"),
        runePurple: makeMat("yggRunePurple", "#a78bfa", "#4c1d95", "#8b5cf6"),
        runeTeal: makeMat("yggRuneTeal", "#2dd4bf", "#0f766e", "#14b8a6"),
        runeBrown: makeMat("yggRuneBrown", "#9a6b3f", "#4a2f1b", "#b7793f"),
        runeWhite: makeMat("yggRuneWhite", "#d7dde0", "#64748b", "#cbd5e1"),
        black: makeMat("yggBlack", "#020204", "#000000"),
        shadow: makeMat("yggShadow", "#050816", "#020617"),
        locked: makeMat("yggLockedGate", "#20252b", "#0b0f14"),
        shard: makeMat("yggMjolnirShard", "#d5f6ff", "#67e8f9", "#67e8f9"),
        player: makeMat("yggPlayerBlack", "#020202", "#000000"),
        playerEye: makeMat("yggPlayerEye", "#67e8f9", "#22d3ee", "#67e8f9")
    };
}

function createHubWorld(materials) {
    createOuterVoidFoundation(materials);
    createCentralPlatform(materials);
    createYggdrasilTree(materials);
    createRootNetwork(materials);
    createRealmGates(materials);
    createAsgardPortal(materials);
    createShardSocket(materials);
    createFloatingDebris(materials);
    createRunicFloorDetails(materials);
    createAmbientParticles(materials);
    createBridgeStones(materials);
}

function createOuterVoidFoundation(materials) {
    const base = BABYLON.MeshBuilder.CreateCylinder("yggOuterBase", {
        diameter: 42,
        height: 0.45,
        tessellation: 160
    }, scene);

    base.position.y = -0.25;
    base.material = materials.darkPlatform;

    const inner = BABYLON.MeshBuilder.CreateCylinder("yggInnerFloor", {
        diameter: 34,
        height: 0.14,
        tessellation: 160
    }, scene);

    inner.position.y = 0.02;
    inner.material = materials.platform;

    addCollisionCircle(0, 0, 2.0);
}

function createCentralPlatform(materials) {
    const dais = BABYLON.MeshBuilder.CreateCylinder("yggCentralDais", {
        diameter: 8.2,
        height: 0.55,
        tessellation: 96
    }, scene);

    dais.position.y = 0.34;
    dais.material = materials.darkPlatform;

    const raised = BABYLON.MeshBuilder.CreateCylinder("yggCentralRaisedFloor", {
        diameter: 6.2,
        height: 0.22,
        tessellation: 96
    }, scene);

    raised.position.y = 0.76;
    raised.material = materials.platform;

    const realmPedestals = [
        ["alfheim", materials.runeCyan],
        ["asgard", materials.runePurple],
        ["jotunheim", materials.runeGold],
        ["vanaheim", materials.runeGreen],
        ["midgard", materials.runeBrown],
        ["svartalfheim", materials.runeGold],
        ["niflheim", materials.runeBlue],
        ["helheim", materials.runeTeal],
        ["muspelheim", materials.runeRed]
    ];

    realmPedestals.forEach((data, index) => {
        const angle = (Math.PI * 2 / realmPedestals.length) * index;
        const x = Math.sin(angle) * 4.25;
        const z = Math.cos(angle) * 4.25;

        const pedestal = BABYLON.MeshBuilder.CreateCylinder(`yggRealmPedestal_${data[0]}`, {
            diameter: 0.5,
            height: 1.15,
            tessellation: 18
        }, scene);

        pedestal.position = new BABYLON.Vector3(x, 0.88, z);
        pedestal.material = materials.darkPlatform;

        const cap = BABYLON.MeshBuilder.CreateCylinder(`yggRealmPedestalCap_${data[0]}`, {
            diameter: 0.78,
            height: 0.16,
            tessellation: 18
        }, scene);

        cap.position = new BABYLON.Vector3(x, 1.52, z);
        cap.material = data[1];

        const runeStone = BABYLON.MeshBuilder.CreateBox(`yggRealmPedestalRune_${data[0]}`, {
            width: 0.14,
            height: 0.03,
            depth: 0.42
        }, scene);

        runeStone.position = new BABYLON.Vector3(x, 1.62, z);
        runeStone.rotation.y = angle;
        runeStone.material = data[1];

        addCollisionCircle(x, z, 0.42);
    });
}

function createYggdrasilTree(materials) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder("yggWorldTreeTrunk", {
        diameterTop: 1.45,
        diameterBottom: 2.75,
        height: 13,
        tessellation: 32
    }, scene);

    trunk.position.y = 7.1;
    trunk.material = materials.bark;

    const trunkBulgeOne = BABYLON.MeshBuilder.CreateCylinder("yggWorldTreeBulgeOne", {
        diameterTop: 2.0,
        diameterBottom: 3.1,
        height: 2.8,
        tessellation: 32
    }, scene);

    trunkBulgeOne.position.y = 2.2;
    trunkBulgeOne.material = materials.bark;

    const trunkBulgeTwo = BABYLON.MeshBuilder.CreateCylinder("yggWorldTreeBulgeTwo", {
        diameterTop: 1.75,
        diameterBottom: 2.3,
        height: 3.2,
        tessellation: 32
    }, scene);

    trunkBulgeTwo.position.y = 11.15;
    trunkBulgeTwo.material = materials.bark;

    for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 / 18) * i;
        const branchLength = 5.2 + seededRandom(i * 41) * 3.8;
        const branchHeight = 10.1 + seededRandom(i * 43) * 2.4;
        const branchRadius = 0.95 + seededRandom(i * 47) * 1.2;

        const branch = BABYLON.MeshBuilder.CreateCylinder(`yggMainBranch_${i}`, {
            diameterTop: 0.12,
            diameterBottom: 0.42,
            height: branchLength,
            tessellation: 14
        }, scene);

        branch.position = new BABYLON.Vector3(
            Math.sin(angle) * branchRadius,
            branchHeight,
            Math.cos(angle) * branchRadius
        );

        branch.rotation.z = BABYLON.Tools.ToRadians(64 + seededRandom(i * 53) * 10);
        branch.rotation.y = angle + BABYLON.Tools.ToRadians(seededRandom(i * 59) * 24 - 12);
        branch.material = i % 3 === 0 ? materials.rootDark : materials.bark;
    }

    const canopyData = [
        [0, 0, 12.7, 3.5, 0.75, 2.9],
        [3.2, 1.1, 13.1, 2.6, 0.58, 2.0],
        [-3.3, 0.8, 13.0, 2.7, 0.6, 2.1],
        [1.1, 3.4, 13.25, 2.4, 0.55, 2.2],
        [-1.2, -3.4, 13.2, 2.4, 0.55, 2.2],
        [4.8, -2.1, 12.75, 1.95, 0.48, 1.65],
        [-4.8, -2.0, 12.75, 1.95, 0.48, 1.65],
        [2.4, -4.8, 12.55, 1.8, 0.45, 1.5],
        [-2.3, 4.8, 12.55, 1.8, 0.45, 1.5]
    ];

    canopyData.forEach((data, index) => {
        const leafCluster = BABYLON.MeshBuilder.CreateIcoSphere(`yggLeafCluster_${index}`, {
            radius: 1,
            subdivisions: 2
        }, scene);

        leafCluster.position = new BABYLON.Vector3(data[0], data[2], data[1]);
        leafCluster.scaling = new BABYLON.Vector3(data[3], data[4], data[5]);
        leafCluster.rotation.y = BABYLON.Tools.ToRadians(index * 37);
        leafCluster.material = materials.moss;
        leafCluster.convertToFlatShadedMesh();
    });

    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;

        const hanging = BABYLON.MeshBuilder.CreateCylinder(`yggHangingRoot_${i}`, {
            diameterTop: 0.04,
            diameterBottom: 0.12,
            height: 3.4 + seededRandom(i * 89) * 2.3,
            tessellation: 10
        }, scene);

        hanging.position = new BABYLON.Vector3(
            Math.sin(angle) * (2.8 + seededRandom(i * 91) * 3.0),
            9.4 + seededRandom(i * 97) * 2.0,
            Math.cos(angle) * (2.8 + seededRandom(i * 101) * 3.0)
        );

        hanging.rotation.z = BABYLON.Tools.ToRadians(seededRandom(i * 103) * 8 - 4);
        hanging.rotation.y = angle;
        hanging.material = materials.rootDark;
    }

    addCollisionCircle(0, 0, 2.1);
}

function createRootNetwork(materials) {
    const rootData = [
        [0, 2.2, 0.55, 4.2, 0],
        [45, 2.0, 0.46, 3.6, 1],
        [90, 2.15, 0.5, 4.0, 2],
        [135, 1.75, 0.38, 3.2, 3],
        [180, 2.2, 0.55, 4.4, 4],
        [225, 1.8, 0.4, 3.4, 5],
        [270, 2.1, 0.48, 3.8, 6],
        [315, 1.9, 0.42, 3.5, 7]
    ];

    rootData.forEach((data) => {
        const angle = BABYLON.Tools.ToRadians(data[0]);
        const distance = data[1];
        const diameter = data[2];
        const length = data[3];
        const index = data[4];

        const root = BABYLON.MeshBuilder.CreateCylinder(`yggCleanFloorRoot_${index}`, {
            diameterTop: diameter * 0.35,
            diameterBottom: diameter,
            height: length,
            tessellation: 14
        }, scene);

        root.position = new BABYLON.Vector3(
            Math.sin(angle) * distance,
            0.28,
            Math.cos(angle) * distance
        );

        root.rotation.z = Math.PI / 2;
        root.rotation.y = -angle;
        root.scaling.y = 1;
        root.material = index % 2 === 0 ? materials.bark : materials.rootDark;
    });

    for (let i = 0; i < 12; i++) {
        const angle = seededRandom(i * 41) * Math.PI * 2;
        const distance = 5.3 + seededRandom(i * 43) * 4.6;

        const stone = BABYLON.MeshBuilder.CreatePolyhedron(`yggSmallRootStone_${i}`, {
            type: 2,
            size: 1
        }, scene);

        stone.position = new BABYLON.Vector3(
            Math.sin(angle) * distance,
            0.21,
            Math.cos(angle) * distance
        );

        stone.scaling = new BABYLON.Vector3(
            0.22 + seededRandom(i * 47) * 0.32,
            0.14 + seededRandom(i * 53) * 0.18,
            0.22 + seededRandom(i * 59) * 0.32
        );

        stone.rotation.y = seededRandom(i * 61) * Math.PI * 2;
        stone.material = materials.rock;
        stone.convertToFlatShadedMesh();
    }
}

function createRealmGates(materials) {
    const realms = [
        {
            key: "alfheim",
            name: "Alfheim",
            rune: "ᚨᛚᚠᚺᛖᛁᛗ",
            colour: "#8ee8ff",
            mat: materials.runeCyan,
            available: false,
            reason: "The Light of Alfheim is sealed. Its bridge refuses to form."
        },
        {
            key: "jotunheim",
            name: "Jotunheim",
            rune: "ᛃᛟᛏᚢᚾᚺᛖᛁᛗ",
            colour: "#eab308",
            mat: materials.runeGold,
            available: false,
            reason: "The giants' realm is silent. The way is buried beneath old death."
        },
        {
            key: "vanaheim",
            name: "Vanaheim",
            rune: "ᚹᚨᚾᚨᚺᛖᛁᛗ",
            colour: "#22c55e",
            mat: materials.runeGreen,
            available: false,
            reason: "The Vanir gate is alive, but overgrown. Something refuses entry."
        },
        {
            key: "midgard",
            name: "Midgard",
            rune: "ᛗᛁᛞᚷᚨᚱᛞ",
            colour: "#9a6b3f",
            mat: materials.runeBrown,
            available: true,
            href: "midgard.html",
            reason: "Midgard remains reachable. The mortal world still clings to Yggdrasil."
        },
        {
            key: "svartalfheim",
            name: "Svartalfheim",
            rune: "ᛊᚹᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ",
            colour: "#d97706",
            mat: materials.runeGold,
            available: false,
            reason: "The dwarven gate is sealed by craftwork older than the current age."
        },
        {
            key: "niflheim",
            name: "Niflheim",
            rune: "ᚾᛁᚠᛚᚺᛖᛁᛗ",
            colour: "#93c5fd",
            mat: materials.runeBlue,
            available: false,
            reason: "A cold mist gathers behind the gate. The path is frozen shut."
        },
        {
            key: "helheim",
            name: "Helheim",
            rune: "ᚺᛖᛚᚺᛖᛁᛗ",
            colour: "#2dd4bf",
            mat: materials.runeTeal,
            available: false,
            reason: "The bridge to Helheim stands closed. No gatekeeper answers."
        },
        {
            key: "muspelheim",
            name: "Muspelheim",
            rune: "ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ",
            colour: "#ef4444",
            mat: materials.runeRed,
            available: progress.muspelUnlocked,
            href: "muspelheim.html",
            reason: progress.muspelUnlocked ? "The shard has powered the root-path. Muspelheim now answers." : "Muspelheim is locked. Yggdrasil requires power from the Mjolnir shard."
        }
    ];

    const radius = 15.8;
    const angles = [-140, -100, -60, -20, 20, 60, 100, 140];

    realms.forEach((realm, index) => {
        const angle = BABYLON.Tools.ToRadians(angles[index]);
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        createRealmGate(realm, index, x, z, angle, materials);
    });
}

function createRealmGate(realm, index, x, z, angle, materials) {
    const root = new BABYLON.TransformNode(`yggRealmGateRoot_${realm.key}`, scene);
    root.position = new BABYLON.Vector3(x, 0, z);
    root.rotation.y = angle;

    const plinth = BABYLON.MeshBuilder.CreateBox(`yggRealmGatePlinth_${realm.key}`, {
        width: 4.8,
        height: 0.38,
        depth: 1.4
    }, scene);

    plinth.position = new BABYLON.Vector3(0, 0.28, 0);
    plinth.material = materials.darkPlatform;
    plinth.parent = root;

    const back = BABYLON.MeshBuilder.CreateBox(`yggRealmGateBack_${realm.key}`, {
        width: 4.1,
        height: 4.6,
        depth: 0.35
    }, scene);

    back.position = new BABYLON.Vector3(0, 2.75, 0.3);
    back.material = materials.platform;
    back.parent = root;

    const disc = BABYLON.MeshBuilder.CreateCylinder(`yggRealmGateDisc_${realm.key}`, {
        diameter: 3.15,
        height: 0.18,
        tessellation: 80
    }, scene);

    disc.position = new BABYLON.Vector3(0, 2.75, -0.02);
    disc.rotation.x = Math.PI / 2;
    disc.material = realm.available ? realm.mat : materials.locked;
    disc.parent = root;

    const outerRing = BABYLON.MeshBuilder.CreateTorus(`yggRealmGateOuterRing_${realm.key}`, {
        diameter: 3.42,
        thickness: 0.09,
        tessellation: 96
    }, scene);

    outerRing.position = new BABYLON.Vector3(0, 2.75, -0.13);
    outerRing.material = realm.mat;
    outerRing.parent = root;

    const innerRing = BABYLON.MeshBuilder.CreateTorus(`yggRealmGateInnerRing_${realm.key}`, {
        diameter: 2.35,
        thickness: 0.045,
        tessellation: 96
    }, scene);

    innerRing.position = new BABYLON.Vector3(0, 2.75, -0.16);
    innerRing.material = realm.available ? realm.mat : materials.darkPlatform;
    innerRing.parent = root;

    const textPlane = BABYLON.MeshBuilder.CreatePlane(`yggRealmGateText_${realm.key}`, {
        width: 2.5,
        height: 0.55
    }, scene);

    textPlane.position = new BABYLON.Vector3(0, 2.75, -0.25);
    textPlane.parent = root;

    const textMat = createGateTextMaterial(realm, false);
    textPlane.material = textMat;

    const sideOne = BABYLON.MeshBuilder.CreateCylinder(`yggRealmGateSideOne_${realm.key}`, {
        diameter: 0.36,
        height: 4.8,
        tessellation: 18
    }, scene);

    sideOne.position = new BABYLON.Vector3(-2.35, 2.65, 0.12);
    sideOne.material = materials.darkPlatform;
    sideOne.parent = root;

    const sideTwo = BABYLON.MeshBuilder.CreateCylinder(`yggRealmGateSideTwo_${realm.key}`, {
        diameter: 0.36,
        height: 4.8,
        tessellation: 18
    }, scene);

    sideTwo.position = new BABYLON.Vector3(2.35, 2.65, 0.12);
    sideTwo.material = materials.darkPlatform;
    sideTwo.parent = root;

    const cap = BABYLON.MeshBuilder.CreateBox(`yggRealmGateCap_${realm.key}`, {
        width: 5.0,
        height: 0.38,
        depth: 0.7
    }, scene);

    cap.position = new BABYLON.Vector3(0, 5.08, 0.12);
    cap.material = materials.darkPlatform;
    cap.parent = root;

    for (let i = 0; i < 8; i++) {
        const runeTick = BABYLON.MeshBuilder.CreateBox(`yggGateRuneTick_${realm.key}_${i}`, {
            width: 0.07,
            height: 0.38,
            depth: 0.035
        }, scene);

        const tickAngle = (Math.PI * 2 / 8) * i;
        runeTick.position = new BABYLON.Vector3(Math.sin(tickAngle) * 1.72, 2.75 + Math.cos(tickAngle) * 1.72, -0.3);
        runeTick.rotation.z = -tickAngle;
        runeTick.material = realm.mat;
        runeTick.parent = root;
    }

    const leftPost = localToWorld2D(x, z, angle, -2.35, 0.12);
    const rightPost = localToWorld2D(x, z, angle, 2.35, 0.12);
    const centreBlock = localToWorld2D(x, z, angle, 0, 0.1);
    const promptPoint = localToWorld2D(x, z, angle, 0, -2.45);

    addCollisionCircle(leftPost.x, leftPost.z, 0.5);
    addCollisionCircle(rightPost.x, rightPost.z, 0.5);
    addCollisionCircle(centreBlock.x, centreBlock.z, 1.4);

    const promptText = realm.available
        ? `${realm.name}: ${realm.reason}\nPress E to travel.`
        : `${realm.name}: ${realm.reason}`;

    addInteractable(promptText, new BABYLON.Vector3(promptPoint.x, 0, promptPoint.z), 2.7, () => {
        if (!realm.available) return;

        if (realm.href) {
            window.location.href = realm.href;
        }
    });

    realmGateRecords.push({
        realm,
        textPlane,
        root,
        outerRing,
        innerRing,
        disc,
        textMatRunic: textMat,
        textMatEnglish: createGateTextMaterial(realm, true)
    });
}

function localToWorld2D(originX, originZ, rotationY, localX, localZ) {
    return {
        x: originX + localX * Math.cos(rotationY) + localZ * Math.sin(rotationY),
        z: originZ - localX * Math.sin(rotationY) + localZ * Math.cos(rotationY)
    };
}

function createGateTextMaterial(realm, english) {
    const texture = new BABYLON.DynamicTexture(`yggGateTextTexture_${realm.key}_${english ? "english" : "rune"}`, {
        width: 1024,
        height: 256
    }, scene, true);

    texture.hasAlpha = true;

    const context = texture.getContext();
    context.clearRect(0, 0, 1024, 256);

    context.font = english ? "bold 82px Georgia" : "bold 82px serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = realm.colour;
    context.shadowColor = realm.colour;
    context.shadowBlur = 22;
    context.fillText(english ? realm.name : realm.rune, 512, 128);

    texture.update();

    const mat = new BABYLON.StandardMaterial(`yggGateTextMat_${realm.key}_${english ? "english" : "rune"}`, scene);
    mat.diffuseTexture = texture;
    mat.emissiveTexture = texture;
    mat.opacityTexture = texture;
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.specularColor = new BABYLON.Color3(0, 0, 0);

    return mat;
}

function createAsgardPortal(materials) {
    if (progress.hasShard) {
        createCollapsedAsgardRemnant(materials);
        return;
    }

    const root = new BABYLON.TransformNode("yggAsgardFloatingPortalRoot", scene);
    root.position = new BABYLON.Vector3(0, 0, -16.4);

    const brokenLeft = BABYLON.MeshBuilder.CreateBox("yggAsgardBrokenLeft", {
        width: 0.55,
        height: 4.6,
        depth: 0.55
    }, scene);

    brokenLeft.position = new BABYLON.Vector3(-2.25, 3.0, 0);
    brokenLeft.rotation.z = BABYLON.Tools.ToRadians(-6);
    brokenLeft.material = materials.platform;
    brokenLeft.parent = root;

    const brokenRight = BABYLON.MeshBuilder.CreateBox("yggAsgardBrokenRight", {
        width: 0.55,
        height: 3.7,
        depth: 0.55
    }, scene);

    brokenRight.position = new BABYLON.Vector3(2.25, 2.6, 0);
    brokenRight.rotation.z = BABYLON.Tools.ToRadians(7);
    brokenRight.material = materials.platform;
    brokenRight.parent = root;

    const topBroken = BABYLON.MeshBuilder.CreateBox("yggAsgardBrokenTop", {
        width: 4.4,
        height: 0.48,
        depth: 0.55
    }, scene);

    topBroken.position = new BABYLON.Vector3(0, 5.1, 0);
    topBroken.rotation.z = BABYLON.Tools.ToRadians(-4);
    topBroken.material = materials.darkPlatform;
    topBroken.parent = root;

    const ring = BABYLON.MeshBuilder.CreateTorus("yggAsgardUnstableRing", {
        diameter: 3.15,
        thickness: 0.08,
        tessellation: 96
    }, scene);

    ring.position = new BABYLON.Vector3(0, 3.05, -0.2);
    ring.material = materials.runePurple;
    ring.parent = root;

    const inner = BABYLON.MeshBuilder.CreateTorus("yggAsgardUnstableInner", {
        diameter: 2.25,
        thickness: 0.05,
        tessellation: 96
    }, scene);

    inner.position = new BABYLON.Vector3(0, 3.05, -0.25);
    inner.rotation.z = Math.PI / 5;
    inner.material = materials.runeBlue;
    inner.parent = root;

    const core = BABYLON.MeshBuilder.CreateSphere("yggAsgardUnstableCore", {
        diameter: 1.25,
        segments: 32
    }, scene);

    core.position = new BABYLON.Vector3(0, 3.05, -0.3);
    core.material = materials.runePurple;
    core.parent = root;

    for (let i = 0; i < 14; i++) {
        const shard = BABYLON.MeshBuilder.CreatePolyhedron(`yggAsgardPortalDebris_${i}`, {
            type: 2,
            size: 1
        }, scene);

        const debrisAngle = (Math.PI * 2 / 14) * i;
        shard.position = new BABYLON.Vector3(Math.sin(debrisAngle) * (2.4 + (i % 3) * 0.18), 3.1 + Math.cos(debrisAngle * 1.7) * 1.2, Math.cos(debrisAngle) * 0.6);
        shard.scaling = new BABYLON.Vector3(0.18 + (i % 3) * 0.1, 0.14 + (i % 4) * 0.08, 0.12 + (i % 2) * 0.09);
        shard.rotation.y = debrisAngle;
        shard.material = i % 2 === 0 ? materials.platform : materials.darkPlatform;
        shard.parent = root;
        shard.convertToFlatShadedMesh();
    }

    addCollisionCircle(-2.25, -16.4, 0.55);
    addCollisionCircle(2.25, -16.4, 0.55);
    addCollisionCircle(0, -16.4, 1.45);

    addInteractable("Asgard Remnants: A temporary bridge hangs in the branches of Yggdrasil.\nPress E to cross before it collapses.", new BABYLON.Vector3(0, 0, -13.9), 3.7, () => {
        window.location.href = "asgard.html";
    });
}

function createCollapsedAsgardRemnant(materials) {
    const root = new BABYLON.TransformNode("yggAsgardCollapsedRoot", scene);
    root.position = new BABYLON.Vector3(0, 0, -16.4);

    const base = BABYLON.MeshBuilder.CreateBox("yggAsgardCollapsedBase", {
        width: 4.5,
        height: 0.35,
        depth: 1.25
    }, scene);

    base.position.y = 0.35;
    base.material = materials.darkPlatform;
    base.parent = root;

    for (let i = 0; i < 12; i++) {
        const broken = BABYLON.MeshBuilder.CreatePolyhedron(`yggAsgardCollapsedStone_${i}`, {
            type: 2,
            size: 1
        }, scene);

        broken.position = new BABYLON.Vector3(-2 + (i % 6) * 0.8, 0.85 + (i % 3) * 0.18, -0.1 + Math.floor(i / 6) * 0.55);
        broken.scaling = new BABYLON.Vector3(0.28 + (i % 3) * 0.12, 0.25 + (i % 2) * 0.12, 0.22 + (i % 4) * 0.07);
        broken.rotation.y = BABYLON.Tools.ToRadians(i * 31);
        broken.material = i % 2 === 0 ? materials.platform : materials.darkPlatform;
        broken.parent = root;
        broken.convertToFlatShadedMesh();
    }

    addCollisionCircle(0, -16.4, 1.8);

    addInteractable("Asgard Remnants: The unstable bridge is gone.\nOnly broken stones remain where the portal once floated.", new BABYLON.Vector3(0, 0, -13.9), 3.5, () => {});
}

function createShardSocket(materials) {
    const base = BABYLON.MeshBuilder.CreateCylinder("yggShardSocketBase", {
        diameter: 2.5,
        height: 0.45,
        tessellation: 48
    }, scene);

    base.position = new BABYLON.Vector3(0, 0.95, 6.2);
    base.material = materials.darkPlatform;

    const socket = BABYLON.MeshBuilder.CreateCylinder("yggShardSocketHole", {
        diameter: 1.25,
        height: 0.16,
        tessellation: 48
    }, scene);

    socket.position = new BABYLON.Vector3(0, 1.22, 6.2);
    socket.material = progress.muspelUnlocked ? materials.runeCyan : materials.black;

    const socketRing = BABYLON.MeshBuilder.CreateTorus("yggShardSocketRing", {
        diameter: 1.7,
        thickness: 0.055,
        tessellation: 64
    }, scene);

    socketRing.position = new BABYLON.Vector3(0, 1.33, 6.2);
    socketRing.rotation.x = Math.PI / 2;
    socketRing.material = progress.muspelUnlocked ? materials.runeCyan : materials.runeWhite;

    if (progress.muspelUnlocked) {
        addInteractable("Mjolnir Shard Socket: The shard has already powered this root-path.\nYou still carry the shard. Muspelheim remains open.", new BABYLON.Vector3(0, 0, 6.2), 2.4, () => {});
    } else if (progress.hasShard) {
        addInteractable("Mjolnir Shard Socket: Yggdrasil can draw power from the Mjolnir shard.\nPress E to channel the shard's power and unlock Muspelheim.", new BABYLON.Vector3(0, 0, 6.2), 2.4, () => {
            localStorage.setItem("scene5HasMjolnirShard", "true");
            localStorage.setItem("scene5MuspelheimUnlocked", "true");
            localStorage.removeItem("scene5ShardSlotted");
            window.location.reload();
        });
    } else {
        addInteractable("Mjolnir Shard Socket: An empty wound in the roots.\nA powerful shard could briefly awaken the sealed path.", new BABYLON.Vector3(0, 0, 6.2), 2.4, () => {});
    }

    shardSocketRecord = { base, socket, socketRing };
    addCollisionCircle(0, 6.2, 1.35);
}

function createFloatingDebris(materials) {
    for (let i = 0; i < 26; i++) {
        const angle = seededRandom(i * 17) * Math.PI * 2;
        const radius = 7 + seededRandom(i * 19) * 15;
        const debris = BABYLON.MeshBuilder.CreatePolyhedron(`yggFloatingDebris_${i}`, {
            type: 2,
            size: 1
        }, scene);

        debris.position = new BABYLON.Vector3(Math.sin(angle) * radius, 2.5 + seededRandom(i * 23) * 7.5, Math.cos(angle) * radius);
        debris.scaling = new BABYLON.Vector3(0.12 + seededRandom(i * 29) * 0.45, 0.1 + seededRandom(i * 31) * 0.35, 0.12 + seededRandom(i * 37) * 0.45);
        debris.rotation.x = seededRandom(i * 41) * Math.PI;
        debris.rotation.y = seededRandom(i * 43) * Math.PI;
        debris.rotation.z = seededRandom(i * 47) * Math.PI;
        debris.material = i % 2 === 0 ? materials.platform : materials.rock;
        debris.convertToFlatShadedMesh();
        debris.metadata = {
            baseY: debris.position.y,
            speed: 0.35 + seededRandom(i * 53) * 0.5,
            offset: seededRandom(i * 59) * Math.PI * 2
        };
    }
}

function createGroundRune(name, text, x, z, size, colour, rotation) {
    const texture = new BABYLON.DynamicTexture(`${name}Texture`, {
        width: 512,
        height: 256
    }, scene, true);

    texture.hasAlpha = true;

    const context = texture.getContext();
    context.clearRect(0, 0, 512, 256);
    context.font = "bold 92px serif";
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

    plane.position = new BABYLON.Vector3(x, 0.36, z);
    plane.rotation.x = Math.PI / 2;
    plane.rotation.z = rotation;
    plane.material = mat;
    plane.isPickable = false;

    return plane;
}

function createRunicFloorDetails(materials) {
    const outerRunes = [
        "ᚨ", "ᛒ", "ᚦ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ",
        "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ",
        "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ", "ᚠ"
    ];

    for (let i = 0; i < outerRunes.length; i++) {
        const angle = (Math.PI * 2 / outerRunes.length) * i;
        const radius = 12.4;

        createGroundRune(
            `yggOuterGroundRune_${i}`,
            outerRunes[i],
            Math.sin(angle) * radius,
            Math.cos(angle) * radius,
            1.15,
            i % 4 === 0 ? "#facc15" : "#5eead4",
            -angle
        );
    }

    const gateRunes = [
        ["ᚨᛚᚠᚺᛖᛁᛗ", -140, "#8ee8ff"],
        ["ᛃᛟᛏᚢᚾᚺᛖᛁᛗ", -100, "#eab308"],
        ["ᚹᚨᚾᚨᚺᛖᛁᛗ", -60, "#22c55e"],
        ["ᛗᛁᛞᚷᚨᚱᛞ", -20, "#9a6b3f"],
        ["ᛊᚹᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ", 20, "#d97706"],
        ["ᚾᛁᚠᛚᚺᛖᛁᛗ", 60, "#93c5fd"],
        ["ᚺᛖᛚᚺᛖᛁᛗ", 100, "#2dd4bf"],
        ["ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ", 140, "#ef4444"]
    ];

    gateRunes.forEach((data, index) => {
        const angle = BABYLON.Tools.ToRadians(data[1]);
        const distance = 8.6;

        createGroundRune(
            `yggGatePathRune_${index}`,
            data[0],
            Math.sin(angle) * distance,
            Math.cos(angle) * distance,
            2.4,
            data[2],
            -angle
        );
    });

    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        const radius = 4.9;

        createGroundRune(
            `yggInnerRootRune_${i}`,
            i % 2 === 0 ? "ᚱ" : "ᛟ",
            Math.sin(angle) * radius,
            Math.cos(angle) * radius,
            0.9,
            "#14b8a6",
            -angle
        );
    }
}

function createAmbientParticles(materials) {
    for (let i = 0; i < 120; i++) {
        const particle = BABYLON.MeshBuilder.CreateSphere(`yggAmbientParticle_${i}`, {
            diameter: 0.035 + seededRandom(i * 7) * 0.05,
            segments: 8
        }, scene);

        const angle = seededRandom(i * 11) * Math.PI * 2;
        const radius = seededRandom(i * 13) * 18;
        particle.position = new BABYLON.Vector3(Math.sin(angle) * radius, 0.8 + seededRandom(i * 17) * 8, Math.cos(angle) * radius);
        particle.material = i % 4 === 0 ? materials.runeGold : materials.runeCyan;
        particle.metadata = {
            angle,
            radius,
            baseY: particle.position.y,
            speed: 0.15 + seededRandom(i * 19) * 0.35,
            offset: seededRandom(i * 23) * Math.PI * 2
        };
    }
}

function createBridgeStones(materials) {
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

    const xLimit = 18.2;
    const zLimit = 18.2;
    const x = player.root.position.x;
    const z = player.root.position.z;
    const ellipse = (x * x) / (xLimit * xLimit) + (z * z) / (zLimit * zLimit);

    if (ellipse > 1) {
        const scale = 1 / Math.sqrt(ellipse);
        player.root.position.x = x * scale;
        player.root.position.z = z * scale;
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

    updateGateTextProximity();
}

function updateGateTextProximity() {
    realmGateRecords.forEach((record) => {
        const gateWorld = record.root.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(player.root.position, gateWorld);
        record.textPlane.material = distance < 4.0 ? record.textMatEnglish : record.textMatRunic;
    });
}

function updateAnimatedObjects() {
    const time = performance.now() * 0.001;

    scene.meshes.forEach((mesh) => {
        if (mesh.name.includes("yggRealmGateOuterRing")) {
            mesh.rotation.z += 0.003;
        }

        if (mesh.name.includes("yggRealmGateInnerRing")) {
            mesh.rotation.z -= 0.004;
        }

        if (mesh.name.includes("yggAsgardUnstableRing")) {
            mesh.rotation.z += 0.009;
            mesh.scaling.x = 1 + Math.sin(time * 4) * 0.03;
            mesh.scaling.y = 1 + Math.cos(time * 5) * 0.03;
        }

        if (mesh.name.includes("yggAsgardUnstableInner")) {
            mesh.rotation.z -= 0.012;
        }

        if (mesh.name.includes("yggAsgardUnstableCore")) {
            mesh.scaling.setAll(1 + Math.sin(time * 5.5) * 0.08);
        }

        if (mesh.name.includes("yggFloatingDebris") && mesh.metadata) {
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.25;
            mesh.rotation.y += 0.002 * mesh.metadata.speed;
        }

        if (mesh.name.includes("yggAmbientParticle") && mesh.metadata) {
            mesh.metadata.angle += 0.002 * mesh.metadata.speed;
            mesh.position.x = Math.sin(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.z = Math.cos(mesh.metadata.angle) * mesh.metadata.radius;
            mesh.position.y = mesh.metadata.baseY + Math.sin(time * mesh.metadata.speed + mesh.metadata.offset) * 0.3;
        }

        if (mesh.name === "yggSlottedMjolnirShard") {
            mesh.rotation.y += 0.01;
            mesh.position.y = 1.72 + Math.sin(time * 2.6) * 0.08;
        }
    });

    if (shardSocketRecord && progress.hasShard && !progress.muspelUnlocked) {
        shardSocketRecord.socketRing.rotation.z += 0.01;
    }
}

function getWalkHeight(x, z) {
    const centerDistance = Math.sqrt(x * x + z * z);

    if (centerDistance < 4.25) {
        return 0.74;
    }

    if (centerDistance < 17.5) {
        return 0.1;
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
    if (!progress.hasShard) {
        return "The hub is active. Midgard remains open, but most realm gates are sealed. Use the unstable Asgard bridge to recover the Mjolnir shard.";
    }

    if (progress.hasShard && !progress.muspelUnlocked) {
        return "The Asgard bridge has collapsed. Use the Mjolnir shard as a temporary power source to awaken the Muspelheim gate.";
    }

    return "The Mjolnir shard has powered Yggdrasil. You still carry it, and Muspelheim is now open.";
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
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    if (glowHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(glowHex).scale(0.55);
    } else if (emissiveHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.16);
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

function setYggdrasilSky() {
    if (skyModelRoot) {
        skyModelRoot.dispose();
        skyModelRoot = null;
    }

    const basePath = "../../assets/Scene%205%20Assets/Skyboxes/";
    const modelPath = `${basePath}Yggdrasil/source/`;
    const texturePath = `${basePath}Yggdrasil/textures/Yggdrasil.png`;

    skyModelRoot = new BABYLON.TransformNode("yggdrasilSkyRoot", scene);

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, "Yggdrasil.glb", scene).then((result) => {
        const skyTexture = new BABYLON.Texture(texturePath, scene, false, true);
        skyTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        skyTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        const skyMat = new BABYLON.StandardMaterial("yggdrasilSkyMat", scene);
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
                skyModelRoot.rotation.y += 0.00025;
            }
        });
    }).catch((error) => {
        console.error("Yggdrasil sky failed to load:", error);
    });
}

function seededRandom(seed) {
    const x = Math.sin(seed * 999.123) * 10000;
    return x - Math.floor(x);
}

scene = createYggdrasilScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());
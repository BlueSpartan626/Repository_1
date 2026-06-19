const scene5Setup = setupEngineAndCanvas();
const canvas = scene5Setup.canvas;
const engine = scene5Setup.engine;

let scene = null;
let camera = null;
let skyModelRoot = null;
let animatedMeshes = [];

const ASSET_ROOT = "../assets/Scene%205%20Assets/";

function createScene5MenuScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.015, 0.012, 0.03, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = new BABYLON.Color3(0.035, 0.05, 0.065);
    scene.fogDensity = 0.0025;

    camera = new BABYLON.ArcRotateCamera(
        "scene5MenuCamera",
        BABYLON.Tools.ToRadians(180),
        BABYLON.Tools.ToRadians(58),
        22,
        new BABYLON.Vector3(0, 2.9, 0),
        scene
    );

    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 17;
    camera.upperRadiusLimit = 30;
    camera.lowerBetaLimit = BABYLON.Tools.ToRadians(40);
    camera.upperBetaLimit = BABYLON.Tools.ToRadians(72);
    camera.wheelDeltaPercentage = 0.01;
    camera.panningSensibility = 0;
    scene.activeCamera = camera;

    const hemi = new BABYLON.HemisphericLight("scene5MenuHemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.45;
    hemi.diffuse = new BABYLON.Color3(0.5, 0.9, 1.0);
    hemi.groundColor = new BABYLON.Color3(0.03, 0.04, 0.06);

    const coreLight = new BABYLON.PointLight("scene5MenuCoreLight", new BABYLON.Vector3(0, 5.5, 0), scene);
    coreLight.intensity = 2.2;
    coreLight.range = 24;
    coreLight.diffuse = new BABYLON.Color3(0.1, 1.0, 0.85);

    const gateLight = new BABYLON.PointLight("scene5MenuGateLight", new BABYLON.Vector3(0, 3, -6), scene);
    gateLight.intensity = 1.8;
    gateLight.range = 28;
    gateLight.diffuse = new BABYLON.Color3(0.45, 0.7, 1.0);

    setMenuSky();

    const materials = createMenuMaterials();

    createHubPlatform(materials);
    createWorldTree(materials);
    createRealmGates(materials);
    createFloatingDebris(materials);
    createMenuUI();

    scene.onBeforeRenderObservable.add(() => {
        updateMenuAnimation();
    });

    return scene;
}

function createMenuMaterials() {
    return {
        platform: makePbrMat("menuPlatformStone", "Midgard/Temple Stone", "#546566", 3.4),
        darkPlatform: makePbrMat("menuDarkPlatformStone", "Midgard/Temple Stone", "#172027", 4.2),
        bark: makePbrMat("menuTreeBark", "Midgard/Bark", "#2b1b13", 2.2),
        leaves: makePbrMat("menuTreeLeaves", "Midgard/Moss", "#0a2d1c", 4),
        cyan: makeMat("menuCyan", "#67e8f9", "#0891b2", "#22d3ee"),
        teal: makeMat("menuTeal", "#5eead4", "#0f766e", "#2dd4bf"),
        blue: makeMat("menuBlue", "#818cf8", "#3730a3", "#6366f1"),
        gold: makeMat("menuGold", "#facc15", "#a16207", "#f59e0b"),
        red: makeMat("menuRed", "#ef4444", "#7f1d1d", "#ef4444"),
        purple: makeMat("menuPurple", "#a78bfa", "#4c1d95", "#8b5cf6"),
        green: makeMat("menuGreen", "#86efac", "#166534", "#22c55e"),
        black: makeMat("menuBlack", "#02030a", "#000000"),
        voidStone: makeMat("menuVoidStone", "#10151c", "#030712")
    };
}

function createHubPlatform(materials) {
    const lower = BABYLON.MeshBuilder.CreateCylinder("scene5MenuLowerPlatform", {
        diameter: 15.8,
        height: 0.7,
        tessellation: 128
    }, scene);

    lower.position.y = -0.35;
    lower.material = materials.darkPlatform;

    const upper = BABYLON.MeshBuilder.CreateCylinder("scene5MenuUpperPlatform", {
        diameter: 14.2,
        height: 0.2,
        tessellation: 128
    }, scene);

    upper.position.y = 0.08;
    upper.material = materials.platform;

    const outerRing = BABYLON.MeshBuilder.CreateTorus("scene5MenuOuterRing", {
        diameter: 14.9,
        thickness: 0.045,
        tessellation: 160
    }, scene);

    outerRing.position.y = 0.25;
    outerRing.rotation.x = Math.PI / 2;
    outerRing.material = materials.teal;
    animatedMeshes.push({ mesh: outerRing, speed: 0.002, axis: "z" });

    const innerRing = BABYLON.MeshBuilder.CreateTorus("scene5MenuInnerRing", {
        diameter: 6.8,
        thickness: 0.05,
        tessellation: 128
    }, scene);

    innerRing.position.y = 0.33;
    innerRing.rotation.x = Math.PI / 2;
    innerRing.material = materials.cyan;
    animatedMeshes.push({ mesh: innerRing, speed: -0.003, axis: "z" });

    for (let i = 0; i < 22; i++) {
        const angle = (Math.PI * 2 / 22) * i;
        const radius = 6.7 + seededRandom(i * 17) * 0.75;

        const stone = BABYLON.MeshBuilder.CreatePolyhedron(`scene5MenuEdgeStone_${i}`, {
            type: 2,
            size: 1
        }, scene);

        stone.position = new BABYLON.Vector3(
            Math.sin(angle) * radius,
            0.38 + seededRandom(i * 19) * 0.22,
            Math.cos(angle) * radius
        );

        stone.scaling = new BABYLON.Vector3(
            0.2 + seededRandom(i * 23) * 0.38,
            0.14 + seededRandom(i * 29) * 0.3,
            0.2 + seededRandom(i * 31) * 0.38
        );

        stone.rotation.x = seededRandom(i * 37) * Math.PI;
        stone.rotation.y = seededRandom(i * 41) * Math.PI;
        stone.material = i % 2 === 0 ? materials.voidStone : materials.darkPlatform;
        stone.convertToFlatShadedMesh();
    }
}

function createWorldTree(materials) {
        const treeBase = BABYLON.MeshBuilder.CreateCylinder("scene5MenuTreeBase", {
        diameter: 4.4,
        height: 0.38,
        tessellation: 96
    }, scene);

    treeBase.position.y = 0.42;
    treeBase.material = materials.darkPlatform;

    const treeBaseTop = BABYLON.MeshBuilder.CreateCylinder("scene5MenuTreeBaseTop", {
        diameter: 3.45,
        height: 0.16,
        tessellation: 96
    }, scene);

    treeBaseTop.position.y = 0.72;
    treeBaseTop.material = materials.platform;

    const treeBaseRing = BABYLON.MeshBuilder.CreateTorus("scene5MenuTreeBaseRing", {
        diameter: 4.85,
        thickness: 0.045,
        tessellation: 128
    }, scene);

    treeBaseRing.position.y = 0.78;
    treeBaseRing.rotation.x = Math.PI / 2;
    treeBaseRing.material = materials.teal;
    animatedMeshes.push({ mesh: treeBaseRing, speed: 0.004, axis: "z" });

    const trunk = BABYLON.MeshBuilder.CreateCylinder("scene5MenuTreeTrunk", {
        diameterTop: 0.85,
        diameterBottom: 1.65,
        height: 6.8,
        tessellation: 22
    }, scene);

    trunk.position.y = 3.45;
    trunk.material = materials.bark;

    const rootData = [
        [0, 0, 4.2, 0],
        [0, 0, 3.7, 45],
        [0, 0, 4.0, 90],
        [0, 0, 3.6, 135],
        [0, 0, 4.1, 180],
        [0, 0, 3.8, 225],
        [0, 0, 4.0, 270],
        [0, 0, 3.7, 315]
    ];

    rootData.forEach((root, index) => {
        const branch = BABYLON.MeshBuilder.CreateCylinder(`scene5MenuRoot_${index}`, {
            diameterTop: 0.18,
            diameterBottom: 0.48,
            height: root[2],
            tessellation: 12
        }, scene);

        branch.position = new BABYLON.Vector3(
            Math.sin(BABYLON.Tools.ToRadians(root[3])) * root[2] * 0.42,
            0.42,
            Math.cos(BABYLON.Tools.ToRadians(root[3])) * root[2] * 0.28
        );

        branch.rotation.z = Math.PI / 2;
        branch.rotation.y = BABYLON.Tools.ToRadians(root[3]);
        branch.material = materials.bark;
    });

    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;

        const branch = BABYLON.MeshBuilder.CreateCylinder(`scene5MenuTreeBranch_${i}`, {
            diameterTop: 0.12,
            diameterBottom: 0.32,
            height: 3.4 + seededRandom(i * 13) * 1.3,
            tessellation: 12
        }, scene);

        branch.position = new BABYLON.Vector3(
            Math.sin(angle) * 0.9,
            4.7 + seededRandom(i * 17) * 1.6,
            Math.cos(angle) * 0.65
        );

        branch.rotation.z = BABYLON.Tools.ToRadians(65);
        branch.rotation.y = angle;
        branch.material = materials.bark;
    }

    const canopyData = [
        [0, 7.1, 0, 2.8, 0.75, 2.0],
        [-1.7, 6.7, 0.3, 2.2, 0.58, 1.65],
        [1.7, 6.75, -0.1, 2.25, 0.58, 1.65],
        [0.4, 6.55, 1.2, 2.1, 0.52, 1.5],
        [-0.3, 6.55, -1.25, 2.0, 0.52, 1.45],
        [-2.4, 6.25, -0.75, 1.7, 0.45, 1.2],
        [2.4, 6.3, 0.75, 1.7, 0.45, 1.2]
    ];

    canopyData.forEach((data, index) => {
        const canopy = BABYLON.MeshBuilder.CreateIcoSphere(`scene5MenuTreeCanopy_${index}`, {
            radius: 1,
            subdivisions: 2
        }, scene);

        canopy.position = new BABYLON.Vector3(data[0], data[1], data[2]);
        canopy.scaling = new BABYLON.Vector3(data[3], data[4], data[5]);
        canopy.material = materials.leaves;
        canopy.convertToFlatShadedMesh();
    });

    const crownRing = BABYLON.MeshBuilder.CreateTorus("scene5MenuTreeCrownRing", {
        diameter: 5.2,
        thickness: 0.04,
        tessellation: 128
    }, scene);

    crownRing.position = new BABYLON.Vector3(0, 4.7, 0);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.material = materials.teal;
    animatedMeshes.push({ mesh: crownRing, speed: 0.004, axis: "z" });
}

function createRealmGates(materials) {
    const gates = [
        {
            name: "Yggdrasil Hub",
            href: "Realms/yggdrasil.html",
            colour: materials.teal,
            angle: -135,
            icon: "ᛉ"
        },
        {
            name: "Midgard",
            href: "Realms/midgard.html",
            colour: materials.gold,
            angle: -45,
            icon: "ᛗ"
        },
        {
            name: "Asgard Remnants",
            href: "Realms/asgard.html",
            colour: materials.purple,
            angle: 135,
            icon: "ᚨ"
        },
        {
            name: "Muspelheim",
            href: "Realms/muspelheim.html",
            colour: materials.red,
            angle: 45,
            icon: "ᛊ"
        }
    ];

    gates.forEach((gate, index) => {
        createRealmGate(gate, index, materials);
    });
}

function createRealmGate(gate, index, materials) {
    const angle = BABYLON.Tools.ToRadians(gate.angle);
    const radius = 6.4;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;

    const root = new BABYLON.TransformNode(`scene5MenuGateRoot_${index}`, scene);
    root.position = new BABYLON.Vector3(x, 0.25, z);
    root.rotation.y = angle;

    const base = BABYLON.MeshBuilder.CreateBox(`scene5MenuGateBase_${index}`, {
        width: 2.15,
        height: 0.34,
        depth: 1.25
    }, scene);

    base.position = new BABYLON.Vector3(0, 0.08, 0);
    base.material = materials.darkPlatform;
    base.parent = root;

    const left = BABYLON.MeshBuilder.CreateBox(`scene5MenuGateLeft_${index}`, {
        width: 0.24,
        height: 2.8,
        depth: 0.24
    }, scene);

    left.position = new BABYLON.Vector3(-0.9, 1.52, 0);
    left.material = materials.darkPlatform;
    left.parent = root;

    const right = BABYLON.MeshBuilder.CreateBox(`scene5MenuGateRight_${index}`, {
        width: 0.24,
        height: 2.8,
        depth: 0.24
    }, scene);

    right.position = new BABYLON.Vector3(0.9, 1.52, 0);
    right.material = materials.darkPlatform;
    right.parent = root;

    const top = BABYLON.MeshBuilder.CreateBox(`scene5MenuGateTop_${index}`, {
        width: 2.2,
        height: 0.22,
        depth: 0.28
    }, scene);

    top.position = new BABYLON.Vector3(0, 2.85, 0);
    top.material = materials.darkPlatform;
    top.parent = root;

    const portal = BABYLON.MeshBuilder.CreateTorus(`scene5MenuGatePortal_${index}`, {
        diameter: 1.55,
        thickness: 0.055,
        tessellation: 72
    }, scene);

    portal.position = new BABYLON.Vector3(0, 1.48, -0.08);
    portal.material = gate.colour;
    portal.parent = root;
    animatedMeshes.push({ mesh: portal, speed: index % 2 === 0 ? 0.011 : -0.011, axis: "z" });

    const core = BABYLON.MeshBuilder.CreateSphere(`scene5MenuGateCore_${index}`, {
        diameter: 0.54,
        segments: 24
    }, scene);

    core.position = new BABYLON.Vector3(0, 1.48, -0.11);
    core.material = gate.colour;
    core.parent = root;
    animatedMeshes.push({ mesh: core, pulse: true, offset: index * 0.8 });

    const rune = createTextPlane(`scene5MenuGateRune_${index}`, gate.icon, 1.0, 0.75, "#ffffff", gate.colour);
    rune.position = new BABYLON.Vector3(0, 1.48, -0.17);
    rune.parent = root;

    const label = createTextPlane(`scene5MenuGateLabel_${index}`, gate.name, 4.2, 0.8, "#e5e7eb", gate.colour);
    label.position = new BABYLON.Vector3(0, 3.55, -0.2);
    label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    label.parent = root;
}

function createFloatingDebris(materials) {
    for (let i = 0; i < 34; i++) {
        const angle = seededRandom(i * 17) * Math.PI * 2;
        const radius = 8 + seededRandom(i * 23) * 11;

        const debris = BABYLON.MeshBuilder.CreatePolyhedron(`scene5MenuFloatingDebris_${i}`, {
            type: 2,
            size: 1
        }, scene);

        debris.position = new BABYLON.Vector3(
            Math.sin(angle) * radius,
            1.2 + seededRandom(i * 29) * 7.5,
            Math.cos(angle) * radius
        );

        debris.scaling = new BABYLON.Vector3(
            0.12 + seededRandom(i * 31) * 0.55,
            0.12 + seededRandom(i * 37) * 0.5,
            0.12 + seededRandom(i * 41) * 0.55
        );

        debris.rotation.x = seededRandom(i * 43) * Math.PI;
        debris.rotation.y = seededRandom(i * 47) * Math.PI;
        debris.material = i % 2 === 0 ? materials.voidStone : materials.darkPlatform;
        debris.convertToFlatShadedMesh();

        animatedMeshes.push({
            mesh: debris,
            float: true,
            baseY: debris.position.y,
            speed: 0.25 + seededRandom(i * 53) * 0.5,
            offset: seededRandom(i * 59) * Math.PI * 2
        });
    }
}

function createMenuUI() {
    const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("scene5MenuUI", true, scene);

    const headerPanel = new BABYLON.GUI.Rectangle();
    headerPanel.width = "560px";
    headerPanel.height = "92px";
    headerPanel.cornerRadius = 10;
    headerPanel.thickness = 1;
    headerPanel.color = "#22d3ee";
    headerPanel.background = "#020617cc";
    headerPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    headerPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    headerPanel.top = "72px";
    gui.addControl(headerPanel);

    const headerStack = new BABYLON.GUI.StackPanel();
    headerStack.width = "540px";
    headerStack.height = "82px";
    headerStack.isVertical = true;
    headerStack.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    headerPanel.addControl(headerStack);

    const title = new BABYLON.GUI.TextBlock();
    title.text = "Scene 5 - Realm Switching";
    title.color = "#f8fafc";
    title.fontSize = 27;
    title.fontWeight = "bold";
    title.height = "42px";
    headerStack.addControl(title);

    const subtitle = new BABYLON.GUI.TextBlock();
    subtitle.text = "Choose a realm route through Yggdrasil";
    subtitle.color = "#cbd5e1";
    subtitle.fontSize = 14;
    subtitle.height = "28px";
    headerStack.addControl(subtitle);

    const sidePanel = new BABYLON.GUI.Rectangle();
    sidePanel.width = "325px";
    sidePanel.height = "255px";
    sidePanel.cornerRadius = 10;
    sidePanel.thickness = 1;
    sidePanel.color = "#94a3b8";
    sidePanel.background = "#020617bb";
    sidePanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    sidePanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    sidePanel.left = "-36px";
    gui.addControl(sidePanel);

    const panel = new BABYLON.GUI.StackPanel();
    panel.width = "285px";
    panel.height = "218px";
    panel.isVertical = true;
    panel.spacing = 10;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    sidePanel.addControl(panel);

    addMenuButton(panel, "Start Route: Midgard", "Realms/midgard.html");
    addMenuButton(panel, "Yggdrasil Hub", "Realms/yggdrasil.html");
    addMenuButton(panel, "Asgard Remnants", "Realms/asgard.html");
    addMenuButton(panel, "Muspelheim", "Realms/muspelheim.html");

    const notePanel = new BABYLON.GUI.Rectangle();
    notePanel.width = "690px";
    notePanel.height = "38px";
    notePanel.cornerRadius = 8;
    notePanel.thickness = 1;
    notePanel.color = "#164e63";
    notePanel.background = "#020617aa";
    notePanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    notePanel.top = "-26px";
    gui.addControl(notePanel);

    const note = new BABYLON.GUI.TextBlock();
    note.text = "Realm route: Midgard → Yggdrasil → Asgard → Yggdrasil → Muspelheim";
    note.color = "#67e8f9";
    note.fontSize = 13;
    note.fontWeight = "bold";
    notePanel.addControl(note);
}

function addMenuButton(panel, text, href) {
    const button = BABYLON.GUI.Button.CreateSimpleButton(`scene5Button_${text}`, text);
    button.width = "285px";
    button.height = "38px";
    button.color = "#f8fafc";
    button.fontSize = 14;
    button.fontWeight = "bold";
    button.background = "#111827";
    button.thickness = 1;
    button.cornerRadius = 7;

    button.onPointerEnterObservable.add(() => {
        button.background = "#0e7490";
        button.color = "#ecfeff";
    });

    button.onPointerOutObservable.add(() => {
        button.background = "#111827";
        button.color = "#f8fafc";
    });

    button.onPointerUpObservable.add(() => {
        window.location.href = href;
    });

    panel.addControl(button);
}

function createTextPlane(name, text, width, height, textColour, glowMaterial) {
    const texture = new BABYLON.DynamicTexture(`${name}Texture`, {
        width: 512,
        height: 256
    }, scene, true);

    texture.hasAlpha = true;

    const context = texture.getContext();
    context.clearRect(0, 0, 512, 256);
    context.font = name.includes("GateLabel") ? "bold 76px system-ui" : "bold 72px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = textColour;
    context.shadowColor = "#22d3ee";
    context.shadowBlur = 10;
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
        width,
        height
    }, scene);

    plane.material = mat;
    plane.isPickable = false;

    return plane;
}

function updateMenuAnimation() {
    const time = performance.now() * 0.001;

    animatedMeshes.forEach((item) => {
        if (item.axis === "z") {
            item.mesh.rotation.z += item.speed;
        }

        if (item.axis === "y") {
            item.mesh.rotation.y += item.speed;
        }

        if (item.pulse) {
            item.mesh.scaling.setAll(1 + Math.sin(time * 3.2 + item.offset) * 0.08);
        }

        if (item.float) {
            item.mesh.position.y = item.baseY + Math.sin(time * item.speed + item.offset) * 0.25;
            item.mesh.rotation.y += 0.002 * item.speed;
        }
    });

    if (skyModelRoot && scene.activeCamera) {
        skyModelRoot.position.copyFrom(scene.activeCamera.position);
        skyModelRoot.rotation.y += 0.00015;
    }
}

function setMenuSky() {
    if (skyModelRoot) {
        skyModelRoot.dispose();
        skyModelRoot = null;
    }

    const modelPath = `${ASSET_ROOT}Skyboxes/Yggdrasil/source/`;
    const texturePath = `${ASSET_ROOT}Skyboxes/Yggdrasil/textures/Yggdrasil.png`;

    skyModelRoot = new BABYLON.TransformNode("scene5MenuSkyRoot", scene);

    BABYLON.SceneLoader.ImportMeshAsync("", modelPath, "Yggdrasil.glb", scene).then((result) => {
        const skyTexture = new BABYLON.Texture(texturePath, scene, false, true);
        skyTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        skyTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        const skyMat = new BABYLON.StandardMaterial("scene5MenuSkyMat", scene);
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
    }).catch((error) => {
        console.warn("Scene 5 menu sky failed to load:", error);
    });
}

function makeMat(name, diffuseHex, emissiveHex = null, glowHex = null) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
    mat.specularColor = new BABYLON.Color3(0.035, 0.035, 0.035);

    if (glowHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(glowHex).scale(0.55);
    } else if (emissiveHex) {
        mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex).scale(0.14);
    }

    return mat;
}

function makePbrMat(name, folder, fallbackHex, tiling = 1) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(fallbackHex);
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const basePath = `${ASSET_ROOT}Textures/`;
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

function seededRandom(seed) {
    const x = Math.sin(seed * 999.123) * 10000;
    return x - Math.floor(x);
}

scene = createScene5MenuScene();

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
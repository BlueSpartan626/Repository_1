// assets/js/scene1.js
// Scene 1 – stripped down: shapes, lights, 5 unique interactions, no textures/audio.
// Once this works, we can re-add textures & sounds.

window.createScene1 = function (engine) {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.15, 0.18, 0.25, 1.0);

    // --- Camera ---
    const camera = new BABYLON.ArcRotateCamera(
        "scene1Camera",
        -Math.PI / 2,
        Math.PI / 3,
        25,
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    camera.attachControl(true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 40;

    // --- Lights ---
    const hemiLight = new BABYLON.HemisphericLight(
        "hemiLight",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    hemiLight.intensity = 0.9;

    const sun = new BABYLON.DirectionalLight(
        "sunLight",
        new BABYLON.Vector3(-0.4, -1, 0.4),
        scene
    );
    sun.intensity = 0.8;

    const shadowGen = new BABYLON.ShadowGenerator(1024, sun);
    shadowGen.usePoissonSampling = true;

    // --- Ground ---
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 40, height: 40, subdivisions: 2 },
        scene
    );
    ground.receiveShadows = true;

    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.22, 0.18); // muted green
    groundMat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    ground.material = groundMat;

    // --- Shapes (5 different ones) ---

    // Box – colour toggle
    const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
    box.position = new BABYLON.Vector3(-6, 1, 0);
    const boxMat = new BABYLON.StandardMaterial("boxMat", scene);
    boxMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3); // red
    box.material = boxMat;

    // Sphere – bounce animation
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
    sphere.position = new BABYLON.Vector3(-3, 1, 0);
    const sphereMat = new BABYLON.StandardMaterial("sphereMat", scene);
    sphereMat.diffuseColor = new BABYLON.Color3(0.4, 0.9, 1.0); // cyan
    sphere.material = sphereMat;

    // Cylinder – spin toggle
    const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {
        height: 2,
        diameter: 2
    }, scene);
    cylinder.position = new BABYLON.Vector3(0, 1, 0);
    const cylinderMat = new BABYLON.StandardMaterial("cylinderMat", scene);
    cylinderMat.diffuseColor = new BABYLON.Color3(0.4, 1, 0.6); // mint
    cylinder.material = cylinderMat;
    cylinder.__spinning = true;

    // Torus – pulse scale
    const torus = BABYLON.MeshBuilder.CreateTorus("torus", {
        diameter: 3,
        thickness: 0.6,
        tessellation: 32
    }, scene);
    torus.position = new BABYLON.Vector3(3, 1, 0);
    const torusMat = new BABYLON.StandardMaterial("torusMat", scene);
    torusMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.5); // warm yellow
    torus.material = torusMat;

    // Cone – toggles spotlight
    const cone = BABYLON.MeshBuilder.CreateCylinder("cone", {
        height: 2.5,
        diameterTop: 0,
        diameterBottom: 2,
        tessellation: 32
    }, scene);
    cone.position = new BABYLON.Vector3(6, 1.25, 0);
    const coneMat = new BABYLON.StandardMaterial("coneMat", scene);
    coneMat.diffuseColor = new BABYLON.Color3(0.7, 0.6, 1.0); // soft purple
    cone.material = coneMat;

    const spot = new BABYLON.SpotLight(
        "coneSpot",
        new BABYLON.Vector3(6, 6, 5),
        new BABYLON.Vector3(0, -1.3, -0.8),
        Math.PI / 3,
        10,
        scene
    );
    spot.intensity = 0.3;
    spot.diffuse = new BABYLON.Color3(0.9, 0.8, 1.0);

    // Shadows from all shapes
    [box, sphere, cylinder, torus, cone].forEach(mesh => shadowGen.addShadowCaster(mesh));

    // --- Animations ---

    // Sphere bounce
    const bounceAnim = new BABYLON.Animation(
        "bounceAnim",
        "position.y",
        30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const bounceKeys = [
        { frame: 0, value: sphere.position.y },
        { frame: 10, value: sphere.position.y + 2.5 },
        { frame: 20, value: sphere.position.y }
    ];
    bounceAnim.setKeys(bounceKeys);
    sphere.animations.push(bounceAnim);

    // Torus pulse (scale up/down)
    const pulseAnim = new BABYLON.Animation(
        "pulseAnim",
        "scaling",
        30,
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const baseScale = torus.scaling.clone();
    const pulseKeys = [
        { frame: 0, value: baseScale },
        { frame: 6, value: baseScale.scale(1.25) },
        { frame: 12, value: baseScale }
    ];
    pulseAnim.setKeys(pulseKeys);
    torus.animations.push(pulseAnim);

    // Cylinder spin per frame
    scene.onBeforeRenderObservable.add(() => {
        if (cylinder.__spinning) {
            const dt = scene.getEngine().getDeltaTime();
            cylinder.rotation.y += dt * 0.002;
        }
    });

    // --- Click interactions ---
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
        const pick = pointerInfo.pickInfo;
        if (!pick || !pick.hit || !pick.pickedMesh) return;

        const mesh = pick.pickedMesh;

        // Box: toggle colour red <-> blue
        if (mesh === box) {
            const c = boxMat.diffuseColor;
            const isRed = c.r > c.b;
            boxMat.diffuseColor = isRed
                ? new BABYLON.Color3(0.3, 0.5, 1.0)
                : new BABYLON.Color3(1, 0.3, 0.3);
        }

        // Sphere: bounce
        if (mesh === sphere) {
            scene.beginAnimation(sphere, 0, 20, false);
        }

        // Cylinder: toggle spinning
        if (mesh === cylinder) {
            cylinder.__spinning = !cylinder.__spinning;
        }

        // Torus: pulse scale
        if (mesh === torus) {
            scene.beginAnimation(torus, 0, 12, false);
        }

        // Cone: toggle spotlight intensity
        if (mesh === cone) {
            const isDim = spot.intensity < 0.5;
            spot.intensity = isDim ? 1.4 : 0.3;
        }
    });

    // --- HUD text (if shared.js exists) ---
    if (window.updateSceneInfoText) {
        window.updateSceneInfoText(
            "Scene 1 – Shapes",
            "Click: Box = colour • Sphere = bounce • Cylinder = spin toggle • Torus = pulse • Cone = spotlight toggle."
        );
    }

    return scene;
};
// assets/js/scene1.js
// Scene 1 – Shapes: basic meshes, textures, lighting, shadows + 5 different interactions.

window.createScene1 = function (engine) {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1.0);

    // --- Camera ---
    // Orbit camera so I can spin around the shapes without any FPS pointer-lock nonsense.
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
    // Hemi = soft global light so nothing is totally black.
    const hemiLight = new BABYLON.HemisphericLight(
        "hemiLight",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    hemiLight.intensity = 0.6;

    // Directional = fake sun for actual shadows.
    const sun = new BABYLON.DirectionalLight(
        "sunLight",
        new BABYLON.Vector3(-0.4, -1, 0.4),
        scene
    );
    sun.intensity = 1.1;

    // Shadow generator so the shapes actually cast shadows on the ground.
    const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
    shadowGen.usePoissonSampling = true;

    // --- Ground / floor ---
    // Using my grass texture here just to prove I can use textures + normal maps.
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 40, height: 40, subdivisions: 2 },
        scene
    );
    ground.receiveShadows = true;

    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    const groundDiffuse = new BABYLON.Texture("assets/ground_diffuse.png", scene);
    groundDiffuse.uScale = 6;
    groundDiffuse.vScale = 6;
    groundMat.diffuseTexture = groundDiffuse;

    const groundNormal = new BABYLON.Texture("assets/ground_normal.png", scene);
    groundNormal.uScale = 6;
    groundNormal.vScale = 6;
    groundMat.bumpTexture = groundNormal;

    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;

    // --- Shapes ---
    // Box – colour toggle
    const box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
    box.position = new BABYLON.Vector3(-6, 1, 0);

    const boxMat = new BABYLON.StandardMaterial("boxMat", scene);
    boxMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2); // red
    box.material = boxMat;

    // Sphere – bounce animation
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
    sphere.position = new BABYLON.Vector3(-3, 1, 0);

    const sphereMat = new BABYLON.StandardMaterial("sphereMat", scene);
    sphereMat.diffuseColor = new BABYLON.Color3(0.3, 0.8, 1); // cyan-ish
    sphere.material = sphereMat;

    // Cylinder – toggle spin
    const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {
        height: 2,
        diameter: 2
    }, scene);
    cylinder.position = new BABYLON.Vector3(0, 1, 0);

    const cylinderMat = new BABYLON.StandardMaterial("cylinderMat", scene);
    cylinderMat.diffuseColor = new BABYLON.Color3(0.4, 1, 0.6); // mint
    cylinder.material = cylinderMat;
    cylinder.__spinning = true; // internal toggle

    // Torus – pulse + click sound
    const torus = BABYLON.MeshBuilder.CreateTorus("torus", {
        diameter: 3,
        thickness: 0.6,
        tessellation: 32
    }, scene);
    torus.position = new BABYLON.Vector3(3, 1, 0);

    const torusMat = new BABYLON.StandardMaterial("torusMat", scene);
    torusMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.3);
    torusMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
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
    coneMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 1); // purple
    cone.material = coneMat;

    // Spotlight that starts off dim and brightens when I click the cone.
    const spot = new BABYLON.SpotLight(
        "coneSpot",
        new BABYLON.Vector3(6, 6, 5),
        new BABYLON.Vector3(0, -1.3, -0.8),
        Math.PI / 3,
        10,
        scene
    );
    spot.intensity = 0.2;
    spot.diffuse = new BABYLON.Color3(0.8, 0.7, 1.0);

    // Add all meshes (except ground) as shadow casters.
    [box, sphere, cylinder, torus, cone].forEach(mesh => shadowGen.addShadowCaster(mesh));

    // --- Audio ---
    // Simple click sound I can reuse for all interactions.
    const clickSound = new BABYLON.Sound(
        "click",
        "assets/audio_click.wav",
        scene,
        null,
        { volume: 0.7 }
    );

    // --- Animations ---
    // Sphere bounce – I only create the Animation once and play it on click.
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

    // Torus pulse animation (scales up and back down).
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
        { frame: 6, value: baseScale.scale(1.2) },
        { frame: 12, value: baseScale }
    ];
    pulseAnim.setKeys(pulseKeys);
    torus.animations.push(pulseAnim);

    // --- Per-frame updates ---
    // Cylinder spins when __spinning is true.
    scene.onBeforeRenderObservable.add(() => {
        if (cylinder.__spinning) {
            cylinder.rotation.y += scene.getEngine().getDeltaTime() * 0.0015;
        }
    });

    // --- Interaction logic ---
    // Helper so I don't spam the sound every millisecond.
    function playClick() {
        if (clickSound.isReady()) clickSound.play();
    }

    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERPICK) return;

        const pick = pointerInfo.pickInfo;
        if (!pick || !pick.hit || !pick.pickedMesh) return;

        const mesh = pick.pickedMesh;

        // Box: toggle colour.
        if (mesh === box) {
            playClick();
            const c = boxMat.diffuseColor;
            const isRed = c.r > c.b;
            if (isRed) {
                boxMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 1); // blue
            } else {
                boxMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2); // back to red
            }
        }

        // Sphere: bounce.
        if (mesh === sphere) {
            playClick();
            scene.beginAnimation(sphere, 0, 20, false);
        }

        // Cylinder: toggle spinning on/off.
        if (mesh === cylinder) {
            playClick();
            cylinder.__spinning = !cylinder.__spinning;
        }

        // Torus: pulse + emissive flash.
        if (mesh === torus) {
            playClick();
            torusMat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.5);
            scene.beginAnimation(torus, 0, 12, false, 1.0, () => {
                torusMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
            });
        }

        // Cone: toggle spotlight strength.
        if (mesh === cone) {
            playClick();
            const isDim = spot.intensity < 0.3;
            spot.intensity = isDim ? 1.4 : 0.2;
        }
    });

    // --- HUD text (shared helper from shared.js) ---
    if (window.updateSceneInfoText) {
        window.updateSceneInfoText(
            "Scene 1 – Shapes",
            "Left click a shape: Box = colour toggle • Sphere = bounce • Cylinder = spin toggle • Torus = pulse + glow • Cone = spotlight toggle"
        );
    }

    return scene;
};
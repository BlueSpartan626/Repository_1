// js/scene2.js
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas");
    const pauseOverlay = document.getElementById("pauseOverlay");

    if (!canvas) {
        console.error("Canvas with id 'renderCanvas' not found");
        return;
    }

    const engine = new BABYLON.Engine(canvas, true);

    let isPaused = false;

    const input = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jumpPressed: false
    };

    const createScene = async () => {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.12, 0.15, 0.20, 1.0);
        scene.collisionsEnabled = true;

        let terrain = null;

        let characterRoot = null;
        let characterMeshes = [];
        let animationNodes = [];

        let idleAnim = null;
        let walkAnim = null;
        let runAnim = null;
        let currentAnim = "";

        let yaw = 0;
        let pitch = 0.18;
        let verticalVelocity = 0;

        let isThirdPerson = true;

        const walkSpeed = 8.0;
        const sprintSpeed = 13.0;
        const gravity = 26.0;
        const jumpStrength = 10.5;

        const thirdPersonDistance = 7.0;
        const thirdPersonHeight = 3.0;

        const firstPersonHeight = 1.48;
        const firstPersonForwardOffset = 0.14;
        const firstPersonSprintForwardOffset = 0.26;

        const playerHalfHeight = 1.7;
        const groundSnapVelocity = -2.0;

        const characterScale = 1.35;
        const characterYOffset = -0.90;

        canvas.addEventListener("click", () => {
            if (!isPaused && document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener("mousemove", (event) => {
            if (isPaused) return;
            if (document.pointerLockElement !== canvas) return;

            yaw += event.movementX * 0.0025;
            pitch -= event.movementY * 0.0020;

            const maxPitchUp = 0.85;
            const maxPitchDown = -0.65;
            pitch = BABYLON.Scalar.Clamp(pitch, maxPitchDown, maxPitchUp);
        });

        const camera = new BABYLON.UniversalCamera(
            "playerCam",
            new BABYLON.Vector3(0, 8, -8),
            scene
        );
        camera.minZ = 0.1;
        camera.fov = 0.95;

        const hemi = new BABYLON.HemisphericLight(
            "hemi",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        hemi.intensity = 0.75;

        const sun = new BABYLON.DirectionalLight(
            "sun",
            new BABYLON.Vector3(-0.4, -1, 0.35),
            scene
        );
        sun.position = new BABYLON.Vector3(30, 60, -30);
        sun.intensity = 1.1;

        const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
        shadowGen.useExponentialShadowMap = true;

        try {
            const hdr = new BABYLON.HDRCubeTexture(
                "../assets/sky.hdr",
                scene,
                256,
                false,
                true,
                false,
                true
            );
            scene.environmentTexture = hdr;
            scene.createDefaultSkybox(hdr, true, 350, 0.5);
        } catch (e) {
            console.warn("sky.hdr failed to load:", e);
        }

        const terrainMat = new BABYLON.StandardMaterial("terrainMat", scene);
        terrainMat.diffuseTexture = new BABYLON.Texture("../assets/ground_diffuse.png", scene);
        terrainMat.bumpTexture = new BABYLON.Texture("../assets/ground_normal.png", scene);
        terrainMat.diffuseTexture.uScale = 30;
        terrainMat.diffuseTexture.vScale = 30;
        terrainMat.bumpTexture.uScale = 30;
        terrainMat.bumpTexture.vScale = 30;
        terrainMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);

        terrain = await new Promise((resolve) => {
            BABYLON.MeshBuilder.CreateGroundFromHeightMap(
                "terrain",
                "../assets/terrain_heightmap.png",
                {
                    width: 160,
                    height: 160,
                    subdivisions: 160,
                    minHeight: -1,
                    maxHeight: 28,
                    onReady: (ground) => {
                        ground.material = terrainMat;
                        ground.checkCollisions = true;
                        ground.receiveShadows = true;
                        resolve(ground);
                    }
                },
                scene
            );
        });

        createWalls(scene);
        createCamp(scene);
        await loadForestAndScatter(scene, shadowGen);

        const playerCollider = BABYLON.MeshBuilder.CreateCapsule(
            "playerCollider",
            {
                height: 3.4,
                radius: 0.55,
                tessellation: 12
            },
            scene
        );
        playerCollider.position = new BABYLON.Vector3(0, 8, 0);
        playerCollider.isVisible = false;
        playerCollider.checkCollisions = true;

        const chooseBestAnimation = (groups, keywords) => {
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
        };

        const stopAllAnimations = () => {
            [idleAnim, walkAnim, runAnim].forEach((anim) => {
                if (anim && anim.isPlaying) {
                    anim.stop();
                }
            });
        };

        const playAnimation = (name) => {
            if (currentAnim === name) return;

            stopAllAnimations();

            if (name === "idle" && idleAnim) {
                idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
                currentAnim = "idle";
                return;
            }

            if (name === "walk" && walkAnim) {
                walkAnim.start(true, 0.95, walkAnim.from, walkAnim.to, false);
                currentAnim = "walk";
                return;
            }

            if (name === "run") {
                if (runAnim) {
                    runAnim.start(true, 1.0, runAnim.from, runAnim.to, false);
                    currentAnim = "run";
                    return;
                }

                if (walkAnim) {
                    walkAnim.start(true, 1.20, walkAnim.from, walkAnim.to, false);
                    currentAnim = "run";
                    return;
                }
            }

            if (idleAnim) {
                idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false);
                currentAnim = "idle";
            } else {
                currentAnim = "";
            }
        };

        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "../assets/",
                "Solus_the_knight.gltf",
                scene
            );

            characterRoot = new BABYLON.TransformNode("characterRoot", scene);
            characterRoot.position.copyFrom(playerCollider.position);
            characterRoot.rotation = new BABYLON.Vector3(0, 0, 0);
            characterRoot.scaling = new BABYLON.Vector3(characterScale, characterScale, characterScale);

            result.meshes.forEach((mesh) => {
                if (mesh.name === "__root__") return;

                if (mesh.parent === null || mesh.parent.name === "__root__") {
                    mesh.parent = characterRoot;
                }

                mesh.isVisible = true;
                mesh.alwaysSelectAsActiveMesh = true;

                if (mesh instanceof BABYLON.Mesh) {
                    mesh.receiveShadows = true;
                    shadowGen.addShadowCaster(mesh, true);
                    characterMeshes.push(mesh);
                }
            });

            if (result.transformNodes && result.transformNodes.length > 0) {
                result.transformNodes.forEach((node) => {
                    if (node.name === "__root__") return;
                    animationNodes.push(node);
                });
            }

            if (result.animationGroups && result.animationGroups.length > 0) {
                idleAnim = chooseBestAnimation(result.animationGroups, ["idle"]);
                walkAnim = chooseBestAnimation(result.animationGroups, ["walk", "move"]);
                runAnim = chooseBestAnimation(result.animationGroups, ["run", "sprint"]);

                console.log(
                    "Animation groups found:",
                    result.animationGroups.map((g) => ({
                        name: g.name,
                        targetedAnimations: g.targetedAnimations ? g.targetedAnimations.length : 0
                    }))
                );
            } else {
                console.warn("Solus model loaded, but no animation groups were found in Solus_the_knight.gltf.");
            }

            if (idleAnim) {
                playAnimation("idle");
            }

            console.log("Solus loaded successfully");
            console.log("Visible Solus meshes:", characterMeshes.map((m) => m.name));
        } catch (e) {
            console.warn("Failed to load Solus model:", e);
        }

        const zeroOutRootMotion = () => {
            animationNodes.forEach((node) => {
                node.position.x = 0;
                node.position.z = 0;
            });
        };

        const getGrounded = () => {
            if (!terrain) return false;

            const ray = new BABYLON.Ray(
                playerCollider.position.clone(),
                BABYLON.Vector3.Down(),
                playerHalfHeight + 0.3
            );

            const hit = scene.pickWithRay(ray, (mesh) => mesh === terrain);
            return !!(hit && hit.hit && hit.distance <= playerHalfHeight + 0.2);
        };

        scene.onBeforeRenderObservable.add(() => {
            if (isPaused) return;

            const dt = engine.getDeltaTime() / 1000;

            const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
            const right = new BABYLON.Vector3(forward.z, 0, -forward.x);

            let move = BABYLON.Vector3.Zero();

            if (input.forward) move.addInPlace(forward);
            if (input.backward) move.subtractInPlace(forward);
            if (input.left) move.subtractInPlace(right);
            if (input.right) move.addInPlace(right);

            const isMoving = move.lengthSquared() > 0.0001;
            const isSprinting = isMoving && input.sprint;
            const currentSpeed = isSprinting ? sprintSpeed : walkSpeed;

            if (isMoving) {
                move = move.normalize().scale(currentSpeed * dt);
            }

            let grounded = getGrounded();

            if (grounded && verticalVelocity < 0) {
                verticalVelocity = groundSnapVelocity;
            }

            if (input.jumpPressed && grounded) {
                verticalVelocity = jumpStrength;
                grounded = false;
            }
            input.jumpPressed = false;

            if (!grounded) {
                verticalVelocity -= gravity * dt;
            }

            const totalMove = new BABYLON.Vector3(
                move.x,
                verticalVelocity * dt,
                move.z
            );

            playerCollider.moveWithCollisions(totalMove);

            const groundedAfterMove = getGrounded();
            if (groundedAfterMove && verticalVelocity < 0) {
                verticalVelocity = groundSnapVelocity;
            }

            if (characterRoot) {
                characterRoot.position.x = playerCollider.position.x;
                characterRoot.position.z = playerCollider.position.z;
                characterRoot.position.y = playerCollider.position.y + characterYOffset;

                if (isMoving) {
                    const moveYaw = Math.atan2(move.x, move.z);
                    characterRoot.rotation.y = moveYaw;
                }
            }

            if (isMoving) {
                if (isSprinting) {
                    playAnimation("run");
                } else {
                    playAnimation("walk");
                }
            } else {
                playAnimation("idle");
            }

            zeroOutRootMotion();

            if (isThirdPerson) {
                const pivot = playerCollider.position.add(new BABYLON.Vector3(0, 1.7, 0));
                const cameraOffset = BABYLON.Vector3.TransformCoordinates(
                    new BABYLON.Vector3(0, thirdPersonHeight, -thirdPersonDistance),
                    BABYLON.Matrix.RotationYawPitchRoll(yaw, -pitch, 0)
                );

                camera.position = pivot.add(cameraOffset);
                camera.setTarget(pivot);
            } else {
                const headPosition = playerCollider.position.add(
                    new BABYLON.Vector3(0, firstPersonHeight, 0)
                );

                const activeForwardOffset = input.sprint
                    ? firstPersonSprintForwardOffset
                    : firstPersonForwardOffset;

                const firstPersonPosition = headPosition.add(
                    forward.scale(activeForwardOffset)
                );

                camera.position.copyFrom(firstPersonPosition);

                const lookDirection = new BABYLON.Vector3(
                    Math.sin(yaw) * Math.cos(pitch),
                    Math.sin(pitch),
                    Math.cos(yaw) * Math.cos(pitch)
                );

                camera.setTarget(firstPersonPosition.add(lookDirection));
            }
        });

        window.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();

            if (key === "w") input.forward = true;
            if (key === "s") input.backward = true;
            if (key === "a") input.left = true;
            if (key === "d") input.right = true;
            if (key === "shift") input.sprint = true;

            if (key === "z") {
                input.jumpPressed = true;
                event.preventDefault();
            }

            if (key === "c") {
                isThirdPerson = !isThirdPerson;
                event.preventDefault();
            }

            if (key === "p") {
                togglePause();
                event.preventDefault();
            }
        });

        window.addEventListener("keyup", (event) => {
            const key = event.key.toLowerCase();

            if (key === "w") input.forward = false;
            if (key === "s") input.backward = false;
            if (key === "a") input.left = false;
            if (key === "d") input.right = false;
            if (key === "shift") input.sprint = false;
        });

        return scene;
    };

    const scenePromise = createScene();

    engine.runRenderLoop(async () => {
        const scene = await scenePromise;
        if (!isPaused) {
            scene.render();
        }
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });

    function togglePause() {
        isPaused = !isPaused;

        if (isPaused) {
            document.exitPointerLock?.();
            pauseOverlay.style.display = "flex";
        } else {
            pauseOverlay.style.display = "none";
        }
    }

    async function loadForestAndScatter(scene, shadowGen) {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "../assets/forest/",
                "scene.gltf",
                scene
            );

            console.log("Forest meshes:", result.meshes.map((m) => m.name));

            const forestRoot = new BABYLON.TransformNode("forestRoot", scene);

            result.meshes.forEach((mesh) => {
                if (mesh.name === "__root__") return;

                if (mesh.parent === null || mesh.parent.name === "__root__") {
                    mesh.parent = forestRoot;
                }

                mesh.isPickable = false;

                if (mesh instanceof BABYLON.Mesh) {
                    mesh.receiveShadows = true;
                    mesh.checkCollisions = true;
                    shadowGen.addShadowCaster(mesh, true);
                }
            });

            if (result.transformNodes && result.transformNodes.length > 0) {
                result.transformNodes.forEach((node) => {
                    if (node.name === "__root__") return;

                    if (node.parent === null || node.parent.name === "__root__") {
                        node.parent = forestRoot;
                    }
                });
            }

            forestRoot.setEnabled(false);

            const chunkPlacements = [
                { x: -26, z: -18, rot: 0.3, scale: 0.85 },
                { x:  24, z: -16, rot: 1.1, scale: 0.85 },
                { x: -28, z:  18, rot: 2.1, scale: 0.90 },
                { x:  26, z:  20, rot: 2.7, scale: 0.90 },
                { x:   0, z:  34, rot: 0.5, scale: 0.80 },
                { x:   0, z: -34, rot: 2.4, scale: 0.80 }
            ];

            chunkPlacements.forEach((cfg, index) => {
                const clone = forestRoot.clone(`forestChunk_${index}`);

                if (!clone) return;

                clone.position = new BABYLON.Vector3(cfg.x, 0, cfg.z);
                clone.rotation = new BABYLON.Vector3(0, cfg.rot, 0);
                clone.scaling = new BABYLON.Vector3(cfg.scale, cfg.scale, cfg.scale);
                clone.setEnabled(true);

                const descendants = clone.getChildMeshes(false);
                descendants.forEach((mesh) => {
                    mesh.isPickable = false;
                    mesh.receiveShadows = true;
                    mesh.checkCollisions = true;
                });
            });
        } catch (e) {
            console.warn("Failed to load forest scene:", e);
        }
    }

    function createCamp(scene) {
        const campRoot = new BABYLON.TransformNode("campRoot", scene);
        campRoot.position = new BABYLON.Vector3(0, 0, 22);

        const emberMat = new BABYLON.StandardMaterial("emberMat", scene);
        emberMat.diffuseColor = new BABYLON.Color3(0.9, 0.45, 0.1);
        emberMat.emissiveColor = new BABYLON.Color3(1.0, 0.45, 0.1);

        const fireCore = BABYLON.MeshBuilder.CreateSphere(
            "fireCore",
            { diameter: 1.0, segments: 12 },
            scene
        );
        fireCore.parent = campRoot;
        fireCore.position = new BABYLON.Vector3(0, 0.45, 0);
        fireCore.material = emberMat;

        const fireLight = new BABYLON.PointLight(
            "fireLight",
            new BABYLON.Vector3(0, 1.4, 22),
            scene
        );
        fireLight.intensity = 2.8;
        fireLight.range = 22;
        fireLight.diffuse = new BABYLON.Color3(1.0, 0.65, 0.3);

        const logMat = new BABYLON.StandardMaterial("logMat", scene);
        logMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);

        const rockMat = new BABYLON.StandardMaterial("campRockMat", scene);
        rockMat.diffuseColor = new BABYLON.Color3(0.28, 0.28, 0.30);

        for (let i = 0; i < 2; i++) {
            const log = BABYLON.MeshBuilder.CreateCylinder(
                `campLog_${i}`,
                { height: 2.2, diameter: 0.22, tessellation: 8 },
                scene
            );
            log.parent = campRoot;
            log.position = new BABYLON.Vector3(0, 0.16, 0);
            log.rotation.z = Math.PI / 2.5;
            log.rotation.y = i === 0 ? Math.PI / 4 : -Math.PI / 4;
            log.material = logMat;
        }

        const rockPositions = [
            [-1.1, 0.18, 0.0],
            [ 1.1, 0.18, 0.0],
            [ 0.0, 0.18, 1.1],
            [ 0.0, 0.18,-1.1],
            [-0.75,0.18, 0.75],
            [ 0.75,0.18,-0.75]
        ];

        rockPositions.forEach((pos, index) => {
            const rock = BABYLON.MeshBuilder.CreateSphere(
                `campRock_${index}`,
                { diameterX: 0.65, diameterY: 0.38, diameterZ: 0.55, segments: 10 },
                scene
            );
            rock.parent = campRoot;
            rock.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
            rock.material = rockMat;
        });
    }

    function createWalls(scene) {
        const size = 145;
        const height = 12;
        const thick = 3;

        const wallMat = new BABYLON.StandardMaterial("wallMat", scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.10, 0.10, 0.10);
        wallMat.specularColor = new BABYLON.Color3(0, 0, 0);

        [
            { x: 0, z: size / 2, width: size, depth: thick },
            { x: 0, z: -size / 2, width: size, depth: thick },
            { x: size / 2, z: 0, width: thick, depth: size },
            { x: -size / 2, z: 0, width: thick, depth: size }
        ].forEach((config, index) => {
            const wall = BABYLON.MeshBuilder.CreateBox(
                `wall${index}`,
                {
                    width: config.width,
                    height: height,
                    depth: config.depth
                },
                scene
            );

            wall.position = new BABYLON.Vector3(config.x, height / 2, config.z);
            wall.checkCollisions = true;
            wall.material = wallMat;
            wall.isPickable = false;
        });
    }
});
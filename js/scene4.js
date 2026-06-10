// js/scene4.js
const s4 = setupEngineAndCanvas();
const canvas4 = s4.canvas;
const engine4 = s4.engine;

let scene4Audio = null;

const SCENE4_TRACKS = [
    {
        title: "Chiptune Pulse",
        file: "../assets/Scene%204%20Audio/Track%201.mp3"
    },
    {
        title: "Neon Circuit",
        file: "../assets/Scene%204%20Audio/Track%202.mp3"
    },
    {
        title: "Arcade Drift",
        file: "../assets/Scene%204%20Audio/Track%203.mp3"
    },
    {
        title: "Digital Afterglow",
        file: "../assets/Scene%204%20Audio/Track%204.mp3"
    },
    {
        title: "Epic Theme",
        file: "../assets/Scene%204%20Audio/Track%205.mp3"
    }
];

function createScene4() {
    const scene = new BABYLON.Scene(engine4);
    scene.clearColor = new BABYLON.Color4(0.005, 0.01, 0.018, 1);

    const camera = new BABYLON.ArcRotateCamera(
        "cam4",
        BABYLON.Tools.ToRadians(135),
        BABYLON.Tools.ToRadians(62),
        22,
        new BABYLON.Vector3(0, 3.2, 0),
        scene
    );
    camera.attachControl(canvas4, true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 38;
    camera.lowerBetaLimit = BABYLON.Tools.ToRadians(12);
    camera.upperBetaLimit = BABYLON.Tools.ToRadians(86);
    camera.wheelDeltaPercentage = 0.01;
    camera.panningSensibility = 0;

    const hemi = new BABYLON.HemisphericLight("hemi4", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.45;

    const blueLight = new BABYLON.PointLight("blueLight4", new BABYLON.Vector3(-5, 5, -4), scene);
    blueLight.diffuse = new BABYLON.Color3(0.1, 0.45, 1);
    blueLight.intensity = 1.2;

    const tealLight = new BABYLON.PointLight("tealLight4", new BABYLON.Vector3(5, 5, 4), scene);
    tealLight.diffuse = new BABYLON.Color3(0, 0.9, 1);
    tealLight.intensity = 1.0;

    const redLight = new BABYLON.PointLight("redLight4", new BABYLON.Vector3(0, 5, 0), scene);
    redLight.diffuse = new BABYLON.Color3(1, 0.05, 0.02);
    redLight.intensity = 0.0;

    const darkMat = makeScene4Mat(scene, "darkMat4", "#070b12", "#000000");
    const floorMat = makeScene4Mat(scene, "floorMat4", "#101827", "#02040a");
    const wallMat = makeScene4Mat(scene, "wallMat4", "#111827", "#030712");
    const tealMat = makeScene4Mat(scene, "tealMat4", "#00eaff", "#00bde8");
    const blueMat = makeScene4Mat(scene, "blueMat4", "#2868ff", "#1646d8");
    const redMat = makeScene4Mat(scene, "redMat4", "#ff2020", "#cc0000");
    const whiteMat = makeScene4Mat(scene, "whiteMat4", "#dff7ff", "#bcecff");

    const ground = BABYLON.MeshBuilder.CreateGround("ground4", { width: 240, height: 240 }, scene);
    ground.material = floorMat;

    createScene4Grid(scene, darkMat, blueMat);
    createScene4Room(scene, wallMat, tealMat, blueMat, whiteMat);

    const orb = createScene4Orb(scene);
    const equalizer = createScene4Equalizer(scene, tealMat, blueMat, redMat);
    const pulseRings = createScene4PulseRings(scene, tealMat, blueMat);
    const trackPlayer = createScene4TrackPlayer(scene);
    const nowPlayingDisplay = createScene4NowPlayingDisplay(scene, trackPlayer);

    const gui = createScene4GUI(scene, {
        orb,
        equalizer,
        pulseRings,
        hemi,
        blueLight,
        tealLight,
        redLight,
        tealMat,
        blueMat,
        redMat,
        trackPlayer,
        nowPlayingDisplay
    });

    scene.onBeforeRenderObservable.add(() => {
        const t = performance.now() * 0.001;
        const audioLevel = trackPlayer.isPlaying ? 1 : 0.15;

        orb.mesh.rotation.y += 0.01;
        orb.mesh.position.y = 4.35 + Math.sin(t * 2.2) * 0.25;

        pulseRings.forEach((ring, index) => {
            ring.position.y = orb.mesh.position.y;
            ring.rotation.y += 0.004 + index * 0.001;
            ring.rotation.x += 0.002;
            ring.scaling.setAll(1 + Math.sin(t * 2 + index) * 0.025 * audioLevel);
        });

        const displayRadius = 6.2;
        const displayDirection = camera.position.subtract(orb.mesh.position);
        displayDirection.y = 0;

        if (displayDirection.lengthSquared() > 0.001) {
            displayDirection.normalize();

            nowPlayingDisplay.plane.position.x = orb.mesh.position.x + displayDirection.x * displayRadius;
            nowPlayingDisplay.plane.position.y = orb.mesh.position.y + 2.35;
            nowPlayingDisplay.plane.position.z = orb.mesh.position.z + displayDirection.z * displayRadius;

            equalizer.root.position.x = orb.mesh.position.x + displayDirection.x * 5.4;
            equalizer.root.position.y = 0.15;
            equalizer.root.position.z = orb.mesh.position.z + displayDirection.z * 5.4;
            equalizer.root.rotation.y = Math.atan2(displayDirection.x, displayDirection.z);
        }

        equalizer.forEach((bar, index) => {
            const wave = Math.sin(t * (2.5 + index * 0.2) + index) * 0.5 + 0.5;
            const target = 0.4 + wave * 2.5 * audioLevel;
            bar.scaling.y = BABYLON.Scalar.Lerp(bar.scaling.y, target, 0.08);
            bar.position.y = 0.2 + bar.scaling.y / 2;
        });

        if (trackPlayer.isPlaying) {
            orb.material.emissiveColor = BABYLON.Color3.Lerp(
                orb.baseColour,
                orb.pulseColour,
                0.35 + Math.sin(t * 5) * 0.25
            );
        }
    });

    return scene;
}

function makeScene4Mat(scene, name, diffuseHex, emissiveHex) {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
    mat.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex);
    mat.specularColor = new BABYLON.Color3(0.2, 0.25, 0.3);
    return mat;
}

function createScene4Grid(scene, darkMat, blueMat) {
    for (let i = -120; i <= 120; i += 4) {
        const lineA = BABYLON.MeshBuilder.CreateBox(`grid4_x_${i}`, { width: 240, height: 0.025, depth: 0.035 }, scene);
        lineA.position = new BABYLON.Vector3(0, 0.02, i);
        lineA.material = blueMat;

        const lineB = BABYLON.MeshBuilder.CreateBox(`grid4_z_${i}`, { width: 0.035, height: 0.025, depth: 240 }, scene);
        lineB.position = new BABYLON.Vector3(i, 0.025, 0);
        lineB.material = blueMat;
    }

    for (let x = -20; x <= 20; x += 5) {
        for (let z = -20; z <= 20; z += 5) {
            const plate = BABYLON.MeshBuilder.CreateBox(`floorPlate4_${x}_${z}`, { width: 1.2, height: 0.03, depth: 0.7 }, scene);
            plate.position = new BABYLON.Vector3(x, 0.04, z);
            plate.material = darkMat;
        }
    }
}

function createScene4Room(scene, wallMat, tealMat, blueMat, whiteMat) {
    const centrePad = BABYLON.MeshBuilder.CreateBox("scene4CentrePad", { width: 12, height: 0.08, depth: 12 }, scene);
    centrePad.position = new BABYLON.Vector3(0, 0.06, 0);
    centrePad.material = wallMat;

    const padLineFront = BABYLON.MeshBuilder.CreateBox("scene4PadLineFront", { width: 12, height: 0.04, depth: 0.08 }, scene);
    padLineFront.position = new BABYLON.Vector3(0, 0.14, -6);
    padLineFront.material = tealMat;

    const padLineBack = BABYLON.MeshBuilder.CreateBox("scene4PadLineBack", { width: 12, height: 0.04, depth: 0.08 }, scene);
    padLineBack.position = new BABYLON.Vector3(0, 0.14, 6);
    padLineBack.material = tealMat;

    const padLineLeft = BABYLON.MeshBuilder.CreateBox("scene4PadLineLeft", { width: 0.08, height: 0.04, depth: 12 }, scene);
    padLineLeft.position = new BABYLON.Vector3(-6, 0.14, 0);
    padLineLeft.material = blueMat;

    const padLineRight = BABYLON.MeshBuilder.CreateBox("scene4PadLineRight", { width: 0.08, height: 0.04, depth: 12 }, scene);
    padLineRight.position = new BABYLON.Vector3(6, 0.14, 0);
    padLineRight.material = blueMat;

    const leftConsole = BABYLON.MeshBuilder.CreateBox("scene4LeftConsole", { width: 2.2, height: 0.5, depth: 1.0 }, scene);
    leftConsole.position = new BABYLON.Vector3(-4.4, 0.35, -4.4);
    leftConsole.material = wallMat;

    const rightConsole = BABYLON.MeshBuilder.CreateBox("scene4RightConsole", { width: 2.2, height: 0.5, depth: 1.0 }, scene);
    rightConsole.position = new BABYLON.Vector3(4.4, 0.35, -4.4);
    rightConsole.material = wallMat;

    const leftConsoleLight = BABYLON.MeshBuilder.CreateBox("scene4LeftConsoleLight", { width: 1.6, height: 0.04, depth: 0.08 }, scene);
    leftConsoleLight.position = new BABYLON.Vector3(-4.4, 0.63, -4.92);
    leftConsoleLight.material = tealMat;

    const rightConsoleLight = BABYLON.MeshBuilder.CreateBox("scene4RightConsoleLight", { width: 1.6, height: 0.04, depth: 0.08 }, scene);
    rightConsoleLight.position = new BABYLON.Vector3(4.4, 0.63, -4.92);
    rightConsoleLight.material = tealMat;

    const rearLightBar = BABYLON.MeshBuilder.CreateBox("scene4RearFloorLight", { width: 9, height: 0.04, depth: 0.1 }, scene);
    rearLightBar.position = new BABYLON.Vector3(0, 0.16, 5.4);
    rearLightBar.material = whiteMat;
}

function createScene4WallLights(scene, label, x, z, length, axis, tealMat, blueMat) {
    const topY = 5.9;
    const midY = 3.4;
    const bottomY = 0.8;

    if (axis === "x") {
        const top = BABYLON.MeshBuilder.CreateBox(`${label}TopTeal4`, { width: length - 2, height: 0.08, depth: 0.12 }, scene);
        top.position = new BABYLON.Vector3(x, topY, z);
        top.material = tealMat;

        const mid = BABYLON.MeshBuilder.CreateBox(`${label}MidBlue4`, { width: length - 4, height: 0.08, depth: 0.12 }, scene);
        mid.position = new BABYLON.Vector3(x, midY, z);
        mid.material = blueMat;

        const bottom = BABYLON.MeshBuilder.CreateBox(`${label}BottomTeal4`, { width: length - 2, height: 0.08, depth: 0.12 }, scene);
        bottom.position = new BABYLON.Vector3(x, bottomY, z);
        bottom.material = tealMat;
    } else {
        const top = BABYLON.MeshBuilder.CreateBox(`${label}TopTeal4`, { width: 0.12, height: 0.08, depth: length - 2 }, scene);
        top.position = new BABYLON.Vector3(x, topY, z);
        top.material = tealMat;

        const mid = BABYLON.MeshBuilder.CreateBox(`${label}MidBlue4`, { width: 0.12, height: 0.08, depth: length - 4 }, scene);
        mid.position = new BABYLON.Vector3(x, midY, z);
        mid.material = blueMat;

        const bottom = BABYLON.MeshBuilder.CreateBox(`${label}BottomTeal4`, { width: 0.12, height: 0.08, depth: length - 2 }, scene);
        bottom.position = new BABYLON.Vector3(x, bottomY, z);
        bottom.material = tealMat;
    }
}

function createScene4Orb(scene) {
    const mesh = BABYLON.MeshBuilder.CreateSphere("audioOrb4", { diameter: 3, segments: 48 }, scene);
    mesh.position = new BABYLON.Vector3(0, 4.1, 0);

    const mat = new BABYLON.StandardMaterial("audioOrbMat4", scene);
    mat.diffuseColor = new BABYLON.Color3(0.05, 0.15, 0.25);
    mat.emissiveColor = new BABYLON.Color3(0.0, 0.75, 1.0);
    mat.specularColor = new BABYLON.Color3(0.8, 0.95, 1.0);
    mesh.material = mat;

    return {
        mesh,
        material: mat,
        baseColour: new BABYLON.Color3(0.0, 0.75, 1.0),
        pulseColour: new BABYLON.Color3(0.2, 1.0, 0.55)
    };
}

function createScene4PulseRings(scene, tealMat, blueMat) {
    const rings = [];

    for (let i = 0; i < 3; i++) {
        const ring = BABYLON.MeshBuilder.CreateTorus(`pulseRing4_${i}`, {
            diameter: 4.6 + i * 1.25,
            thickness: 0.055,
            tessellation: 72
        }, scene);

        ring.position = new BABYLON.Vector3(0, 4.1, 0);
        ring.rotation.x = Math.PI / 2 + i * 0.2;
        ring.material = i % 2 === 0 ? tealMat : blueMat;
        rings.push(ring);
    }

    return rings;
}

function createScene4Equalizer(scene, tealMat, blueMat, redMat) {
    const bars = [];
    const root = new BABYLON.TransformNode("equalizerRoot4", scene);
    const count = 18;

    for (let i = 0; i < count; i++) {
        const bar = BABYLON.MeshBuilder.CreateBox(`eqBar4_${i}`, { width: 0.42, height: 1, depth: 0.42 }, scene);
        bar.parent = root;
        bar.position = new BABYLON.Vector3(-6.8 + i * 0.8, 0.5, 0);
        bar.scaling.y = 0.5;
        bar.material = i < 6 ? tealMat : i < 12 ? blueMat : redMat;
        bars.push(bar);
    }

    bars.root = root;

    return bars;
}

function createScene4TrackPlayer(scene) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const masterGain = audioContext.createGain();

    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);

    const player = {
        scene,
        audioContext,
        masterGain,
        tracks: [],
        index: 0,
        volume: 0.7,
        isPlaying: false,
        title: SCENE4_TRACKS[0].title,
        onTrackChanged: null
    };

    SCENE4_TRACKS.forEach((track) => {
        const audio = new Audio(track.file);
        audio.loop = true;
        audio.volume = 1;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";

        const source = audioContext.createMediaElementSource(audio);
        source.connect(masterGain);

        audio.addEventListener("error", () => {
            console.error("Scene 4 audio failed to load:", track.file, audio.error);
        });

        player.tracks.push({
            title: track.title,
            audio,
            source
        });
    });

    return player;
}

function createScene4NowPlayingDisplay(scene, trackPlayer) {
    const plane = BABYLON.MeshBuilder.CreatePlane("nowPlayingPlane4", { width: 8.4, height: 1.95 }, scene);
    plane.position = new BABYLON.Vector3(0, 6.8, -5.8);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const texture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane, 1024, 256);

    const panel = new BABYLON.GUI.Rectangle();
    panel.background = "#020617dd";
    panel.color = "#38bdf8";
    panel.thickness = 2;
    panel.cornerRadius = 18;
    texture.addControl(panel);

    const stack = new BABYLON.GUI.StackPanel();
    stack.isVertical = true;
    stack.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    panel.addControl(stack);

    const label = new BABYLON.GUI.TextBlock();
    label.text = "NOW PLAYING";
    label.height = "62px";
    label.color = "#93c5fd";
    label.fontSize = 30;
    label.fontWeight = "bold";
    stack.addControl(label);

    const title = new BABYLON.GUI.TextBlock();
    title.text = trackPlayer.title;
    title.height = "78px";
    title.color = "white";
    title.fontSize = 36;
    title.fontWeight = "bold";
    stack.addControl(title);

    const state = new BABYLON.GUI.TextBlock();
    state.text = "Paused";
    state.height = "48px";
    state.color = "#cbd5e1";
    state.fontSize = 22;
    stack.addControl(state);

    return {
        plane,
        texture,
        title,
        state
    };
}

function playScene4Click() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 660;
    gain.gain.value = 0.08;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
}

function stopScene4CurrentTrack(player) {
    const current = player.tracks[player.index];

    if (current && current.audio) {
        current.audio.pause();
        current.audio.currentTime = 0;
    }
}

function playScene4CurrentTrack(player) {
    const current = player.tracks[player.index];

    if (!current || !current.audio) return;

    if (player.audioContext.state === "suspended") {
        player.audioContext.resume();
    }

    current.audio.volume = 1;
    current.audio.loop = true;

    const playPromise = current.audio.play();

    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                player.isPlaying = true;
                player.title = current.title;

                if (player.onTrackChanged) {
                    player.onTrackChanged();
                }
            })
            .catch((error) => {
                console.error("Scene 4 audio play failed:", error);
                player.isPlaying = false;

                if (player.onTrackChanged) {
                    player.onTrackChanged();
                }
            });
    }
}

function setScene4AudioEnabled(player, enabled) {
    if (enabled) {
        playScene4CurrentTrack(player);
    } else {
        stopScene4CurrentTrack(player);
        player.isPlaying = false;

        if (player.onTrackChanged) {
            player.onTrackChanged();
        }
    }
}

function setScene4AudioVolume(player, value) {
    player.volume = value;
    player.masterGain.gain.value = value;
}

function nextScene4Track(player) {
    const wasPlaying = player.isPlaying;

    stopScene4CurrentTrack(player);
    player.index = (player.index + 1) % player.tracks.length;
    player.title = player.tracks[player.index].title;

    if (wasPlaying) {
        playScene4CurrentTrack(player);
    } else if (player.onTrackChanged) {
        player.onTrackChanged();
    }
}

function previousScene4Track(player) {
    const wasPlaying = player.isPlaying;

    stopScene4CurrentTrack(player);
    player.index = (player.index - 1 + player.tracks.length) % player.tracks.length;
    player.title = player.tracks[player.index].title;

    if (wasPlaying) {
        playScene4CurrentTrack(player);
    } else if (player.onTrackChanged) {
        player.onTrackChanged();
    }
}

function createScene4GUI(scene, refs) {
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI4");

    const panel = new BABYLON.GUI.StackPanel();
    panel.width = "315px";
    panel.isVertical = true;
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    panel.paddingRight = "24px";
    panel.background = "#020617cc";
    panel.color = "#38bdf8";
    panel.thickness = 1;
    ui.addControl(panel);

    const title = new BABYLON.GUI.TextBlock();
    title.text = "Scene 4 Audio Console";
    title.height = "46px";
    title.color = "white";
    title.fontSize = 20;
    title.fontWeight = "bold";
    panel.addControl(title);

    const status = new BABYLON.GUI.TextBlock();
    status.text = "Track: Chiptune Pulse";
    status.height = "36px";
    status.color = "#93c5fd";
    status.fontSize = 14;
    status.textWrapping = true;
    panel.addControl(status);

    refs.trackPlayer.onTrackChanged = () => {
        status.text = `Track: ${refs.trackPlayer.title}`;
        refs.nowPlayingDisplay.title.text = refs.trackPlayer.title;
        refs.nowPlayingDisplay.state.text = refs.trackPlayer.isPlaying ? "Playing" : "Paused";
        refs.nowPlayingDisplay.state.color = refs.trackPlayer.isPlaying ? "#86efac" : "#cbd5e1";
    };

    let musicOn = false;
    let nightMode = false;
    let dangerMode = false;
    let colourIndex = 0;

    makeScene4Button(panel, "Play / Pause Music", () => {
        playScene4Click();
        musicOn = !musicOn;
        setScene4AudioEnabled(refs.trackPlayer, musicOn);
    });

    makeScene4Button(panel, "Previous Track", () => {
        playScene4Click();
        previousScene4Track(refs.trackPlayer);
    });

    makeScene4Button(panel, "Next Track", () => {
        playScene4Click();
        nextScene4Track(refs.trackPlayer);
    });

    makeScene4Button(panel, "Cycle Orb Colour", () => {
        playScene4Click();

        const colours = [
            new BABYLON.Color3(0.0, 0.75, 1.0),
            new BABYLON.Color3(0.25, 1.0, 0.55),
            new BABYLON.Color3(1.0, 0.25, 0.45),
            new BABYLON.Color3(0.95, 0.75, 0.25)
        ];

        colourIndex = (colourIndex + 1) % colours.length;
        refs.orb.baseColour = colours[colourIndex];
        refs.orb.pulseColour = BABYLON.Color3.Lerp(colours[colourIndex], BABYLON.Color3.White(), 0.35);
        refs.orb.material.emissiveColor = colours[colourIndex];
    });

    makeScene4Button(panel, "Toggle Night Mode", () => {
        playScene4Click();
        nightMode = !nightMode;

        if (nightMode) {
            scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.006, 1);
            refs.hemi.intensity = 0.18;
            refs.blueLight.intensity = 0.7;
            refs.tealLight.intensity = 0.65;
        } else {
            scene.clearColor = new BABYLON.Color4(0.005, 0.01, 0.018, 1);
            refs.hemi.intensity = 0.45;
            refs.blueLight.intensity = 1.2;
            refs.tealLight.intensity = 1.0;
        }
    });

    makeScene4Button(panel, "Emergency Lighting", () => {
        playScene4Click();
        dangerMode = !dangerMode;
        refs.redLight.intensity = dangerMode ? 2.0 : 0.0;

        refs.equalizer.forEach((bar, index) => {
            if (dangerMode && index > 10) {
                bar.material = refs.redMat;
            } else if (index < 6) {
                bar.material = refs.tealMat;
            } else {
                bar.material = refs.blueMat;
            }
        });
    });

    const volumeText = new BABYLON.GUI.TextBlock();
    volumeText.text = "Volume: 70%";
    volumeText.height = "28px";
    volumeText.color = "white";
    volumeText.fontSize = 14;
    volumeText.paddingTop = "10px";
    panel.addControl(volumeText);

    const slider = new BABYLON.GUI.Slider();
    slider.minimum = 0;
    slider.maximum = 1;
    slider.value = 0.7;
    slider.height = "24px";
    slider.width = "240px";
    slider.color = "#38bdf8";
    slider.background = "#0f172a";
    slider.borderColor = "#60a5fa";
    slider.paddingTop = "8px";
    slider.onValueChangedObservable.add((v) => {
        setScene4AudioVolume(refs.trackPlayer, v);
        volumeText.text = `Volume: ${Math.round(v * 100)}%`;
    });
    panel.addControl(slider);

    const hint = new BABYLON.GUI.TextBlock();
    hint.text = "Interactive sci-fi audio console. Use the interface to play loopable tracks, switch songs, adjust volume, alter lighting states, and change the energy core response.";
    hint.height = "96px";
    hint.color = "#cbd5e1";
    hint.fontSize = 13;
    hint.textWrapping = true;
    hint.paddingTop = "14px";
    panel.addControl(hint);

    return ui;
}

function makeScene4Button(panel, label, callback) {
    const btn = BABYLON.GUI.Button.CreateSimpleButton(`btn4_${label}`, label);
    btn.height = "42px";
    btn.color = "white";
    btn.fontSize = 15;
    btn.background = "#1e293b";
    btn.cornerRadius = 6;
    btn.thickness = 1;
    btn.paddingTop = "10px";
    btn.onPointerEnterObservable.add(() => {
        btn.background = "#334155";
    });
    btn.onPointerOutObservable.add(() => {
        btn.background = "#1e293b";
    });
    btn.onPointerUpObservable.add(callback);
    panel.addControl(btn);
    return btn;
}

const scene4 = createScene4();

engine4.runRenderLoop(() => {
    scene4.render();
});

window.addEventListener("resize", () => {
    engine4.resize();
});
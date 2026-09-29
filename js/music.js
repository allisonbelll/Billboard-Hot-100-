(function (window) {
  let allRows = [];
  let selectedRow = null;
  let audioContext = null;
  let playing = false;
  let stopTimer = null;
  let sceneBundle = null;

  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  }

  function hash(value) {
    return [...value].reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 17) >>> 0;
  }

  function colorFor(value) {
    const colors = [0xd94d36, 0xe8b738, 0x76b9ac, 0x527f9f, 0xf18535];
    return colors[hash(value) % colors.length];
  }

  function selectedChartRow(date) {
    return allRows.find(row => row.chart_date === date && row.rank === 1) || allRows.find(row => row.chart_date === date);
  }

  function updateSelectedRow() {
    const selector = document.getElementById("weekSelector");
    selectedRow = selectedChartRow(selector.value);
    if (!selectedRow) return;

    setText("nowPlayingSong", selectedRow.song);
    setText("nowPlayingArtist", `${selectedRow.artist} · No. ${selectedRow.rank}`);
    setText("nowPlayingDate", formatDate(selectedRow.chart_date));
    setText("playerStatus", `Ready to play a chart-inspired melody for ${selectedRow.song}.`);
    if (sceneBundle) sceneBundle.setLabelColor(colorFor(selectedRow.song));
  }

  function populateWeekSelector(rows) {
    const selector = document.getElementById("weekSelector");
    if (!selector) return;
    const dates = [...new Set(rows.map(row => row.chart_date))].sort().reverse();
    selector.innerHTML = "";
    dates.forEach(date => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = `Week of ${formatDate(date)}`;
      selector.appendChild(option);
    });
    selector.value = dates[0] || "";
    selector.addEventListener("change", updateSelectedRow);
    updateSelectedRow();
  }

  function playNote(context, frequency, start, duration, type = "triangle", volume = .11) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .08);
  }

  function melodyFor(row) {
    const seed = hash(`${row.song}|${row.artist}|${row.chart_date}`);
    return Array.from({ length: 12 }, (_, index) => {
      const step = (seed + index * 17 + (index % 3) * 7) % scale.length;
      return scale[step];
    });
  }

  async function playRecord() {
    if (!selectedRow) return;
    if (playing) {
      stopRecord();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setText("playerStatus", "Your browser does not support the audio preview.");
      return;
    }

    audioContext = audioContext || new AudioContext();
    if (audioContext.state === "suspended") await audioContext.resume();
    const start = audioContext.currentTime + .06;
    const notes = melodyFor(selectedRow);
    notes.forEach((frequency, index) => {
      playNote(audioContext, frequency, start + index * .28, .24, index % 4 === 0 ? "sine" : "triangle", .1);
      if (index % 3 === 0) playNote(audioContext, frequency / 2, start + index * .28, .3, "sine", .045);
    });

    playing = true;
    document.getElementById("playRecord").textContent = "■ Stop melody";
    setText("playerStatus", `Now playing ${selectedRow.song} by ${selectedRow.artist}.`);
    if (sceneBundle) sceneBundle.setPlaying(true);
    stopTimer = window.setTimeout(stopRecord, 3900);
  }

  function stopRecord() {
    playing = false;
    if (stopTimer) window.clearTimeout(stopTimer);
    stopTimer = null;
    const button = document.getElementById("playRecord");
    if (button) button.textContent = "▶ Play this week";
    if (selectedRow) setText("playerStatus", `Ready to play a chart-inspired melody for ${selectedRow.song}.`);
    if (sceneBundle) sceneBundle.setPlaying(false);
  }

  function cylinderBetween(THREE, start, end, radius, material) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 16), material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  function createRecordPlayer() {
    const mount = document.getElementById("recordPlayer");
    if (!mount || !window.THREE) return null;

    try {
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
      camera.position.set(6.6, 5.4, 7.4);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.innerHTML = "";
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xfff3d8, 0x3b2922, 2.5));
      const keyLight = new THREE.DirectionalLight(0xfff4cf, 4);
      keyLight.position.set(4, 8, 5);
      keyLight.castShadow = true;
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x76b9ac, 1.5, 14);
      fillLight.position.set(-4, 3, -3);
      scene.add(fillLight);

      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2c25, roughness: .7, metalness: .08 });
      const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xd5a84a, roughness: .38, metalness: .5 });
      const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf4ead5, roughness: .7 });
      const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x171414, roughness: .45, metalness: .16 });
      const redMaterial = new THREE.MeshStandardMaterial({ color: 0xd94d36, roughness: .5 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, .42, 5.6), baseMaterial);
      base.position.y = -.62;
      base.castShadow = true;
      base.receiveShadow = true;
      scene.add(base);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(6.1, .08, 5.3), goldMaterial);
      trim.position.y = -.39;
      scene.add(trim);

      const recordGroup = new THREE.Group();
      recordGroup.position.y = -.12;
      scene.add(recordGroup);
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, .18, 64), blackMaterial);
      platter.castShadow = true;
      platter.receiveShadow = true;
      recordGroup.add(platter);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .22, 48), redMaterial);
      label.position.y = .13;
      label.castShadow = true;
      recordGroup.add(label);
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .35, 24), goldMaterial);
      spindle.position.y = .25;
      recordGroup.add(spindle);
      for (let radius = .95; radius < 2.45; radius += .24) {
        const groove = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x55433a, transparent: true, opacity: .65 }));
        groove.rotation.x = Math.PI / 2;
        groove.position.y = .11;
        recordGroup.add(groove);
      }

      const tonearmBase = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .22, 32), goldMaterial);
      tonearmBase.position.set(2.35, -.05, -1.6);
      tonearmBase.castShadow = true;
      scene.add(tonearmBase);
      scene.add(cylinderBetween(THREE, new THREE.Vector3(2.35, .1, -1.6), new THREE.Vector3(1.78, 1.25, -.9), .1, goldMaterial));
      scene.add(cylinderBetween(THREE, new THREE.Vector3(1.78, 1.25, -.9), new THREE.Vector3(.95, 1.25, -.25), .075, goldMaterial));
      const needle = new THREE.Mesh(new THREE.ConeGeometry(.12, .36, 16), redMaterial);
      needle.position.set(.88, 1.08, -.2);
      needle.rotation.z = Math.PI;
      scene.add(needle);

      const keyStart = -2.35;
      for (let index = 0; index < 9; index += 1) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(.44, .08, .78), index % 3 === 0 ? paperMaterial : new THREE.MeshStandardMaterial({ color: 0xfdf7ea, roughness: .6 }));
        key.position.set(keyStart + index * .52, -.25, 2.05);
        key.castShadow = true;
        scene.add(key);
        if (index < 8 && index % 2 === 0) {
          const blackKey = new THREE.Mesh(new THREE.BoxGeometry(.22, .12, .48), blackMaterial);
          blackKey.position.set(keyStart + .26 + index * .52, -.18, 1.86);
          blackKey.castShadow = true;
          scene.add(blackKey);
        }
      }

      const button = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .1, 24), redMaterial);
      button.rotation.x = Math.PI / 2;
      button.position.set(-2.45, -.16, -1.9);
      scene.add(button);

      const resize = () => {
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      if (window.ResizeObserver) new ResizeObserver(resize).observe(mount);

      let isPlaying = false;
      let labelColor = colorFor("Billboard");
      const clock = new THREE.Clock();
      const animate = () => {
        const elapsed = clock.getElapsedTime();
        if (isPlaying) recordGroup.rotation.y += .035;
        else recordGroup.rotation.y += .002;
        recordGroup.position.y = -.12 + Math.sin(elapsed * 1.2) * .012;
        renderer.render(scene, camera);
        window.requestAnimationFrame(animate);
      };
      animate();

      return {
        setPlaying(value) { isPlaying = value; },
        setLabelColor(value) {
          labelColor = value;
          label.material.color.setHex(labelColor);
        },
      };
    } catch (error) {
      console.warn("3D player unavailable", error);
      mount.innerHTML = '<div class="record-player-fallback" aria-hidden="true"></div>';
      return null;
    }
  }

  function start(rows) {
    allRows = rows;
    populateWeekSelector(rows);
    document.getElementById("playRecord")?.addEventListener("click", playRecord);
    sceneBundle = createRecordPlayer();
    if (sceneBundle && selectedRow) sceneBundle.setLabelColor(colorFor(selectedRow.song));
  }

  window.Hot100Music = { start };
})(window);

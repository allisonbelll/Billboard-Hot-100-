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
    const colors = [0xff5b77, 0xffd65c, 0x6ff2ca, 0x5ad7ff, 0xf38bdc, 0xae8cff, 0xff9d45];
    return colors[hash(value) % colors.length];
  }

  function colorHex(value) {
    return `#${value.toString(16).padStart(6, "0")}`;
  }

  function populateRecordWall(rows) {
    const wall = document.getElementById("hangingRecords");
    if (!wall) return;
    const seen = new Set();
    const numberOnes = rows
      .filter(row => row.rank === 1)
      .sort((a, b) => b.chart_date.localeCompare(a.chart_date))
      .filter(row => {
        const key = `${row.song}|${row.artist}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);

    wall.innerHTML = "";
    numberOnes.forEach((row, index) => {
      const accent = colorHex(colorFor(`${row.song}|${row.artist}`));
      const record = document.createElement("article");
      record.className = `hanging-record hanging-record-${index + 1}`;
      record.style.setProperty("--label-color", accent);
      record.style.setProperty("--tilt", `${[-6, 4, -3, 7, -5, 3, -7, 5][index]}deg`);

      const disc = document.createElement("div");
      disc.className = "record-disc";
      disc.setAttribute("aria-label", `Number one record: ${row.song} by ${row.artist}`);
      const discCopy = document.createElement("span");
      discCopy.className = "record-copy";
      discCopy.textContent = "No. 1";
      disc.appendChild(discCopy);

      const meta = document.createElement("div");
      meta.className = "record-meta";
      const title = document.createElement("strong");
      title.textContent = row.song;
      const artist = document.createElement("small");
      artist.textContent = row.artist;
      const date = document.createElement("span");
      date.className = "record-rank";
      date.textContent = formatDate(row.chart_date);
      meta.append(title, artist, date);
      record.append(disc, meta);
      wall.appendChild(record);
    });
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
      camera.position.set(7.1, 5.9, 8.2);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.innerHTML = "";
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0x9ab8ff, 0x170e28, 2.6));
      const keyLight = new THREE.DirectionalLight(0xfff0bb, 4.5);
      keyLight.position.set(4, 9, 5);
      keyLight.castShadow = true;
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x5ad7ff, 2.2, 15);
      fillLight.position.set(-4, 3.5, -3);
      scene.add(fillLight);
      const pinkLight = new THREE.PointLight(0xff5b77, 1.6, 10);
      pinkLight.position.set(3.6, 2.2, 1.8);
      scene.add(pinkLight);

      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3043, roughness: .48, metalness: .12 });
      const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffd65c, roughness: .28, metalness: .72 });
      const silverMaterial = new THREE.MeshStandardMaterial({ color: 0xaab7ce, roughness: .26, metalness: .82 });
      const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f2e8, roughness: .7 });
      const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x090a13, roughness: .3, metalness: .28 });
      const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff5b77, roughness: .42, metalness: .08 });
      const mintMaterial = new THREE.MeshStandardMaterial({ color: 0x6ff2ca, emissive: 0x164b42, emissiveIntensity: 1.1, roughness: .32 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, .42, 5.6), baseMaterial);
      base.position.y = -.62;
      base.castShadow = true;
      base.receiveShadow = true;
      scene.add(base);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.05, .12, 5.25), new THREE.MeshStandardMaterial({ color: 0x19172a, roughness: .7, metalness: .16 }));
      deck.position.y = -.37;
      deck.receiveShadow = true;
      scene.add(deck);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(6.1, .08, 5.3), goldMaterial);
      trim.position.y = -.39;
      scene.add(trim);

      const recordGroup = new THREE.Group();
      recordGroup.position.y = -.12;
      scene.add(recordGroup);
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, .16, 96), silverMaterial);
      platter.castShadow = true;
      platter.receiveShadow = true;
      recordGroup.add(platter);
      const slipmat = new THREE.Mesh(new THREE.CylinderGeometry(2.48, 2.48, .06, 96), new THREE.MeshStandardMaterial({ color: 0x302842, roughness: .96, metalness: .02 }));
      slipmat.position.y = .12;
      recordGroup.add(slipmat);
      const record = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.42, .11, 96), blackMaterial);
      record.position.y = .19;
      record.castShadow = true;
      record.receiveShadow = true;
      recordGroup.add(record);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .16, 48), redMaterial);
      label.position.y = .28;
      label.castShadow = true;
      recordGroup.add(label);
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .35, 24), goldMaterial);
      spindle.position.y = .4;
      recordGroup.add(spindle);
      for (let radius = .92; radius < 2.35; radius += .18) {
        const groove = new THREE.Mesh(new THREE.TorusGeometry(radius, .012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x55433a, transparent: true, opacity: .65 }));
        groove.rotation.x = Math.PI / 2;
        groove.position.y = .27;
        recordGroup.add(groove);
      }
      const platterRim = new THREE.Mesh(new THREE.TorusGeometry(2.62, .045, 10, 96), new THREE.MeshBasicMaterial({ color: 0x5ad7ff, transparent: true, opacity: .7 }));
      platterRim.rotation.x = Math.PI / 2;
      platterRim.position.y = .23;
      recordGroup.add(platterRim);

      const tonearmBase = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .22, 32), goldMaterial);
      tonearmBase.position.set(2.35, -.05, -1.6);
      tonearmBase.castShadow = true;
      scene.add(tonearmBase);
      scene.add(cylinderBetween(THREE, new THREE.Vector3(2.35, .1, -1.6), new THREE.Vector3(1.78, 1.25, -.9), .1, goldMaterial));
      scene.add(cylinderBetween(THREE, new THREE.Vector3(1.78, 1.25, -.9), new THREE.Vector3(.95, 1.25, -.25), .075, goldMaterial));
      const tonearmJoint = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 24), silverMaterial);
      tonearmJoint.position.set(1.78, 1.25, -.9);
      scene.add(tonearmJoint);
      const counterweight = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .55, 24), silverMaterial);
      counterweight.rotation.z = Math.PI / 2;
      counterweight.position.set(2.68, .1, -1.6);
      scene.add(counterweight);
      const needle = new THREE.Mesh(new THREE.ConeGeometry(.12, .36, 16), redMaterial);
      needle.position.set(.88, 1.08, -.2);
      needle.rotation.z = Math.PI;
      scene.add(needle);

      const meter = new THREE.Mesh(new THREE.BoxGeometry(1.18, .3, .06), blackMaterial);
      meter.position.set(-2.25, -.16, -1.87);
      scene.add(meter);
      for (let index = 0; index < 6; index += 1) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(.12, .08, .08), index > 3 ? redMaterial : mintMaterial);
        light.position.set(-2.68 + index * .18, -.02, -1.88);
        scene.add(light);
      }

      [-1.55, -1.05, -.55].forEach((x, index) => {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(.15, .18, .12, 32), index === 1 ? redMaterial : goldMaterial);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(x, -.16, -1.92);
        knob.castShadow = true;
        scene.add(knob);
      });

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

      const addHangingRecord = (x, y, z, accent, tilt) => {
        const hanging = new THREE.Group();
        hanging.position.set(x, y, z);
        hanging.rotation.z = tilt;
        hanging.add(cylinderBetween(THREE, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 2.65, 0), .012, mintMaterial));
        const wallDisc = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .08, 64), blackMaterial);
        wallDisc.rotation.x = Math.PI / 2;
        wallDisc.castShadow = true;
        hanging.add(wallDisc);
        const wallLabel = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .1, 36), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: .38, roughness: .35 }));
        wallLabel.rotation.x = Math.PI / 2;
        wallLabel.position.z = .06;
        hanging.add(wallLabel);
        scene.add(hanging);
      };
      addHangingRecord(-2.35, 1.2, -2.45, 0xff5b77, -.08);
      addHangingRecord(-.85, 1.7, -2.7, 0x6ff2ca, .06);
      addHangingRecord(.85, 1.25, -2.75, 0xffd65c, -.05);
      addHangingRecord(2.3, 1.75, -2.5, 0xae8cff, .08);

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
    populateRecordWall(rows);
    populateWeekSelector(rows);
    document.getElementById("playRecord")?.addEventListener("click", playRecord);
    sceneBundle = createRecordPlayer();
    if (sceneBundle && selectedRow) sceneBundle.setLabelColor(colorFor(selectedRow.song));
  }

  window.Hot100Music = { start };
})(window);

(function (window) {
  let allRows = [];
  let numberOneRows = [];
  let selectedRow = null;
  let spinning = false;
  let spinTimer = null;
  let sceneBundle = null;

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

      const sleeve = document.createElement("div");
      sleeve.className = "record-sleeve";
      const sleeveLabel = document.createElement("span");
      sleeveLabel.textContent = "CHART ARCHIVE";
      const sleeveTitle = document.createElement("strong");
      sleeveTitle.textContent = row.song;
      const sleeveArtist = document.createElement("small");
      sleeveArtist.textContent = row.artist;
      sleeve.append(sleeveLabel, sleeveTitle, sleeveArtist);

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
      record.append(sleeve, disc, meta);
      wall.appendChild(record);
    });
  }

  function selectedChartRow(date) {
    return allRows.find(row => row.chart_date === date && row.rank === 1) || allRows.find(row => row.chart_date === date);
  }

  function renderSelectedRow(row, status) {
    if (!row) return;
    selectedRow = row;
    setText("nowPlayingSong", row.song);
    setText("nowPlayingArtist", `${row.artist} · No. ${row.rank}`);
    setText("nowPlayingDate", formatDate(row.chart_date));
    const accent = colorHex(colorFor(`${row.song}|${row.artist}`));
    const cover = document.getElementById("nowPlayingCover");
    if (cover) cover.style.setProperty("--cover-accent", accent);
    setText("coverSong", row.song);
    setText("coverArtist", row.artist);
    setText("playerStatus", status || (spinning ? `Spinning through songs… currently showing ${row.song}.` : `Selected ${row.song} by ${row.artist}. Click the player to spin.`));
    if (sceneBundle) sceneBundle.setLabelColor(colorFor(`${row.song}|${row.artist}`));
  }

  function updateSelectedRow() {
    const selector = document.getElementById("weekSelector");
    const row = selector ? selectedChartRow(selector.value) : null;
    if (row) renderSelectedRow(row);
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

  function randomNumberOne() {
    return numberOneRows[Math.floor(Math.random() * numberOneRows.length)];
  }

  function spinRecord() {
    if (!numberOneRows.length) return;
    if (sceneBundle && !sceneBundle.isZoomed()) sceneBundle.setZoomed(true);
    if (spinning) {
      stopSpin();
      return;
    }

    spinning = true;
    const button = document.getElementById("spinRecord");
    if (button) {
      button.textContent = "■ Stop on this song";
      button.setAttribute("aria-pressed", "true");
    }
    setText("playerStatus", "Spinning through real No. 1 songs from the archive…");
    if (sceneBundle) sceneBundle.setPlaying(true);
    spinTimer = window.setInterval(() => {
      selectedRow = randomNumberOne();
      const selector = document.getElementById("weekSelector");
      if (selector) selector.value = selectedRow.chart_date;
      renderSelectedRow(selectedRow);
    }, 420);
  }

  function stopSpin() {
    spinning = false;
    if (spinTimer) window.clearInterval(spinTimer);
    spinTimer = null;
    const button = document.getElementById("spinRecord");
    if (button) {
      button.textContent = "↻ Spin the records";
      button.setAttribute("aria-pressed", "false");
    }
    if (sceneBundle) sceneBundle.setPlaying(false);
    if (selectedRow) setText("playerStatus", `Stopped on ${selectedRow.song} by ${selectedRow.artist}.`);
  }

  function selectRecordRow(row) {
    if (!row) return;
    if (spinning) stopSpin();
    const selector = document.getElementById("weekSelector");
    if (selector) selector.value = row.chart_date;
    renderSelectedRow(row, `Selected ${row.song} by ${row.artist}. Hover another neon dot or spin again.`);
  }

  function cylinderBetween(THREE, start, end, radius, material) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 16), material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  }

  function createRecordPlayer(rows) {
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
      const interactionHint = document.createElement("div");
      interactionHint.className = "record-interaction-hint";
      interactionHint.textContent = "Click the record to zoom in";
      mount.appendChild(interactionHint);
      const tooltip = document.createElement("div");
      tooltip.className = "record-tooltip";
      tooltip.hidden = true;
      const tooltipSong = document.createElement("strong");
      const tooltipMeta = document.createElement("span");
      tooltip.append(tooltipSong, tooltipMeta);
      mount.appendChild(tooltip);

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

      const songRowsByKey = new Map();
      rows.forEach(row => {
        const key = `${row.song}|${row.artist}`;
        const existing = songRowsByKey.get(key);
        if (!existing || row.rank < existing.rank || (row.rank === existing.rank && row.chart_date > existing.chart_date)) songRowsByKey.set(key, row);
      });
      const songRows = [...songRowsByKey.values()];
      const dotPositions = [];
      const dotColors = [];
      songRows.forEach(row => {
        const key = `${row.song}|${row.artist}`;
        const seed = hash(key);
        const angle = (seed % 6283) / 1000;
        const radius = .84 + (((seed >>> 8) % 1370) / 1000);
        dotPositions.push(Math.cos(angle) * radius, .41, Math.sin(angle) * radius);
        const color = new THREE.Color(colorFor(key));
        dotColors.push(color.r, color.g, color.b);
      });
      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
      dotGeometry.setAttribute("color", new THREE.Float32BufferAttribute(dotColors, 3));
      const dotMaterial = new THREE.PointsMaterial({ size: .038, vertexColors: true, transparent: true, opacity: .88, depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true });
      const songDots = new THREE.Points(dotGeometry, dotMaterial);
      songDots.visible = false;
      recordGroup.add(songDots);
      const haloMaterial = new THREE.PointsMaterial({ size: .11, vertexColors: true, transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
      const songDotHalos = new THREE.Points(dotGeometry, haloMaterial);
      songDotHalos.visible = false;
      recordGroup.add(songDotHalos);
      const hoverMarker = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95 }));
      hoverMarker.visible = false;
      recordGroup.add(hoverMarker);

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

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points.threshold = .14;
      const pointer = new THREE.Vector2();
      const normalCameraPosition = new THREE.Vector3(7.1, 5.9, 8.2);
      const zoomCameraPosition = new THREE.Vector3(4.15, 3.45, 4.7);
      const normalLookAt = new THREE.Vector3(0, 0, 0);
      const zoomLookAt = new THREE.Vector3(0, .2, 0);
      let cameraGoal = normalCameraPosition.clone();
      let lookGoal = normalLookAt.clone();
      let zoomed = false;
      const stage = mount.closest(".music-stage");
      const zoomOutButton = document.getElementById("zoomOutRecord");

      const hitTest = event => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObject(songDots, false)[0];
      };

      const hideTooltip = () => {
        tooltip.hidden = true;
        hoverMarker.visible = false;
      };

      const showTooltip = (row, intersection, event) => {
        if (!row) return hideTooltip();
        const point = songDots.geometry.attributes.position;
        hoverMarker.position.set(point.getX(intersection.index), point.getY(intersection.index) + .035, point.getZ(intersection.index));
        hoverMarker.visible = true;
        tooltipSong.textContent = row.song;
        tooltipMeta.textContent = `${row.artist} · Rank ${row.rank} · ${formatDate(row.chart_date)} · ${row.weeks_on_chart} weeks`;
        const rect = renderer.domElement.getBoundingClientRect();
        tooltip.style.left = `${Math.min(Math.max(12, event.clientX - rect.left + 16), Math.max(12, rect.width - 230))}px`;
        tooltip.style.top = `${Math.min(Math.max(12, event.clientY - rect.top - 20), Math.max(12, rect.height - 78))}px`;
        tooltip.hidden = false;
      };

      const handlePointerMove = event => {
        if (!zoomed) return hideTooltip();
        const intersection = hitTest(event);
        showTooltip(intersection ? songRows[intersection.index] : null, intersection, event);
      };

      const handleCanvasClick = event => {
        if (!zoomed) return;
        const intersection = hitTest(event);
        if (!intersection) return;
        event.stopPropagation();
        const row = songRows[intersection.index];
        selectRecordRow(row);
        showTooltip(row, intersection, event);
      };

      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerleave", hideTooltip);
      renderer.domElement.addEventListener("click", handleCanvasClick);

      const setZoomed = value => {
        zoomed = value;
        cameraGoal = (value ? zoomCameraPosition : normalCameraPosition).clone();
        lookGoal = (value ? zoomLookAt : normalLookAt).clone();
        songDots.visible = value;
        songDotHalos.visible = value;
        mount.classList.toggle("is-zoomed", value);
        if (stage) stage.classList.toggle("is-zoomed", value);
        if (zoomOutButton) zoomOutButton.hidden = !value;
        interactionHint.textContent = value ? `Hover one of ${songRows.length.toLocaleString()} song/artist dots · click the record to spin` : "Click the record to zoom in";
        if (!value) hideTooltip();
        setText("playerStatus", value ? "Close-up ready: hover a neon dot or click the record to spin." : `Selected ${selectedRow ? selectedRow.song : "a song"}. Click the record to zoom in.`);
      };

      zoomOutButton?.addEventListener("click", () => {
        if (spinning) stopSpin();
        setZoomed(false);
      });

      let isPlaying = false;
      let labelColor = colorFor("Billboard");
      const clock = new THREE.Clock();
      const animate = () => {
        const elapsed = clock.getElapsedTime();
        if (isPlaying) recordGroup.rotation.y += .035;
        else recordGroup.rotation.y += .002;
        recordGroup.position.y = -.12 + Math.sin(elapsed * 1.2) * .012;
        camera.position.lerp(cameraGoal, .08);
        const currentLookAt = camera.userData.currentLookAt || normalLookAt.clone();
        currentLookAt.lerp(lookGoal, .08);
        camera.userData.currentLookAt = currentLookAt;
        camera.lookAt(currentLookAt);
        renderer.render(scene, camera);
        window.requestAnimationFrame(animate);
      };
      animate();

      return {
        setPlaying(value) { isPlaying = value; },
        setZoomed,
        isZoomed() { return zoomed; },
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
    numberOneRows = rows.filter(row => row.rank === 1);
    populateRecordWall(rows);
    populateWeekSelector(rows);
    const spinButton = document.getElementById("spinRecord");
    const player = document.getElementById("recordPlayer");
    spinButton?.addEventListener("click", spinRecord);
    const activatePlayer = () => {
      if (sceneBundle && !sceneBundle.isZoomed()) {
        sceneBundle.setZoomed(true);
        return;
      }
      spinRecord();
    };
    player?.addEventListener("click", activatePlayer);
    player?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activatePlayer();
      }
    });
    sceneBundle = createRecordPlayer(rows);
    if (sceneBundle && selectedRow) sceneBundle.setLabelColor(colorFor(`${selectedRow.song}|${selectedRow.artist}`));
    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && sceneBundle?.isZoomed()) {
        if (spinning) stopSpin();
        sceneBundle.setZoomed(false);
      }
    });
  }

  window.Hot100Music = { start };
})(window);

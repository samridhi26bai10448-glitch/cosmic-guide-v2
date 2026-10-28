
/* ==========================================
   COSMIC GUIDE — LOCATION-BASED SKY MAP
   Educational horizon projection using
   approximate coordinates of bright stars.
   ========================================== */

(() => {
  const canvas = document.getElementById("skyMapCanvas");
  const container = document.getElementById("skyMapContainer");

  if (!canvas || !container) return;

  const ctx = canvas.getContext("2d");
  const zoomLabel = document.getElementById("zoomLevel");
  const status = document.getElementById("skyMapStatus");

  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const resetBtn = document.getElementById("resetSkyMapBtn");

  // Real approximate equatorial coordinates:
  // RA is in hours; Dec is in degrees.
  const stars = [
    { name: "Polaris", ra: 2.53, dec: 89.26, mag: 2.0 },
    { name: "Dubhe", ra: 11.06, dec: 61.75, mag: 1.8 },
    { name: "Merak", ra: 11.03, dec: 56.38, mag: 2.4 },
    { name: "Phecda", ra: 11.90, dec: 53.69, mag: 2.4 },
    { name: "Megrez", ra: 12.26, dec: 57.03, mag: 3.3 },
    { name: "Alioth", ra: 12.90, dec: 55.96, mag: 1.8 },
    { name: "Mizar", ra: 13.40, dec: 54.93, mag: 2.2 },
    { name: "Alkaid", ra: 13.79, dec: 49.31, mag: 1.9 },

    { name: "Betelgeuse", ra: 5.92, dec: 7.41, mag: 0.5 },
    { name: "Bellatrix", ra: 5.42, dec: 6.35, mag: 1.6 },
    { name: "Alnitak", ra: 5.68, dec: -1.94, mag: 1.8 },
    { name: "Alnilam", ra: 5.60, dec: -1.20, mag: 1.7 },
    { name: "Mintaka", ra: 5.53, dec: -0.30, mag: 2.2 },
    { name: "Saiph", ra: 5.80, dec: -9.67, mag: 2.1 },
    { name: "Rigel", ra: 5.24, dec: -8.20, mag: 0.1 },

    { name: "Vega", ra: 18.62, dec: 38.78, mag: 0.0 },
    { name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.3 },
    { name: "Albireo", ra: 19.51, dec: 27.96, mag: 3.1 },
    { name: "Sadr", ra: 20.37, dec: 40.26, mag: 2.2 },
    { name: "Altair", ra: 19.85, dec: 8.87, mag: 0.8 },

    { name: "Arcturus", ra: 14.26, dec: 19.18, mag: 0.0 },
    { name: "Spica", ra: 13.42, dec: -11.16, mag: 1.0 },
    { name: "Regulus", ra: 10.14, dec: 11.97, mag: 1.4 },
    { name: "Antares", ra: 16.49, dec: -26.43, mag: 1.0 },
    { name: "Shaula", ra: 17.56, dec: -37.10, mag: 1.6 },
    { name: "Acrux", ra: 12.44, dec: -63.10, mag: 0.8 },
    { name: "Gacrux", ra: 12.52, dec: -57.11, mag: 1.6 }
  ];

  const patterns = [
    {
      name: "Ursa Major",
      stars: ["Dubhe", "Merak", "Phecda", "Megrez",
              "Alioth", "Mizar", "Alkaid"]
    },
    {
      name: "Orion",
      stars: ["Betelgeuse", "Bellatrix", "Mintaka",
              "Alnilam", "Alnitak", "Saiph", "Rigel"]
    },
    {
      name: "Cygnus",
      stars: ["Deneb", "Sadr", "Albireo"]
    },
    {
      name: "Summer Triangle",
      stars: ["Vega", "Deneb", "Altair", "Vega"]
    },
    {
      name: "Scorpius",
      stars: ["Antares", "Shaula"]
    },
    {
      name: "Crux",
      stars: ["Acrux", "Gacrux"]
    }
  ];

  const starByName = Object.fromEntries(
    stars.map(star => [star.name, star])
  );

  let latitude = null;
  let longitude = null;
  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function radians(degrees) {
    return degrees * Math.PI / 180;
  }

  // Greenwich Mean Sidereal Time, approximately.
  function getLocalSiderealTime(date, longitudeDegrees) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const days = jd - 2451545.0;

    const gmst =
      (18.697374558 + 24.06570982441908 * days) % 24;

    return ((gmst + longitudeDegrees / 15) % 24 + 24) % 24;
  }

  // Convert a star's RA/Dec to altitude and azimuth.
  function getHorizontalPosition(star, date) {
    const lst = getLocalSiderealTime(date, longitude);
    const hourAngle = radians((lst - star.ra) * 15);
    const dec = radians(star.dec);
    const lat = radians(latitude);

    const sinAltitude =
      Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle);

    const altitude = Math.asin(
      Math.max(-1, Math.min(1, sinAltitude))
    );

    // Azimuth is measured clockwise from north.
    const east = -Math.cos(dec) * Math.sin(hourAngle);

    const north =
      Math.sin(dec) * Math.cos(lat) -
      Math.cos(dec) * Math.cos(hourAngle) * Math.sin(lat);

    let azimuth = Math.atan2(east, north);

    if (azimuth < 0) azimuth += 2 * Math.PI;

    return {
      altitude: altitude * 180 / Math.PI,
      azimuth: azimuth * 180 / Math.PI
    };
  }

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();

    width = rect.width;
    height = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    drawSky();
  }

  function drawSky() {
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const background = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, Math.max(width, height)
    );

    background.addColorStop(0, "#142044");
    background.addColorStop(1, "#030612");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    if (latitude === null || longitude === null) {
      ctx.fillStyle = "#dce5ff";
      ctx.textAlign = "center";
      ctx.font = "16px Arial";
      ctx.fillText(
        "Search for a city to map your sky",
        width / 2, height / 2
      );
      ctx.textAlign = "left";
      return;
    }

    const radius = Math.max(
      40,
      Math.min(width * 0.43, height * 0.42)
    );

    const cx = width / 2 + offsetX;
    const cy = height / 2 + offsetY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);

    // Horizon circle and altitude rings.
    [1, 2 / 3, 1 / 3].forEach(fraction => {
      ctx.beginPath();
      ctx.arc(0, 0, radius * fraction, 0, Math.PI * 2);
      ctx.strokeStyle = fraction === 1
        ? "rgba(150, 190, 255, 0.65)"
        : "rgba(150, 190, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Compass directions.
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#bdccff";

    [
      { name: "N", az: 0 },
      { name: "E", az: 90 },
      { name: "S", az: 180 },
      { name: "W", az: 270 }
    ].forEach(direction => {
      const angle = radians(direction.az);
      const x = Math.sin(angle) * (radius + 18);
      const y = -Math.cos(angle) * (radius + 18);

      ctx.fillText(direction.name, x, y + 4);
    });

    const now = new Date();
    const positions = {};

    stars.forEach(star => {
      const horizontal = getHorizontalPosition(star, now);

      if (horizontal.altitude <= 0) return;

      // Zenith is in the centre; horizon is at the outer ring.
      const distance = radius * (90 - horizontal.altitude) / 90;
      const angle = radians(horizontal.azimuth);

      positions[star.name] = {
        x: Math.sin(angle) * distance,
        y: -Math.cos(angle) * distance,
        altitude: horizontal.altitude
      };
    });

    // Connect only stars currently above the horizon.
    patterns.forEach(pattern => {
      ctx.beginPath();
      let drawing = false;

      pattern.stars.forEach(name => {
        const point = positions[name];

        if (!point) {
          drawing = false;
          return;
        }

        if (!drawing) {
          ctx.moveTo(point.x, point.y);
          drawing = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.strokeStyle = "rgba(130, 180, 255, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // Draw visible stars and their names.
    Object.entries(positions).forEach(([name, point]) => {
      const star = starByName[name];
      const starRadius = Math.max(1.4, 4 - star.mag);

      ctx.beginPath();
      ctx.arc(point.x, point.y, starRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 170, 255, 0.13)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.font = "11px Arial";
      ctx.fillStyle = "#d8e3ff";
      ctx.textAlign = "left";
      ctx.fillText(name, point.x + 6, point.y - 5);
    });

    ctx.restore();
    ctx.textAlign = "left";
  }

  function updateZoom(amount) {
    zoom = Math.max(1, Math.min(4, zoom + amount));
    zoomLabel.textContent = `Zoom: ${zoom.toFixed(1)}×`;
    drawSky();
  }

  zoomInBtn.addEventListener("click", () => updateZoom(0.25));
  zoomOutBtn.addEventListener("click", () => updateZoom(-0.25));

  resetBtn.addEventListener("click", () => {
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    zoomLabel.textContent = "Zoom: 1.0×";
    drawSky();
  });

  canvas.addEventListener("pointerdown", event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (!dragging) return;

    offsetX += event.clientX - lastX;
    offsetY += event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;
    drawSky();
  });

  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });

  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });

  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    updateZoom(event.deltaY < 0 ? 0.25 : -0.25);
  }, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  // Receive the coordinates from the existing location search.
  window.addEventListener("sky-location-changed", event => {
    latitude = event.detail.latitude;
    longitude = event.detail.longitude;

    offsetX = 0;
    offsetY = 0;
    zoom = 1;

    zoomLabel.textContent = "Zoom: 1.0×";

    status.textContent =
      `Sky map updated for latitude ${latitude.toFixed(2)}°, ` +
      `longitude ${longitude.toFixed(2)}°. ` +
      "Star positions are calculated for the current time.";

    drawSky();
  });

  resizeCanvas();

  status.textContent =
    "Search for a city or use your location to calculate star positions.";
})();

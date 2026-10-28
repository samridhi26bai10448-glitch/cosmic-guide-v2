const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
const cityInput = document.getElementById("cityInput");
const cityBtn = document.getElementById("cityBtn");

// Update weather information on the page.
function updateWeatherDisplay(weather) {
  const clouds = weather.cloud_cover;
  const temperature = weather.temperature_2m;

  document.getElementById("cloudValue").textContent = `${clouds}%`;
  document.getElementById("tempValue").textContent = `${temperature}°C`;

  document.getElementById("cloudNote").textContent =
    clouds <= 20 ? "Relatively clear skies" :
    clouds <= 60 ? "Some clouds expected" :
    "Mostly cloudy conditions";

  document.getElementById("tempNote").textContent =
    "Current reported air temperature";

  const skyValue = document.getElementById("skyValue");
  const skyNote = document.getElementById("skyNote");

  if (clouds <= 20) {
    skyValue.textContent = "Promising";
    skyNote.textContent =
      "Low cloud cover. Check darkness and object visibility too.";
  } else if (clouds <= 60) {
    skyValue.textContent = "Mixed";
    skyNote.textContent = "Some objects may be hidden by clouds.";
  } else {
    skyValue.textContent = "Cloudy";
    skyNote.textContent = "Clouds may obstruct your view of the sky.";
  }
}

// Fetch weather for a latitude and longitude.
async function getWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,cloud_cover,weather_code` +
    `&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service unavailable");
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error("Weather data unavailable");
  }

  return data.current;
}

// Use the device's location.
locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent =
      "Your browser does not support location access.";
    return;
  }

  locationStatus.textContent = "Finding your location...";
  locationBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      updatePlanetInfo(latitude, longitude);
      updateConstellationInfo(latitude, longitude);
      window.dispatchEvent(new CustomEvent("sky-location-changed", {
  detail: { latitude, longitude }
}));


      try {
        const weather = await getWeather(latitude, longitude);
        updateWeatherDisplay(weather);

        locationStatus.textContent =
          "Local weather updated. Forecast time: " +
          weather.time.replace("T", " ") +
          ". Cloud cover alone cannot guarantee good stargazing.";
      } catch (error) {
        locationStatus.textContent =
          "Couldn't load weather. Check your internet and try again.";
      } finally {
        locationBtn.disabled = false;
      }
    },
    (error) => {
      const messages = {
        1: "Location permission was denied. Allow it in your browser settings to continue.",
        2: "Your location could not be determined. Check your device settings.",
        3: "Location lookup timed out. Please try again."
      };

      locationStatus.textContent =
        messages[error.code] || "Unable to get your location.";

      locationBtn.disabled = false;
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000
    }
  );
});

// Search for a city and show its weather.
cityBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();

  if (!city) {
    locationStatus.textContent = "Please enter a city name.";
    return;
  }

  locationStatus.textContent = "Searching for " + city + "...";
  cityBtn.disabled = true;

  try {
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(city) +
      "&count=1&language=en&format=json";

    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      throw new Error("City search failed");
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      locationStatus.textContent =
        "City not found. Please try another name.";
      return;
    }

    const place = geoData.results[0];
    const latitude = place.latitude;
    const longitude = place.longitude;

    updatePlanetInfo(latitude, longitude);
    updateConstellationInfo(latitude, longitude);
    window.dispatchEvent(new CustomEvent("sky-location-changed", {
  detail: { latitude, longitude }
}));

    const weather = await getWeather(latitude, longitude);
    updateWeatherDisplay(weather);

    locationStatus.textContent =
      `Weather for ${place.name}, ${place.country || ""} — ` +
      `reported at ${weather.time.replace("T", " ")}. ` +
      "Cloud cover alone cannot guarantee good stargazing.";
  } catch (error) {
    locationStatus.textContent =
      "Could not retrieve data. Check your internet and try again.";
  } finally {
    cityBtn.disabled = false;
  }
});

// Estimate the Moon's current phase.
function getMoonPhase(date = new Date()) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const lunarCycle = 29.530588853;

  const daysSinceNewMoon =
    (date.getTime() - knownNewMoon) / 86400000;

  const age =
    ((daysSinceNewMoon % lunarCycle) + lunarCycle) % lunarCycle;

  if (age < 1.85 || age >= 27.68) return "New Moon";
  if (age < 7.38) return "Waxing Crescent";
  if (age < 9.22) return "First Quarter";
  if (age < 14.77) return "Waxing Gibbous";
  if (age < 16.61) return "Full Moon";
  if (age < 22.15) return "Waning Gibbous";
  if (age < 23.99) return "Last Quarter";

  return "Waning Crescent";
}

// Estimate the percentage of the Moon illuminated.
function getMoonIllumination(date = new Date()) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const lunarCycle = 29.530588853;

  const daysSinceNewMoon =
    (date.getTime() - knownNewMoon) / 86400000;

  const age =
    ((daysSinceNewMoon % lunarCycle) + lunarCycle) % lunarCycle;

  const phaseAngle = (2 * Math.PI * age) / lunarCycle;

  return Math.round(
    ((1 - Math.cos(phaseAngle)) / 2) * 100
  );
}

// Explain the current Moon phase.
function getMoonPhaseDescription(phase) {
  const descriptions = {
    "New Moon":
      "The Moon is nearly invisible in the night sky.",
    "Waxing Crescent":
      "A thin crescent is growing brighter each night.",
    "First Quarter":
      "The bright part is growing, with about half illuminated.",
    "Waxing Gibbous":
      "More than half is illuminated, growing toward Full Moon.",
    "Full Moon":
      "The Moon appears nearly fully illuminated.",
    "Waning Gibbous":
      "The Moon is still mostly illuminated, but the bright part is shrinking.",
    "Last Quarter":
      "About half is illuminated, and the bright part is shrinking.",
    "Waning Crescent":
      "A thin crescent remains as the Moon approaches New Moon."
  };

  return descriptions[phase] ||
    "The Moon's appearance changes throughout its monthly cycle.";
}


 // Display Moon information.
const moonInfo = document.getElementById("moonInfo");
const moonPhaseName = document.getElementById("moonPhaseName");
const moonIllumination = document.getElementById("moonIllumination");
const moonImage = document.getElementById("moonImage");

if (moonInfo) {
  const phase = getMoonPhase();
  if (moonImage) {
  moonImage.dataset.phase = phase.toLowerCase().replaceAll(" ", "-");
}
  const illumination = getMoonIllumination();
  const description = getMoonPhaseDescription(phase);

  if (moonPhaseName) {
    moonPhaseName.textContent = phase;
  }

  moonInfo.textContent =
    `${description} ` +
    "Actual visibility depends on your local sky and time.";

  if (moonIllumination) {
    moonIllumination.textContent =
      `🌕 ${illumination}% illuminated`;
  }
}


// Calculate planet rise and set times.
function updatePlanetInfo(latitude, longitude) {
  const planetInfo = document.getElementById("planetInfo");

  if (!planetInfo) return;

  if (typeof Astronomy === "undefined") {
    planetInfo.textContent =
      "Planet calculations are unavailable. Check your internet connection.";
    return;
  }

  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const now = new Date();

  const planets = [
    { name: "Mercury", body: Astronomy.Body.Mercury },
    { name: "Venus", body: Astronomy.Body.Venus },
    { name: "Mars", body: Astronomy.Body.Mars },
    { name: "Jupiter", body: Astronomy.Body.Jupiter },
    { name: "Saturn", body: Astronomy.Body.Saturn }
  ];

  const formatTime = (time) => {
    if (!time) return "Not found in the next 24 hours";

    return time.date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  try {
    
const results = planets.map((planet) => {
  const rise = Astronomy.SearchRiseSet(
    planet.body, observer, 1, now, 1
  );

  const set = Astronomy.SearchRiseSet(
    planet.body, observer, -1, now, 1
  );

  return `
    <div class="planet-card">
      <h3>${planet.name}</h3>
      <p><strong>Rise:</strong> ${formatTime(rise)}</p>
      <p><strong>Set:</strong> ${formatTime(set)}</p>
    </div>
  `;
});

planetInfo.innerHTML =
  results.join("") +
  `<p class="planet-note">
    Rise and set times are approximate. They do not guarantee visibility.
  </p>`;

  } catch (error) {
    planetInfo.textContent =
      "Planet information could not be calculated. Please try again.";

    console.error("Planet calculation error:", error);
  }
}

// Constellation catalogue with symbolic star-pattern illustrations.
// Coordinates are approximate centres, not complete constellation boundaries.

function updateConstellationInfo(latitude, longitude) {
  const resultsContainer = document.getElementById("constellationResults");
  const status = document.getElementById("constellationStatus");

  if (!resultsContainer || !status) return;

  const constellations = [
    {
      name: "Orion", description: "The Hunter", ra: 5.6, dec: 0,
      stars: [[20,15],[38,30],[50,45],[62,30],[80,15],[42,53],[50,60],[58,53]],
      lines: [[0,1],[1,2],[2,3],[3,4],[1,5],[5,6],[6,7],[7,3]]
    },
    {
      name: "Scorpius", description: "The Scorpion", ra: 16.9, dec: -30,
      stars: [[20,15],[32,25],[40,38],[50,45],[62,48],[72,58],[66,70],[53,76]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
    },
    {
      name: "Ursa Major", description: "The Great Bear", ra: 11, dec: 55,
      stars: [[15,20],[32,25],[48,18],[63,28],[65,48],[45,53],[28,43]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1]]
    },
    {
      name: "Crux", description: "The Southern Cross", ra: 12.5, dec: -60,
      stars: [[50,10],[48,40],[20,50],[75,55],[52,80]],
      lines: [[0,1],[2,1],[1,3],[1,4]]
    },
    {
      name: "Leo", description: "The Lion", ra: 10.7, dec: 15,
      stars: [[15,25],[30,15],[43,28],[35,42],[52,50],[68,45],[82,60]],
      lines: [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]
    },
    {
      name: "Cygnus", description: "The Swan", ra: 20.5, dec: 40,
      stars: [[50,10],[50,35],[25,50],[75,50],[50,75]],
      lines: [[0,1],[2,1],[1,3],[1,4]]
    },
    {
      name: "Cassiopeia", description: "The Queen", ra: 1, dec: 60,
      stars: [[10,25],[30,55],[48,20],[68,55],[90,30]],
      lines: [[0,1],[1,2],[2,3],[3,4]]
    },
    {
      name: "Andromeda", description: "The Princess", ra: 0.8, dec: 38,
      stars: [[10,40],[30,35],[50,42],[70,32],[90,38]],
      lines: [[0,1],[1,2],[2,3],[3,4]]
    },
    {
      name: "Taurus", description: "The Bull", ra: 4.5, dec: 17,
      stars: [[15,30],[35,45],[50,25],[65,45],[82,30],[50,65]],
      lines: [[0,1],[1,2],[2,3],[3,4],[2,5]]
    },
    {
      name: "Gemini", description: "The Twins", ra: 7, dec: 22,
      stars: [[25,12],[30,35],[35,58],[65,12],[60,35],[55,58]],
      lines: [[0,1],[1,2],[3,4],[4,5],[1,4]]
    },
    {
      name: "Virgo", description: "The Maiden", ra: 13, dec: -2,
      stars: [[15,20],[35,35],[55,25],[70,48],[85,65],[45,65]],
      lines: [[0,1],[1,2],[2,3],[3,4],[3,5]]
    },
    {
      name: "Sagittarius", description: "The Archer", ra: 19, dec: -25,
      stars: [[15,40],[30,20],[48,35],[65,20],[82,40],[65,60],[45,55]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]]
    },
    {
      name: "Pegasus", description: "The Winged Horse", ra: 23, dec: 20,
      stars: [[20,20],[75,20],[75,75],[20,75],[45,45]],
      lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,2]]
    },
    {
      name: "Aquarius", description: "The Water Bearer", ra: 22, dec: -10,
      stars: [[15,25],[35,40],[50,25],[65,45],[80,35],[55,65]],
      lines: [[0,1],[1,2],[2,3],[3,4],[3,5]]
    },
    {
      name: "Pisces", description: "The Fishes", ra: 0.5, dec: 10,
      stars: [[15,20],[30,35],[45,25],[60,40],[75,30],[85,55],[65,70]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]
    }
  ];

  // Estimate local sidereal time.
  const now = new Date();
  const jd = now.getTime() / 86400000 + 2440587.5;
  const days = jd - 2451545.0;

  const gmst =
    ((18.697374558 + 24.06570982441908 * days) % 24 + 24) % 24;

  const lst = (gmst + longitude / 15 + 24) % 24;
  const latRad = latitude * Math.PI / 180;

  function getAltitude(ra, dec) {
    const hourAngle = (lst - ra) * 15 * Math.PI / 180;
    const decRad = dec * Math.PI / 180;

    const sinAlt =
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) *
      Math.cos(hourAngle);

    const safeValue = Math.max(-1, Math.min(1, sinAlt));

    return Math.asin(safeValue) * 180 / Math.PI;
  }

  const visible = constellations
    .map((item) => ({
      ...item,
      altitude: getAltitude(item.ra, item.dec)
    }))
    .filter((item) => item.altitude > 10)
    .sort((a, b) => b.altitude - a.altitude);

  if (visible.length === 0) {
    resultsContainer.innerHTML = `
      <article class="card">
        <h3>No candidate constellations found</h3>
        <p>
          None of the listed constellation centres is currently
          more than 10° above the horizon. Try checking again later.
        </p>
      </article>`;

    status.textContent =
      "No listed constellation centre is currently more than 10° above the horizon.";
    return;
  }

  resultsContainer.innerHTML = visible.map((item) => {
    const lines = item.lines.map(([a, b]) => {
      const first = item.stars[a];
      const second = item.stars[b];

      return `
        <line
          x1="${first[0]}" y1="${first[1]}"
          x2="${second[0]}" y2="${second[1]}"
          stroke="#8fcfff"
          stroke-width="1.2"
        />`;
    }).join("");

    const stars = item.stars.map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="2.4" fill="#ffffff" />
    `).join("");

    return `
      <article class="card constellation-card">
        <svg
          viewBox="0 0 100 90"
          role="img"
          aria-label="Symbolic star pattern for ${item.name}"
          style="width:100%;max-width:220px;height:auto;background:#081426;border-radius:12px;padding:12px;box-sizing:border-box"
        >
          ${lines}
          ${stars}
        </svg>

        <h3>${item.name}</h3>
        <p class="muted">${item.description}</p>
        <p>Estimated centre altitude: ${Math.round(item.altitude)}°</p>
        <p class="muted">
          This constellation's estimated centre is above the horizon.
          Actual visibility depends on the sky conditions and nearby obstacles.
          The drawing is symbolic, not an exact star chart.
        </p>
      </article>`;
  }).join("");

  status.textContent =
    `Results calculated for latitude ${latitude.toFixed(2)}°, ` +
    `longitude ${longitude.toFixed(2)}°. ` +
    "Estimates use approximate constellation centre coordinates.";
}

/* Interactive constellation details */


constellationDetails = {
  "Orion": {
    brightest: "Rigel and Betelgeuse",
    identify: "Find the three bright stars in a straight line that form Orion's Belt.",
    fact: "Orion is one of the easiest constellations to recognise."
  },
  "Scorpius": {
    brightest: "Antares",
    identify: "Look for a curved line of stars resembling a scorpion's tail.",
    fact: "Antares is a reddish star near the heart of Scorpius."
  },
  "Ursa Major": {
    brightest: "Alioth",
    identify: "Look for the seven-star Big Dipper pattern, part of Ursa Major.",
    fact: "The two outer stars of the Dipper's bowl help point towards Polaris."
  },
  "Crux": {
    brightest: "Acrux",
    identify: "Look for a compact group of bright stars arranged like a cross.",
    fact: "Crux is also known as the Southern Cross."
  },
  "Leo": {
    brightest: "Regulus",
    identify: "Look for a backward question-mark shape representing the Lion's head.",
    fact: "Leo is one of the zodiac constellations."
  },
  "Cygnus": {
    brightest: "Deneb",
    identify: "Look for a cross-like pattern known as the Northern Cross.",
    fact: "Cygnus represents a swan in traditional constellation stories."
  },
  "Cassiopeia": {
    brightest: "Schedar",
    identify: "Look for five prominent stars forming a W or M shape.",
    fact: "Cassiopeia is named after a queen in Greek mythology."
  },
  "Andromeda": {
    brightest: "Alpheratz",
    identify: "Look for a chain of stars extending away from the Great Square of Pegasus.",
    fact: "The Andromeda Galaxy is located within this constellation."
  },
  "Taurus": {
    brightest: "Aldebaran",
    identify: "Look for a V-shaped group of stars representing the Bull's face.",
    fact: "The Pleiades star cluster is also found in Taurus."
  },
  "Gemini": {
    brightest: "Pollux",
    identify: "Look for two roughly parallel rows of stars representing the Twins.",
    fact: "Its two brightest stars are Castor and Pollux."
  },
  "Virgo": {
    brightest: "Spica",
    identify: "Find Spica, a bright star that helps identify Virgo.",
    fact: "Virgo is the largest zodiac constellation by area."
  },
  "Sagittarius": {
    brightest: "Kaus Australis",
    identify: "Look for a teapot-like pattern of stars.",
    fact: "The direction of Sagittarius points towards the centre of the Milky Way."
  },
  "Pegasus": {
    brightest: "Enif",
    identify: "Look for the Great Square, a large four-star pattern.",
    fact: "Pegasus represents a winged horse in Greek mythology."
  },
  "Aquarius": {
    brightest: "Sadalsuud",
    identify: "Look for a spread-out pattern of relatively faint stars.",
    fact: "Aquarius is one of the zodiac constellations."
  },
  "Pisces": {
    brightest: "Eta Piscium",
    identify: "Look for two groups of stars connected by a line.",
    fact: "Pisces represents two fish in traditional constellation stories."
  }
};


document.addEventListener("click", function (event) {
  const card = event.target.closest(".constellation-card");

  if (!card) return;

  const heading = card.querySelector("h3");

  if (!heading) return;

  const details = constellationDetails[heading.textContent];

  if (!details) return;

  // Remove previously opened details from this card.
  const existing = card.querySelector(".constellation-details");

  if (existing) {
    existing.remove();
    return;
  }

  // Create the details section.
  const panel = document.createElement("div");
  panel.className = "constellation-details";

  const title = document.createElement("h4");
  title.textContent = "Explore " + heading.textContent;

  const brightest = document.createElement("p");
  brightest.textContent = "Bright stars: " + details.brightest;

  const identify = document.createElement("p");
  identify.textContent = "How to find it: " + details.identify;

  const fact = document.createElement("p");
  fact.textContent = "Did you know? " + details.fact;

  panel.append(title, brightest, identify, fact);
  card.appendChild(panel);
});

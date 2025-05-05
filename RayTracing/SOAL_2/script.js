// script.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting script.js");

  // --- Dependency Checks ---
  if (typeof glMatrix === "undefined") {
    /* ... (error check sama) ... */ return;
  }
  if (typeof RaytraceHelpers === "undefined") {
    /* ... (error check sama) ... */ return;
  }

  // --- Get DOM Elements ---
  const canvas = document.getElementById("raytracerCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const renderButton = document.getElementById("renderButton");
  const renderTimeEl = document.getElementById("renderTime");

  // Input elements
  const inputs = {
    camX: document.getElementById("cam-x"),
    camY: document.getElementById("cam-y"),
    camZ: document.getElementById("cam-z"),
    bgColor: document.getElementById("bg-color"),
    s1cx: document.getElementById("s1-cx"),
    s1cy: document.getElementById("s1-cy"),
    s1cz: document.getElementById("s1-cz"),
    s1radius: document.getElementById("s1-radius"),
    s1color: document.getElementById("s1-color"),
    s2cx: document.getElementById("s2-cx"),
    s2cy: document.getElementById("s2-cy"),
    s2cz: document.getElementById("s2-cz"),
    s2radius: document.getElementById("s2-radius"),
    s2color: document.getElementById("s2-color"),
  };

  // --- gl-matrix Alias ---
  const vec3 = glMatrix.vec3;

  // --- Helper Function: Hex Color to RGB Array ---
  function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16), // R
          parseInt(result[2], 16), // G
          parseInt(result[3], 16), // B
        ]
      : [0, 0, 0]; // Return black on error
  }

  // --- Function to Read Configuration from Inputs ---
  function getConfigFromInputs() {
    const config = {
      cameraOrigin: vec3.fromValues(
        parseFloat(inputs.camX.value) || 0,
        parseFloat(inputs.camY.value) || 0,
        parseFloat(inputs.camZ.value) || -5
      ),
      backgroundColor: hexToRgb(inputs.bgColor.value),
      spheres: [
        // Sphere 1
        {
          id: 1,
          center: vec3.fromValues(
            parseFloat(inputs.s1cx.value) || 0,
            parseFloat(inputs.s1cy.value) || 0,
            parseFloat(inputs.s1cz.value) || 0
          ),
          radius: parseFloat(inputs.s1radius.value) || 0.1,
          color: hexToRgb(inputs.s1color.value),
        },
        // Sphere 2
        {
          id: 2,
          center: vec3.fromValues(
            parseFloat(inputs.s2cx.value) || 0,
            parseFloat(inputs.s2cy.value) || 0,
            parseFloat(inputs.s2cz.value) || 0
          ),
          radius: parseFloat(inputs.s2radius.value) || 0.1,
          color: hexToRgb(inputs.s2color.value),
        },
      ],
    };

    // Pre-calculate radius squared for each sphere
    config.spheres.forEach((sphere) => {
      sphere.radiusSq = sphere.radius * sphere.radius;
    });

    return config;
  }

  // --- Main Raytracing Function ---
  function renderScene() {
    const startTime = performance.now();
    console.log("Reading config and starting render...");

    // 1. Get current configuration from inputs
    const config = getConfigFromInputs();
    const camera = { origin: config.cameraOrigin };
    const spheres = config.spheres; // Always exactly 2 spheres
    const backgroundColor = config.backgroundColor;

    console.log("Using config:", config); // Log the config being used

    // 2. Raytracing Logic
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = (x / (width - 1)) * 2.0 - 1.0;
        const worldY = -((y / (height - 1)) * 2.0 - 1.0);
        const worldZ = 0;

        const pixelPos = vec3.fromValues(worldX, worldY, worldZ);
        const rayDirection = vec3.create();
        vec3.subtract(rayDirection, pixelPos, camera.origin);
        vec3.normalize(rayDirection, rayDirection);

        let closestT = Infinity;
        let hitSphere = null;

        // Iterate through the two spheres
        for (const sphere of spheres) {
          const intersectionT = RaytraceHelpers.intersectSphere(
            camera.origin,
            rayDirection,
            sphere
          );
          if (intersectionT !== null && intersectionT < closestT) {
            closestT = intersectionT;
            hitSphere = sphere;
          }
        }

        const pixelIndex = (y * width + x) * 4;
        let r, g, b;
        if (hitSphere !== null) {
          [r, g, b] = hitSphere.color; // Use color from the hit sphere
        } else {
          [r, g, b] = backgroundColor; // Use background color
        }
        const a = 255;

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;
      }
    }

    // 3. Display result on canvas
    ctx.putImageData(imageData, 0, 0);

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    console.log(`Raytracing finished in ${duration} ms`);
    if (renderTimeEl) {
      renderTimeEl.textContent = `Render time: ${duration} ms`;
    }
  }

  // --- Event Listener ---
  if (renderButton) {
    renderButton.addEventListener("click", renderScene);
    console.log("Render button listener attached.");
  } else {
    console.error("Render button not found!");
  }

  // --- Initial Render ---
  console.log("Performing initial render...");
  renderScene(); // Render the scene once on page load with default values
}); // End DOMContentLoaded listener

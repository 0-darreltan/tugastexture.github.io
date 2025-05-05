// script.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting script.js with Phong Lighting");

  // --- Dependency Checks ---
  if (typeof glMatrix === "undefined") {
    console.error("FATAL: gl-matrix missing");
    return;
  }
  if (typeof RaytraceHelpers === "undefined") {
    console.error("FATAL: helper.js missing");
    return;
  }

  // --- Get DOM Elements ---
  const canvas = document.getElementById("raytracerCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const renderButton = document.getElementById("renderButton");
  const renderTimeEl = document.getElementById("renderTime");

  // Input elements (grouped for clarity)
  const inputs = {
    camera: {
      x: document.getElementById("cam-x"),
      y: document.getElementById("cam-y"),
      z: document.getElementById("cam-z"),
    },
    light: {
      x: document.getElementById("light-x"),
      y: document.getElementById("light-y"),
      z: document.getElementById("light-z"),
      color: document.getElementById("light-color"),
      ambient: document.getElementById("ambient-intensity"),
    },
    background: {
      color: document.getElementById("bg-color"),
    },
    sphere1: {
      cx: document.getElementById("s1-cx"),
      cy: document.getElementById("s1-cy"),
      cz: document.getElementById("s1-cz"),
      radius: document.getElementById("s1-radius"),
      shininess: document.getElementById("s1-shininess"),
      color: document.getElementById("s1-color"),
    },
    sphere2: {
      cx: document.getElementById("s2-cx"),
      cy: document.getElementById("s2-cy"),
      cz: document.getElementById("s2-cz"),
      radius: document.getElementById("s2-radius"),
      shininess: document.getElementById("s2-shininess"),
      color: document.getElementById("s2-color"),
    },
  };

  // --- gl-matrix Alias ---
  const vec3 = glMatrix.vec3;

  // --- Helper Functions ---
  function hexToRgb(hex) {
    /* ... (sama seperti sebelumnya) ... */
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }

  // Convert RGB [0, 255] to normalized Float32Array [0.0, 1.0]
  function rgbToFloat(rgb) {
    return Float32Array.from([rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0]);
  }

  // Convert normalized Float32Array [0.0, 1.0] back to RGB [0, 255]
  function floatToRgb(floatColor) {
    return [
      Math.max(0, Math.min(255, Math.round(floatColor[0] * 255))),
      Math.max(0, Math.min(255, Math.round(floatColor[1] * 255))),
      Math.max(0, Math.min(255, Math.round(floatColor[2] * 255))),
    ];
  }

  // Clamp a value between min and max
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // --- Function to Read Configuration from Inputs ---
  function getConfigFromInputs() {
    const config = {
      cameraOrigin: vec3.fromValues(
        parseFloat(inputs.camera.x.value) || 0,
        parseFloat(inputs.camera.y.value) || 0,
        parseFloat(inputs.camera.z.value) || -5
      ),
      lightPosition: vec3.fromValues(
        parseFloat(inputs.light.x.value) || 0,
        parseFloat(inputs.light.y.value) || 5,
        parseFloat(inputs.light.z.value) || -10
      ),
      lightColor: rgbToFloat(hexToRgb(inputs.light.color.value)), // Normalized light color
      ambientIntensity: parseFloat(inputs.light.ambient.value) || 0.1,
      backgroundColor: hexToRgb(inputs.background.color.value), // Background stays 0-255 for direct use
      spheres: [
        {
          id: 1,
          center: vec3.fromValues(
            parseFloat(inputs.sphere1.cx.value) || 0,
            parseFloat(inputs.sphere1.cy.value) || 0,
            parseFloat(inputs.sphere1.cz.value) || 0
          ),
          radius: parseFloat(inputs.sphere1.radius.value) || 0.1,
          color: rgbToFloat(hexToRgb(inputs.sphere1.color.value)), // Normalized sphere color (Ka, Kd)
          shininess: parseInt(inputs.sphere1.shininess.value) || 16,
          specularColor: vec3.fromValues(1.0, 1.0, 1.0), // White specular (Ks) - normalized
        },
        {
          id: 2,
          center: vec3.fromValues(
            parseFloat(inputs.sphere2.cx.value) || 0,
            parseFloat(inputs.sphere2.cy.value) || 0,
            parseFloat(inputs.sphere2.cz.value) || 0
          ),
          radius: parseFloat(inputs.sphere2.radius.value) || 0.1,
          color: rgbToFloat(hexToRgb(inputs.sphere2.color.value)), // Normalized sphere color (Ka, Kd)
          shininess: parseInt(inputs.sphere2.shininess.value) || 16,
          specularColor: vec3.fromValues(1.0, 1.0, 1.0), // White specular (Ks) - normalized
        },
      ],
    };

    config.spheres.forEach((sphere) => {
      sphere.radiusSq = sphere.radius * sphere.radius;
    });
    return config;
  }

  // --- Main Raytracing Function with Phong Lighting ---
  function renderScene() {
    const startTime = performance.now();
    console.log("Reading config and starting Phong render...");

    const config = getConfigFromInputs();
    const cameraOrigin = config.cameraOrigin;
    const spheres = config.spheres;
    const backgroundColor = config.backgroundColor; // [0, 255]
    const lightPosition = config.lightPosition;
    const lightColor = config.lightColor; // Normalized [0, 1]
    const ambientIntensity = config.ambientIntensity; // [0, 1]

    console.log("Using config:", config); // Log the config being used

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Pre-allocate temporary vectors outside the loop if performance is critical
    const hitPoint = vec3.create();
    const normal = vec3.create();
    const lightDir = vec3.create();
    const viewDir = vec3.create();
    const reflectDir = vec3.create();
    const ambientColor = vec3.create();
    const diffuseColor = vec3.create();
    const specularColor = vec3.create();
    const finalColor = vec3.create(); // Final normalized color

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // --- Ray Generation (Same as before) ---
        const worldX = (x / (width - 1)) * 2.0 - 1.0;
        const worldY = -((y / (height - 1)) * 2.0 - 1.0);
        const worldZ = 0;
        const pixelPos = vec3.fromValues(worldX, worldY, worldZ);
        const rayDirection = vec3.create(); // Need a new one per pixel
        vec3.subtract(rayDirection, pixelPos, cameraOrigin);
        vec3.normalize(rayDirection, rayDirection);

        // --- Find Closest Intersection (Same as before) ---
        let closestT = Infinity;
        let hitSphere = null;
        for (const sphere of spheres) {
          const intersectionT = RaytraceHelpers.intersectSphere(
            cameraOrigin,
            rayDirection,
            sphere
          );
          if (intersectionT !== null && intersectionT < closestT) {
            closestT = intersectionT;
            hitSphere = sphere;
          }
        }

        // --- Calculate Color ---
        const pixelIndex = (y * width + x) * 4;
        let r, g, b;

        if (hitSphere !== null) {
          // --- Calculate Phong Lighting ---
          // 1. Hit Point (P = O + t*D)
          vec3.scaleAndAdd(hitPoint, cameraOrigin, rayDirection, closestT);

          // 2. Normal (N = normalize(P - Center))
          vec3.subtract(normal, hitPoint, hitSphere.center);
          vec3.normalize(normal, normal);

          // 3. Light Direction (L = normalize(LightPos - P))
          vec3.subtract(lightDir, lightPosition, hitPoint);
          vec3.normalize(lightDir, lightDir);

          // 4. View Direction (V = normalize(CameraOrigin - P))
          vec3.subtract(viewDir, cameraOrigin, hitPoint);
          vec3.normalize(viewDir, viewDir);

          // --- Ambient Component ---
          // Ambient = Ka * globalAmbientIntensity
          vec3.scale(ambientColor, hitSphere.color, ambientIntensity); // hitSphere.color is Ka

          // --- Diffuse Component ---
          // Diffuse = Kd * lightColor * max(0, dot(N, L))
          const NdotL = vec3.dot(normal, lightDir);
          const diffuseFactor = Math.max(0.0, NdotL);
          vec3.multiply(diffuseColor, hitSphere.color, lightColor); // Kd * lightColor
          vec3.scale(diffuseColor, diffuseColor, diffuseFactor); // * max(0, NdotL)

          // --- Specular Component ---
          // Specular = Ks * lightColor * pow(max(0, dot(R, V)), shininess)
          // R = reflect(-L, N) = 2 * dot(N, L) * N - L
          const twoNdotL = 2.0 * NdotL;
          vec3.scale(reflectDir, normal, twoNdotL); // R = 2 * NdotL * N
          vec3.subtract(reflectDir, reflectDir, lightDir); // R = 2 * NdotL * N - L
          vec3.normalize(reflectDir, reflectDir); // Normalize R (important!)

          const RdotV = vec3.dot(reflectDir, viewDir);
          const specularFactor = Math.pow(
            Math.max(0.0, RdotV),
            hitSphere.shininess
          );
          vec3.multiply(specularColor, hitSphere.specularColor, lightColor); // Ks * lightColor
          vec3.scale(specularColor, specularColor, specularFactor); // * pow(max(0, RdotV), shininess)

          // --- Combine Components ---
          // FinalColor = Ambient + Diffuse + Specular
          vec3.add(finalColor, ambientColor, diffuseColor);
          vec3.add(finalColor, finalColor, specularColor);

          // Convert back to [0, 255] and clamp
          [r, g, b] = floatToRgb(finalColor);
        } else {
          // No intersection, use background color
          [r, g, b] = backgroundColor;
        }

        // --- Set Pixel Data ---
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255; // Alpha
      }
    }

    // Display result
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
  renderScene();
}); // End DOMContentLoaded listener

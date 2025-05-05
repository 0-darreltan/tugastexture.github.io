// script.js

// Tunggu sampai DOM siap dan semua script (termasuk helper.js) dimuat
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting script.js");

  // Pastikan glMatrix dan RaytraceHelpers sudah ada
  if (typeof glMatrix === "undefined") {
    console.error(
      "FATAL ERROR: gl-matrix library not loaded before script.js!"
    );
    alert("Error: gl-matrix library not loaded. Check index.html.");
    return;
  }
  if (typeof RaytraceHelpers === "undefined") {
    console.error(
      "FATAL ERROR: RaytraceHelpers (helper.js) not loaded before script.js!"
    );
    alert(
      "Error: helper.js not loaded or failed. Check console and index.html."
    );
    return;
  }

  // --- Setup Canvas ---
  const canvas = document.getElementById("raytracerCanvas");
  if (!canvas) {
    console.error(
      "FATAL ERROR: Canvas element with ID 'raytracerCanvas' not found!"
    );
    return;
  }
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // --- gl-matrix Alias ---
  const vec3 = glMatrix.vec3; // Alias lokal untuk script ini

  // --- Scene Definition ---
  const camera = {
    origin: vec3.fromValues(0, 0, -5), // Posisi kamera
  };

  const sphere = {
    center: vec3.fromValues(0, 0, 0), // Bola di pusat origin
    radius: 1.0,
    radiusSq: 1.0 * 1.0, // Pre-calculate radius squared
  };

  // --- Raytracing Logic ---
  console.log("Starting Raytracing...");
  const startTime = performance.now();

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Loop untuk setiap pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 1. Konversi koordinat pixel ke koordinat viewport/dunia
      const worldX = (x / (width - 1)) * 2.0 - 1.0;
      const worldY = -((y / (height - 1)) * 2.0 - 1.0);
      const worldZ = 0; // Viewport plane at z = 0

      // 2. Hitung arah sinar (ray direction)
      const pixelPos = vec3.fromValues(worldX, worldY, worldZ);
      const rayDirection = vec3.create();
      vec3.subtract(rayDirection, pixelPos, camera.origin);
      vec3.normalize(rayDirection, rayDirection); // Normalisasi arah!

      // 3. Cek perpotongan sinar dengan bola MENGGUNAKAN HELPER
      const intersectionT = RaytraceHelpers.intersectSphere(
        camera.origin,
        rayDirection,
        sphere
      );

      // 4. Tentukan warna pixel
      const pixelIndex = (y * width + x) * 4;
      let r = 50; // Warna background (biru muda)
      let g = 150;
      let b = 255;
      let a = 255;

      if (intersectionT !== null) {
        // Ada perpotongan! Warnai merah
        r = 255;
        g = 50;
        b = 50;
      }

      // 5. Set warna pixel di ImageData
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = a;
    }
  }

  // Tampilkan hasil akhir ke canvas
  ctx.putImageData(imageData, 0, 0);

  const endTime = performance.now();
  console.log(`Raytracing finished in ${(endTime - startTime).toFixed(2)} ms`);
  console.log("Sphere center:", sphere.center);
  console.log("Camera origin:", camera.origin);
}); // End DOMContentLoaded listener

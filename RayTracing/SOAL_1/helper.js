// helper.js

// Pastikan glMatrix sudah dimuat (diasumsikan dimuat global oleh index.html)
if (typeof glMatrix === "undefined") {
  console.error("FATAL ERROR: gl-matrix library not loaded before helper.js!");
  alert("Error: gl-matrix library not loaded. Check index.html.");
}

// Buat namespace atau object untuk helper functions agar tidak polusi global scope
const RaytraceHelpers = {
  vec3: glMatrix.vec3, // Alias untuk kenyamanan di dalam helper

  /**
   * Menghitung perpotongan sinar (ray) dengan bola (sphere).
   * Ray: P(t) = origin + t * direction
   * Sphere: ||X - center||^2 = radius^2
   * Mengembalikan nilai 't' (jarak perpotongan) jika ada, atau null jika tidak.
   * Hanya mengembalikan t > 0 (perpotongan di depan origin sinar).
   *
   * @param {vec3} rayOrigin - Titik asal sinar.
   * @param {vec3} rayDirection - Vektor arah sinar (harus normalized).
   * @param {object} sphere - Objek bola dengan 'center' (vec3) dan 'radiusSq' (float).
   * @returns {number|null} - Nilai t terdekat (positif) atau null.
   */
  intersectSphere: function (rayOrigin, rayDirection, sphere) {
    const L = this.vec3.create(); // Vektor dari pusat bola ke asal sinar
    this.vec3.subtract(L, rayOrigin, sphere.center);

    // a = dot(rayDirection, rayDirection) = 1 (karena rayDirection normalized)
    const a = 1.0;

    // b = 2 * dot(L, rayDirection)
    const b = 2.0 * this.vec3.dot(L, rayDirection);

    // c = dot(L, L) - radius^2
    const c = this.vec3.dot(L, L) - sphere.radiusSq;

    // Hitung diskriminan (delta = b^2 - 4ac)
    const discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0) {
      return null; // Tidak ada perpotongan nyata
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);

    // Hitung dua solusi t
    const t0 = (-b - sqrtDiscriminant) / (2.0 * a);
    const t1 = (-b + sqrtDiscriminant) / (2.0 * a);

    // Cari solusi t positif terdekat
    // Gunakan epsilon kecil (0.001) untuk menghindari self-intersection / floating point errors
    const epsilon = 0.001;
    if (t0 > epsilon && (t1 <= epsilon || t0 < t1)) {
      // t0 adalah perpotongan terdekat & positif
      return t0;
    } else if (t1 > epsilon) {
      // t1 adalah perpotongan terdekat & positif
      return t1;
    }

    return null; // Kedua perpotongan negatif atau nol (di belakang/tepat di origin)
  },

  // Anda bisa menambahkan fungsi helper vektor/matrix lain di sini jika diperlukan
};

// Optional: Freeze object agar tidak mudah termodifikasi
// Object.freeze(RaytraceHelpers);

console.log("helper.js loaded"); // Konfirmasi load

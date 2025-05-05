// helper.js
// (Kode sama seperti sebelumnya - berisi RaytraceHelpers.intersectSphere)

if (typeof glMatrix === "undefined") {
  console.error("FATAL ERROR: gl-matrix library not loaded before helper.js!");
  alert("Error: gl-matrix library not loaded. Check index.html.");
}

const RaytraceHelpers = {
  vec3: glMatrix.vec3,
  intersectSphere: function (rayOrigin, rayDirection, sphere) {
    const L = this.vec3.create();
    this.vec3.subtract(L, rayOrigin, sphere.center);
    const a = 1.0;
    const b = 2.0 * this.vec3.dot(L, rayDirection);
    const c = this.vec3.dot(L, L) - sphere.radiusSq;
    const discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t0 = (-b - sqrtDiscriminant) / (2.0 * a);
    const t1 = (-b + sqrtDiscriminant) / (2.0 * a);
    const epsilon = 0.001;

    if (t0 > epsilon && (t1 <= epsilon || t0 < t1)) {
      return t0;
    } else if (t1 > epsilon) {
      return t1;
    }
    return null;
  },
};
console.log("helper.js loaded");

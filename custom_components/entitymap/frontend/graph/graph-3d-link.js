/** The camera angle travels in the URL query, so a copied link reopens the same 3D view. */

const CAMERA_PARAM = "cam";
const DIMENSION_PARAM = "dim";

export function formatCameraParam(camera) {
  return [camera.yaw.toFixed(3), camera.pitch.toFixed(3), Math.round(camera.distance)].join(",");
}

export function parseCameraParam(text) {
  const parts = String(text || "").split(",").map(Number);

  if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value)) || parts[2] <= 0) {
    return null;
  }

  const [yaw, pitch, distance] = parts;

  return { yaw, pitch, distance };
}

export function readLinkedView(search) {
  const params = new URLSearchParams(search);

  return {
    dimension: params.get(DIMENSION_PARAM) === "3d" ? "3d" : null,
    camera: parseCameraParam(params.get(CAMERA_PARAM)),
  };
}

export function buildViewLink(location, camera) {
  const params = new URLSearchParams({ [DIMENSION_PARAM]: "3d", [CAMERA_PARAM]: formatCameraParam(camera) });

  return `${location.origin}${location.pathname}?${params}`;
}

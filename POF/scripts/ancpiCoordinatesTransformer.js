const proj4 = require("proj4");

proj4.defs(
  "EPSG:3844",
  "+proj=sterea +lat_0=46 +lon_0=25 +k=0.99975 +x_0=500000 +y_0=500000 +ellps=krass +towgs84=2.329,-147.042,-92.08,-0.309,0.325,0.497,5.69 +units=m +no_defs +type=crs"
);

const stereo70Polygon = [
  [406467.0604364206, 311234.9746220746],
  [407061.84495932295, 311234.9746220746],
  [407061.84495932295, 311752.5006571266],
  [406467.0604364206, 311752.5006571266],
  [406467.0604364206, 311234.9746220746]
];

const wgs84Polygon = stereo70Polygon.map(([x, y]) => {
  const [lon, lat] = proj4("EPSG:3844", "EPSG:4326", [x, y]);
  return [lon, lat];
});

const geojson = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [wgs84Polygon]
  }
};

console.log(JSON.stringify(geojson, null, 2));

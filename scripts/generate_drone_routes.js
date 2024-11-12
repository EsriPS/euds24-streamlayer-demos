const fs = require('fs');
const path = require('path');

const drones = [
  { ID: 'DR001', Name: 'R2-D2', Type: 'ModelX' },
  { ID: 'DR002', Name: 'C-3PO', Type: 'ModelY' },
  { ID: 'DR003', Name: 'BB-8', Type: 'ModelZ' },
  { ID: 'DR004', Name: 'Chopper', Type: 'ModelX' },
  { ID: 'DR005', Name: 'K2SO', Type: 'ModelY' },
];

const origin = { lat: 52.539573, lon: 13.425947 };
const destinations = [
  { lat: 52.518437, lon: 13.436011 },
  { lat: 52.539477, lon: 13.404578 },
  { lat: 52.516643, lon: 13.425428 },
  { lat: 52.523642, lon: 13.414852 },
  { lat: 52.523703, lon: 13.394514 },
];

const statuses = ['Departing', 'In Transit', 'Delivering', 'Returning'];

function formatTimestamp(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${formattedHours}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
}

function generateTimestamp(baseTime, offsetSeconds) {
  const date = new Date(baseTime.getTime() + offsetSeconds * 1000);
  return date.getTime(); // Return epoch milliseconds
}

function interpolateLocation(start, end, fraction) {
  const lat = start.lat + (end.lat - start.lat) * fraction;
  const lon = start.lon + (end.lon - start.lon) * fraction;
  return { lat, lon };
}

function calculateHeading(start, end) {
  const startLat = (start.lat * Math.PI) / 180;
  const startLon = (start.lon * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLon = (end.lon * Math.PI) / 180;

  const dLon = endLon - startLon;
  const y = Math.sin(dLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);
  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360; // Normalize to 0-360 degrees
}

function generateDroneData(duration) {
  const baseTime = new Date('2024-11-04T08:00:00');
  let data = [];

  drones.forEach((drone, index) => {
    const destination = destinations[index];
    const journeyStages = [
      { status: 'Departing', location: origin },
      { status: 'In Transit', location: destination },
      { status: 'Delivering', location: destination },
      { status: 'Returning', location: origin },
    ];

    let timeOffset = 0;
    const finalBattery = Math.random() * 0.3; // Random value between 0 and 0.3
    let previousLocation = origin;
    journeyStages.forEach((stage, stageIndex) => {
      const stageDuration = duration / journeyStages.length;
      for (let i = 0; i < stageDuration; i++) {
        const fraction = i / stageDuration;
        const location = interpolateLocation(
          stageIndex % 2 === 0 ? origin : destination,
          stageIndex % 2 === 0 ? destination : origin,
          fraction
        );
        const timestamp = generateTimestamp(baseTime, timeOffset);
        const battery = 1 - (timeOffset / duration) * (1 - finalBattery); // Calculate battery level
        const nextLocation =
          i < stageDuration - 1
            ? interpolateLocation(
                stageIndex % 2 === 0 ? origin : destination,
                stageIndex % 2 === 0 ? destination : origin,
                (i + 1) / stageDuration
              )
            : location;
        const heading = calculateHeading(previousLocation, nextLocation); // Calculate heading
        data.push({
          ID: drone.ID,
          Name: drone.Name,
          Location: `${location.lon.toFixed(4)}, ${location.lat.toFixed(4)}`,
          Date_Time: timestamp,
          Status: stage.status,
          Type: drone.Type,
          Battery: battery.toFixed(2), // Add battery field
          Heading: heading.toFixed(2), // Add heading field
        });
        previousLocation = location;
        timeOffset += 1;
      }
    });
  });

  data.sort((a, b) => new Date(a.Date_Time) - new Date(b.Date_Time));

  let csvData = 'ID,Name,Location,Date_Time,Status,Type,Battery,Heading\n'; // Add Battery and Heading to header
  data.forEach((row) => {
    csvData += `${row.ID},${row.Name},"${row.Location}",${row.Date_Time},${row.Status},${row.Type},${row.Battery},${row.Heading}\n`;
  });

  return csvData;
}

function saveToFile(data, filename) {
  fs.writeFileSync(path.join(__dirname, filename), data);
}

const duration = process.argv[2] ? parseInt(process.argv[2], 10) : 15;
const droneData = generateDroneData(duration);
saveToFile(droneData, 'drones_new.csv');
console.log(
  `Drone data generated and saved to drones_new.csv with a journey duration of ${duration} seconds.`
);

import { Origin, Horoscope } from "circular-natal-horoscope-js/dist/index.js";

interface Planets {
  [key: string]: [number];
}

const points = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "ascendant",
  "midheaven",
];

export function calculateHoraryChart(
  timestamp: Date,
  latitude: number,
  longitude: number
): any {
  const origin = new Origin({
    year: timestamp.getFullYear(),
    month: timestamp.getMonth(),
    date: timestamp.getDate(),
    hour: timestamp.getHours(),
    minute: timestamp.getMinutes(),
    second: timestamp.getSeconds(),
    latitude,
    longitude,
  });
  const horoscope = new Horoscope({
    origin,
    houseSystem: "whole-sign",
    zodiac: "tropical",
    aspectPoints: ["bodies", "points", "angles"],
    aspectWithPoints: ["bodies", "points", "angles"],
    aspectTypes: ["major"],
    customOrbs: {
      conjunction: 8,
      opposition: 8,
      trine: 8,
      square: 7,
      sextile: 6,
    },
    language: "en",
  });
  const planets: Planets = {};
  horoscope.CelestialBodies.all.map(
    (body: {
      key: string;
      ChartPosition: { Ecliptic: { DecimalDegrees: number } };
    }) => {
      if (points.includes(body.key as string)) {
        planets[body.key] = [body.ChartPosition.Ecliptic.DecimalDegrees];
      }
    }
  );
  const houseCusps: number[] = horoscope.Houses.map(
    (house: {
      ChartPosition: {
        StartPosition: { Ecliptic: { DecimalDegrees: number } };
      };
    }) => {
      return house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees;
    }
  );
  return {
    planets: planets,
    cusps: houseCusps,
  };
}

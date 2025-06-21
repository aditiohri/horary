import { Origin, Horoscope } from "circular-natal-horoscope-js/dist/index.js";

interface Planets {
  [key: string]: [number];
}

const points = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

export function calculateHoraryChart(
  timestamp: Date,
  latitude: number,
  longitude: number,
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
    aspectPoints: ["bodies"],
    aspectWithPoints: ["bodies"],
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
    },
  );
  planets["ascendant"] = [
    horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees,
  ];
  planets["midheaven"] = [
    horoscope.Midheaven.ChartPosition.Ecliptic.DecimalDegrees,
  ];
  const houseCusps: number[] = horoscope.Houses.map(
    (house: {
      ChartPosition: {
        StartPosition: { Ecliptic: { DecimalDegrees: number } };
      };
    }) => {
      return house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees;
    },
  );
  // filter out traditional aspects and planets
  const aspects = { ...horoscope.Aspects.points };
  let tradAspects = [];
  for (const planet in aspects) {
    if (points.includes(planet.toString())) {
      const planetAspects = aspects[planet]
        .filter(
          (aspect) =>
            aspect.aspectLevel === "major" &&
            points.includes(aspect.point1Key.toString()) &&
            points.includes(aspect.point2Key.toString()),
        )
        .map((aspect) => {
          return `${aspect.point1Key} ${aspect.aspectKey} ${aspect.point2Key}`;
        });
      tradAspects = tradAspects.concat(planetAspects);
    }
  }
  tradAspects = new Set(tradAspects);
  // console.log(horoscope.Aspects.points, tradAspects);
  return {
    planets: planets,
    cusps: houseCusps,
    aspects: [...tradAspects],
  };
}

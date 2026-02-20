import { Origin, Horoscope } from "circular-natal-horoscope-js/dist/index.js";

interface PlanetData {
  position: number;
  isRetrograde: boolean;
}

interface Planets {
  [key: string]: PlanetData;
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
      // Maximum orbs allowed by library (conjunction limited to 12°)
      // NOTE: This is too restrictive for horary astrology - need Swiss Ephemeris
      conjunction: 12,
      opposition: 12,
      trine: 12,
      square: 10,
      sextile: 8,
    },
    language: "en",
  });
  const planets: Planets = {};
  horoscope.CelestialBodies.all.map(
    (body: {
      key: string;
      ChartPosition: { Ecliptic: { DecimalDegrees: number } };
      isRetrograde?: boolean;
    }) => {
      if (points.includes(body.key as string)) {
        planets[body.key] = {
          position: body.ChartPosition.Ecliptic.DecimalDegrees,
          isRetrograde: body.isRetrograde ?? false,
        };
      }
    },
  );
  planets["ascendant"] = {
    position: horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees,
    isRetrograde: false,
  };
  planets["midheaven"] = {
    position: horoscope.Midheaven.ChartPosition.Ecliptic.DecimalDegrees,
    isRetrograde: false,
  };
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
  const aspects: Record<string, Array<{
    aspectLevel: string;
    point1Key: string;
    point2Key: string;
    aspectKey: string;
  }>> = { ...horoscope.Aspects.points };
  let tradAspects: string[] = [];
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
  const uniqueAspects = [...new Set(tradAspects)];
  return {
    planets: planets,
    cusps: houseCusps,
    aspects: uniqueAspects,
  };
}

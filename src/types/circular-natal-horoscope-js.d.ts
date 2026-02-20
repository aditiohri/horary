declare module "circular-natal-horoscope-js/dist/index.js" {
  export class Origin {
    constructor(options: {
      year: number;
      month: number;
      date: number;
      hour: number;
      minute: number;
      second: number;
      latitude: number;
      longitude: number;
    });
  }

  export class Horoscope {
    constructor(options: {
      origin: Origin;
      houseSystem: string;
      zodiac: string;
      aspectPoints: string[];
      aspectWithPoints: string[];
      aspectTypes: string[];
      customOrbs?: Record<string, number>;
      language?: string;
    });

    CelestialBodies: {
      all: Array<{
        key: string;
        label: string;
        ChartPosition: {
          Ecliptic: {
            DecimalDegrees: number;
          };
        };
        isRetrograde?: boolean;
      }>;
    };

    Ascendant: {
      ChartPosition: {
        Ecliptic: {
          DecimalDegrees: number;
        };
      };
    };

    Midheaven: {
      ChartPosition: {
        Ecliptic: {
          DecimalDegrees: number;
        };
      };
    };

    Houses: Array<{
      ChartPosition: {
        StartPosition: {
          Ecliptic: {
            DecimalDegrees: number;
          };
        };
      };
    }>;

    Aspects: {
      points: Record<
        string,
        Array<{
          aspectLevel: string;
          point1Key: string;
          point2Key: string;
          aspectKey: string;
          orb: number;
        }>
      >;
    };
  }
}

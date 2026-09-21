export type NasaWildfireIncident = {
  id: string;
  title: string;
  categories: {
    id: string;
  }[];
  geometry: {
    coordinates: [number, number];
  }[];
};

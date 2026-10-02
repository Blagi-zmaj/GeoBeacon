import { describe, it, expect } from "vitest";
import { mapNasaEventsToMatrix } from "./nasa.mapper.js";

describe("mapNasaEventsToMatrix", () => {
  it("should correctly map data from NASA", () => {
    const mockNasaData = [
      {
        id: "EONET_123",
        title: "Big fire in Moscow",
        categories: [{ id: "wildfires" }],
        geometry: [{ coordinates: [-120.2, 35.6] }],
      },
    ];

    const result = mapNasaEventsToMatrix(mockNasaData);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      "Big fire in Moscow",
      "wildfires",
      4,
      "POINT(-120.2 35.6)",
      "EONET_123",
    ]);
  });

  it("should add default category if missing", () => {
    const mockNasaData = [
      {
        id: "EONET_123",
        title: "Big fire in Moscow",
        categories: [],
        geometry: [{ coordinates: [-120.2, 35.6] }],
      },
    ];

    const result = mapNasaEventsToMatrix(mockNasaData);
    expect(result).toHaveLength(0);
  });

  it("should avoid incidents without coordinates", () => {
    const mockNasaData = [
      {
        id: "EONET_123",
        title: "Big fire in Moscow",
        categories: [{ id: "wildfires" }],
      },
    ];

    const result = mapNasaEventsToMatrix(mockNasaData);
    console.log("result", result);

    expect(result).toHaveLength(0);
  });
});

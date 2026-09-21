import { describe, it, expect } from "vitest";
import { app } from "../server.js";

describe("test incidents endpoint", () => {
  it("should return a list of incidents", async () => {
    const response = await app.inject({
      method: "GET",
      url: "api/incidents/incidents",
    });
    const incidentsArray = await response.json();
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(incidentsArray.incidentsData)).toBe(true);
  });

  it("should add new record in database", async () => {
    const response = await app.inject({
      method: "POST",
      url: "api/incidents/incidents",
      payload: {
        title: "Request test fire",
        type: "FIRE",
        severity: 3,
        lng: 19.0,
        lat: 50.0,
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().clientData.title).toBe("Request test fire");
  });

  it("should show error when try to add new record in database", async () => {
    const response = await app.inject({
      method: "POST",
      url: "api/incidents/incidents",
      payload: {
        title: "Request test fire",
        type: "FIRE",
        severity: 3,
        lng: 19.0,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe(
      "body must have required property 'lat'",
    );
  });
});

export function mapNasaEventsToMatrix(events: any[]) {
  const validEvents = events
    .filter(
      (event) =>
        event.geometry && event.geometry[0] && event.geometry[0].coordinates,
    )
    .filter((event) => event.categories[0]);

  return validEvents.map((event) => {
    const lon = event.geometry[0]?.coordinates[0];
    const lat = event.geometry[0]?.coordinates[1];

    return [
      event.title,
      event.categories[0]?.id ?? null,
      4,
      `POINT(${lon} ${lat})`,
      event.id,
      new Date().toISOString(),
    ];
  });
}

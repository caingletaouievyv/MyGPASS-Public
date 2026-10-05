import { PortCatalogItem, VesselVisitCatalogItem } from './booking.models';

export function getAvailableDestinationPorts(
  ports: PortCatalogItem[],
  vesselVisits: VesselVisitCatalogItem[],
  originPortId: number
): PortCatalogItem[] {
  if (!originPortId) return [];

  const destinationIds = new Set(
    vesselVisits
      .filter((visit) => visit.originPortId === originPortId)
      .map((visit) => visit.destinationPortId)
  );

  return ports.filter((port) => destinationIds.has(port.portId));
}

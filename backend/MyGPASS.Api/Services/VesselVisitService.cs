using MyGPASS.Api.Data;
using MyGPASS.Api.DTOs.VesselVisits;
using MyGPASS.Api.Models.Schedule;
using MyGPASS.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MyGPASS.Api.Services;

public class VesselVisitService : IVesselVisitService
{
    private readonly MyGPASSDbContext _dbContext;

    public VesselVisitService(MyGPASSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VesselVisitResponseDto>> GetVesselVisitsAsync()
    {
        return await _dbContext.VesselVisits
            .AsNoTracking()
            .OrderBy(x => x.OriginPort.Name)
            .ThenBy(x => x.DestinationPort.Name)
            .ThenBy(x => x.EstimatedTimeOfDeparture)
            .Select(x => new VesselVisitResponseDto
            {
                VesselVisitId = x.VesselVisitId,

                OriginPortId = x.OriginPortId,
                OriginPortName = x.OriginPort.Name,

                DestinationPortId = x.DestinationPortId,
                DestinationPortName = x.DestinationPort.Name,

                // Shipping line comes through the vessel relationship.
                ShippingLineId = x.Vessel.ShippingLineId,
                ShippingLineName = x.Vessel.ShippingLine.Name,

                VesselId = x.VesselId,
                VesselName = x.Vessel.Name,

                DayOfDeparture = x.DayOfDeparture,

                EstimatedTimeOfDeparture = x.EstimatedTimeOfDeparture
            })
            .ToListAsync();
    }

    public async Task<VesselVisitAdminResponseDto> CreateVesselVisitAsync(VesselVisitCreateRequestDto request)
    {
        await EnsureReferencesExistAsync(request.OriginPortId, request.DestinationPortId, request.VesselId);

        var vesselVisit = new VesselVisit
        {
            OriginPortId = request.OriginPortId,
            DestinationPortId = request.DestinationPortId,
            VesselId = request.VesselId,
            DayOfDeparture = request.DayOfDeparture,
            EstimatedTimeOfDeparture = request.EstimatedTimeOfDeparture
        };

        _dbContext.VesselVisits.Add(vesselVisit);
        await _dbContext.SaveChangesAsync();

        return await MapToAdminResponseAsync(vesselVisit.VesselVisitId);
    }

    public async Task<VesselVisitAdminResponseDto> UpdateVesselVisitAsync(long vesselVisitId, VesselVisitUpdateRequestDto request)
    {
        var vesselVisit = await _dbContext.VesselVisits
            .Include(x => x.OriginPort)
            .Include(x => x.DestinationPort)
            .Include(x => x.Vessel)
                .ThenInclude(x => x.ShippingLine)
            .FirstOrDefaultAsync(x => x.VesselVisitId == vesselVisitId);

        if (vesselVisit == null)
        {
            throw new KeyNotFoundException("Vessel visit was not found.");
        }

        await EnsureReferencesExistAsync(request.OriginPortId, request.DestinationPortId, request.VesselId);

        vesselVisit.OriginPortId = request.OriginPortId;
        vesselVisit.DestinationPortId = request.DestinationPortId;
        vesselVisit.VesselId = request.VesselId;
        vesselVisit.DayOfDeparture = request.DayOfDeparture;
        vesselVisit.EstimatedTimeOfDeparture = request.EstimatedTimeOfDeparture;

        await _dbContext.SaveChangesAsync();
        return await MapToAdminResponseAsync(vesselVisit.VesselVisitId);
    }

    public async Task DeleteVesselVisitAsync(long vesselVisitId)
    {
        var vesselVisit = await _dbContext.VesselVisits
            .FirstOrDefaultAsync(x => x.VesselVisitId == vesselVisitId);

        if (vesselVisit == null)
        {
            throw new KeyNotFoundException("Vessel visit was not found.");
        }

        var linkedBookings = await _dbContext.Bookings
            .Where(x => x.VesselVisitId == vesselVisitId)
            .ToListAsync();

        foreach (var booking in linkedBookings)
        {
            booking.VesselVisitId = null;
        }

        _dbContext.VesselVisits.Remove(vesselVisit);

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        await _dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private async Task EnsureReferencesExistAsync(long originPortId, long destinationPortId, long vesselId)
    {
        var originPortExists = await _dbContext.Ports.AnyAsync(x => x.PortId == originPortId);
        if (!originPortExists)
        {
            throw new KeyNotFoundException("Origin port was not found.");
        }

        var destinationPortExists = await _dbContext.Ports.AnyAsync(x => x.PortId == destinationPortId);
        if (!destinationPortExists)
        {
            throw new KeyNotFoundException("Destination port was not found.");
        }

        var vesselExists = await _dbContext.Vessels.AnyAsync(x => x.VesselId == vesselId);
        if (!vesselExists)
        {
            throw new KeyNotFoundException("Vessel was not found.");
        }
    }

    private async Task<VesselVisitAdminResponseDto> MapToAdminResponseAsync(long vesselVisitId)
    {
        var vesselVisit = await _dbContext.VesselVisits
            .AsNoTracking()
            .Include(x => x.OriginPort)
            .Include(x => x.DestinationPort)
            .Include(x => x.Vessel)
                .ThenInclude(x => x.ShippingLine)
            .FirstOrDefaultAsync(x => x.VesselVisitId == vesselVisitId);

        if (vesselVisit == null)
        {
            throw new KeyNotFoundException("Vessel visit was not found.");
        }

        return new VesselVisitAdminResponseDto
        {
            VesselVisitId = vesselVisit.VesselVisitId,
            OriginPortId = vesselVisit.OriginPortId,
            OriginPortName = vesselVisit.OriginPort.Name,
            DestinationPortId = vesselVisit.DestinationPortId,
            DestinationPortName = vesselVisit.DestinationPort.Name,
            ShippingLineId = vesselVisit.Vessel.ShippingLineId,
            ShippingLineName = vesselVisit.Vessel.ShippingLine.Name,
            VesselId = vesselVisit.VesselId,
            VesselName = vesselVisit.Vessel.Name,
            DayOfDeparture = vesselVisit.DayOfDeparture,
            EstimatedTimeOfDeparture = vesselVisit.EstimatedTimeOfDeparture
        };
    }
}
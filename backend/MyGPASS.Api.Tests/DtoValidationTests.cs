using System.ComponentModel.DataAnnotations;
using MyGPASS.Api.DTOs.Auth;
using MyGPASS.Api.DTOs.Bookings;
using MyGPASS.Api.DTOs.Users;
using Xunit;

namespace MyGPASS.Api.Tests;

public class DtoValidationTests
{
    [Fact]
    public void BookingCreateRequest_ValidRequestPassesValidation()
    {
        var request = new BookingCreateRequestDto
        {
            OriginPortId = 1,
            DestinationPortId = 2,
            ShippingLineId = 3,
            VesselVisitId = 4,
            DepartureAt = new DateTime(2026, 9, 18, 9, 0, 0),
            PassengerCount = 2
        };

        Assert.Empty(Validate(request));
    }

    [Fact]
    public void BookingCreateRequest_RejectsInvalidIdsPassengerCountAndDefaultDate()
    {
        var request = new BookingCreateRequestDto
        {
            OriginPortId = 0,
            DestinationPortId = -1,
            ShippingLineId = 0,
            VesselVisitId = -1,
            PassengerCount = 11
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.OriginPortId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.DestinationPortId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.ShippingLineId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.VesselVisitId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.PassengerCount)));
        Assert.Contains(errors, error => error.ErrorMessage == "DepartureAt is required.");
    }

    [Fact]
    public void UserRegisterRequest_RejectsMissingAndExcessiveValues()
    {
        var request = new UserRegisterRequestDto
        {
            MobileNumber = "09171234567",
            Email = new string('a', 250) + "@example.com",
            FirstName = new string('A', 101),
            LastName = "Valid",
            Password = new string('A', 129)
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.Email)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.FirstName)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.Password)));
    }

    [Fact]
    public void UserRegisterRequest_RejectsMissingRequiredValues()
    {
        var request = new UserRegisterRequestDto();

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.MobileNumber)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.Email)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.FirstName)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.LastName)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(request.Password)));
    }

    [Fact]
    public void AuthRequests_RejectOversizedTokensAndPasswords()
    {
        var verifyRequest = new VerifyEmailRequestDto { Token = new string('x', 257) };
        var resetRequest = new ResetPasswordRequestDto
        {
            Token = new string('x', 257),
            NewPassword = "Valid1!" + new string('a', 122)
        };

        Assert.Contains(Validate(verifyRequest), error => error.MemberNames.Contains(nameof(verifyRequest.Token)));
        Assert.Contains(Validate(resetRequest), error => error.MemberNames.Contains(nameof(resetRequest.Token)));
        Assert.Contains(Validate(resetRequest), error => error.MemberNames.Contains(nameof(resetRequest.NewPassword)));
    }

    [Fact]
    public void UserUpdateRequest_RejectsInvalidMobileNumber()
    {
        var request = new UserUpdateRequestDto
        {
            FirstName = "Valid",
            LastName = "User",
            MobileNumber = "not-a-mobile",
            Email = "valid@example.com"
        };

        Assert.Contains(Validate(request), error => error.MemberNames.Contains(nameof(request.MobileNumber)));
    }

    [Fact]
    public void UserRoleUpdateRequest_AllowsValidRoleLengthAndRejectsExcessiveRole()
    {
        var validRequest = new UserRoleUpdateRequestDto { Role = "Admin" };
        var invalidRequest = new UserRoleUpdateRequestDto { Role = new string('A', 21) };

        Assert.Empty(Validate(validRequest));
        Assert.Contains(Validate(invalidRequest), error => error.MemberNames.Contains(nameof(invalidRequest.Role)));
    }

    private static List<ValidationResult> Validate(object instance)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(
            instance,
            new ValidationContext(instance),
            results,
            validateAllProperties: true);
        return results;
    }
}
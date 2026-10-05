namespace MyGPASS.Api.Services.Interfaces;

public interface IDatabaseService
{
    Task<bool> CanConnectAsync();
}
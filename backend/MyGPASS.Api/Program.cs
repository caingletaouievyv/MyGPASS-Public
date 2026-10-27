using MyGPASS.Api.Extensions;
using MyGPASS.Api.Middleware;
using MyGPASS.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Services.AddProblemDetails();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddApiSecurity(builder.Configuration, builder.Environment);
builder.Services.AddAuthenticationRateLimiting();
builder.Services.Configure<GCashOptions>(builder.Configuration.GetSection("GCash"));

var app = builder.Build();

app.UseExceptionHandler();
app.UseSecurityHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseApiCors();
app.UseRateLimiter();
app.UseApiSecurity();
app.Use(async (context, next) =>
{
    context.Response.Headers.Remove("X-Powered-By");
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

app.MapControllers();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    application = "GTI PASS API"
})).AllowAnonymous();

app.Run();

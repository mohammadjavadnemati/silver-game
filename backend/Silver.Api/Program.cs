using Silver.Api.Hubs;
using Silver.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("SilverFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000") // ← اگه فرانت‌اند رو پورت دیگه‌ای اجرا می‌کنی، همون رو بذار
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddSingleton<RoomService>();
builder.Services.AddSingleton<IGameStateStore, InMemoryGameStateStore>();
builder.Services.AddSingleton<GameSessionService>();
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});
builder.Services.AddSingleton<RoomService>();

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));
app.UseCors("SilverFrontend");

app.MapHub<GameHub>("/hubs/game");

app.Run();
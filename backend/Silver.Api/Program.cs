using Silver.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// CORS برای اینکه فرانت (روی پورت دیگه) بتونه وصل شه
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000") // آدرس Next.js dev server
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // SignalR بهش نیاز داره
    });
});

builder.Services.AddSignalR();

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.MapHub<GameHub>("/hubs/game");

app.Run();
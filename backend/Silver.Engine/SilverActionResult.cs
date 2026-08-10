namespace Silver.Engine;

public class SilverActionResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public SilverGameState? UpdatedState { get; init; }

    public static SilverActionResult Fail(string message) => new() { Success = false, ErrorMessage = message };
    public static SilverActionResult Ok(SilverGameState state) => new() { Success = true, UpdatedState = state };
}
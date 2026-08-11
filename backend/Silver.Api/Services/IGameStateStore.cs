using Silver.Engine;

namespace Silver.Api.Services;

public interface IGameStateStore
{
    Task<SilverGameState?> GetAsync(string gameId);
    Task SaveAsync(SilverGameState state);
    Task DeleteAsync(string gameId);
}
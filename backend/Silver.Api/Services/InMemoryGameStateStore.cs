using System.Collections.Concurrent;
using Silver.Engine;

namespace Silver.Api.Services;

public class InMemoryGameStateStore : IGameStateStore
{
    private readonly ConcurrentDictionary<string, SilverGameState> _states = new();

    public Task<SilverGameState?> GetAsync(string gameId)
    {
        _states.TryGetValue(gameId, out var state);
        return Task.FromResult(state);
    }

    public Task SaveAsync(SilverGameState state)
    {
        _states[state.GameId] = state;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string gameId)
    {
        _states.TryRemove(gameId, out _);
        return Task.CompletedTask;
    }
}
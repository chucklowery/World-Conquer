// Deterministic multi-map, multi-epoch foundation soak. This uses the same
// native C++ match coordinator as the WASM launcher; engine AI and rendering
// remain covered separately by the real Chromium acceptance workflow.
#include "rts_live_match.h"
#include <algorithm>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>

static std::string read(const char* path) {
    std::ifstream input(path, std::ios::binary);
    assert(input);
    return std::string(std::istreambuf_iterator<char>(input),
                       std::istreambuf_iterator<char>());
}

static uint64_t digest(uint64_t value, const std::string& data) {
    for (unsigned char ch : data) {
        value ^= ch;
        value *= 1099511628211ULL;
    }
    return value;
}

struct Result {
    uint64_t hash;
    size_t ticks;
    uint64_t p95Microseconds;
};

static Result run(const std::string& defs, const std::string& ridge,
                  const std::string& marsh) {
    rts::LiveMatch match;
    rts::EntityId previousId = 0;
    uint16_t previousEpoch = 0;
    uint64_t hash = 1469598103934665603ULL;
    std::vector<uint64_t> tickMicros;

    for (int cycle = 0; cycle < 24; ++cycle) {
        const bool wide = cycle % 2 == 1;
        assert(match.load(wide ? marsh : ridge, defs));
        const rts::WorldSnapshot initial = match.snapshot();
        assert(initial.epoch > previousEpoch);
        assert(initial.width == (wide ? 24 : 16));
        assert(initial.height == (wide ? 14 : 10));
        assert(initial.commandStates.size() == 6);
        assert(initial.mapMetadata.resources.size() == 2);
        assert(initial.entities.size() == 8);
        assert(match.actors().size() == 6);
        if (previousId != 0) {
            assert(match.actors()[0].id != previousId);
            assert(match.order(1, previousId, orders::Kind::Stop, {0, 0}) !=
                   rts::WorldCode::Accepted);
        }
        previousId = match.actors()[0].id;
        previousEpoch = initial.epoch;
        hash = digest(hash, rts::worldJson(initial));

        for (int tick = 0; tick < 120; ++tick) {
            const auto start = std::chrono::steady_clock::now();
            if (tick == 0) {
                const rts::EntityId actor = match.actors()[0].id;
                const courier::Point destination = wide ? courier::Point{8, 3}
                                                        : courier::Point{6, 2};
                assert(match.order(1, actor, orders::Kind::Move, destination) ==
                       rts::WorldCode::Accepted);
                // Rejected ownership and out-of-bounds commands are atomic.
                const std::string before = rts::worldJson(match.snapshot(false));
                assert(match.order(2, actor, orders::Kind::Stop, {0, 0}) ==
                       rts::WorldCode::NotOwned);
                assert(match.order(1, actor, orders::Kind::Move, {-1, -1}) ==
                       rts::WorldCode::BadTarget);
                assert(rts::worldJson(match.snapshot(false)) == before);
            }
            const std::vector<orders::Move> moves = match.plan();
            assert(match.navigation().budget().searches <= 2);
            assert(match.navigation().budget().expansions <=
                   2 * match.navigation().width() * match.navigation().height());
            for (const orders::Move& move : moves)
                assert(match.observePosition(move.actor, move.waypoint));
            assert(match.resolveCombat());
            const rts::WorldSnapshot snapshot = match.snapshot();
            assert(snapshot.version == 3 && snapshot.epoch == previousEpoch);
            assert(snapshot.commandStates.size() == 6);
            assert(snapshot.entities.size() <= rts::WORLD_MAX_ENTITIES);
            assert(snapshot.events.size() <= rts::WORLD_MAX_EVENTS);
            hash = digest(hash, rts::worldJson(snapshot));
            const auto end = std::chrono::steady_clock::now();
            tickMicros.push_back(static_cast<uint64_t>(
                std::chrono::duration_cast<std::chrono::microseconds>(
                    end - start).count()));
        }
    }
    std::sort(tickMicros.begin(), tickMicros.end());
    return {hash, tickMicros.size(),
            tickMicros[(tickMicros.size() * 95) / 100]};
}

int main() {
    const std::string defs = read("game/content/r18/definitions.rts");
    const std::string ridge = read("game/content/missions/ridge-pass.map");
    const std::string marsh = read("game/content/missions/marsh-border.map");
    const Result first = run(defs, ridge, marsh);
    const Result second = run(defs, ridge, marsh);
    assert(first.hash == second.hash && first.ticks == 2880);
    std::cout << "PASS: foundation deterministic native match stress, "
              << first.ticks << " ticks, 24 map loads/epochs per replay; "
              << "hash " << first.hash << "; p95 host tick "
              << first.p95Microseconds << " us (informational)\n";
}

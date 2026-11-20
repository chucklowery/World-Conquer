// R20 representative navigation soak: 24 independently commanded actors
// crossing both authored R04 maps under bounded R02 pathfinding.
// This tests native path/order reservations; actual InfantryClass movement
// and browser pointer routing remain separate WASM/Chromium acceptance gates.
#include "production_orders.h"
#include <algorithm>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <iterator>
#include <set>
#include <string>
#include <vector>

using courier::Point;

static std::string read(const char* path) {
    std::ifstream input(path, std::ios::binary);
    assert(input);
    return std::string(std::istreambuf_iterator<char>(input),
                       std::istreambuf_iterator<char>());
}

static uint64_t mix(uint64_t hash, uint64_t value) {
    for (int n = 0; n < 8; ++n) {
        hash ^= static_cast<uint8_t>(value >> (8 * n));
        hash *= 1099511628211ULL;
    }
    return hash;
}

static std::vector<Point> sideCells(const std::vector<uint8_t>& blocked,
                                    int width, int height, bool left) {
    std::vector<Point> result;
    for (int y = 1; y < height - 1; ++y) {
        for (int offset = 1; offset < width / 3; ++offset) {
            const int x = left ? offset : width - 1 - offset;
            if (!blocked[y * width + x]) result.push_back({x, y});
        }
    }
    return result;
}

struct Result {
    uint64_t hash;
    int moved, arrived, unreachable, congested, waiting, searches, expansions;
    uint64_t p95Microseconds;
    // Capture the first terminal replan failure, not just its final status.
    // The scheduler hook captures occupancy before cleanup, subsequent
    // reservations or test-harness movement commits can change the answer.
    struct Failure {
        int actor;
        uint64_t tick;
        Point position, goal;
        bool staticRoute, dynamicRoute, goalOccupied;
    };
    std::vector<Failure> failures;
};

static bool routeExists(const std::vector<uint8_t>& blocked, int width,
                        int height, Point start, Point goal,
                        const orders::Controller& nav, int actor,
                        bool avoidActors) {
    const int cells = width * height;
    std::vector<uint8_t> visited(cells, 0);
    std::vector<Point> queue;
    queue.push_back(start);
    visited[start.y * width + start.x] = 1;
    for (size_t head = 0; head < queue.size(); ++head) {
        const Point p = queue[head];
        if (p == goal) return true;
        const Point directions[] = {{1, 0}, {0, 1}, {-1, 0}, {0, -1}};
        for (const Point delta : directions) {
            const Point next{p.x + delta.x, p.y + delta.y};
            if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height)
                continue;
            const int cell = next.y * width + next.x;
            if (blocked[cell] || visited[cell]) continue;
            if (avoidActors) {
                bool occupied = false;
                for (size_t i = 0; i < nav.count(); ++i) {
                    if (static_cast<int>(i) == actor || !nav.unit(i).alive)
                        continue;
                    if (nav.unit(i).position == next ||
                        (nav.unit(i).inFlight && nav.unit(i).waypoint == next)) {
                        occupied = true;
                        break;
                    }
                }
                if (occupied) continue;
            }
            visited[cell] = 1;
            queue.push_back(next);
        }
    }
    return false;
}

struct FailureContext {
    const std::vector<uint8_t>* blocked;
    const std::vector<Point>* destinations;
    int width, height;
    std::vector<Result::Failure>* failures;
};

static void captureFailure(const orders::Controller& nav, int actor,
                           void* context) {
    const FailureContext& data = *static_cast<const FailureContext*>(context);
    assert(actor >= 0 && static_cast<size_t>(actor) < nav.count());
    const orders::Unit& unit = nav.unit(actor);
    const Point goal = (*data.destinations)[actor];
    for (const Result::Failure& previous : *data.failures)
        assert(previous.actor != actor);
    bool goalOccupied = false;
    for (size_t i = 0; i < nav.count(); ++i) {
        if (static_cast<int>(i) == actor || !nav.unit(i).alive) continue;
        if (nav.unit(i).position == goal ||
            (nav.unit(i).inFlight && nav.unit(i).waypoint == goal))
            goalOccupied = true;
    }
    data.failures->push_back({actor,nav.tick(),unit.position,goal,
        routeExists(*data.blocked,data.width,data.height,unit.position,
                    goal,nav,actor,false),
        routeExists(*data.blocked,data.width,data.height,unit.position,
                    goal,nav,actor,true),goalOccupied});
}

static Result run(const std::string& mapSource) {
    courier::State map;
    assert(courier::loadMap(map, mapSource));
    const int width = map.width, height = map.height;
    std::vector<uint8_t> blocked(map.blocked.begin(), map.blocked.end());
    for (const courier::Resource& resource : map.resources)
        blocked[resource.p.y * width + resource.p.x] = 1;
    const std::vector<Point> left = sideCells(blocked, width, height, true);
    const std::vector<Point> right = sideCells(blocked, width, height, false);
    // Twelve actors on each side, with distinct empty destinations across
    // the map. The reciprocal flow exercises reservations and congestion.
    assert(left.size() >= 24 && right.size() >= 24);
    std::vector<Point> positions, destinations;
    for (int i = 0; i < 12; ++i) positions.push_back(left[i]);
    for (int i = 0; i < 12; ++i) positions.push_back(right[i]);
    for (int i = 12; i < 24; ++i) destinations.push_back(right[i]);
    for (int i = 12; i < 24; ++i) destinations.push_back(left[i]);

    orders::Controller nav;
    assert(nav.resetDynamic(width, height, blocked, positions));
    assert(nav.count() == 24);
    std::vector<uint8_t> costs(blocked.size(), 0);
    for (size_t i = 0; i < costs.size(); ++i)
        if (!blocked[i]) costs[i] =
            static_cast<uint8_t>(courier::movementCost(map.terrain[i]));
    assert(nav.setMovementCosts(costs));
    // A rejected roster change must leave a live controller untouched.
    std::vector<Point> duplicate = positions;
    duplicate.push_back(positions.front());
    assert(!nav.resetDynamic(width, height, blocked, duplicate));
    assert(nav.count() == 24 && nav.unit(0).position == positions.front());
    assert(nav.enqueue({1, 1, 0, {orders::Kind::Move,
                        map.resources.front().p, -1}, false}) ==
           orders::Code::Blocked);

    for (int i = 0; i < 24; ++i) {
        const orders::Request request = {1, static_cast<uint64_t>(i + 2), i,
            {orders::Kind::Move, destinations[i], -1}, false};
        assert(nav.enqueue(request) == orders::Code::Accepted);
    }

    uint64_t hash = 1469598103934665603ULL;
    int moved = 0, searches = 0, expansions = 0;
    std::vector<Result::Failure> failures;
    FailureContext failureContext{&blocked,&destinations,width,height,&failures};
    std::vector<uint64_t> tickMicros;
    for (int tick = 1; tick <= 480; ++tick) {
        const auto start = std::chrono::steady_clock::now();
        const std::vector<orders::Move> moves = nav.step(
            tick,captureFailure,&failureContext);
        assert(nav.budget().searches <= orders::MAX_SEARCHES_PER_TICK);
        assert(nav.budget().expansions <=
               orders::MAX_SEARCHES_PER_TICK * std::min(width * height, 512));
        searches += nav.budget().searches;
        expansions += nav.budget().expansions;
        moved += static_cast<int>(moves.size());
        for (const orders::Move& move : moves) {
            assert(move.actor >= 0 && move.actor < 24);
            assert(nav.passable(move.waypoint));
            nav.update(move.actor, move.waypoint, true);
        }
        std::set<int> occupied;
        for (int i = 0; i < 24; ++i) {
            const Point p = nav.unit(i).position;
            assert(nav.passable(p));
            assert(occupied.insert(p.y * width + p.x).second);
            hash = mix(hash, static_cast<uint64_t>(p.y * width + p.x));
            hash = mix(hash, static_cast<uint64_t>(nav.unit(i).status));
            hash = mix(hash, nav.unit(i).activeSequence);
        }
        hash = mix(hash, nav.budget().searches);
        hash = mix(hash, nav.budget().expansions);
        tickMicros.push_back(static_cast<uint64_t>(
            std::chrono::duration_cast<std::chrono::microseconds>(
                std::chrono::steady_clock::now() - start).count()));
    }
    int arrived = 0;
    int unreachable = 0, congested = 0, waiting = 0;
    for (int i = 0; i < 24; ++i)
        if (nav.unit(i).position == destinations[i]) ++arrived;
        else if (nav.unit(i).status == orders::Status::Unreachable) ++unreachable;
        else if (nav.unit(i).status == orders::Status::Congested) ++congested;
        else if (nav.unit(i).status == orders::Status::Waiting) ++waiting;
    std::sort(tickMicros.begin(), tickMicros.end());
    return {hash, moved, arrived, unreachable, congested, waiting, searches, expansions,
            tickMicros[(tickMicros.size() * 95) / 100], failures};
}

int main() {
    for (const char* path : {"game/content/missions/ridge-pass.map",
                             "game/content/missions/marsh-border.map"}) {
        const std::string source = read(path);
        const Result a = run(source), b = run(source);
        assert(a.hash == b.hash);
        assert(a.moved == b.moved && a.arrived == b.arrived &&
               a.unreachable == b.unreachable && a.congested == b.congested &&
               a.waiting == b.waiting);
        assert(a.failures.size() == b.failures.size());
        assert(static_cast<int>(a.failures.size()) == a.unreachable + a.congested);
        for (size_t i = 0; i < a.failures.size(); ++i) {
            const Result::Failure& f = a.failures[i];
            const Result::Failure& replay = b.failures[i];
            assert(f.actor == replay.actor && f.tick == replay.tick &&
                   f.position == replay.position &&
                   f.goal == replay.goal && f.staticRoute == replay.staticRoute &&
                   f.dynamicRoute == replay.dynamicRoute &&
                   f.goalOccupied == replay.goalOccupied);
            // A static topology failure here would contradict the admitted
            // move order. A dynamically reachable target timed out would
            // instead indicate an R02 fairness/replan regression.
            assert(f.staticRoute && !f.dynamicRoute);
        }
        assert(a.moved >= 24 && a.arrived >= 20);
        // A dynamic blockage must not masquerade as disconnected terrain.
        // Congestion remains a terminal order failure until the maintainer
        // approves a policy for occupied destinations and reciprocal traffic.
        assert(a.waiting == 0 && a.unreachable == 0 &&
               a.arrived + a.congested == 24);
        if (source.find("id marsh-border\n") != std::string::npos)
            assert(a.arrived == 24 && a.congested == 0);
        else assert(a.arrived == 21 && a.congested == 3);
        std::cout << "PASS: 24-actor R02 congestion on " << path
                  << ", 480 ticks, " << a.moved << " moves, "
                  << a.arrived << "/24 arrivals, "
                  << a.unreachable << " unreachable, " << a.congested << " congested, "
                  << a.waiting << " waiting, "
                  << a.searches << " searches, " << a.expansions
                  << " expanded cells; hash " << a.hash
                  << "; p95 host tick " << a.p95Microseconds
                  << " us (informational)\n";
        for (const Result::Failure& f : a.failures)
            std::cout << "  congested actor " << f.actor << " at tick "
                      << f.tick << " from ("
                      << f.position.x << ',' << f.position.y << ") to ("
                      << f.goal.x << ',' << f.goal.y << "): static-route="
                      << f.staticRoute << " dynamic-route=" << f.dynamicRoute
                      << " goal-occupied=" << f.goalOccupied << '\n';
    }
}

#include "production_orders.h"
#include <cassert>
#include <chrono>
#include <iostream>
#include <set>

using courier::Point;
static orders::Request request(int actor,orders::Kind kind,Point p,uint64_t seq,
                               bool append=false,int guard=-1,uint64_t tick=1){
    return {tick,seq,actor,{kind,p,guard},append};
}
static std::array<bool,orders::CELLS> terrain(){
    courier::State courier;
    std::array<bool,orders::CELLS> fixed={};
    assert(orders::fixedTerrain(courier,fixed));
    return fixed;
}
static std::array<Point,orders::COUNT> starts(){
    return {{{1,2},{2,3},{1,4},{2,5}}};
}
struct FailureObservation {
    bool called,activeOnFailure,laterInFlight;
    FailureObservation():called(false),activeOnFailure(false),laterInFlight(false){}
};
static void observeFailure(const orders::Controller& controller,int actor,void* context){
    FailureObservation& observed=*static_cast<FailureObservation*>(context);
    assert(actor==0&&!observed.called);
    observed.called=true;
    observed.activeOnFailure=controller.unit(0).hasOrder;
    observed.laterInFlight=controller.unit(1).inFlight;
}
static void run(orders::Controller& controller,int ticks){
    for(int t=1;t<=ticks;t++){
        const std::vector<orders::Move> moves=controller.step(t);
        std::set<int> occupancy;
        for(int i=0;i<orders::COUNT;i++){
            const Point p=controller.unit(i).position;
            assert(occupancy.insert(p.y*orders::WIDTH+p.x).second);
        }
        for(const orders::Move& m:moves){
            // Test adapter simulates the completion notification from a live
            // InfantryClass::Coord_Cell; the production WASM adapter dispatches
            // the same single-cell waypoints through Assign_Destination.
            controller.update(m.actor,m.waypoint,true);
        }
        occupancy.clear();
        for(int i=0;i<orders::COUNT;i++){
            const Point p=controller.unit(i).position;
            assert(occupancy.insert(p.y*orders::WIDTH+p.x).second);
            assert(controller.passable(p));
        }
        assert(controller.budget().searches<=orders::MAX_SEARCHES_PER_TICK);
        assert(controller.budget().expansions<=
               orders::MAX_SEARCHES_PER_TICK*orders::MAX_EXPANSIONS_PER_SEARCH);
    }
}
int main(){
    courier::State wrongSize;
    std::array<bool,orders::CELLS> untouched={};
    wrongSize.width=24;
    assert(!orders::fixedTerrain(wrongSize,untouched));
    wrongSize=courier::State();wrongSize.blocked.pop_back();
    assert(!orders::fixedTerrain(wrongSize,untouched));
    for(bool b:untouched)assert(!b); // rejected conversions are atomic
    orders::Controller c;
    c.reset(terrain(),starts());
    for(int i=0;i<4;i++)assert(c.enqueue(request(i,orders::Kind::Move,{15,1+i},i+1))==
                                   orders::Code::Accepted);
    run(c,140);
    for(int i=0;i<4;i++){
        assert(c.unit(i).position==Point({15,1+i}));
        assert(c.unit(i).status==orders::Status::Idle);
    }
    // Admission rejection leaves the active command intact, and disconnected
    // terrain is distinct from a temporarily occupied destination.
    c.reset(terrain(),starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{5,2},1))==orders::Code::Blocked);
    assert(c.enqueue(request(0,orders::Kind::Move,{18,2},2))==orders::Code::BadTarget);
    assert(c.enqueue(request(7,orders::Kind::Move,{4,2},3))==orders::Code::BadActor);
    std::array<bool,orders::CELLS> isolated=terrain();
    for(int y=0;y<orders::HEIGHT;y++)isolated[y*orders::WIDTH+8]=true;
    c.reset(isolated,starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{15,2},4))==orders::Code::Unreachable);
    c.reset(terrain(),starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{4,1},10))==orders::Code::Accepted);
    assert(c.enqueue(request(0,orders::Kind::Move,{4,4},11,true))==orders::Code::Accepted);
    assert(c.enqueue(request(0,orders::Kind::Move,{4,5},12,true))==orders::Code::Accepted);
    run(c,30);
    assert(c.unit(0).position==Point({4,5}));
    c.reset(terrain(),starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{4,1},10))==orders::Code::Accepted);
    assert(c.enqueue(request(0,orders::Kind::Move,{4,4},11))==orders::Code::Accepted);
    run(c,20);
    assert(c.unit(0).position==Point({4,4})); // replacement, no stale goal
    assert(c.enqueue(request(0,orders::Kind::Patrol,{4,1},20))==orders::Code::Accepted);
    run(c,12);
    assert(c.unit(0).status==orders::Status::Patrolling);
    assert(c.enqueue(request(0,orders::Kind::Hold,{0,0},21))==orders::Code::Accepted);
    run(c,1);
    const Point held=c.unit(0).position;
    run(c,5);
    assert(c.unit(0).position==held&&c.unit(0).status==orders::Status::Holding);
    assert(c.enqueue(request(0,orders::Kind::Guard,{0,0},22,false,1))==orders::Code::Accepted);
    run(c,3);
    assert(c.unit(0).status==orders::Status::Guarding);
    c.update(1,c.unit(1).position,false);
    run(c,1);
    assert(c.unit(0).status==orders::Status::Idle);
    assert(c.enqueue(request(0,orders::Kind::AttackMove,{12,8},23))==orders::Code::Accepted);
    run(c,3);
    assert(c.unit(0).hasOrder);
    c.update(0,c.unit(0).position,false);
    run(c,1);
    assert(c.unit(0).status==orders::Status::Dead);
    assert(c.enqueue(request(0,orders::Kind::Move,{4,2},24))==orders::Code::Dead);

    // A destination that becomes impassable after admission is cancelled with
    // explicit feedback; no navigation is issued into that tile.
    c.reset(terrain(),starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{4,2},25))==orders::Code::Accepted);
    run(c,1);
    assert(c.enqueue(request(0,orders::Kind::Stop,{0,0},26))==orders::Code::Accepted);
    run(c,1);
    assert(c.unit(0).status==orders::Status::Idle);

    c.reset(terrain(),starts());
    assert(c.enqueue(request(0,orders::Kind::Move,{4,2},27))==orders::Code::Accepted);
    c.step(1);
    std::array<bool,orders::CELLS> obstructed=terrain();
    obstructed[2*orders::WIDTH+4]=true;
    c.updateTerrain(obstructed);
    c.step(2);
    assert(c.unit(0).status==orders::Status::Unreachable);
    bool blockedFeedback=false;
    for(const orders::Feedback& f:c.takeFeedback())
        if(f.code==orders::Code::Blocked&&f.sequence==0)blockedFeedback=true;
    assert(blockedFeedback);

    // Terminal diagnostics must run before order cleanup AND before a later
    // actor's waypoint reservation; observing after step()/update() would
    // describe different occupancy from the failure transition.
    orders::Controller observedController;
    std::vector<uint8_t> twoActorTerrain(8*8,0);
    assert(observedController.resetDynamic(8,8,twoActorTerrain,{{1,1},{4,1}}));
    assert(observedController.enqueue(request(0,orders::Kind::Move,{6,1},28))==
           orders::Code::Accepted);
    assert(!observedController.step(1).empty()); // activate actor 0 before blocking its goal
    twoActorTerrain[1*8+6]=1;
    assert(observedController.updateTerrainDynamic(twoActorTerrain));
    assert(observedController.enqueue(request(1,orders::Kind::Move,{4,2},29,
                                             false,-1,2))==orders::Code::Accepted);
    FailureObservation observation;
    const std::vector<orders::Move> pendingMoves=observedController.step(
        3,observeFailure,&observation); // fairness rotation visits actor 0 first
    assert(observation.called&&observation.activeOnFailure&&
           !observation.laterInFlight);
    assert(observedController.unit(0).status==orders::Status::Unreachable&&
           observedController.unit(1).inFlight&&!pendingMoves.empty());

    // A transiently occupied one-cell corridor is not unreachable terrain.
    // The same command must recover if its blocker moves before timeout; a
    // persistent reservation receives an explicit congestion result instead.
    std::vector<uint8_t> choke(8*8,1);
    for(int x=1;x<=6;x++)choke[3*8+x]=0;
    orders::Controller traffic;
    assert(traffic.resetDynamic(8,8,choke,{{1,3},{3,3}}));
    assert(traffic.enqueue(request(0,orders::Kind::Move,{6,3},30))==orders::Code::Accepted);
    for(int t=1;t<=15;t++)traffic.step(t);
    assert(traffic.unit(0).hasOrder&&traffic.unit(0).status==orders::Status::Waiting);
    traffic.update(1,traffic.unit(1).position,false);
    for(int t=16;t<=35;t++)for(const orders::Move& m:traffic.step(t))
        traffic.update(m.actor,m.waypoint,true);
    assert(traffic.unit(0).position==Point({6,3})&&
           traffic.unit(0).status==orders::Status::Idle);

    assert(traffic.resetDynamic(8,8,choke,{{1,3},{3,3}}));
    assert(traffic.enqueue(request(0,orders::Kind::Move,{6,3},31))==orders::Code::Accepted);
    for(int t=1;t<=120;t++)traffic.step(t);
    assert(traffic.unit(0).status==orders::Status::Congested&&
           !traffic.unit(0).hasOrder);
    bool congestionFeedback=false;
    for(const orders::Feedback& f:traffic.takeFeedback())
        if(f.code==orders::Code::Congested&&f.sequence==0)congestionFeedback=true;
    assert(congestionFeedback);

    // Friendly idle scatter, but never force an enemy or an actor with an
    // active Hold order out of the way. Preserve the bounded search budget.
    std::vector<uint8_t> yieldLane(64,1);
    for(int x=1;x<=6;x++)yieldLane[3*8+x]=0;
    yieldLane[4*8+3]=0;
    auto trafficCase=[&](int blockerTeam,bool hold){
        orders::Controller nav;
        assert(nav.resetDynamic(8,8,yieldLane,{{1,3},{3,3}}));
        assert(nav.setTeam(0,1)&&nav.setTeam(1,blockerTeam));
        if(hold)assert(nav.enqueue(request(1,orders::Kind::Hold,{3,3},30))==
                       orders::Code::Accepted);
        assert(nav.enqueue(request(0,orders::Kind::Move,{4,3},31))==
               orders::Code::Accepted);
        bool reached=false;
        for(int t=1;t<=145;t++){
            for(const orders::Move& m:nav.step(t))nav.update(m.actor,m.waypoint,true);
            assert(nav.budget().searches<=orders::MAX_SEARCHES_PER_TICK);
            if(nav.unit(0).position==Point({4,3}))reached=true;
        }
        if(blockerTeam==1&&!hold){
            assert(reached&&!(nav.unit(1).position==Point({3,3})));
        }else{
            assert(!reached&&nav.unit(1).position==Point({3,3}));
            assert(nav.unit(0).status==orders::Status::Congested);
        }
    };
    trafficCase(1,false);
    trafficCase(2,false);
    trafficCase(1,true);

    // Final R02 integration: dynamic roster and a 12x8 R04-style cost map.
    // Weighted A* detours around expensive (but passable) rough terrain.
    orders::Controller dynamic;
    std::vector<uint8_t> open(12*8,0),costs(12*8,1);
    for(int x=2;x<10;x++)costs[1*12+x]=3;
    const std::vector<Point> positions={{1,1},{10,7},{0,7},{5,7},{7,7},{9,7}};
    assert(dynamic.resetDynamic(12,8,open,positions));
    assert(dynamic.count()==6&&dynamic.width()==12&&dynamic.height()==8);
    assert(dynamic.setMovementCosts(costs));
    assert(dynamic.enqueue(request(0,orders::Kind::Move,{10,1},1))==orders::Code::Accepted);
    const auto weighted=dynamic.step(1);
    assert(!weighted.empty()&&weighted[0].actor==0);
    assert(weighted[0].waypoint.x==1); // north/south around cost-3 tiles
    assert(dynamic.budget().searches<=2&&dynamic.budget().expansions<=2*96);
    assert(!dynamic.resetDynamic(8,8,std::vector<uint8_t>(3,0),positions));
    assert(dynamic.count()==6&&dynamic.width()==12); // malformed map atomic

    // An 8x8 winding corridor has a unique 32-edge route. Every open tile
    // costs 3, so g reaches 96: greater than the old cells_+1 sentinel.
    std::vector<uint8_t> winding(64,1),rough(64,0);
    for(int y:{0,2,4,6})for(int x=0;x<8;x++)winding[y*8+x]=0;
    for(const Point p:std::vector<Point>{{7,1},{0,3},{7,5},{0,7}})
        winding[p.y*8+p.x]=0;
    for(size_t i=0;i<winding.size();i++)if(!winding[i])rough[i]=3;
    assert(dynamic.resetDynamic(8,8,winding,{{0,0}}));
    assert(dynamic.setMovementCosts(rough));
    assert(dynamic.enqueue(request(0,orders::Kind::Move,{0,7},1))==orders::Code::Accepted);
    for(int t=1;t<=40;t++)for(const orders::Move& m:dynamic.step(t))
        dynamic.update(m.actor,m.waypoint,true);
    assert(dynamic.unit(0).position==Point({0,7}));
    assert(dynamic.unit(0).status==orders::Status::Idle);

    // Reserve queued capacity at admission, including requests that have not
    // yet reached step(), so an accepted World command cannot vanish later.
    dynamic.resetDynamic(8,8,std::vector<uint8_t>(64,0),{{0,0}});
    assert(dynamic.enqueue(request(0,orders::Kind::Hold,{0,0},1))==orders::Code::Accepted);
    for(int n=0;n<8;n++)assert(dynamic.enqueue(request(0,orders::Kind::Move,{1,1},2+n,true))==
                                 orders::Code::Accepted);
    assert(dynamic.enqueue(request(0,orders::Kind::Move,{2,2},10,true))==orders::Code::QueueFull);
    dynamic.step(1);
    assert(dynamic.unit(0).status==orders::Status::Holding&&
           dynamic.unit(0).queued.size()==8);

    // Representative 18x11 map budget: two bounded A* replans per tick.
    auto begin=std::chrono::steady_clock::now();
    int searches=0,expansions=0;
    for(int n=0;n<1000;n++){
        c.reset(terrain(),starts());
        c.enqueue(request(0,orders::Kind::Move,{16,9},1));
        c.enqueue(request(1,orders::Kind::Move,{15,7},2));
        c.step(1);
        searches+=c.budget().searches;expansions+=c.budget().expansions;
    }
    const auto micros=std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::steady_clock::now()-begin).count();
    std::cout<<"PASS: R02 four-unit obstacle crossing, deterministic replace/queue, modes, death and rejection\n";
    std::cout<<"BUDGET: 18x11, 1000 ticks, "<<searches<<" searches, "<<expansions
             <<" expanded cells, "<<micros<<" us total, "<<(double)micros/1000
             <<" us/tick (host); cap 2 searches and 396 expansions/tick\n";
}

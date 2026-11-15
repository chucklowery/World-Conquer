#include "simulation_contract.h"
#include <cassert>
#include <iostream>

int main(){
    courier::State state;
    courier::Combat combat;
    rts::Contract sim(state,combat);
    assert(rts::UNIT_IDS[0]!=rts::UNIT_IDS[1]);
    assert(rts::UNIT_IDS[2]!=rts::CRATE_IDS[0]);
    assert(rts::CRATE_IDS[1]!=rts::EXTRACTION_ID);
    assert(sim.terrainAt({5,2})==rts::Terrain::Blocked);
    assert(sim.terrainAt({-1,0})==rts::Terrain::Outside);
    assert(sim.passable({3,2}));
    const rts::Snapshot initial=sim.publish();
    assert(initial.version==1&&initial.tick==0&&initial.width==18&&initial.height==11);
    assert(initial.terrain.size()==198&&initial.entities.size()==7);
    assert(initial.entities[0].id==1001&&initial.entities[0].owner==rts::PLAYER_HOUSE);
    assert(initial.entities[2].team==rts::SENTRY_TEAM);
    assert(initial.entities[4].owner==rts::NEUTRAL);
    assert(initial.selectedEntityId==1001);
    const std::string shape=rts::json(initial);
    assert(shape.find("\"version\":1")!=std::string::npos);
    assert(shape.find("\"map\":{\"width\":18,\"height\":11")!=std::string::npos);
    assert(shape.find("\"ownerId\":1,\"teamId\":1")!=std::string::npos);

    const rts::Command move={1,20,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,{3,2},0};
    const rts::Command select={1,10,rts::PLAYER_HOUSE,1002,rts::CommandKind::Select,{0,0},0};
    assert(sim.enqueue(move).code==rts::ResultCode::Accepted);
    assert(sim.enqueue(select).code==rts::ResultCode::Accepted);
    assert(sim.enqueue(move).code==rts::ResultCode::DuplicateSequence);
    const std::string unchanged=rts::json(sim.view());
    const rts::Command blocked={1,30,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,{5,2},0};
    const rts::Command foreign={1,31,rts::SENTRY_HOUSE,1001,rts::CommandKind::Move,{3,2},0};
    const rts::Command unknown={1,32,rts::PLAYER_HOUSE,9999,rts::CommandKind::Select,{0,0},0};
    const rts::Command outside={1,33,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,{18,2},0};
    const rts::Command past={0,34,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,{3,2},0};
    assert(sim.enqueue(blocked).code==rts::ResultCode::Blocked);
    assert(sim.enqueue(foreign).code==rts::ResultCode::NotOwned);
    assert(sim.enqueue(unknown).code==rts::ResultCode::UnknownEntity);
    assert(sim.enqueue(outside).code==rts::ResultCode::BadTarget);
    assert(sim.enqueue(past).code==rts::ResultCode::InvalidTick);
    assert(rts::json(sim.view())==unchanged); // rejections never modify gameplay
    sim.process(0);
    assert(state.selected==0&&!state.hasNav[0]);
    sim.process(1);
    assert(state.selected==1&&state.hasNav[0]&&state.navTargets[0]==courier::Point({3,2}));
    const rts::Snapshot ordered=sim.publish();
    assert(ordered.events.size()==9); // six rejections, two accepts, selection
    assert(ordered.events[6].sequence==10&&ordered.events[7].sequence==20);
    assert(ordered.events[8].kind==rts::EventKind::Selection);
    assert(ordered.entities[0].hasOrder);
    assert(rts::json(ordered).find("\"type\":\"command\"")!=std::string::npos);

    // Native InfantryClass::AI is the only source of these coordinates. The
    // contract observes changes, but never steps infantry by itself.
    state.units[0].p={2,2};++state.frame;
    rts::Snapshot advanced=sim.publish();
    assert(advanced.tick==1&&advanced.entities[0].position==courier::Point({2,2}));
    assert(advanced.events.size()==1&&advanced.events[0].kind==rts::EventKind::Position);
    state.units[2].hp=1;
    state.collected[0]=true;state.cargo=1;
    advanced=sim.publish();
    assert(advanced.events.size()==2);
    assert(advanced.events[0].kind==rts::EventKind::Health);
    assert(advanced.events[1].kind==rts::EventKind::Pickup);

    // A new mission invalidates all queued commands and publishes a reset.
    const rts::Command delayed={10,35,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,{4,2},0};
    assert(sim.enqueue(delayed).code==rts::ResultCode::Accepted);
    state=courier::State();combat=courier::Combat();sim.restart();
    sim.process(10);
    assert(!state.hasNav[0]&&state.frame==0);
    advanced=sim.publish();
    assert(advanced.tick==0&&advanced.events.size()==1);
    assert(advanced.events[0].kind==rts::EventKind::Restart);
    assert(advanced.entities[0].id==initial.entities[0].id);
    std::cout<<"PASS: R00 IDs, owner/team, terrain, ordering, rejection, events, versioned snapshot and restart\n";
}

#include "rts_world.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>

static std::string catalogText(){
    std::ifstream file("game/content/r18/definitions.rts",std::ios::binary);
    assert(file);
    return std::string((std::istreambuf_iterator<char>(file)),std::istreambuf_iterator<char>());
}
static rts::WorldCommand command(uint16_t epoch,uint64_t tick,uint64_t seq,
                  rts::HouseId issuer,rts::HouseId owner,rts::EntityId actor,
                  rts::WorldAction action,const std::string& definition,int x,int y,
                  rts::EntityId target=0){
    return {epoch,tick,seq,issuer,owner,actor,target,action,definition,x,y};
}
static void print(const rts::WorldSnapshot& snapshot,bool json){
    if(json)std::cout<<rts::worldJson(snapshot)<<'\n';
}
int main(int argc,char** argv){
    const bool output=argc==2&&std::string(argv[1])=="--json";
    const bool restartStressOutput=argc==2&&std::string(argv[1])=="--restart-stress-json";
    rts::Catalog catalog;
    const std::string source=catalogText();
    assert(catalog.load(source));
    assert(catalog.definitions().size()==11);
    assert(catalog.find("game.aster.ranger")->visualKey=="r05.aster.ranger");
    // Failed schema reload is atomic, and art keys cannot act as gameplay IDs.
    std::string corrupt=source;
    const size_t art=corrupt.find("def|game.aster.ranger|aster|infantry|1|1|r05.aster.ranger");
    assert(art!=std::string::npos);
    corrupt.replace(art+41,16,"r05.forge.ranger");
    assert(!catalog.load(corrupt));
    assert(catalog.find("game.aster.ranger"));
    assert(!catalog.find("r05.aster.ranger"));
    std::string fakeArt=source;
    const size_t badVisual=fakeArt.find("visual|r05.aster.ranger");
    assert(badVisual!=std::string::npos);
    fakeArt.replace(badVisual+7,16,"r05.aster.unknown");
    assert(!catalog.load(fakeArt));
    assert(!catalog.load("RTS-DEFINITIONS|2\n"));
    assert(!catalog.load(source+"def|game.aster.ranger|aster|infantry|1|1|r05.aster.ranger|5\n"));

    std::vector<rts::House> houses={{1,1,"aster"},{2,2,"forge"},{3,1,"aster"}};
    std::vector<uint8_t> terrain(16*10,0);
    terrain[4*16+4]=1;
    rts::World world;
    assert(!world.configure(catalog,0,10,terrain,houses));
    assert(!world.configure(catalog,16,10,std::vector<uint8_t>(5,0),houses));
    assert(!world.configure(catalog,16,10,terrain,{{1,1,"aster"},{1,2,"forge"}}));
    assert(world.configure(catalog,16,10,terrain,houses));
    assert(world.epoch()==1&&world.tick()==0);
    print(world.publish(),output);

    const rts::WorldCommand a=command(1,1,1,1,1,0,rts::WorldAction::Spawn,
                                     "game.aster.ranger",1,1);
    const rts::WorldCommand b=command(1,1,2,2,2,0,rts::WorldAction::Spawn,
                                     "game.forge.ranger",12,7);
    const rts::WorldCommand neutral=command(1,1,3,0,0,0,rts::WorldAction::Spawn,
                                     "game.world.crystal",7,7);
    assert(world.enqueue(a)==rts::WorldCode::Accepted);
    assert(world.enqueue(b)==rts::WorldCode::Accepted);
    assert(world.enqueue(neutral)==rts::WorldCode::Accepted);
    assert(world.enqueue(a)==rts::WorldCode::DuplicateSequence);
    assert(world.enqueue(command(1,1,4,1,2,0,rts::WorldAction::Spawn,
        "game.forge.ranger",3,3))==rts::WorldCode::NotOwned);
    const std::string before=rts::worldJson(world.view());
    assert(world.enqueue(command(1,1,4,1,1,0,rts::WorldAction::Spawn,
        "game.forge.ranger",3,3))==rts::WorldCode::WrongFaction);
    assert(world.enqueue(command(1,1,4,1,1,0,rts::WorldAction::Spawn,
        "game.aster.ranger",4,4))==rts::WorldCode::Blocked);
    assert(world.enqueue(command(1,1,4,1,1,0,rts::WorldAction::Spawn,
        "not.a.definition",3,3))==rts::WorldCode::UnknownDefinition);
    assert(rts::worldJson(world.view())==before);
    assert(world.process(1));
    const rts::EntityId first=(1u<<20)|1,second=(1u<<20)|2,third=(1u<<20)|3;
    assert(world.entities().size()==3);
    assert(world.entity(first)->owner==1&&world.entity(first)->team==1);
    assert(world.entity(second)->owner==2&&world.entity(second)->team==2);
    assert(world.entity(third)->owner==0&&world.entity(third)->team==0);
    rts::WorldSnapshot snapshot=world.publish();
    assert(snapshot.events.size()==6);
    assert(snapshot.events[0].type==rts::WorldEventType::Command);
    assert(snapshot.events[1].type==rts::WorldEventType::Spawn);
    assert(snapshot.events[5].entityId==third);
    assert(snapshot.selectedEntityId==0);
    print(snapshot,output);

    assert(world.enqueue(command(1,2,4,2,2,first,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::NotOwned);
    assert(world.enqueue(command(1,2,4,1,2,first,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::BadTeam);
    assert(world.enqueue(command(1,2,4,1,1,first,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::Accepted);
    assert(world.enqueue(command(1,2,5,1,1,first,rts::WorldAction::Move,
        "",3,1))==rts::WorldCode::Accepted);
    assert(world.enqueue(command(1,2,6,1,1,first,rts::WorldAction::Attack,
        "",0,0,first))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(1,2,6,1,1,first,rts::WorldAction::Attack,
        "",-1,0,second))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(1,2,6,1,1,first,rts::WorldAction::Attack,
        "",0,10,second))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(1,2,6,1,1,first,rts::WorldAction::Attack,
        "",0,0,second))==rts::WorldCode::Accepted);
    assert(world.process(2));
    snapshot=world.publish();
    assert(snapshot.selectedEntityId==first);
    assert(world.entity(first)->target==second);
    assert(world.observePosition(first,2,1)); // driven by a native engine adapter
    assert(!world.observePosition(first,4,4)); // blocked terrain
    assert(world.observeDamage(first,2,second));
    snapshot=world.publish();
    assert(snapshot.events.size()==2);
    assert(snapshot.events[0].type==rts::WorldEventType::Position);
    assert(snapshot.events[1].type==rts::WorldEventType::Damage);
    print(snapshot,output);

    assert(world.enqueue(command(1,3,7,0,0,first,rts::WorldAction::Kill,
        "",0,0))==rts::WorldCode::Accepted);
    assert(world.enqueue(command(1,3,8,2,2,second,rts::WorldAction::Despawn,
        "",0,0))==rts::WorldCode::Accepted);
    assert(world.process(3));
    snapshot=world.publish();
    assert(world.entity(first)->life==rts::Life::Dead);
    assert(world.entity(second)->life==rts::Life::Despawned);
    assert(snapshot.selectedEntityId==0);
    assert(rts::worldJson(snapshot).find("\"lifecycle\":\"despawned\"")!=std::string::npos);
    print(snapshot,output);
    assert(world.enqueue(command(1,4,7,1,1,first,rts::WorldAction::Move,
        "",5,5))==rts::WorldCode::DuplicateSequence);
    assert(world.enqueue(command(1,4,9,1,1,first,rts::WorldAction::Move,
        "",5,5))==rts::WorldCode::Dead);
    assert(world.enqueue(command(0,4,9,1,1,first,rts::WorldAction::Move,
        "",5,5))==rts::WorldCode::InvalidEpoch);
    assert(world.enqueue(command(1,3,9,1,1,first,rts::WorldAction::Move,
        "",5,5))==rts::WorldCode::InvalidTick);
    assert(world.restart());
    snapshot=world.publish();
    assert(world.epoch()==2&&world.tick()==0&&world.entities().empty());
    assert(snapshot.events.size()==1&&snapshot.events[0].type==rts::WorldEventType::Restart);
    print(snapshot,output);
    assert(world.enqueue(a)==rts::WorldCode::InvalidEpoch);
    assert(world.enqueue(command(2,1,1,1,1,0,rts::WorldAction::Spawn,
        "game.aster.rover",3,3))==rts::WorldCode::Accepted);
    assert(world.process(1));
    snapshot=world.publish();
    assert(snapshot.entities.size()==1&&snapshot.entities[0].id!=first);
    assert(snapshot.entities[0].id==((2u<<20)|1));
    print(snapshot,output);
    const rts::EntityId secondEpochId=snapshot.entities[0].id;

    // A second map has independent dimensions, ownership, and terrain.
    rts::World wide;
    assert(wide.configure(catalog,24,14,std::vector<uint8_t>(24*14,0),houses));
    assert(wide.enqueue(command(1,1,1,3,3,0,rts::WorldAction::Spawn,
        "game.aster.hub",8,7))==rts::WorldCode::Accepted);
    assert(wide.process(1));
    assert(wide.entity(first)->team==1);
    assert(wide.view().width==24&&wide.view().height==14);
    // Changing a valid map is a new epoch, never reusing a prior match ID.
    assert(world.configure(catalog,24,14,std::vector<uint8_t>(24*14,0),houses));
    assert(world.epoch()==3&&world.entities().empty());
    assert(world.enqueue(command(3,1,1,1,1,0,rts::WorldAction::Spawn,
        "game.aster.ranger",3,3))==rts::WorldCode::Accepted);
    assert(world.process(1)&&world.entities()[0].id!=secondEpochId);

    // Bounded command/event queues; rejected commands do not consume sequence.
    rts::World bounded;
    assert(bounded.configure(catalog,24,14,std::vector<uint8_t>(24*14,0),houses));
    for(uint64_t seq=1;seq<=rts::WORLD_MAX_COMMANDS;seq++)
        assert(bounded.enqueue(command(1,1,seq,1,1,0,rts::WorldAction::Select,
            "",0,0))==rts::WorldCode::Accepted);
    assert(bounded.enqueue(command(1,1,129,1,1,0,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::QueueFull);
    assert(bounded.process(1));
    assert(bounded.publish().events.size()==rts::WORLD_MAX_EVENTS);
    assert(bounded.enqueue(command(1,2,129,1,1,0,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::Accepted);
    // Every event remains bounded even when no observer consumes a full batch.
    rts::World crowded;
    assert(crowded.configure(catalog,24,14,std::vector<uint8_t>(24*14,0),houses));
    for(int n=0;n<255;n++){
        const int x=n%24,y=n/24;
        assert(crowded.enqueue(command(1,n<128?1:2,n+1,0,0,0,
            rts::WorldAction::Spawn,"game.world.crystal",x,y))==
            rts::WorldCode::Accepted);
        if(n==127)assert(crowded.process(1));
    }
    assert(crowded.process(2));
    assert(crowded.entities().size()==rts::WORLD_MAX_ENTITIES-1);
    // Selection uses the command budget but reserves no entity ID. A queued
    // spawn still has the last record available, even with 255 tombstone slots.
    assert(crowded.enqueue(command(1,3,256,1,1,0,rts::WorldAction::Select,
        "",0,0))==rts::WorldCode::Accepted);
    assert(crowded.enqueue(command(1,3,257,0,0,0,rts::WorldAction::Spawn,
        "game.world.crystal",15,10))==rts::WorldCode::Accepted);
    assert(crowded.process(3));
    assert(crowded.entities().size()==rts::WORLD_MAX_ENTITIES);
    assert(crowded.publish().events.size()==rts::WORLD_MAX_EVENTS);
    assert(crowded.enqueue(command(1,4,258,0,0,0,rts::WorldAction::Spawn,
        "game.world.crystal",0,12))==rts::WorldCode::Capacity);
    // Replaying one mixed, simultaneous-command stream yields identical
    // IDs, rejection events, tombstones and restart epochs byte-for-byte.
    const auto replay=[&catalog,&houses](){
        rts::World r;
        assert(r.configure(catalog,16,10,std::vector<uint8_t>(160,0),houses));
        assert(r.enqueue(command(1,1,1,1,1,0,rts::WorldAction::Spawn,
            "game.aster.ranger",2,2))==rts::WorldCode::Accepted);
        assert(r.enqueue(command(1,1,2,1,1,0,rts::WorldAction::Spawn,
            "game.aster.ranger",2,2))==rts::WorldCode::Accepted);
        assert(r.enqueue(command(1,1,3,2,2,0,rts::WorldAction::Spawn,
            "game.forge.ranger",7,2))==rts::WorldCode::Accepted);
        assert(r.process(1));
        const std::string begin=rts::worldJson(r.publish());
        assert(r.entities().size()==2);
        const rts::EntityId id=(1u<<20)|1;
        assert(r.enqueue(command(1,2,4,1,1,id,rts::WorldAction::Move,
            "",3,2))==rts::WorldCode::Accepted);
        assert(r.enqueue(command(1,2,5,1,1,id,rts::WorldAction::Despawn,
            "",0,0))==rts::WorldCode::Accepted);
        assert(r.process(2));
        const std::string middle=rts::worldJson(r.publish());
        assert(r.restart());
        const std::string ending=rts::worldJson(r.publish());
        return begin+middle+ending;
    };
    assert(replay()==replay());
    // Epoch transitions must remain publishable even when 128 commands cause
    // 256 events to be appended after an unconsumed restart marker.
    rts::World overflow;
    assert(overflow.configure(catalog,16,10,std::vector<uint8_t>(160,0),houses));
    print(overflow.publish(),restartStressOutput);
    assert(overflow.restart());
    for(uint64_t seq=1;seq<=rts::WORLD_MAX_COMMANDS;seq++)
        assert(overflow.enqueue(command(2,1,seq,1,1,0,rts::WorldAction::Select,
            "",0,0))==rts::WorldCode::Accepted);
    assert(overflow.process(1));
    const rts::WorldSnapshot overflowSnapshot=overflow.publish();
    assert(overflowSnapshot.events.size()==rts::WORLD_MAX_EVENTS);
    assert(overflowSnapshot.events.front().type==rts::WorldEventType::Restart);
    assert(overflowSnapshot.events.back().type==rts::WorldEventType::Selection);
    print(overflowSnapshot,restartStressOutput);
    assert(overflow.publish().events.empty());
    if(!output&&!restartStressOutput)
        std::cout<<"PASS: R18 schema, two factions/neutral, dynamic maps, ownership, replay, lifecycle, epochs and v3 JSON\n";
}

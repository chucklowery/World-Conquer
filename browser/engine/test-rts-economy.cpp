#include "rts_world.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>

static rts::WorldCommand command(const rts::World& world,uint64_t sequence,
                                 rts::HouseId issuer,rts::EntityId actor,
                                 rts::EntityId target,rts::WorldAction action,
                                 int x,int y,const std::string& definition=""){
    return {world.epoch(),world.tick()+1,sequence,issuer,issuer,actor,target,
            action,definition,x,y};
}
static rts::EntityId spawn(rts::World& world,uint64_t sequence,rts::HouseId owner,
                           const char* definition,int x,int y){
    const rts::WorldCommand c=command(world,sequence,owner,0,0,
                                      rts::WorldAction::Spawn,x,y,definition);
    assert(world.enqueue(c)==rts::WorldCode::Accepted);
    assert(world.process(world.tick()+1));
    return world.entities().back().id;
}
int main(int argc,char** argv){
    const bool json=argc==2&&std::string(argv[1])=="--json";
    const bool compatJson=argc==2&&std::string(argv[1])=="--v3-compat-json";
    std::ifstream file("game/content/r18/definitions.rts");assert(file);
    const std::string text((std::istreambuf_iterator<char>(file)),
                            std::istreambuf_iterator<char>());
    rts::Catalog catalog;assert(catalog.load(text));
    rts::World world;
    assert(world.configure(catalog,16,10,std::vector<uint8_t>(160,0),
                           {{1,1,"aster"},{2,2,"forge"}}));
    const rts::EntityId harvester=spawn(world,1,1,"game.aster.harvester",4,5);
    const rts::EntityId refinery=spawn(world,2,1,"game.aster.refinery",2,3);
    const rts::EntityId resource=spawn(world,3,0,"game.world.crystal",5,5);
    const rts::EntityId enemy=spawn(world,4,2,"game.forge.harvester",9,5);
    const rts::EntityId enemyRefinery=spawn(world,5,2,"game.forge.refinery",10,3);
    assert(world.seedResource(resource,3));
    assert(!world.seedResource(resource,3));
    assert(!world.seedResource(harvester,3));
    assert(!world.seedResource(enemy,100001));
    world.publish(); // separate fixture setup from order/event assertions
    const std::string initialV3=rts::worldJson(world.view());
    assert(initialV3.find("\"version\":3")!=std::string::npos);
    assert(initialV3.find("\"credits\"")==std::string::npos);
    assert(initialV3.find("\"resources\"")==std::string::npos);
    if(json)std::cout<<rts::worldJson(world.publishEconomy())<<'\n';

    const std::string before=rts::worldJson(world.viewEconomy());
    assert(world.enqueue(command(world,6,2,harvester,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::NotOwned);
    assert(world.enqueue(command(world,6,1,harvester,enemy,
        rts::WorldAction::Harvest,9,5))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(world,6,1,harvester,resource,
        rts::WorldAction::Harvest,4,5))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(world,6,1,harvester,refinery,
        rts::WorldAction::ReturnCargo,2,3))==rts::WorldCode::Empty);
    assert(world.enqueue(command(world,6,1,enemy,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::NotOwned);
    assert(world.enqueue(command(world,6,2,enemy,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Unreachable);
    assert(world.enqueue(command(world,6,1,harvester,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Accepted);
    assert(world.process(world.tick()+1));
    assert(world.commitHarvest(harvester,resource,4)==rts::WorldCode::Capacity);
    assert(world.commitHarvest(harvester,resource,0)==rts::WorldCode::BadTarget);
    assert(world.commitHarvest(harvester,resource,3)==rts::WorldCode::Accepted);
    assert(world.entity(resource)->life==rts::Life::Despawned);
    assert(world.viewEconomy().resources[0].remaining==0);
    assert(world.commitHarvest(harvester,resource,1)==rts::WorldCode::BadTarget);
    if(json)std::cout<<rts::worldJson(world.publishEconomy())<<'\n';
    else world.publishEconomy();
    assert(world.enqueue(command(world,7,1,harvester,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(world,7,1,harvester,enemyRefinery,
        rts::WorldAction::ReturnCargo,10,3))==rts::WorldCode::BadTarget);
    assert(world.enqueue(command(world,7,1,harvester,refinery,
        rts::WorldAction::ReturnCargo,2,3))==rts::WorldCode::Accepted);
    assert(world.process(world.tick()+1));
    assert(world.commitReturnCargo(harvester,enemyRefinery)==rts::WorldCode::BadTarget);
    assert(world.commitReturnCargo(harvester,refinery)==rts::WorldCode::Accepted);
    assert(world.houses()[0].credits==3&&world.houses()[1].credits==0);
    assert(world.commitReturnCargo(harvester,refinery)==rts::WorldCode::BadTarget);
    if(json)std::cout<<rts::worldJson(world.publishEconomy())<<'\n';
    else world.publishEconomy();
    assert(world.enqueue(command(world,8,1,harvester,refinery,
        rts::WorldAction::ReturnCargo,2,3))==rts::WorldCode::Empty);
    // The exhausted footprint is free, but a replacement source is never
    // the old identity (no implicit respawn or regrowth).
    const rts::EntityId newResource=spawn(world,8,0,"game.world.crystal",5,5);
    assert(newResource!=resource&&world.seedResource(newResource,2));
    assert(world.restart());
    assert(world.houses()[0].credits==0&&world.viewEconomy().resources.empty()&&
           world.viewEconomy().harvesters.empty());
    assert(world.enqueue(command(world,1,1,harvester,resource,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::UnknownEntity);
    if(json)std::cout<<rts::worldJson(world.publishEconomy())<<'\n';
    else world.publishEconomy();
    assert(before!=rts::worldJson(world.viewEconomy()));

    // A separate near-limit native house proves atomic credit overflow.
    rts::World full;
    assert(full.configure(catalog,16,10,std::vector<uint8_t>(160,0),
                          {{1,1,"aster",rts::WORLD_MAX_CREDITS},{2,2,"forge"}}));
    const rts::EntityId h=spawn(full,1,1,"game.aster.harvester",4,5);
    const rts::EntityId r=spawn(full,2,0,"game.world.crystal",5,5);
    const rts::EntityId f=spawn(full,3,1,"game.aster.refinery",2,3);
    assert(full.seedResource(r,1));full.publish();
    assert(full.enqueue(command(full,4,1,h,r,rts::WorldAction::Harvest,5,5))==
           rts::WorldCode::Accepted);
    assert(full.process(full.tick()+1));
    assert(full.commitHarvest(h,r,1)==rts::WorldCode::Accepted);
    assert(full.enqueue(command(full,5,1,h,f,rts::WorldAction::ReturnCargo,2,3))==
           rts::WorldCode::Overflow);
    assert(full.houses()[0].credits==rts::WORLD_MAX_CREDITS);
    assert(full.viewEconomy().harvesters[0].cargo==1);
    assert(full.enqueue(command(full,5,0,h,0,rts::WorldAction::Kill,0,0))==
           rts::WorldCode::Accepted);
    assert(full.process(full.tick()+1));
    assert(full.viewEconomy().harvesters[0].cargo==0);
    assert(full.restart()&&full.houses()[0].credits==rts::WORLD_MAX_CREDITS);

    // A larger neutral deposit tests the full-cargo guard and Stop
    // cancellation; two native harvesters never consume a source twice.
    rts::World concurrent;
    assert(concurrent.configure(catalog,16,10,std::vector<uint8_t>(160,0),
                                {{1,1,"aster"},{2,2,"forge"}}));
    const rts::EntityId one=spawn(concurrent,1,1,"game.aster.harvester",4,5);
    const rts::EntityId two=spawn(concurrent,2,2,"game.forge.harvester",6,5);
    const rts::EntityId source=spawn(concurrent,3,0,"game.world.crystal",5,5);
    const rts::EntityId receiver=spawn(concurrent,4,1,"game.aster.refinery",2,3);
    assert(concurrent.seedResource(source,25));concurrent.publish();
    assert(concurrent.enqueue(command(concurrent,5,1,one,source,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Accepted);
    assert(concurrent.enqueue(command(concurrent,6,2,two,source,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Accepted);
    assert(concurrent.process(concurrent.tick()+1));
    assert(concurrent.commitHarvest(one,source,20)==rts::WorldCode::Accepted);
    assert(concurrent.viewEconomy().harvesters[0].cargo==20);
    assert(concurrent.enqueue(command(concurrent,7,1,one,source,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Full);
    assert(concurrent.commitHarvest(two,source,5)==rts::WorldCode::Accepted);
    assert(concurrent.viewEconomy().resources[0].remaining==0);
    assert(concurrent.commitHarvest(one,source,1)==rts::WorldCode::BadTarget);
    assert(concurrent.enqueue(command(concurrent,7,1,one,receiver,
        rts::WorldAction::ReturnCargo,2,3))==rts::WorldCode::Accepted);
    assert(concurrent.process(concurrent.tick()+1));
    assert(concurrent.enqueue(command(concurrent,8,1,one,0,
        rts::WorldAction::Stop,4,5))==rts::WorldCode::Accepted);
    assert(concurrent.process(concurrent.tick()+1));
    assert(concurrent.commitReturnCargo(one,receiver)==rts::WorldCode::BadTarget);
    assert(concurrent.viewEconomy().harvesters[0].cargo==20);

    // Depletion of a selected neutral resource must clear selection, and
    // the legacy v3 producer must keep its ordinary despawn/selection events
    // without leaking economy-only event types into v3 consumers.
    rts::World selected;
    assert(selected.configure(catalog,16,10,std::vector<uint8_t>(160,0),
                              {{1,1,"aster"},{2,2,"forge"}}));
    const rts::EntityId picker=spawn(selected,1,1,"game.aster.harvester",4,5);
    const rts::EntityId deposit=spawn(selected,2,0,"game.world.crystal",5,5);
    assert(selected.seedResource(deposit,1));selected.publish();
    assert(selected.enqueue(command(selected,3,0,deposit,0,
        rts::WorldAction::Select,0,0))==rts::WorldCode::Accepted);
    assert(selected.process(selected.tick()+1));
    assert(selected.view().selectedEntityId==deposit);
    assert(selected.enqueue(command(selected,4,1,picker,deposit,
        rts::WorldAction::Harvest,5,5))==rts::WorldCode::Accepted);
    assert(selected.process(selected.tick()+1));
    assert(selected.commitHarvest(picker,deposit,1)==rts::WorldCode::Accepted);
    assert(selected.view().selectedEntityId==0);
    const rts::WorldSnapshot legacy=selected.publish();
    bool sawSelection=false,sawDespawn=false;
    for(const rts::WorldEvent& event:legacy.events){
        assert(rts::legacyWorldEvent(event));
        if(event.type==rts::WorldEventType::Selection&&event.entityId==0)
            sawSelection=true;
        if(event.type==rts::WorldEventType::Despawn&&event.entityId==deposit)
            sawDespawn=true;
    }
    assert(sawSelection&&sawDespawn);
    const std::string legacyJson=rts::worldJson(legacy);
    assert(legacyJson.find("resource_delta")==std::string::npos);
    assert(legacyJson.find("resource_depleted")==std::string::npos);
    // The defensive JSON serializer also filters economy-only event codes
    // if given a manually assembled v3 snapshot.
    rts::WorldSnapshot injected=legacy;
    injected.events.push_back({rts::WorldEventType::Command,selected.epoch(),
        selected.tick(),5,picker,0,0,rts::WorldCode::Empty,0,0,0,1});
    injected.events.push_back({rts::WorldEventType::ResourceDelta,selected.epoch(),
        selected.tick(),5,deposit,picker,0,rts::WorldCode::Accepted,0,0,-1,0});
    const std::string sanitized=rts::worldJson(injected);
    assert(sanitized==legacyJson);
    if(compatJson)std::cout<<sanitized<<'\n';
    if(!json&&!compatJson)
        std::cout<<"PASS: FND-004/005 native identity, depletion, credit/cargo, admission, overflow and restart\n";
}

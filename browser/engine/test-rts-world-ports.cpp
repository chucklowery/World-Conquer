#include "rts_world_ports.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>

static std::string contents(const char* name){
    std::ifstream f(name,std::ios::binary);assert(f);
    return std::string((std::istreambuf_iterator<char>(f)),std::istreambuf_iterator<char>());
}
static rts::WorldCommand spawn(uint16_t epoch,uint64_t sequence,rts::HouseId issuer,
                              const std::string& definition,int x,int y){
    return {epoch,1,sequence,issuer,issuer,0,0,rts::WorldAction::Spawn,definition,x,y};
}
int main(){
    rts::Catalog catalog;
    assert(catalog.load(contents("game/content/r18/definitions.rts")));
    const std::vector<rts::House> houses={{1,1,"aster"},{2,2,"forge"},{3,1,"aster"}};
    // R04's variable-size native parser hydrates one World without truncation.
    courier::State ridge;
    assert(courier::loadMap(ridge,contents("game/content/missions/ridge-pass.map")));
    rts::World world;
    assert(rts::configureFromR04(world,catalog,ridge,houses));
    assert(world.view().width==16&&world.view().height==10);
    assert(world.enqueue(spawn(1,1,1,"game.aster.ranger",1,2))==rts::WorldCode::Accepted);
    assert(world.enqueue(spawn(1,2,2,"game.forge.ranger",12,2))==rts::WorldCode::Accepted);
    assert(world.process(1));
    const std::string before=rts::worldJson(world.view());
    ridge.blocked.pop_back();
    assert(!rts::configureFromR04(world,catalog,ridge,houses));
    assert(rts::worldJson(world.view())==before);
    orders::Controller navigation;
    const rts::EntityId first=(1u<<20)|1;
    assert(!rts::bindR02Orders(world,navigation,1,{{first,first,first,first}}));

    // R02's four-actor native diagnostic is bounded to Courier's footprint.
    courier::State courier;
    rts::World fixed;
    assert(rts::configureFromR04(fixed,catalog,courier,houses));
    for(unsigned i=0;i<4;i++)
        assert(fixed.enqueue(spawn(1,i+1,1,"game.aster.ranger",1+static_cast<int>(i),1))
               ==rts::WorldCode::Accepted);
    assert(fixed.enqueue(spawn(1,5,2,"game.forge.ranger",6,1))==rts::WorldCode::Accepted);
    assert(fixed.process(1));
    const std::array<rts::EntityId,4> own={{first,first+1,first+2,first+3}};
    assert(rts::bindR02Orders(fixed,navigation,1,own));
    assert(navigation.unit(0).position==courier::Point({1,1}));
    assert(!rts::bindR02Orders(fixed,navigation,2,own));
    assert(!rts::bindR02Orders(fixed,navigation,1,{{first,first,first+2,first+3}}));
    assert(navigation.enqueue({1,1,0,{orders::Kind::Move,{1,3},-1},false})
           ==orders::Code::Accepted);

    // R03 receives stable R18 entity IDs, house/team and HP, and returns
    // native damage events to the one canonical world. No JS combat authority.
    const rtscombat::Weapon rifle={1,3,2,2,rtscombat::Infantry,
        rtscombat::SmallArms,rtscombat::Instant,0,0,0,true,false,rtscombat::EnemiesOnly};
    rtscombat::System combat;
    assert(rts::bindR03Combat(fixed,combat,{rifle},{1,1,1}));
    assert(combat.actors().size()==5);
    assert(combat.find(first)->team==1);
    const rts::EntityId foe=first+4;
    assert(combat.find(foe)->team==2);
    assert(!combat.canAttack(first,first+1));
    assert(combat.orderAttack(first+3,foe));
    assert(fixed.process(2));
    combat.tick(2);
    assert(rts::applyR03CombatEvents(fixed,combat));
    assert(fixed.entity(foe)->hp==3);
    const rts::WorldSnapshot events=fixed.publish();
    bool found=false;
    for(const rts::WorldEvent& e:events.events)
        if(e.type==rts::WorldEventType::Damage&&e.entityId==foe&&
           e.sourceId==first+3&&e.weaponId==1)found=true;
    assert(found);
    assert(fixed.restart());
    assert(fixed.enqueue(spawn(1,1,1,"game.aster.ranger",1,1))
           ==rts::WorldCode::InvalidEpoch);
    std::cout<<"PASS: R04 map-to-world, R02 bounded order binding, R03 combat/HP/event ports, team isolation and restart\n";
}

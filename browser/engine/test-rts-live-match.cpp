#include "rts_live_match.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>

static std::string read(const std::string& name){
    std::ifstream input(name.c_str(),std::ios::binary);
    assert(input);
    return std::string(std::istreambuf_iterator<char>(input),
                       std::istreambuf_iterator<char>());
}
int main(int argc,char** argv){
    const bool json=argc==2&&std::string(argv[1])=="--json";
    const std::string defs=read("game/content/r18/definitions.rts");
    const std::string ridge=read("game/content/missions/ridge-pass.map");
    const std::string marsh=read("game/content/missions/marsh-border.map");
    rts::LiveMatch match;
    assert(!match.load("malformed map",defs));
    assert(match.load(ridge,defs));
    assert(match.world().epoch()==1&&match.world().tick()==1);
    assert(match.actors().size()==6); // map-authored four plus two script starts
    assert(match.navigation().count()==6);
    assert(match.navigation().width()==16&&match.navigation().height()==10);
    assert(match.world().entities().size()==8); // two neutral R04 resources
    auto s=match.snapshot();
    assert(s.version==3&&s.mapMetadata.present&&s.mapMetadata.tiles.size()==160);
    assert(s.mapMetadata.spawns.size()==2&&s.mapMetadata.resources.size()==2);
    assert(s.entities[0].definitionId=="game.aster.ranger"&&s.entities[0].owner==1);
    assert(s.entities[2].definitionId=="game.forge.ranger"&&s.entities[2].owner==2);
    assert(s.entities[6].owner==0&&s.entities[6].team==0);
    assert(s.selectedEntityId==0&&s.commandStates.size()==6);
    assert(s.events.size()==16&&s.events.front().type==rts::WorldEventType::Command);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    const rts::EntityId scout=match.actors()[0].id,ally=match.actors()[1].id;
    const rts::EntityId enemy=match.actors()[2].id;
    const std::string before=rts::worldJson(match.snapshot(false));
    assert(match.order(2,scout,orders::Kind::Move,{2,2})==rts::WorldCode::NotOwned);
    assert(match.order(1,scout,orders::Kind::Move,{-1,2})==rts::WorldCode::BadTarget);
    assert(match.order(1,scout,orders::Kind::Move,{8,2})==rts::WorldCode::Blocked);
    assert(match.order(1,scout,orders::Kind::Guard,{0,0},false,enemy)==
           rts::WorldCode::BadTarget);
    assert(rts::worldJson(match.snapshot(false))==before);
    assert(match.select(1,scout)==rts::WorldCode::Accepted);
    assert(match.order(1,scout,orders::Kind::Move,{6,2})==rts::WorldCode::Accepted);
    assert(match.order(1,scout,orders::Kind::Patrol,{6,3},true)==rts::WorldCode::Accepted);
    assert(match.order(1,ally,orders::Kind::Guard,{0,0},false,scout)==rts::WorldCode::Accepted);
    assert(match.order(1,match.actors()[4].id,orders::Kind::Hold,{0,0})==
           rts::WorldCode::Accepted);
    bool moved=false;
    for(int n=0;n<75;n++){
        const auto waypoints=match.plan();
        assert(match.navigation().budget().searches<=2);
        assert(match.navigation().budget().expansions<=2*160);
        for(const orders::Move& move:waypoints){
            assert(match.observePosition(move.actor,move.waypoint));
            if(move.actor==0)moved=true;
        }
        assert(match.resolveCombat());
    }
    assert(moved&&match.world().entity(scout)->x!=1);
    s=match.snapshot();
    assert(s.selectedEntityId==scout&&s.commandStates.size()==6);
    assert(s.commandStates[0].queued<=1);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    assert(match.order(1,scout,orders::Kind::Stop,{0,0})==rts::WorldCode::Accepted);
    assert(match.plan().size()<=2);
    assert(match.resolveCombat());
    assert(match.restart());
    s=match.snapshot();
    assert(s.epoch==2&&s.tick==1&&s.selectedEntityId==0);
    assert(s.events[0].type==rts::WorldEventType::Restart);
    assert(match.actors()[0].id!=scout);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    const std::string intact=rts::worldJson(match.snapshot(false));
    assert(!match.load(ridge+"invalid\n",defs));
    assert(!match.load(marsh,"RTS-DEFINITIONS|99\n"));
    std::string incompleteDefs=defs;
    const size_t forgeDef=incompleteDefs.find("game.forge.ranger");
    assert(forgeDef!=std::string::npos);
    incompleteDefs.replace(forgeDef,17,"game.forge.scout");
    assert(!match.load(ridge,incompleteDefs)); // valid schema, missing scripted role
    assert(rts::worldJson(match.snapshot(false))==intact);
    // A successful reload is a new epoch, even when the caller reuses this
    // LiveMatch instance; stale IDs must never identify a new actor.
    const rts::EntityId beforeReload=match.actors()[0].id;
    assert(match.load(marsh,defs));
    s=match.snapshot();
    assert(s.epoch==3&&s.tick==1&&s.selectedEntityId==0);
    assert(s.events.front().type==rts::WorldEventType::Restart);
    assert(match.actors()[0].id!=beforeReload);
    assert(s.mapMetadata.id=="marsh-border");
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    // Reserve all eight future orders before World admits them. The ninth
    // rejection cannot silently corrupt the canonical active Hold order.
    rts::LiveMatch queued;
    assert(queued.load(ridge,defs));
    const rts::EntityId queueActor=queued.actors()[0].id;
    assert(queued.order(1,queueActor,orders::Kind::Hold,{0,0})==rts::WorldCode::Accepted);
    queued.plan();
    for(int n=0;n<8;n++)assert(queued.order(1,queueActor,orders::Kind::Move,{6,2},true)==
                                rts::WorldCode::Accepted);
    assert(queued.order(1,queueActor,orders::Kind::Move,{6,3},true)==
           rts::WorldCode::QueueFull);
    queued.plan();
    s=queued.snapshot(false);
    assert(s.commandStates[0].kind=="hold"&&s.commandStates[0].queued==8);
    assert(s.entities[0].hasOrder&&s.entities[0].orderX==s.commandStates[0].x);
    assert(queued.order(1,queueActor,orders::Kind::Stop,{0,0})==rts::WorldCode::Accepted);
    queued.plan();
    s=queued.snapshot(false);
    assert(!s.entities[0].hasOrder&&s.commandStates[0].queued==0);
    // Recheck range at activation too: a moving target can invalidate an
    // otherwise legal future attack without leaving phantom weapon focus.
    rts::LiveMatch movingTarget;
    assert(movingTarget.load(ridge,defs));
    assert(movingTarget.observePosition(0,{10,2}));
    const rts::EntityId seeker=movingTarget.actors()[0].id;
    const rts::EntityId fleeing=movingTarget.actors()[2].id;
    assert(movingTarget.attack(1,seeker,fleeing)==rts::WorldCode::Accepted);
    assert(movingTarget.observePosition(2,{15,2}));
    movingTarget.plan();
    s=movingTarget.snapshot();
    assert(!s.entities[0].hasOrder&&s.commandStates[0].kind=="stop");
    assert(movingTarget.combat().find(seeker)->focus==0);
    bool invalidated=false;
    for(const rts::WorldEvent& event:s.events)
        invalidated|=event.type==rts::WorldEventType::Command&&
                     event.code==rts::WorldCode::BadTarget&&event.entityId==seeker;
    assert(invalidated);
    rts::LiveMatch wide;
    assert(wide.load(marsh,defs));
    s=wide.snapshot();
    assert(s.mapMetadata.id=="marsh-border"&&s.width==24&&s.height==14);
    assert(s.entities[2].owner==2&&s.commandStates.size()==6);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    // Stationary attacks cannot accept an out-of-range target. A nearby
    // target, however, becomes active only when the next tick executes.
    assert(wide.attack(1,wide.actors()[0].id,wide.actors()[2].id)==
           rts::WorldCode::BadTarget);
    assert(wide.observePosition(0,{19,8})); // host mock of real native observation
    const rts::EntityId attacker=wide.actors()[0].id,target=wide.actors()[2].id;
    assert(wide.attack(1,attacker,target)==rts::WorldCode::Accepted);
    assert(wide.attack(2,wide.actors()[0].id,wide.actors()[2].id)==
           rts::WorldCode::NotOwned);
    assert(wide.attack(1,wide.actors()[0].id,wide.actors()[1].id)==
           rts::WorldCode::BadTarget);
    assert(wide.combat().find(attacker)->focus==0); // admission is not execution
    assert(wide.plan().size()<=2);
    assert(wide.combat().find(attacker)->focus==target);
    s=wide.snapshot(false);
    assert(s.entities[0].hasOrder&&s.entities[0].target==target);
    assert(s.commandStates[0].kind=="attack"&&s.commandStates[0].status=="attacking");
    assert(s.commandStates[0].x==s.entities[0].orderX);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    // A queued replacement must not cancel the active attack until it runs.
    assert(wide.order(1,attacker,orders::Kind::Move,{19,7},true)==rts::WorldCode::Accepted);
    wide.plan();
    assert(wide.combat().find(attacker)->focus==target);
    s=wide.snapshot(false);
    assert(s.commandStates[0].kind=="attack"&&s.commandStates[0].queued==1);
    assert(s.entities[0].target==target&&s.entities[0].orderX==s.commandStates[0].x);
    assert(wide.order(1,attacker,orders::Kind::Move,{19,7})==rts::WorldCode::Accepted);
    wide.plan();
    assert(wide.combat().find(attacker)->focus==0);
    s=wide.snapshot(false);
    assert(s.entities[0].hasOrder&&s.entities[0].target==0&&
           s.commandStates[0].kind=="move"&&s.commandStates[0].queued==0);
    assert(wide.attack(1,attacker,target)==rts::WorldCode::Accepted);
    wide.plan();
    assert(wide.combat().find(attacker)->focus==target);
    assert(wide.order(1,attacker,orders::Kind::Stop,{0,0})==rts::WorldCode::Accepted);
    wide.plan();
    assert(wide.combat().find(attacker)->focus==0);
    s=wide.snapshot(false);
    assert(!s.entities[0].hasOrder&&s.commandStates[0].kind=="stop"&&
           s.commandStates[0].status=="idle"&&s.commandStates[0].queued==0);
    assert(wide.resolveCombat());
    const std::string result=rts::worldJson(wide.snapshot());
    assert(result.find("\"commandStates\"")!=std::string::npos);
    if(json)std::cout<<result<<'\n';
    // Host movement observations place three fighters near native R03 enemies.
    // Weapon simulation itself advances deterministically on R18 ticks.
    rts::LiveMatch fight;
    assert(fight.load(ridge,defs));
    s=fight.snapshot();
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    assert(fight.observePosition(0,{10,2}));
    assert(fight.observePosition(1,{10,3}));
    assert(fight.observePosition(4,{10,6}));
    bool shot=false,hit=false,damaged=false,died=false;
    bool emittedFight=false;
    for(int tick=0;tick<130&&fight.phase()=="playing";tick++){
        fight.plan();assert(fight.resolveCombat());
        const rts::WorldSnapshot battle=fight.snapshot();
        const auto& events=battle.events;
        for(const rts::WorldEvent& event:events){
            shot|=event.type==rts::WorldEventType::Shot;
            hit|=event.type==rts::WorldEventType::Hit;
            damaged|=event.type==rts::WorldEventType::Damage;
            died|=event.type==rts::WorldEventType::Death;
        }
        if(json&&!emittedFight&&shot&&hit&&damaged){
            std::cout<<rts::worldJson(battle)<<'\n';emittedFight=true;
        }
    }
    assert(shot&&hit&&damaged&&died);
    assert(fight.phase()=="won");
    s=fight.snapshot(false);
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    assert(fight.restart()&&fight.phase()=="playing");
    s=fight.snapshot();
    if(json)std::cout<<rts::worldJson(s)<<'\n';
    if(!json)std::cout<<"PASS: R02/R03/R04 shared R18 match, six dynamic actors, two maps, team isolation, native orders, map metadata, restart and migration\n";
}

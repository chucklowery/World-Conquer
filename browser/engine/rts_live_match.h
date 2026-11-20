#pragma once
// R02/R03/R04 acceptance: one native R18-owned match. The host fixtures feed
// observed positions; the browser adapter feeds REAL InfantryClass::AI cells.
// Neither this coordinator nor JavaScript calculates an infantry movement step.
#include "rts_world_ports.h"
#include <utility>

namespace rts {

struct LiveActor {
    EntityId id;
    HouseId owner;
    courier::Point spawn;
};

class LiveMatch {
    Catalog catalog_;
    courier::State authored_;
    World world_;
    orders::Controller navigation_;
    rtscombat::System weapons_;
    std::vector<LiveActor> actors_;
    std::vector<uint8_t> navigationTerrain_;
    uint64_t nextSequence_;
    std::string phase_;
    bool ready_;

    static WorldCode orderCode(orders::Code c){
        switch(c){
            case orders::Code::Accepted:return WorldCode::Accepted;
            case orders::Code::BadActor:return WorldCode::UnknownEntity;
            case orders::Code::Dead:return WorldCode::Dead;
            case orders::Code::BadTarget:return WorldCode::BadTarget;
            case orders::Code::Blocked:return WorldCode::Blocked;
            case orders::Code::Unreachable:return WorldCode::Unreachable;
            case orders::Code::Congested:return WorldCode::Blocked;
            case orders::Code::QueueFull:return WorldCode::QueueFull;
        }
        return WorldCode::BadTarget;
    }
    static WorldAction action(orders::Kind kind){
        switch(kind){
            case orders::Kind::Move:return WorldAction::Move;
            case orders::Kind::AttackMove:return WorldAction::AttackMove;
            case orders::Kind::Stop:return WorldAction::Stop;
            case orders::Kind::Hold:return WorldAction::Hold;
            case orders::Kind::Guard:return WorldAction::Guard;
            case orders::Kind::Patrol:return WorldAction::Patrol;
            case orders::Kind::Attack:return WorldAction::Attack;
        }
        return WorldAction::Stop;
    }
    int actorIndex(EntityId id)const{
        for(size_t i=0;i<actors_.size();i++)if(actors_[i].id==id)return static_cast<int>(i);
        return -1;
    }
    bool reconcileOrders(){
        for(size_t i=0;i<actors_.size();i++){
            const WorldEntity* e=world_.entity(actors_[i].id);
            if(!e)return false;
            if(e->life!=Life::Alive)continue;
            const orders::Unit& u=navigation_.unit(static_cast<int>(i));
            courier::Point goal=u.hasOrder?u.current.target:u.position;
            EntityId target=0;
            if(u.hasOrder&&(u.current.kind==orders::Kind::Guard||
                            u.current.kind==orders::Kind::Attack)){
                if(u.current.guard<0||static_cast<size_t>(u.current.guard)>=actors_.size())return false;
                const WorldEntity* followed=world_.entity(actors_[u.current.guard].id);
                if(!followed||followed->life!=Life::Alive)return false;
                goal={followed->x,followed->y};target=followed->id;
            }
            if(!world_.observeOrderState(e->id,u.hasOrder,goal.x,goal.y,target))return false;
        }
        return true;
    }
    WorldCode spawn(HouseId owner,const std::string& definition,courier::Point p){
        const WorldCommand cmd={world_.epoch(),1,++nextSequence_,owner,owner,0,0,
                                WorldAction::Spawn,definition,p.x,p.y};
        return world_.enqueue(cmd);
    }
    bool seed(){
        nextSequence_=0;phase_="playing";actors_.clear();
        std::vector<courier::Point> positions;
        // Authored starting actors, followed by one extra native infantry per
        // faction. This is an initial-scenario script, not production/building.
        std::vector<std::pair<HouseId,courier::Point>> starting;
        for(int i=0;i<4;i++)starting.push_back({static_cast<HouseId>(i<2?1:2),
                                                 authored_.units[i].p});
        for(int house=1;house<=2;house++){
            const courier::Rect z=authored_.spawnZones[house-1];
            bool found=false;
            for(int y=z.y;y<z.y+z.h&&!found;y++)for(int x=z.x;x<z.x+z.w&&!found;x++){
                const courier::Point p{x,y};
                if(!courier::inside(authored_,p))continue;
                bool taken=false;
                for(const auto& actor:starting)if(actor.second==p)taken=true;
                for(const courier::Resource& resource:authored_.resources)
                    if(resource.p==p)taken=true;
                if(!taken){starting.push_back({static_cast<HouseId>(house),p});found=true;}
            }
            if(!found)return false;
        }
        for(const auto& entry:starting){
            if(spawn(entry.first,entry.first==1?"game.aster.ranger":
                     "game.forge.ranger",entry.second)!=WorldCode::Accepted)return false;
            positions.push_back(entry.second);
        }
        for(const courier::Resource& resource:authored_.resources)
            if(spawn(0,"game.world.crystal",resource.p)!=WorldCode::Accepted)return false;
        if(!world_.process(1))return false;
        if(world_.entities().size()!=starting.size()+authored_.resources.size())return false;
        for(size_t i=0;i<authored_.resources.size();i++){
            const WorldEntity& e=world_.entities()[starting.size()+i];
            const courier::Resource& r=authored_.resources[i];
            if(e.owner!=0||e.definitionId!="game.world.crystal"||
               e.x!=r.p.x||e.y!=r.p.y||!world_.seedResource(e.id,r.amount))return false;
        }
        for(size_t i=0;i<starting.size();i++){
            const WorldEntity& e=world_.entities()[i];
            if(e.life!=Life::Alive||e.owner!=starting[i].first)return false;
            actors_.push_back({e.id,e.owner,starting[i].second});
        }
        const WorldSnapshot snap=world_.view();
        navigationTerrain_=snap.terrain;
        // Neutral resources occupy an R18 entity footprint, so the navigation
        // grid must reserve those cells even when the native land is passable.
        for(const courier::Resource& resource:authored_.resources)
            navigationTerrain_[resource.p.y*authored_.width+resource.p.x]=1;
        if(!navigation_.resetDynamic(authored_.width,authored_.height,
                                     navigationTerrain_,positions))return false;
        std::vector<uint8_t> costs;
        for(size_t i=0;i<authored_.terrain.size();i++)
            costs.push_back(navigationTerrain_[i]?0:
                static_cast<uint8_t>(courier::movementCost(authored_.terrain[i])));
        if(!navigation_.setMovementCosts(costs))return false;
        const std::vector<rtscombat::Weapon> definitions={
            {1,3,3,2,rtscombat::Infantry,rtscombat::SmallArms,rtscombat::Instant,
             0,0,1,true,false,rtscombat::EnemiesOnly},
            {2,3,4,1,rtscombat::Infantry|rtscombat::Vehicle,rtscombat::Explosive,
             rtscombat::Projectile,1,0,1,true,false,rtscombat::EnemiesOnly}
        };
        if(!bindR03Combat(world_,weapons_,definitions,{1,2,2}))return false;
        for(const LiveActor& a:actors_){
            rtscombat::Actor* actor=weapons_.find(a.id);
            if(!actor)return false;
            actor->autoAcquire=true;
            actor->weapon=a.owner==1?1:2;
        }
        return true;
    }
    bool configure(const Catalog& catalog,const courier::State& map){
        catalog_=catalog;authored_=map;
        const std::vector<House> houses={{1,1,"aster"},{2,2,"forge"}};
        if(!configureFromR04(world_,catalog_,authored_,houses)||!seed())return false;
        ready_=true;return true;
    }
public:
    LiveMatch():nextSequence_(0),phase_("playing"),ready_(false){}
    bool load(const std::string& mapBytes,const std::string& catalogBytes){
        Catalog catalog;courier::State parsed;
        if(!catalog.load(catalogBytes)||!courier::loadMap(parsed,mapBytes))return false;
        // Keep the existing World in the candidate, so configure() increments
        // its epoch on a successful reload. A rejected map/catalog leaves all
        // commands, IDs, events and pending projectiles untouched.
        LiveMatch candidate=*this;
        if(!candidate.configure(catalog,parsed))return false;
        *this=std::move(candidate);return true;
    }
    bool restart(){
        if(!ready_||!world_.restart())return false;
        return seed();
    }
    bool ready()const{return ready_;}
    const World& world()const{return world_;}
    const courier::State& authored()const{return authored_;}
    const orders::Controller& navigation()const{return navigation_;}
    const rtscombat::System& combat()const{return weapons_;}
    const std::vector<LiveActor>& actors()const{return actors_;}
    const std::string& phase()const{return phase_;}
    WorldCode order(HouseId issuer,EntityId id,orders::Kind kind,
                    courier::Point tile,bool append=false,EntityId guardId=0){
        const int index=actorIndex(id);
        if(!ready_||phase_!="playing")return WorldCode::InvalidEpoch;
        if(index<0)return WorldCode::UnknownEntity;
        const WorldEntity* actor=world_.entity(id);
        if(!actor||actor->life!=Life::Alive)return WorldCode::Dead;
        if(actor->owner!=issuer)return WorldCode::NotOwned;
        const int guard=actorIndex(guardId);
        if(kind==orders::Kind::Guard){
            const WorldEntity* target=world_.entity(guardId);
            if(guard<0||!target||target->life!=Life::Alive||
               target->team!=actor->team||guardId==id)return WorldCode::BadTarget;
            tile={target->x,target->y};
        }
        if(kind==orders::Kind::Attack){
            const WorldEntity* target=world_.entity(guardId);
            if(guard<0||!target||target->life!=Life::Alive||
               target->team==actor->team||!weapons_.canEngage(id,guardId))
                return WorldCode::BadTarget;
            tile={target->x,target->y};
        }
        if(kind==orders::Kind::Stop||kind==orders::Kind::Hold)
            tile={actor->x,actor->y};
        const orders::Request request={world_.tick()+1,nextSequence_+1,index,
                                      {kind,tile,guard},append};
        const orders::Code checked=navigation_.preview(request);
        if(checked!=orders::Code::Accepted)return orderCode(checked);
        const WorldCommand cmd={world_.epoch(),request.tick,request.sequence,issuer,
                                actor->owner,id,guardId,action(kind),"",tile.x,tile.y};
        const WorldCode result=world_.enqueue(cmd);
        if(result!=WorldCode::Accepted)return result;
        // Same single-threaded preflight; reservations in Controller::admit()
        // make a post-World admission failure impossible without a bug.
        if(navigation_.enqueue(request)!=orders::Code::Accepted)return WorldCode::QueueFull;
        ++nextSequence_;return result;
    }
    WorldCode select(HouseId issuer,EntityId id){
        if(!ready_)return WorldCode::InvalidEpoch;
        const WorldEntity* actor=world_.entity(id);
        if(!actor||actor->owner!=issuer||actor->life!=Life::Alive)
            return WorldCode::NotOwned;
        const WorldCommand cmd={world_.epoch(),world_.tick()+1,nextSequence_+1,
                                issuer,issuer,id,0,WorldAction::Select,"",0,0};
        const WorldCode result=world_.enqueue(cmd);
        if(result==WorldCode::Accepted)++nextSequence_;
        return result;
    }
    WorldCode attack(HouseId issuer,EntityId id,EntityId target){
        return order(issuer,id,orders::Kind::Attack,{0,0},false,target);
    }
    // Called once per simulation tick before InfantryClass::AI. This schedules
    // adjacent waypoints but never changes any actor's world position.
    std::vector<orders::Move> plan(){
        if(!ready_||phase_!="playing")return {};
        if(!world_.process(world_.tick()+1))return {};
        const std::vector<orders::Move> moves=navigation_.step(world_.tick());
        for(const orders::Activation& activation:navigation_.takeActivations()){
            const EntityId id=actors_[activation.actor].id;
            // A future appended Move must not cancel current weapon focus.
            // Activation, replacement and Stop all cancel the previous focus;
            // projectiles already launched remain in the R03 system.
            weapons_.cancel(id);
            if(activation.kind==orders::Kind::Attack){
                const orders::Unit& u=navigation_.unit(activation.actor);
                if(u.hasOrder&&u.current.kind==orders::Kind::Attack&&
                   (!weapons_.canEngage(id,actors_[u.current.guard].id)||
                    !weapons_.orderAttack(id,actors_[u.current.guard].id))){
                    // A target can move out of range while a future Attack is
                    // waiting. Report the stale target at activation instead
                    // of silently retaining an impossible weapon focus.
                    navigation_.cancelActor(activation.actor);
                    world_.observeOrderFeedback(id,WorldCode::BadTarget,activation.sequence);
                }
            }
        }
        for(const orders::Feedback& feedback:navigation_.takeFeedback()){
            const WorldCode result=orderCode(feedback.code);
            if(result!=WorldCode::Accepted)
                world_.observeOrderFeedback(actors_[feedback.actor].id,result,feedback.sequence);
        }
        if(!reconcileOrders())return {};
        return moves;
    }
    bool observePosition(size_t index,courier::Point position){
        if(!ready_||index>=actors_.size())return false;
        const WorldEntity* e=world_.entity(actors_[index].id);
        if(!e||e->life!=Life::Alive)return false;
        if(!world_.observePosition(e->id,position.x,position.y))return false;
        navigation_.update(static_cast<int>(index),position,true);
        rtscombat::Actor* combat=weapons_.find(e->id);
        if(!combat)return false;
        combat->position={position.x,position.y};return true;
    }
    // Resolve actual R03 weapons, then commit every result into the canonical
    // R18 HP/event/lifecycle record. No alternate health state is published.
    bool resolveCombat(){
        if(!ready_)return false;
        if(phase_!="playing")return true;
        weapons_.tick(world_.tick());
        for(const rtscombat::Event& event:weapons_.events()){
            bool okay=true;
            if(event.type==rtscombat::Shot||event.type==rtscombat::Hit)
                okay=world_.observeCombatTrace(event.type==rtscombat::Shot?
                    WorldEventType::Shot:WorldEventType::Hit,event.target,event.source,
                    event.weapon,event.x,event.y,event.value);
            else if(event.type==rtscombat::Damage)
                okay=world_.observeDamage(event.target,event.value,event.source,event.weapon);
            if(!okay)return false;
        }
        bool aster=false,forge=false;
        for(size_t i=0;i<actors_.size();i++){
            const WorldEntity* e=world_.entity(actors_[i].id);
            const rtscombat::Actor* combat=weapons_.find(actors_[i].id);
            if(!e||!combat||e->hp!=combat->hp)return false;
            if(e->life!=Life::Alive){
                navigation_.update(static_cast<int>(i),{e->x,e->y},false);
                navigation_.cancelDependent(static_cast<int>(i));
                weapons_.cancel(e->id);
                continue;
            }
            if(e->owner==1)aster=true;else if(e->owner==2)forge=true;
        }
        if(!aster)phase_="lost";
        else if(!forge)phase_="won";
        return reconcileOrders();
    }
    WorldSnapshot snapshot(bool drain=true,bool economy=false){
        WorldSnapshot s=economy?(drain?world_.publishEconomy():world_.viewEconomy()):
            (drain?world_.publish():world_.view());
        s.phase=phase_;
        WorldMapMetadata& m=s.mapMetadata;m.present=true;
        m.id=authored_.mapId;m.title=authored_.title;m.biome=authored_.biome;
        m.tiles=authored_.terrain;
        for(uint8_t tile:m.tiles)m.costs.push_back(static_cast<uint8_t>(courier::movementCost(tile)));
        for(const courier::Resource& resource:authored_.resources)
            m.resources.push_back({resource.p.x,resource.p.y,resource.amount});
        for(int h=0;h<2;h++){
            const courier::Rect z=authored_.spawnZones[h];
            m.spawns.push_back({static_cast<HouseId>(h+1),z.x,z.y,z.w,z.h});
            const courier::Point base=authored_.bases[h];
            m.bases.push_back({static_cast<HouseId>(h+1),base.x,base.y});
        }
        m.victoryX=authored_.victory.x;m.victoryY=authored_.victory.y;
        m.victoryW=authored_.victory.w;m.victoryH=authored_.victory.h;
        for(size_t i=0;i<actors_.size();i++){
            const WorldEntity* e=world_.entity(actors_[i].id);
            if(!e||e->life!=Life::Alive)continue;
            const orders::Unit& u=navigation_.unit(static_cast<int>(i));
            const courier::Point goal={e->hasOrder?e->orderX:e->x,
                                       e->hasOrder?e->orderY:e->y};
            s.commandStates.push_back({e->id,orders::name(u.hasOrder?u.current.kind:
                orders::Kind::Stop),orders::name(u.status),goal.x,goal.y,
                static_cast<unsigned>(u.queued.size())});
        }
        return s;
    }
};
}

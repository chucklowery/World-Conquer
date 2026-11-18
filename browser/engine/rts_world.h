#pragma once
// R18: native, deterministic identity/ownership/lifecycle layer. It does not
// advance movement, resolve weapons, render, or manufacture units.
#include "simulation_contract.h"
#include <algorithm>
#include <limits>
#include <set>
#include <string>
#include <vector>

namespace rts {

static const unsigned WORLD_SNAPSHOT_VERSION=3;
static const unsigned WORLD_ECONOMY_SNAPSHOT_VERSION=4;
static const unsigned DEFINITION_SCHEMA_VERSION=1;
static const int WORLD_MAX_RESOURCE_AMOUNT=100000, WORLD_MAX_CREDITS=1000000000;
static const int WORLD_HARVESTER_CAPACITY=20;
static const size_t WORLD_MAX_HOUSES=16, WORLD_MAX_ENTITIES=256;
static const size_t WORLD_MAX_COMMANDS=128, WORLD_MAX_EVENTS=256;
static const int WORLD_MAX_WIDTH=128, WORLD_MAX_HEIGHT=128, WORLD_MAX_CELLS=4096;
static const uint64_t WORLD_COMMAND_HORIZON=64;
static const uint32_t WORLD_ID_COUNTER_MASK=(1u<<20)-1;
static const uint16_t WORLD_MAX_EPOCH=(1u<<12)-1;

enum class Role { Infantry, Vehicle, Structure, Resource };
enum class Life { Alive, Dead, Despawned };
enum class WorldAction { Spawn, Select, Move, Stop, Attack, Despawn, Kill,
    AttackMove, Hold, Guard, Patrol, Harvest, ReturnCargo };
enum class WorldCode { Accepted, InvalidEpoch, InvalidTick, DuplicateSequence,
    UnknownHouse, UnknownEntity, UnknownDefinition, NotOwned, BadTeam,
    Dead, BadTarget, Blocked, Occupied, QueueFull, Capacity, WrongFaction,
    Unreachable, Empty, Full, Overflow };
enum class WorldEventType { Command, Spawn, Selection, Order, Position,
    Damage, Death, Despawn, Restart, Shot, Hit, ResourceDelta, CargoDelta,
    CreditsDelta, ResourceDepleted, HarvestState };
enum class HarvestJob { Idle, Harvesting, Returning };
inline const char* harvestJobName(HarvestJob j){
    switch(j){case HarvestJob::Idle:return "idle";
        case HarvestJob::Harvesting:return "harvesting";
        case HarvestJob::Returning:return "returning";}
    return "unknown";
}

inline const char* roleName(Role r){
    switch(r){case Role::Infantry:return "infantry";case Role::Vehicle:return "vehicle";
        case Role::Structure:return "structure";case Role::Resource:return "resource";}
    return "unknown";
}
inline const char* lifeName(Life l){
    switch(l){case Life::Alive:return "alive";case Life::Dead:return "dead";
        case Life::Despawned:return "despawned";}
    return "unknown";
}
inline const char* actionName(WorldAction a){
    switch(a){case WorldAction::Spawn:return "spawn";case WorldAction::Select:return "select";
        case WorldAction::Move:return "move";case WorldAction::Stop:return "stop";
        case WorldAction::Attack:return "attack";case WorldAction::Despawn:return "despawn";
        case WorldAction::Kill:return "kill";case WorldAction::AttackMove:return "attack_move";
        case WorldAction::Hold:return "hold";case WorldAction::Guard:return "guard";
        case WorldAction::Patrol:return "patrol";
        case WorldAction::Harvest:return "harvest";
        case WorldAction::ReturnCargo:return "return_cargo";}
    return "unknown";
}
inline const char* codeName(WorldCode c){
    switch(c){case WorldCode::Accepted:return "accepted";
        case WorldCode::InvalidEpoch:return "invalid_epoch";
        case WorldCode::InvalidTick:return "invalid_tick";
        case WorldCode::DuplicateSequence:return "duplicate_sequence";
        case WorldCode::UnknownHouse:return "unknown_house";
        case WorldCode::UnknownEntity:return "unknown_entity";
        case WorldCode::UnknownDefinition:return "unknown_definition";
        case WorldCode::NotOwned:return "not_owned";
        case WorldCode::BadTeam:return "bad_team";
        case WorldCode::Dead:return "dead";
        case WorldCode::BadTarget:return "bad_target";
        case WorldCode::Blocked:return "blocked";
        case WorldCode::Occupied:return "occupied";
        case WorldCode::QueueFull:return "queue_full";
        case WorldCode::Capacity:return "capacity";
        case WorldCode::WrongFaction:return "wrong_faction";
        case WorldCode::Unreachable:return "unreachable";
        case WorldCode::Empty:return "empty";case WorldCode::Full:return "full";
        case WorldCode::Overflow:return "overflow";}
    return "unknown";
}
inline const char* worldEventName(WorldEventType t){
    switch(t){case WorldEventType::Command:return "command";
        case WorldEventType::Spawn:return "spawn";case WorldEventType::Selection:return "selection";
        case WorldEventType::Order:return "order";case WorldEventType::Position:return "position";
        case WorldEventType::Damage:return "damage";case WorldEventType::Death:return "death";
        case WorldEventType::Despawn:return "despawn";case WorldEventType::Restart:return "restart";
        case WorldEventType::Shot:return "shot";case WorldEventType::Hit:return "hit";
        case WorldEventType::ResourceDelta:return "resource_delta";
        case WorldEventType::CargoDelta:return "cargo_delta";
        case WorldEventType::CreditsDelta:return "credits_delta";
        case WorldEventType::ResourceDepleted:return "resource_depleted";
        case WorldEventType::HarvestState:return "harvest_state";}
    return "unknown";
}
inline bool economyEvent(WorldEventType t){
    return t==WorldEventType::ResourceDelta||t==WorldEventType::CargoDelta||
           t==WorldEventType::CreditsDelta||t==WorldEventType::ResourceDepleted||
           t==WorldEventType::HarvestState;
}
inline bool economyCode(WorldCode c){
    return c==WorldCode::Empty||c==WorldCode::Full||c==WorldCode::Overflow;
}
inline bool safeKey(const std::string& s){
    if(s.empty()||s.size()>64)return false;
    for(char c:s)if(!((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='.'||c=='-'))
        return false;
    return true;
}
inline bool integerField(const std::string& s,int& value){
    if(s.empty()||s.size()>9)return false;
    int n=0;
    for(char c:s){if(c<'0'||c>'9')return false;n=n*10+c-'0';}
    value=n;return true;
}
inline std::vector<std::string> splitFields(const std::string& line){
    std::vector<std::string> out;
    size_t start=0;
    for(size_t i=0;i<=line.size();i++)if(i==line.size()||line[i]=='|'){
        out.push_back(line.substr(start,i-start));start=i+1;
    }
    return out;
}
inline bool parseRole(const std::string& s,Role& r){
    if(s=="infantry")r=Role::Infantry;
    else if(s=="vehicle")r=Role::Vehicle;
    else if(s=="structure")r=Role::Structure;
    else if(s=="resource")r=Role::Resource;
    else return false;
    return true;
}
struct VisualDefinition {
    std::string key,faction;
    Role role;
    int width,height;
};
struct Definition {
    std::string id,faction,visualKey;
    Role role;
    int width,height,maxHp;
};
inline bool knownR05Visual(const std::string& key,const std::string& faction,
                           Role role,int w,int h){
    // Deliberately small, reviewed binding catalog. Extend from the R05 roster
    // with matching source metadata before a new gameplay definition ships.
    static const VisualDefinition known[]={
        {"r05.aster.ranger","aster",Role::Infantry,1,1},
        {"r05.aster.rover","aster",Role::Vehicle,1,1},
        {"r05.aster.harvester","aster",Role::Vehicle,1,1},
        {"r05.aster.hub","aster",Role::Structure,3,2},
        {"r05.aster.refinery","aster",Role::Structure,2,2},
        {"r05.forge.ranger","forge",Role::Infantry,1,1},
        {"r05.forge.rover","forge",Role::Vehicle,1,1},
        {"r05.forge.harvester","forge",Role::Vehicle,1,1},
        {"r05.forge.hub","forge",Role::Structure,3,2},
        {"r05.forge.refinery","forge",Role::Structure,2,2},
        {"r05.world.crystal","neutral",Role::Resource,1,1}
    };
    for(const VisualDefinition& v:known)
        if(v.key==key&&v.faction==faction&&v.role==role&&
           v.width==w&&v.height==h)return true;
    return false;
}
class Catalog {
    std::vector<Definition> definitions_;
    std::vector<VisualDefinition> visuals_;
public:
    const std::vector<Definition>& definitions()const{return definitions_;}
    const Definition* find(const std::string& id)const{
        for(const Definition& d:definitions_)if(d.id==id)return &d;
        return nullptr;
    }
    // Atomic grammar: RTS-DEFINITIONS|1 followed by
    // visual|art-key|faction|role|width|height and
    // def|gameplay-id|faction|role|width|height|art-key|max-hp.
    // Visual rows are a validated projection of R05 roster metadata, not
    // permission to invent sprite keys or gameplay behavior.
    bool load(const std::string& data){
        if(data.size()>16384)return false;
        std::istringstream input(data);
        std::string line;
        if(!std::getline(input,line))return false;
        if(!line.empty()&&line.back()=='\r')line.pop_back();
        if(line!="RTS-DEFINITIONS|1")return false;
        Catalog candidate;
        while(std::getline(input,line)){
            if(!line.empty()&&line.back()=='\r')line.pop_back();
            if(line.empty())return false;
            const std::vector<std::string> f=splitFields(line);
            if(f.size()==6&&f[0]=="visual"){
                Role role=Role::Infantry;int w=0,h=0;
                if(!safeKey(f[1])||!safeKey(f[2])||!parseRole(f[3],role)||
                   !integerField(f[4],w)||!integerField(f[5],h)||
                   w<1||w>4||h<1||h>4||
                   (f[2]!="aster"&&f[2]!="forge"&&f[2]!="neutral")||
                   !knownR05Visual(f[1],f[2],role,w,h))
                    return false;
                for(const VisualDefinition& v:candidate.visuals_)if(v.key==f[1])return false;
                candidate.visuals_.push_back({f[1],f[2],role,w,h});
            }else if(f.size()==8&&f[0]=="def"){
                Role role=Role::Infantry;int w=0,h=0,hp=0;
                if(!safeKey(f[1])||f[1].compare(0,5,"game.")!=0||
                   !safeKey(f[2])||!parseRole(f[3],role)||
                   !integerField(f[4],w)||!integerField(f[5],h)||
                   !safeKey(f[6])||!integerField(f[7],hp)||
                   w<1||w>4||h<1||h>4||hp<1||hp>10000||
                   (f[2]!="aster"&&f[2]!="forge"&&f[2]!="neutral"))
                    return false;
                for(const Definition& d:candidate.definitions_)if(d.id==f[1])return false;
                candidate.definitions_.push_back({f[1],f[2],f[6],role,w,h,hp});
            }else return false;
            if(candidate.visuals_.size()>64||candidate.definitions_.size()>64)return false;
        }
        if(candidate.definitions_.empty())return false;
        for(const Definition& d:candidate.definitions_){
            bool found=false;
            for(const VisualDefinition& v:candidate.visuals_){
                if(v.key!=d.visualKey)continue;
                if(v.faction!=d.faction||v.role!=d.role||
                   v.width!=d.width||v.height!=d.height)return false;
                found=true;break;
            }
            if(!found||((d.faction=="neutral")!=(d.role==Role::Resource)))return false;
        }
        *this=candidate;return true;
    }
};
struct House {
    HouseId id;
    TeamId team;
    std::string faction;
    int credits;
    House(HouseId i,TeamId t,const std::string& f,int balance=0):
        id(i),team(t),faction(f),credits(balance){}
};
struct ResourceAccount {EntityId entityId;int remaining,maxAmount;};
struct HarvesterAccount {
    EntityId entityId;
    int cargo,capacity;
    EntityId resourceId,refineryId;
    HarvestJob job;
    uint64_t sequence;
};
struct WorldEntity {
    EntityId id;
    std::string definitionId;
    HouseId owner;
    TeamId team;
    int x,y,hp;
    Life life;
    bool hasOrder;
    int orderX,orderY;
    EntityId target;
};
struct WorldCommand {
    uint16_t epoch;
    uint64_t tick,sequence;
    HouseId issuer,owner;
    EntityId actor,target;
    WorldAction action;
    std::string definitionId;
    int x,y;
};
struct WorldEvent {
    WorldEventType type;
    uint16_t epoch;
    uint64_t tick,sequence;
    EntityId entityId,sourceId;
    uint16_t weaponId;
    WorldCode code;
    int x,y,value;
    HouseId ownerId;
};
inline bool legacyWorldEvent(const WorldEvent& e){
    return !economyEvent(e.type)&&!economyCode(e.code);
}
struct WorldCommandState {
    EntityId entityId;
    std::string kind,status;
    int x,y;
    unsigned queued;
};
struct WorldMapResource { int x,y,amount; };
struct WorldMapSpawn { HouseId house;int x,y,w,h; };
struct WorldMapBase { HouseId house;int x,y; };
struct WorldMapMetadata {
    std::string id,title,biome;
    std::vector<uint8_t> tiles,costs;
    std::vector<WorldMapResource> resources;
    std::vector<WorldMapSpawn> spawns;
    std::vector<WorldMapBase> bases;
    int victoryX,victoryY,victoryW,victoryH;
    bool present;
};
struct WorldSnapshot {
    unsigned version,definitionSchemaVersion;
    uint16_t epoch;
    uint64_t tick;
    int width,height;
    EntityId selectedEntityId;
    std::vector<uint8_t> terrain;
    std::vector<House> houses;
    std::vector<ResourceAccount> resources;
    std::vector<HarvesterAccount> harvesters;
    std::vector<WorldEntity> entities;
    std::vector<Definition> definitions;
    std::vector<WorldEvent> events;
    std::vector<WorldCommandState> commandStates;
    WorldMapMetadata mapMetadata;
    std::string phase;
};

class World {
    Catalog catalog_;
    std::vector<House> houses_;
    std::vector<House> initialHouses_;
    std::vector<ResourceAccount> resources_;
    std::vector<HarvesterAccount> harvesters_;
    std::vector<WorldEntity> entities_;
    std::vector<uint8_t> terrain_;
    std::vector<WorldCommand> pending_;
    std::vector<WorldEvent> events_;
    int width_,height_;
    uint16_t epoch_;
    uint32_t nextId_;
    uint64_t tick_,lastSequence_;
    EntityId selected_;
    bool ready_;

    const House* house(HouseId id)const{
        for(const House& h:houses_)if(h.id==id)return &h;
        return nullptr;
    }
    const WorldEntity* findInternal(EntityId id)const{
        for(const WorldEntity& e:entities_)if(e.id==id)return &e;
        return nullptr;
    }
    WorldEntity* mutableEntity(EntityId id){
        for(WorldEntity& e:entities_)if(e.id==id)return &e;
        return nullptr;
    }
    ResourceAccount* resource(EntityId id){
        for(ResourceAccount& r:resources_)if(r.entityId==id)return &r;
        return nullptr;
    }
    const ResourceAccount* resource(EntityId id)const{
        for(const ResourceAccount& r:resources_)if(r.entityId==id)return &r;
        return nullptr;
    }
    HarvesterAccount* harvester(EntityId id){
        for(HarvesterAccount& h:harvesters_)if(h.entityId==id)return &h;
        return nullptr;
    }
    const HarvesterAccount* harvester(EntityId id)const{
        for(const HarvesterAccount& h:harvesters_)if(h.entityId==id)return &h;
        return nullptr;
    }
    static bool isHarvester(const std::string& id){
        return id=="game.aster.harvester"||id=="game.forge.harvester";
    }
    static bool isRefinery(const std::string& id){
        return id=="game.aster.refinery"||id=="game.forge.refinery";
    }
    bool adjacent(const WorldEntity& actor,const WorldEntity& target)const{
        const Definition* d=catalog_.find(target.definitionId);
        if(!d)return false;
        return actor.x>=target.x-1&&actor.x<=target.x+d->width&&
               actor.y>=target.y-1&&actor.y<=target.y+d->height;
    }
    WorldCode validateEconomy(EntityId actorId,EntityId targetId,WorldAction action)const{
        const WorldEntity* e=findInternal(actorId);
        const WorldEntity* t=findInternal(targetId);
        if(!e||!t||t->life!=Life::Alive||e->life!=Life::Alive)
            return WorldCode::BadTarget;
        const HarvesterAccount* h=harvester(actorId);
        if(!h||!isHarvester(e->definitionId))return WorldCode::BadTarget;
        if(action==WorldAction::Harvest){
            const ResourceAccount* r=resource(targetId);
            if(!r||t->owner!=0||!r->remaining)return WorldCode::BadTarget;
            if(h->cargo==h->capacity)return WorldCode::Full;
        }else{
            if(!isRefinery(t->definitionId)||t->owner!=e->owner||!t->owner)
                return WorldCode::BadTarget;
            if(!h->cargo)return WorldCode::Empty;
            const House* owner=house(e->owner);
            if(!owner||owner->credits>WORLD_MAX_CREDITS-h->cargo)return WorldCode::Overflow;
        }
        // R20 admits only adjacent, already-reachable actions. R06 must
        // navigate via R02 and revalidate on arrival before committing.
        if(!adjacent(*e,*t))return WorldCode::Unreachable;
        return WorldCode::Accepted;
    }
    void cancelHarvest(EntityId id,uint64_t sequence=0){
        HarvesterAccount* h=harvester(id);
        if(!h||h->job==HarvestJob::Idle)return;
        h->job=HarvestJob::Idle;h->resourceId=0;h->refineryId=0;
        h->sequence=0;
        emit(WorldEventType::HarvestState,sequence,id,0,0,0);
    }
    void cancelDependents(EntityId target,uint64_t sequence=0){
        for(const HarvesterAccount& h:harvesters_)
            if(h.resourceId==target||h.refineryId==target){
                WorldEntity* e=mutableEntity(h.entityId);
                if(e){e->hasOrder=false;e->target=0;
                    emit(WorldEventType::Order,sequence,e->id,e->x,e->y);}
                cancelHarvest(h.entityId,sequence);
            }
    }
    void endEconomicLifetime(EntityId id,uint64_t sequence=0){
        cancelHarvest(id,sequence);cancelDependents(id,sequence);
        HarvesterAccount* h=harvester(id);
        if(h&&h->cargo){
            emit(WorldEventType::CargoDelta,sequence,id,0,0,-h->cargo);
            h->cargo=0;
        }
        ResourceAccount* r=resource(id);
        if(r&&r->remaining){
            emit(WorldEventType::ResourceDelta,sequence,id,0,0,-r->remaining);
            r->remaining=0;
            emit(WorldEventType::ResourceDepleted,sequence,id);
        }
    }
    bool inside(int x,int y,int w=1,int h=1)const{
        return x>=0&&y>=0&&w>0&&h>0&&x<=width_-w&&y<=height_-h;
    }
    bool areaFree(int x,int y,const Definition& d,EntityId except=0)const{
        if(!inside(x,y,d.width,d.height))return false;
        for(int ty=y;ty<y+d.height;ty++)for(int tx=x;tx<x+d.width;tx++)
            if(terrain_[ty*width_+tx])return false;
        for(const WorldEntity& e:entities_){
            if(e.id==except||e.life!=Life::Alive)continue;
            const Definition* other=catalog_.find(e.definitionId);
            if(other&&x<e.x+other->width&&e.x<x+d.width&&
               y<e.y+other->height&&e.y<y+d.height)return false;
        }
        return true;
    }
    void emit(WorldEventType type,uint64_t seq,EntityId entity,
              int x=0,int y=0,int value=0,WorldCode code=WorldCode::Accepted,
              EntityId source=0,uint16_t weapon=0){
        if(events_.size()==WORLD_MAX_EVENTS){
            // A restart marker is the proof of epoch progression for v3
            // consumers. Keep it until publish() drains this event batch.
            auto oldest=events_.begin();
            if(oldest->type==WorldEventType::Restart)++oldest;
            events_.erase(oldest);
        }
        const WorldEntity* e=findInternal(entity);
        events_.push_back({type,epoch_,tick_,seq,entity,source,weapon,code,x,y,value,
                           static_cast<HouseId>(e?e->owner:0)});
    }
    WorldCode validate(const WorldCommand& c)const{
        if(!ready_||c.epoch!=epoch_)return WorldCode::InvalidEpoch;
        if(c.tick<=tick_||c.tick-tick_>WORLD_COMMAND_HORIZON)return WorldCode::InvalidTick;
        if(c.sequence==0||c.sequence<=lastSequence_)return WorldCode::DuplicateSequence;
        if(pending_.size()>=WORLD_MAX_COMMANDS)return WorldCode::QueueFull;
        if(c.issuer!=0&&!house(c.issuer))return WorldCode::UnknownHouse;
        switch(c.action){
            case WorldAction::Spawn:case WorldAction::Select:case WorldAction::Move:
            case WorldAction::Stop:case WorldAction::Attack:case WorldAction::Despawn:
            case WorldAction::Kill:case WorldAction::AttackMove:
            case WorldAction::Hold:case WorldAction::Guard:
            case WorldAction::Patrol:case WorldAction::Harvest:
            case WorldAction::ReturnCargo:break;
            default:return WorldCode::BadTarget;
        }
        if(c.action==WorldAction::Spawn){
            if(c.actor||c.target)return WorldCode::BadTarget;
            const Definition* d=catalog_.find(c.definitionId);
            if(!d)return WorldCode::UnknownDefinition;
            const House* owner=house(c.owner);
            if(c.owner!=0&&!owner)return WorldCode::UnknownHouse;
            if(c.issuer!=0&&c.issuer!=c.owner)return WorldCode::NotOwned;
            if((d->faction=="neutral")!=(c.owner==0)||
               (owner&&d->faction!=owner->faction))return WorldCode::WrongFaction;
            size_t reservedSpawns=0;
            for(const WorldCommand& queued:pending_)
                if(queued.action==WorldAction::Spawn)++reservedSpawns;
            if(entities_.size()+reservedSpawns>=WORLD_MAX_ENTITIES)
                return WorldCode::Capacity;
            if(!inside(c.x,c.y,d->width,d->height))return WorldCode::BadTarget;
            if(!areaFree(c.x,c.y,*d))return WorldCode::Blocked;
            return WorldCode::Accepted;
        }
        if(c.action==WorldAction::Select&&c.actor==0){
            if(c.issuer==0)return WorldCode::UnknownHouse;
            return WorldCode::Accepted;
        }
        const WorldEntity* e=findInternal(c.actor);
        if(!e)return WorldCode::UnknownEntity;
        if(c.issuer!=0&&e->owner!=c.issuer)return WorldCode::NotOwned;
        if(c.action==WorldAction::Kill&&c.issuer!=0)return WorldCode::NotOwned;
        if(c.owner!=e->owner&&(c.issuer!=0||c.owner!=0))return WorldCode::BadTeam;
        if(e->life!=Life::Alive)return WorldCode::Dead;
        if(c.action==WorldAction::Harvest||c.action==WorldAction::ReturnCargo){
            if(c.issuer==0||c.target==0)return WorldCode::BadTarget;
            const WorldEntity* target=findInternal(c.target);
            if(!target||c.x!=target->x||c.y!=target->y)return WorldCode::BadTarget;
            return validateEconomy(c.actor,c.target,c.action);
        }
        if(c.action==WorldAction::Move||c.action==WorldAction::AttackMove||
           c.action==WorldAction::Patrol){
            const Definition* d=catalog_.find(e->definitionId);
            if(!d||(d->role!=Role::Infantry&&d->role!=Role::Vehicle)||
               !inside(c.x,c.y,d->width,d->height))return WorldCode::BadTarget;
            if(!areaFree(c.x,c.y,*d,e->id))return WorldCode::Blocked;
        }else if(c.action==WorldAction::Attack){
            // Orders serialize their attack coordinates even when a target ID
            // is supplied. Reject values the v3 consumer cannot publish.
            if(!inside(c.x,c.y))return WorldCode::BadTarget;
            const WorldEntity* target=findInternal(c.target);
            if(!target||target->life!=Life::Alive||target->team==e->team)
                return WorldCode::BadTarget;
        }else if(c.action==WorldAction::Guard){
            const WorldEntity* target=findInternal(c.target);
            if(!target||target->life!=Life::Alive||target->id==e->id||
               target->team!=e->team||!inside(c.x,c.y))return WorldCode::BadTarget;
        }
        return WorldCode::Accepted;
    }
    WorldCode execute(const WorldCommand& c){
        // Re-evaluate against prior orders at this tick without consuming a
        // second sequence number. Runtime changes may invalidate a spawn.
        WorldCode result=WorldCode::Accepted;
        if(c.action==WorldAction::Spawn){
            const Definition* d=catalog_.find(c.definitionId);
            if(!d||entities_.size()>=WORLD_MAX_ENTITIES||
               nextId_>WORLD_ID_COUNTER_MASK)result=WorldCode::Capacity;
            else if(!areaFree(c.x,c.y,*d))result=WorldCode::Occupied;
        }else if(c.actor){
            const WorldEntity* e=findInternal(c.actor);
            if(!e||e->life!=Life::Alive)result=WorldCode::Dead;
            else if(c.action==WorldAction::Move||c.action==WorldAction::AttackMove||
                    c.action==WorldAction::Patrol){
                const Definition* d=catalog_.find(e->definitionId);
                if(!d||!areaFree(c.x,c.y,*d,e->id))result=WorldCode::Blocked;
            }else if(c.action==WorldAction::Attack||c.action==WorldAction::Guard){
                const WorldEntity* t=findInternal(c.target);
                if(!t||t->life!=Life::Alive||
                   (c.action==WorldAction::Attack?t->team==e->team:
                    t->team!=e->team))result=WorldCode::BadTarget;
            }else if(c.action==WorldAction::Harvest||c.action==WorldAction::ReturnCargo){
                const WorldEntity* target=findInternal(c.target);
                result=(!target||c.x!=target->x||c.y!=target->y)?
                    WorldCode::BadTarget:validateEconomy(c.actor,c.target,c.action);
            }
        }
        emit(WorldEventType::Command,c.sequence,c.actor,c.x,c.y,0,result);
        if(result!=WorldCode::Accepted)return result;
        if(c.action==WorldAction::Spawn){
            const House* h=house(c.owner);
            const Definition* d=catalog_.find(c.definitionId);
            const EntityId id=(static_cast<EntityId>(epoch_)<<20)|nextId_++;
            entities_.push_back({id,c.definitionId,c.owner,static_cast<TeamId>(h?h->team:0),c.x,c.y,
                                 d->maxHp,Life::Alive,false,0,0,0});
            if(isHarvester(c.definitionId))
                harvesters_.push_back({id,0,WORLD_HARVESTER_CAPACITY,0,0,HarvestJob::Idle,0});
            emit(WorldEventType::Spawn,c.sequence,id,c.x,c.y);
        }else if(c.action==WorldAction::Select){
            selected_=c.actor;
            emit(WorldEventType::Selection,c.sequence,selected_);
        }else if(c.action==WorldAction::Move||c.action==WorldAction::Stop||
                 c.action==WorldAction::Attack||c.action==WorldAction::AttackMove||
                 c.action==WorldAction::Hold||c.action==WorldAction::Guard||
                 c.action==WorldAction::Patrol||c.action==WorldAction::Harvest||
                 c.action==WorldAction::ReturnCargo){
            WorldEntity* e=mutableEntity(c.actor);
            cancelHarvest(c.actor,c.sequence);
            e->hasOrder=c.action!=WorldAction::Stop;
            e->orderX=c.x;e->orderY=c.y;
            e->target=(c.action==WorldAction::Attack||c.action==WorldAction::Guard||
                       c.action==WorldAction::Harvest||c.action==WorldAction::ReturnCargo)?c.target:0;
            emit(WorldEventType::Order,c.sequence,c.actor,c.x,c.y);
            if(c.action==WorldAction::Harvest||c.action==WorldAction::ReturnCargo){
                HarvesterAccount* account=harvester(c.actor);
                account->job=c.action==WorldAction::Harvest?HarvestJob::Harvesting:HarvestJob::Returning;
                account->resourceId=c.action==WorldAction::Harvest?c.target:0;
                account->refineryId=c.action==WorldAction::ReturnCargo?c.target:0;
                account->sequence=c.sequence;
                emit(WorldEventType::HarvestState,c.sequence,c.actor,c.x,c.y,0,
                     WorldCode::Accepted,c.target);
            }
        }else if(c.action==WorldAction::Kill||c.action==WorldAction::Despawn){
            WorldEntity* e=mutableEntity(c.actor);
            e->life=c.action==WorldAction::Kill?Life::Dead:Life::Despawned;
            e->hasOrder=false;e->target=0;
            endEconomicLifetime(e->id,c.sequence);
            if(c.action==WorldAction::Kill)e->hp=0;
            if(selected_==e->id){selected_=0;emit(WorldEventType::Selection,c.sequence,0);}
            for(WorldEntity& other:entities_)if(other.life==Life::Alive&&
                  other.hasOrder&&other.target==c.actor){
                other.hasOrder=false;other.target=0;
                emit(WorldEventType::Order,c.sequence,other.id);
            }
            emit(c.action==WorldAction::Kill?WorldEventType::Death:
                 WorldEventType::Despawn,c.sequence,c.actor);
        }
        return result;
    }
public:
    World():width_(0),height_(0),epoch_(1),nextId_(1),tick_(0),
            lastSequence_(0),selected_(0),ready_(false){}
    const Catalog& catalog()const{return catalog_;}
    uint16_t epoch()const{return epoch_;}
    uint64_t tick()const{return tick_;}
    const WorldEntity* entity(EntityId id)const{return findInternal(id);}
    const std::vector<House>& houses()const{return houses_;}
    const std::vector<WorldEntity>& entities()const{return entities_;}
    // Atomic map/house/schema configuration, before any commands are accepted.
    bool configure(const Catalog& catalog,int width,int height,
                   const std::vector<uint8_t>& terrain,const std::vector<House>& houses){
        if(width<8||height<8||width>WORLD_MAX_WIDTH||height>WORLD_MAX_HEIGHT||
           width*height>WORLD_MAX_CELLS||
           terrain.size()!=static_cast<size_t>(width*height)||
           houses.empty()||houses.size()>WORLD_MAX_HOUSES||
           catalog.definitions().empty())return false;
        for(uint8_t t:terrain)if(t>1)return false;
        std::set<HouseId> ids;
        for(const House& h:houses){
            if(!h.id||!h.team||h.credits<0||h.credits>WORLD_MAX_CREDITS||
               (h.faction!="aster"&&h.faction!="forge")||
               !ids.insert(h.id).second)return false;
        }
        if(ready_&&epoch_>=WORLD_MAX_EPOCH)return false;
        const bool reconfiguring=ready_;
        const uint16_t nextEpoch=ready_?static_cast<uint16_t>(epoch_+1):1;
        catalog_=catalog;houses_=houses;initialHouses_=houses;
        terrain_=terrain;width_=width;height_=height;
        entities_.clear();resources_.clear();harvesters_.clear();
        pending_.clear();events_.clear();
        epoch_=nextEpoch;nextId_=1;tick_=0;lastSequence_=0;selected_=0;ready_=true;
        if(reconfiguring)emit(WorldEventType::Restart,0,0);
        return true;
    }
    WorldCode enqueue(const WorldCommand& c){
        const WorldCode result=validate(c);
        if(result==WorldCode::Accepted){pending_.push_back(c);lastSequence_=c.sequence;}
        return result;
    }
    // R04 -> R18 handoff. Seeded amounts are native after the validated R18
    // resource spawn; map metadata remains immutable and is never decremented.
    bool seedResource(EntityId id,int amount){
        const WorldEntity* e=findInternal(id);
        const Definition* d=e?catalog_.find(e->definitionId):nullptr;
        if(!e||e->life!=Life::Alive||e->owner!=0||!d||d->role!=Role::Resource||
           resource(id)||amount<1||amount>WORLD_MAX_RESOURCE_AMOUNT)return false;
        resources_.push_back({id,amount,amount});return true;
    }
    // These explicit R06 commit ports do no pathfinding, harvesting timer,
    // production or auto-routing. R06 invokes them only after native arrival.
    WorldCode commitHarvest(EntityId actor,EntityId source,int amount){
        HarvesterAccount* h=harvester(actor);
        ResourceAccount* r=resource(source);
        if(!h||!r||h->job!=HarvestJob::Harvesting||h->resourceId!=source||amount<=0)
            return WorldCode::BadTarget;
        const WorldCode checked=validateEconomy(actor,source,WorldAction::Harvest);
        if(checked!=WorldCode::Accepted)return checked;
        if(amount>r->remaining||amount>h->capacity-h->cargo)return WorldCode::Capacity;
        r->remaining-=amount;h->cargo+=amount;
        emit(WorldEventType::ResourceDelta,h->sequence,source,0,0,-amount,
             WorldCode::Accepted,actor);
        emit(WorldEventType::CargoDelta,h->sequence,actor,0,0,amount,
             WorldCode::Accepted,source);
        if(r->remaining==0){
            WorldEntity* depleted=mutableEntity(source);
            depleted->life=Life::Despawned;depleted->hasOrder=false;depleted->target=0;
            if(selected_==source){
                selected_=0;
                emit(WorldEventType::Selection,h->sequence,0);
            }
            emit(WorldEventType::ResourceDepleted,h->sequence,source,0,0,0,
                 WorldCode::Accepted,actor);
            emit(WorldEventType::Despawn,h->sequence,source);
            cancelDependents(source,h->sequence);
        }else if(h->cargo==h->capacity){
            WorldEntity* e=mutableEntity(actor);
            e->hasOrder=false;e->target=0;
            emit(WorldEventType::Order,h->sequence,actor,e->x,e->y);
            cancelHarvest(actor,h->sequence);
        }
        return WorldCode::Accepted;
    }
    WorldCode commitReturnCargo(EntityId actor,EntityId refinery){
        HarvesterAccount* h=harvester(actor);
        if(!h||h->job!=HarvestJob::Returning||h->refineryId!=refinery)
            return WorldCode::BadTarget;
        const WorldCode checked=validateEconomy(actor,refinery,WorldAction::ReturnCargo);
        if(checked!=WorldCode::Accepted)return checked;
        const WorldEntity* e=findInternal(actor);
        for(House& owner:houses_)if(owner.id==e->owner){
            owner.credits+=h->cargo;
            emit(WorldEventType::CargoDelta,h->sequence,actor,0,0,-h->cargo,
                 WorldCode::Accepted,refinery);
            emit(WorldEventType::CreditsDelta,h->sequence,actor,0,0,h->cargo,
                 WorldCode::Accepted,refinery);
            h->cargo=0;
            WorldEntity* mutableActor=mutableEntity(actor);
            mutableActor->hasOrder=false;mutableActor->target=0;
            emit(WorldEventType::Order,h->sequence,actor,e->x,e->y);
            cancelHarvest(actor,h->sequence);
            return WorldCode::Accepted;
        }
        return WorldCode::UnknownHouse;
    }
    bool process(uint64_t toTick){
        if(!ready_||toTick<tick_||toTick-tick_>WORLD_COMMAND_HORIZON)return false;
        std::stable_sort(pending_.begin(),pending_.end(),
            [](const WorldCommand& a,const WorldCommand& b){
                if(a.tick!=b.tick)return a.tick<b.tick;
                if(a.sequence!=b.sequence)return a.sequence<b.sequence;
                return a.actor<b.actor;
            });
        size_t processed=0;
        while(processed<pending_.size()&&pending_[processed].tick<=toTick){
            tick_=pending_[processed].tick;
            execute(pending_[processed]);++processed;
        }
        pending_.erase(pending_.begin(),pending_.begin()+processed);
        tick_=toTick;return true;
    }
    bool restart(){
        if(!ready_||epoch_>=WORLD_MAX_EPOCH)return false;
        ++epoch_;tick_=0;nextId_=1;lastSequence_=0;selected_=0;
        houses_=initialHouses_;
        entities_.clear();resources_.clear();harvesters_.clear();
        pending_.clear();events_.clear();
        emit(WorldEventType::Restart,0,0);return true;
    }
    // These are observation/commit ports. The production engine has already
    // simulated movement or combat; this layer never performs those steps.
    bool observePosition(EntityId id,int x,int y){
        WorldEntity* e=mutableEntity(id);
        if(!e||e->life!=Life::Alive)return false;
        const Definition* d=catalog_.find(e->definitionId);
        if(!d||((d->role==Role::Resource||d->role==Role::Structure)&&
                (x!=e->x||y!=e->y))||!areaFree(x,y,*d,id))return false;
        if(e->x==x&&e->y==y)return true;
        e->x=x;e->y=y;emit(WorldEventType::Position,0,id,x,y);return true;
    }
    // R02 activation/completion is observed after World has admitted the
    // command batch. In particular, an appended command is not active until
    // navigation selects it, and a completed move has no lingering order.
    bool observeOrderState(EntityId id,bool active,int x,int y,EntityId target=0){
        WorldEntity* e=mutableEntity(id);
        if(!e||e->life!=Life::Alive||!inside(x,y)||
           (target&&(!findInternal(target)||findInternal(target)->life!=Life::Alive)))return false;
        if(e->hasOrder==active&&(!active||
           (e->orderX==x&&e->orderY==y&&e->target==target)))return true;
        e->hasOrder=active;e->orderX=x;e->orderY=y;e->target=active?target:0;
        emit(WorldEventType::Order,0,id,x,y);return true;
    }
    bool observeDamage(EntityId id,int damage,EntityId source=0,uint16_t weapon=0){
        WorldEntity* e=mutableEntity(id);
        if(!e||e->life!=Life::Alive||damage<=0||
           (source&&!findInternal(source)))return false;
        const int actual=std::min(e->hp,damage);
        e->hp-=actual;emit(WorldEventType::Damage,0,id,e->x,e->y,actual,
                           WorldCode::Accepted,source,weapon);
        if(!e->hp){
            e->life=Life::Dead;e->hasOrder=false;e->target=0;
            endEconomicLifetime(id);
            if(selected_==id){selected_=0;emit(WorldEventType::Selection,0,0);}
            for(WorldEntity& other:entities_)if(other.life==Life::Alive&&
                  other.hasOrder&&other.target==id){
                other.hasOrder=false;other.target=0;
                emit(WorldEventType::Order,0,other.id);
            }
            emit(WorldEventType::Death,0,id,e->x,e->y,0,WorldCode::Accepted,source,weapon);
        }
        return true;
    }
    // R03 emits shot/hit traces without changing World-owned health. The
    // damage commit remains observeDamage(), so one subsystem owns HP/death.
    bool observeCombatTrace(WorldEventType type,EntityId id,EntityId source,
                            uint16_t weapon,int x,int y,int value=0){
        if((type!=WorldEventType::Shot&&type!=WorldEventType::Hit)||
           !findInternal(id)||!findInternal(source)||!weapon||
           !inside(x,y)||value<0)return false;
        emit(type,0,id,x,y,value,WorldCode::Accepted,source,weapon);return true;
    }
    // An admitted order may later become unreachable as obstacles or units
    // change. Report that runtime outcome without changing ownership/HP.
    bool observeOrderFeedback(EntityId id,WorldCode result,uint64_t sequence=0){
        if(!findInternal(id)||(result!=WorldCode::Blocked&&
           result!=WorldCode::Unreachable&&result!=WorldCode::QueueFull&&
           result!=WorldCode::BadTarget&&result!=WorldCode::Dead))return false;
        emit(WorldEventType::Command,sequence,id,0,0,0,result);return true;
    }
    WorldSnapshot view()const{
        WorldSnapshot s={};
        s.version=WORLD_SNAPSHOT_VERSION;s.definitionSchemaVersion=DEFINITION_SCHEMA_VERSION;
        s.epoch=epoch_;s.tick=tick_;s.width=width_;s.height=height_;
        s.selectedEntityId=selected_;s.terrain=terrain_;s.houses=houses_;
        s.entities=entities_;s.definitions=catalog_.definitions();
        s.phase="playing";
        return s;
    }
    WorldSnapshot viewEconomy()const{
        WorldSnapshot s=view();s.version=WORLD_ECONOMY_SNAPSHOT_VERSION;
        s.resources=resources_;s.harvesters=harvesters_;
        return s;
    }
    WorldSnapshot publishEconomy(){
        WorldSnapshot s=viewEconomy();s.events.swap(events_);return s;
    }
    WorldSnapshot publish(){
        WorldSnapshot s=view();s.events.swap(events_);
        s.events.erase(std::remove_if(s.events.begin(),s.events.end(),
            [](const WorldEvent& event){return !legacyWorldEvent(event);}),s.events.end());
        return s;
    }
};

inline std::string worldJson(const WorldSnapshot& s){
    // All catalog identifiers have already passed safeKey() validation.
    std::ostringstream o;
    const bool economy=s.version==WORLD_ECONOMY_SNAPSHOT_VERSION;
    o<<"{\"version\":"<<s.version;
    if(economy)o<<",\"capabilities\":[\"economy\"]";
    o<<",\"definitionSchemaVersion\":"
     <<s.definitionSchemaVersion<<",\"epoch\":"<<s.epoch
     <<",\"tick\":"<<s.tick<<",\"map\":{\"width\":"<<s.width
     <<",\"height\":"<<s.height<<",\"terrain\":[";
    for(size_t i=0;i<s.terrain.size();i++){if(i)o<<',';o<<unsigned(s.terrain[i]);}
    o<<']';
    if(s.mapMetadata.present){
        const WorldMapMetadata& m=s.mapMetadata;
        o<<",\"id\":\""<<m.id<<"\",\"title\":\""<<m.title
         <<"\",\"biome\":\""<<m.biome<<"\",\"tiles\":[";
        for(size_t i=0;i<m.tiles.size();i++){if(i)o<<',';o<<unsigned(m.tiles[i]);}
        o<<"],\"costs\":[";
        for(size_t i=0;i<m.costs.size();i++){if(i)o<<',';o<<unsigned(m.costs[i]);}
        o<<"],\"resources\":[";
        for(size_t i=0;i<m.resources.size();i++){
            const WorldMapResource& r=m.resources[i];if(i)o<<',';
            o<<"{\"x\":"<<r.x<<",\"y\":"<<r.y<<",\"amount\":"<<r.amount<<'}';
        }
        o<<"],\"spawns\":[";
        for(size_t i=0;i<m.spawns.size();i++){
            const WorldMapSpawn& z=m.spawns[i];if(i)o<<',';
            o<<"{\"house\":"<<z.house<<",\"x\":"<<z.x<<",\"y\":"<<z.y
             <<",\"w\":"<<z.w<<",\"h\":"<<z.h<<'}';
        }
        o<<"],\"bases\":[";
        for(size_t i=0;i<m.bases.size();i++){
            const WorldMapBase& b=m.bases[i];if(i)o<<',';
            o<<"{\"house\":"<<b.house<<",\"x\":"<<b.x<<",\"y\":"<<b.y<<'}';
        }
        o<<"],\"victory\":{\"x\":"<<m.victoryX<<",\"y\":"<<m.victoryY
         <<",\"w\":"<<m.victoryW<<",\"h\":"<<m.victoryH<<"}";
    }
    o<<"},\"selectedEntityId\":"<<s.selectedEntityId
     <<",\"cargo\":0,\"phase\":\""<<(s.phase.empty()?"playing":s.phase)
     <<"\",\"houses\":[";
    for(size_t i=0;i<s.houses.size();i++){
        const House& h=s.houses[i];if(i)o<<',';
        o<<"{\"id\":"<<h.id<<",\"teamId\":"<<h.team
         <<",\"faction\":\""<<h.faction<<"\"";
        if(economy)o<<",\"credits\":"<<h.credits;
        o<<'}';
    }
    if(economy){
        o<<"],\"resources\":[";
        for(size_t i=0;i<s.resources.size();i++){
            const ResourceAccount& r=s.resources[i];if(i)o<<',';
            o<<"{\"entityId\":"<<r.entityId<<",\"remaining\":"<<r.remaining
             <<",\"maxAmount\":"<<r.maxAmount<<'}';
        }
        o<<"],\"harvesters\":[";
        for(size_t i=0;i<s.harvesters.size();i++){
            const HarvesterAccount& h=s.harvesters[i];if(i)o<<',';
            o<<"{\"entityId\":"<<h.entityId<<",\"cargo\":"<<h.cargo
             <<",\"capacity\":"<<h.capacity<<",\"resourceId\":"<<h.resourceId
             <<",\"refineryId\":"<<h.refineryId<<",\"jobState\":\""
             <<harvestJobName(h.job)<<"\",\"sequence\":"<<h.sequence<<'}';
        }
    }
    o<<"],\"definitions\":[";
    for(size_t i=0;i<s.definitions.size();i++){
        const Definition& d=s.definitions[i];if(i)o<<',';
        o<<"{\"id\":\""<<d.id<<"\",\"faction\":\""<<d.faction
         <<"\",\"role\":\""<<roleName(d.role)<<"\",\"kind\":\""<<roleName(d.role)
         <<"\",\"width\":"<<d.width<<",\"height\":"<<d.height
         <<",\"maxHp\":"<<d.maxHp<<",\"visualKey\":\""<<d.visualKey<<"\"}";
    }
    o<<"],\"entities\":[";
    for(size_t i=0;i<s.entities.size();i++){
        const WorldEntity& e=s.entities[i];if(i)o<<',';
        const Definition* d=nullptr;
        for(const Definition& candidate:s.definitions)if(candidate.id==e.definitionId){d=&candidate;break;}
        o<<"{\"id\":"<<e.id<<",\"definitionId\":\""<<e.definitionId
         <<"\",\"visualKey\":\""<<(d?d->visualKey:"")
         <<"\",\"kind\":\""<<(d?roleName(d->role):"unknown")
         <<"\",\"ownerId\":"<<e.owner<<",\"teamId\":"<<e.team
         <<",\"x\":"<<e.x<<",\"y\":"<<e.y<<",\"hp\":"<<e.hp
         <<",\"active\":"<<(e.life==Life::Alive?"true":"false")
         <<",\"lifecycle\":\""<<lifeName(e.life)<<"\",\"order\":";
        if(e.hasOrder)o<<"{\"x\":"<<e.orderX<<",\"y\":"<<e.orderY
                       <<",\"target\":"<<e.target<<"}";
        else o<<"null";
        o<<'}';
    }
    o<<"],\"events\":[";
    bool firstEvent=true;
    for(size_t i=0;i<s.events.size();i++){
        const WorldEvent& e=s.events[i];
        if(!economy&&!legacyWorldEvent(e))continue;
        if(!firstEvent)o<<',';
        firstEvent=false;
        o<<"{\"type\":\""<<worldEventName(e.type)
         <<"\",\"epoch\":"<<e.epoch<<",\"tick\":"<<e.tick
         <<",\"sequence\":"<<e.sequence<<",\"entityId\":"<<e.entityId
         <<",\"sourceId\":"<<e.sourceId<<",\"weaponId\":"<<e.weaponId
         <<",\"x\":"<<e.x<<",\"y\":"<<e.y
         <<",\"value\":"<<e.value<<",\"code\":\""<<codeName(e.code)<<"\"";
        if(economy)o<<",\"ownerId\":"<<e.ownerId;
        o<<'}';
    }
    o<<']';
    if(!s.commandStates.empty()){
        o<<",\"commandStates\":[";
        for(size_t i=0;i<s.commandStates.size();i++){
            const WorldCommandState& c=s.commandStates[i];if(i)o<<',';
            o<<"{\"entityId\":"<<c.entityId<<",\"kind\":\""<<c.kind
             <<"\",\"status\":\""<<c.status<<"\",\"x\":"<<c.x
             <<",\"y\":"<<c.y<<",\"queued\":"<<c.queued<<'}';
        }
        o<<']';
    }
    o<<'}';return o.str();
}
}

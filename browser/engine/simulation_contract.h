#pragma once
// R00: versioned, media-independent simulation boundary. Courier owns mission
// state/combat; live InfantryClass coordinates are copied into that state by
// the native adapter before a snapshot is taken. No browser movement logic.
#include "courier_combat.h"
#include <algorithm>
#include <cstdint>
#include <sstream>

namespace rts {
typedef uint32_t EntityId;
typedef uint16_t HouseId;
typedef uint16_t TeamId;
static const unsigned SNAPSHOT_VERSION=1;
static const HouseId NEUTRAL=0, PLAYER_HOUSE=1, SENTRY_HOUSE=2;
static const TeamId PLAYER_TEAM=1, SENTRY_TEAM=2;
static const EntityId UNIT_IDS[4]={1001,1002,2001,2002};
static const EntityId CRATE_IDS[2]={3001,3002};
static const EntityId EXTRACTION_ID=4001;

enum class Kind { Infantry, Supply, Extraction };
enum class Terrain { Clear=0, Blocked=1, Outside=2 };
enum class CommandKind { Select, Move, Stop, Attack };
enum class ResultCode { Accepted, InvalidTick, DuplicateSequence, UnknownEntity,
                        NotOwned, Dead, WrongPhase, BadTarget, Blocked, Unreachable };
enum class EventKind { Command, Selection, Position, Health, Pickup, Phase, Restart };

struct Command {
    uint64_t tick,sequence;
    HouseId issuer;
    EntityId actor;
    CommandKind kind;
    courier::Point tile;
    EntityId target;
};
struct CommandResult { uint64_t sequence;ResultCode code; };
struct Event {
    EventKind kind;
    uint64_t tick,sequence;
    EntityId entity;
    int x,y,value;
    ResultCode code;
};
struct Entity {
    EntityId id;
    Kind kind;
    HouseId owner;
    TeamId team;
    courier::Point position;
    int hp;
    bool active,hasOrder;
    courier::Point order;
};
// Optional R02 extension. Empty in Courier so existing R00 entities, events,
// IDs and snapshot version retain their established meaning.
struct CommandState {
    EntityId id;
    const char* kind,*status;
    courier::Point destination;
    unsigned queued;
};
struct Snapshot {
    unsigned version;
    uint64_t tick;
    int width,height,selected,cargo,phase;
    EntityId selectedEntityId;
    std::vector<uint8_t> terrain;
    std::vector<uint8_t> tiles;
    std::vector<courier::Resource> resources;
    std::array<courier::Rect,2> spawns;
    std::array<courier::Point,2> bases;
    courier::Rect victory;
    std::string mapId,title,biome;
    std::vector<Entity> entities;
    std::vector<Event> events;
    std::vector<CommandState> commandStates;
};

inline const char* name(Kind kind){
    switch(kind){case Kind::Infantry:return "infantry";
                 case Kind::Supply:return "supply";
                 case Kind::Extraction:return "extraction";}
    return "unknown";
}
inline const char* name(ResultCode code){
    switch(code){case ResultCode::Accepted:return "accepted";
        case ResultCode::InvalidTick:return "invalid_tick";
        case ResultCode::DuplicateSequence:return "duplicate_sequence";
        case ResultCode::UnknownEntity:return "unknown_entity";
        case ResultCode::NotOwned:return "not_owned";
        case ResultCode::Dead:return "dead";
        case ResultCode::WrongPhase:return "wrong_phase";
        case ResultCode::BadTarget:return "bad_target";
        case ResultCode::Blocked:return "blocked";
        case ResultCode::Unreachable:return "unreachable";}
    return "unknown";
}
inline const char* name(EventKind kind){
    switch(kind){case EventKind::Command:return "command";
        case EventKind::Selection:return "selection";
        case EventKind::Position:return "position";
        case EventKind::Health:return "health";
        case EventKind::Pickup:return "pickup";
        case EventKind::Phase:return "phase";
        case EventKind::Restart:return "restart";}
    return "unknown";
}
inline const char* phaseName(int phase){return phase==1?"won":phase==2?"lost":"playing";}
inline int unitIndex(EntityId id){for(int i=0;i<4;i++)if(UNIT_IDS[i]==id)return i;return -1;}

class Contract {
    courier::State& state_;
    courier::Combat& combat_;
    std::vector<Command> pending_;
    std::vector<Event> events_;
    Snapshot prior_;
    bool hasPrior_;

    void emit(EventKind kind,EntityId entity,int x=0,int y=0,int value=0,
              uint64_t sequence=0,ResultCode code=ResultCode::Accepted){
        events_.push_back({kind,static_cast<uint64_t>(state_.frame),sequence,entity,x,y,value,code});
    }
    ResultCode validate(const Command& c) const {
        if(c.tick<=static_cast<uint64_t>(state_.frame))return ResultCode::InvalidTick;
        const int i=unitIndex(c.actor);
        if(i<0)return ResultCode::UnknownEntity;
        if(c.issuer!=PLAYER_HOUSE||i>=2)return ResultCode::NotOwned;
        if(state_.phase!=0)return ResultCode::WrongPhase;
        if(state_.units[i].hp<=0)return ResultCode::Dead;
        if(c.kind==CommandKind::Move){
            if(c.tile.x<0||c.tile.y<0||c.tile.x>=state_.width||c.tile.y>=state_.height)return ResultCode::BadTarget;
            if(!courier::inside(state_,c.tile))return ResultCode::Blocked;
            if(!(c.tile==state_.units[i].p)&&courier::route(state_,i,c.tile).empty())
                return ResultCode::Unreachable;
        }else if(c.kind==CommandKind::Attack){
            const int enemy=unitIndex(c.target);
            if(enemy<2||state_.units[enemy].hp<=0)return ResultCode::BadTarget;
        }
        return ResultCode::Accepted;
    }
    static bool ordered(const Command& a,const Command& b){
        if(a.tick!=b.tick)return a.tick<b.tick;
        if(a.sequence!=b.sequence)return a.sequence<b.sequence;
        return a.actor<b.actor;
    }
    void execute(const Command& c){
        // Revalidate against the *current* world: an accepted queued order may
        // become impossible if a prior command or sentry changed the state.
        Command check=c;
        check.tick=static_cast<uint64_t>(state_.frame)+1;
        ResultCode result=validate(check);
        const int i=unitIndex(c.actor);
        if(result==ResultCode::Accepted){
            if(c.kind==CommandKind::Select)state_.selected=i;
            if(c.kind==CommandKind::Move){
                if(!courier::assignDestination(state_,i,c.tile))result=ResultCode::Unreachable;
                else combat_.focus[i]=-1;
            }
            if(c.kind==CommandKind::Stop){
                combat_.focus[i]=-1;
                if(!courier::assignDestination(state_,i,state_.units[i].p))result=ResultCode::BadTarget;
            }
            if(c.kind==CommandKind::Attack){
                const int enemy=unitIndex(c.target);
                if(!courier::orderAttack(state_,combat_,i,enemy))result=ResultCode::BadTarget;
                else if(courier::distance(state_.units[i].p,state_.units[enemy].p)>2){
                    courier::Point approach{0,0};
                    if(courier::approachEnemy(state_,i,enemy,approach))
                        courier::assignDestination(state_,i,approach);
                }
            }
        }
        emit(EventKind::Command,c.actor,c.tile.x,c.tile.y,0,c.sequence,result);
    }
public:
    Contract(courier::State& state,courier::Combat& combat):state_(state),combat_(combat),hasPrior_(false){}
    Terrain terrainAt(courier::Point p) const {
        if(p.x<0||p.y<0||p.x>=state_.width||p.y>=state_.height)return Terrain::Outside;
        return state_.blocked[p.y*state_.width+p.x]?Terrain::Blocked:Terrain::Clear;
    }
    bool passable(courier::Point p) const {return terrainAt(p)==Terrain::Clear;}
    CommandResult enqueue(const Command& c){
        ResultCode result=validate(c);
        if(result==ResultCode::Accepted){
            if(c.sequence==0||std::find_if(pending_.begin(),pending_.end(),
               [&c](const Command& p){return p.sequence==c.sequence;})!=pending_.end())
                result=ResultCode::DuplicateSequence;
            else pending_.push_back(c);
        }
        if(result!=ResultCode::Accepted)emit(EventKind::Command,c.actor,c.tile.x,c.tile.y,0,c.sequence,result);
        return {c.sequence,result};
    }
    void process(uint64_t nextTick){
        std::stable_sort(pending_.begin(),pending_.end(),ordered);
        size_t completed=0;
        while(completed<pending_.size()&&pending_[completed].tick<=nextTick){
            execute(pending_[completed]);++completed;
        }
        pending_.erase(pending_.begin(),pending_.begin()+completed);
    }
    void restart(){
        pending_.clear();events_.clear();hasPrior_=false;
        emit(EventKind::Restart,0);
    }
    Snapshot view() const {
        Snapshot snapshot={};
        snapshot.version=state_.mapId=="courier-extraction"?SNAPSHOT_VERSION:2;
        snapshot.tick=static_cast<uint64_t>(state_.frame);
        snapshot.width=state_.width;snapshot.height=state_.height;
        snapshot.mapId=state_.mapId;snapshot.title=state_.title;snapshot.biome=state_.biome;
        snapshot.tiles=state_.terrain;snapshot.resources=state_.resources;
        snapshot.spawns=state_.spawnZones;snapshot.bases=state_.bases;snapshot.victory=state_.victory;
        snapshot.selected=state_.selected;
        snapshot.selectedEntityId=UNIT_IDS[state_.selected];
        snapshot.cargo=state_.cargo;snapshot.phase=state_.phase;
        for(bool blocked:state_.blocked)snapshot.terrain.push_back(blocked?1:0);
        for(int i=0;i<4;i++){
            const courier::Unit& u=state_.units[i];
            snapshot.entities.push_back({UNIT_IDS[i],Kind::Infantry,
                i<2?PLAYER_HOUSE:SENTRY_HOUSE,i<2?PLAYER_TEAM:SENTRY_TEAM,
                u.p,u.hp,u.hp>0,i<2&&state_.hasNav[i],i<2?state_.navTargets[i]:courier::Point{0,0}});
        }
        for(int i=0;i<2;i++)snapshot.entities.push_back({CRATE_IDS[i],Kind::Supply,NEUTRAL,0,
            state_.crates[i],0,!state_.collected[i],false,{0,0}});
        snapshot.entities.push_back({EXTRACTION_ID,Kind::Extraction,NEUTRAL,0,
            state_.exit,0,true,false,{0,0}});
        return snapshot;
    }
    Snapshot publish(){
        Snapshot current=view();
        if(hasPrior_){
            if(current.selectedEntityId!=prior_.selectedEntityId)
                emit(EventKind::Selection,current.selectedEntityId);
            for(size_t i=0;i<current.entities.size();i++){
                const Entity& a=current.entities[i],& b=prior_.entities[i];
                if(!(a.position==b.position))emit(EventKind::Position,a.id,a.position.x,a.position.y);
                if(a.hp!=b.hp)emit(EventKind::Health,a.id,0,0,a.hp);
                if(a.kind==Kind::Supply&&a.active!=b.active&&!a.active)emit(EventKind::Pickup,a.id);
            }
            if(current.phase!=prior_.phase)emit(EventKind::Phase,0,0,0,current.phase);
        }
        prior_=current;hasPrior_=true;
        current.events.swap(events_);
        return current;
    }
};

inline std::string json(const Snapshot& s){
    std::ostringstream out;
    out<<"{\"version\":"<<s.version<<",\"tick\":"<<s.tick
       <<",\"map\":{\"width\":"<<s.width<<",\"height\":"<<s.height
       <<",\"id\":\""<<s.mapId<<"\",\"title\":\""<<s.title<<"\",\"biome\":\""<<s.biome
       <<"\",\"terrain\":[";
    for(size_t i=0;i<s.terrain.size();i++){if(i)out<<',';out<<static_cast<unsigned>(s.terrain[i]);}
    out<<"],\"tiles\":[";
    for(size_t i=0;i<s.tiles.size();i++){if(i)out<<',';out<<static_cast<unsigned>(s.tiles[i]);}
    out<<"],\"costs\":[";
    for(size_t i=0;i<s.tiles.size();i++){if(i)out<<',';out<<courier::movementCost(s.tiles[i]);}
    out<<"],\"resources\":[";
    for(size_t i=0;i<s.resources.size();i++){
        if(i)out<<',';
        out<<"{\"x\":"<<s.resources[i].p.x<<",\"y\":"<<s.resources[i].p.y
           <<",\"amount\":"<<s.resources[i].amount<<'}';
    }
    out<<"],\"spawns\":[";
    for(int i=0;i<2;i++){
        if(i)out<<',';
        const courier::Rect r=s.spawns[i];
        out<<"{\"house\":"<<i+1<<",\"x\":"<<r.x<<",\"y\":"<<r.y
           <<",\"w\":"<<r.w<<",\"h\":"<<r.h<<'}';
    }
    out<<"],\"bases\":[";
    for(int i=0;i<2;i++){
        if(i)out<<',';
        out<<"{\"house\":"<<i+1<<",\"x\":"<<s.bases[i].x<<",\"y\":"<<s.bases[i].y<<'}';
    }
    out<<"],\"victory\":{\"x\":"<<s.victory.x<<",\"y\":"<<s.victory.y
       <<",\"w\":"<<s.victory.w<<",\"h\":"<<s.victory.h
       <<"}},\"selectedEntityId\":"<<s.selectedEntityId<<",\"cargo\":"<<s.cargo
       <<",\"phase\":\""<<phaseName(s.phase)<<"\",\"entities\":[";
    for(size_t i=0;i<s.entities.size();i++){
        const Entity& e=s.entities[i];if(i)out<<',';
        out<<"{\"id\":"<<e.id<<",\"kind\":\""<<name(e.kind)<<"\",\"ownerId\":"<<e.owner
           <<",\"teamId\":"<<e.team<<",\"x\":"<<e.position.x<<",\"y\":"<<e.position.y
           <<",\"hp\":"<<e.hp<<",\"active\":"<<(e.active?"true":"false")<<",\"order\":";
        if(e.hasOrder)out<<"{\"x\":"<<e.order.x<<",\"y\":"<<e.order.y<<'}';
        else out<<"null";
        out<<'}';
    }
    out<<"],\"commandStates\":[";
    for(size_t i=0;i<s.commandStates.size();i++){
        const CommandState& c=s.commandStates[i];if(i)out<<',';
        out<<"{\"entityId\":"<<c.id<<",\"kind\":\""<<c.kind
           <<"\",\"status\":\""<<c.status<<"\",\"x\":"<<c.destination.x
           <<",\"y\":"<<c.destination.y<<",\"queued\":"<<c.queued<<'}';
    }
    out<<"],\"events\":[";
    for(size_t i=0;i<s.events.size();i++){
        const Event& e=s.events[i];if(i)out<<',';
        out<<"{\"type\":\""<<name(e.kind)<<"\",\"tick\":"<<e.tick
           <<",\"entityId\":"<<e.entity<<",\"sequence\":"<<e.sequence
           <<",\"x\":"<<e.x<<",\"y\":"<<e.y<<",\"value\":"<<e.value
           <<",\"code\":\""<<name(e.code)<<"\"}";
    }
    out<<"]}";return out.str();
}
}

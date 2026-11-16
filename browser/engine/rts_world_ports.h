#pragma once
// Native integration ports for R02, R03 and R04. World owns entity identity,
// ownership, HP and positions. Existing engine modules execute movement,
// combat and map staging; these ports never advance a simulation in JS.
#include "rts_world.h"
#include "production_orders.h"
#include "rts_weapon_system.h"
#include <array>
#include <map>

namespace rts {

inline bool configureFromR04(World& world,const Catalog& catalog,
                             const courier::State& map,
                             const std::vector<House>& houses){
    if(map.width<1||map.height<1||
       map.blocked.size()!=static_cast<size_t>(map.width*map.height))return false;
    std::vector<uint8_t> terrain;
    terrain.reserve(map.blocked.size());
    for(bool blocked:map.blocked)terrain.push_back(blocked?1:0);
    return world.configure(catalog,map.width,map.height,terrain,houses);
}

// A bounded compatibility bridge for the current four-actor R02 diagnostic.
// Returning false for a variable map or a mixed-owner roster is deliberate;
// the generalized R02 order scheduler must later use dynamic EntityIds.
inline bool bindR02Orders(const World& world,orders::Controller& controller,
                          HouseId issuer,const std::array<EntityId,orders::COUNT>& ids){
    const WorldSnapshot s=world.view();
    if(s.width!=orders::WIDTH||s.height!=orders::HEIGHT||
       s.terrain.size()!=orders::CELLS)return false;
    std::array<bool,orders::CELLS> blocked;
    for(size_t i=0;i<blocked.size();i++)blocked[i]=s.terrain[i]!=0;
    std::array<courier::Point,orders::COUNT> positions;
    std::set<EntityId> used;
    for(int i=0;i<orders::COUNT;i++){
        const WorldEntity* e=world.entity(ids[i]);
        if(!e||!used.insert(ids[i]).second||e->owner!=issuer||e->life!=Life::Alive)
            return false;
        const Definition* d=world.catalog().find(e->definitionId);
        if(!d||d->role!=Role::Infantry||d->width!=1||d->height!=1)return false;
        positions[i]={e->x,e->y};
    }
    controller.reset(blocked,positions);return true;
}

struct CombatLoadout {
    uint16_t infantry,vehicle,structure;
};
inline uint16_t weaponFor(Role role,const CombatLoadout& loadout){
    switch(role){
        case Role::Infantry:return loadout.infantry;
        case Role::Vehicle:return loadout.vehicle;
        case Role::Structure:return loadout.structure;
        case Role::Resource:return 0;
    }
    return 0;
}
inline bool bindR03Combat(const World& world,rtscombat::System& out,
                          const std::vector<rtscombat::Weapon>& weapons,
                          const CombatLoadout& loadout){
    const WorldSnapshot s=world.view();
    if(s.width<=0||s.height<=0)return false;
    rtscombat::System candidate(s.width,s.height);
    if(!candidate.setTerrain(s.terrain))return false;
    for(const rtscombat::Weapon& w:weapons)if(!candidate.addWeapon(w))return false;
    for(const WorldEntity& e:s.entities){
        if(e.life!=Life::Alive)continue;
        const Definition* def=world.catalog().find(e.definitionId);
        if(!def)return false;
        const uint16_t weapon=weaponFor(def->role,loadout);
        if(def->role==Role::Resource)continue;
        if(!weapon)return false;
        const rtscombat::TargetClass klass=def->role==Role::Infantry?rtscombat::Infantry:
            def->role==Role::Vehicle?rtscombat::Vehicle:rtscombat::Structure;
        const rtscombat::Armor armor=def->role==Role::Infantry?rtscombat::Soft:
            def->role==Role::Vehicle?rtscombat::Light:rtscombat::Heavy;
        if(!candidate.addActor({e.id,e.owner,e.team,klass,armor,{e.x,e.y},
                                e.hp,weapon,false,0,-1}))return false;
    }
    out=candidate;return true;
}
inline bool applyR03CombatEvents(World& world,const rtscombat::System& combat){
    // Validate the complete native damage batch before committing any HP.
    // Otherwise one malformed event could leave a partially applied tick.
    std::map<EntityId,int> damage;
    for(const rtscombat::Event& event:combat.events())
        if(event.type==rtscombat::Damage){
            const WorldEntity* target=world.entity(event.target);
            if(!target||target->life!=Life::Alive||event.value<=0||
               !world.entity(event.source))return false;
            damage[event.target]+=event.value;
            if(damage[event.target]>target->hp)return false;
        }
    for(const rtscombat::Event& event:combat.events())
        if(event.type==rtscombat::Damage&&!world.observeDamage(
             event.target,event.value,event.source,event.weapon))return false;
    return true;
}
}

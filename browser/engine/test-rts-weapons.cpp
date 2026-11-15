#include "rts_weapon_system.h"
#include "simulation_contract.h"
#include <cassert>
#include <iostream>
#include <sstream>

using namespace rtscombat;
static const Weapon rifle={1,3,2,2,Infantry,SmallArms,Instant,0,0,0,true,false,EnemiesOnly};
static const Weapon cannon={2,4,3,2,Infantry|Vehicle,Piercing,Projectile,2,0,0,true,false,EnemiesOnly};
static const Weapon grenade={3,4,3,2,Infantry|Vehicle,Explosive,Projectile,1,1,0,true,false,SplashAll};

static Actor actor(uint32_t id,int team,TargetClass kind,Armor armor,int x,int y,int hp,
                   uint16_t weaponId=1,bool automatic=false){
    return {id,static_cast<uint16_t>(team),static_cast<uint16_t>(team),kind,armor,
            {x,y},hp,weaponId,automatic,0,-1};
}
static int count(const System& s,EventType type){
    int n=0;for(const Event& e:s.events())if(e.type==type)++n;return n;
}

static void rules(){
    System s(8,5);assert(s.addWeapon(rifle));assert(s.addWeapon(cannon));assert(s.addWeapon(grenade));
    assert(!s.addWeapon(rifle));
    assert(s.addActor(actor(1001,1,Infantry,Soft,1,1,6)));
    assert(s.addActor(actor(1002,1,Infantry,Soft,1,2,6)));
    assert(s.addActor(actor(2001,2,Infantry,Soft,3,1,6)));
    assert(s.addActor(actor(2002,2,Vehicle,Heavy,4,1,8)));
    assert(!s.addActor(actor(1001,1,Infantry,Soft,1,1,6)));
    assert(!s.canAttack(1001,1002)); // same team
    assert(!s.canAttack(1001,2002)); // rifles reject vehicles
    assert(!s.canAttack(9999,2001));
    assert(s.orderAttack(1001,2001));
    s.tick(0);assert(count(s,Shot)==1&&s.find(2001)->hp==4);
    s.tick(1);assert(count(s,Shot)==0&&s.find(2001)->hp==4);
    s.tick(2);assert(count(s,Shot)==1&&s.find(2001)->hp==2);
    s.cancel(1001);s.tick(3);s.tick(4);
    assert(s.find(2001)->hp==2&&count(s,Shot)==0); // cancel means no reacquire
    assert(s.orderAttack(1001,2001));s.tick(5); // cooldown since tick 2 has elapsed
    assert(s.find(2001)->hp==0&&count(s,Death)==1);
    s.tick(6);assert(count(s,Death)==0);
    assert(s.find(1001)->focus==0);
    assert(!s.orderAttack(1001,2001));
}
static void armorAndLineOfSight(){
    System s(8,5);s.addWeapon(rifle);s.addWeapon(cannon);
    std::vector<uint8_t> blocks(8*5,0);blocks[1*8+2]=1;
    assert(s.setTerrain(blocks));assert(!s.setTerrain({1,2}));
    assert(s.addActor(actor(1001,1,Infantry,Soft,1,1,6)));
    assert(s.addActor(actor(1002,1,Infantry,Soft,1,3,6,2)));
    assert(s.addActor(actor(2001,2,Infantry,Soft,3,1,6)));
    assert(s.addActor(actor(2002,2,Vehicle,Heavy,4,3,9)));
    assert(s.orderAttack(1001,2001));s.tick(0);
    assert(count(s,Shot)==0); // obstacle blocks rifle
    assert(s.orderAttack(1002,2002));s.tick(1);
    assert(count(s,Shot)==1&&count(s,Hit)==0&&s.projectiles().size()==1);
    s.tick(2);assert(s.find(2002)->hp==9);
    s.tick(3);assert(s.find(2002)->hp==6); // 2 piercing * 150% heavy armor = 3
    assert(count(s,Damage)==1&&s.projectiles().empty());
    // Projectiles have deterministic impact cells, and moving can dodge.
    s.cancel(1002);s.find(2002)->position={4,2};
    s.orderAttack(1002,2002);s.tick(4);
    s.find(2002)->position={4,3};s.tick(5);s.tick(6);
    assert(s.find(2002)->hp==6);
}
static void splashAndSimultaneous(){
    System s(8,5);s.addWeapon(grenade);
    s.addActor(actor(1001,1,Infantry,Soft,1,1,5,3));
    s.addActor(actor(1002,1,Infantry,Soft,3,2,5,3));
    s.addActor(actor(2001,2,Infantry,Soft,3,1,5,3));
    assert(s.orderAttack(1001,2001));
    s.tick(0);assert(count(s,Shot)==1&&s.find(2001)->hp==5);
    s.cancel(1001);s.tick(1); // in-flight shot survives order cancellation
    assert(s.find(2001)->hp==3&&s.find(1002)->hp==3);
    assert(count(s,Hit)==2&&count(s,Damage)==2);

    System duel(6,4);duel.addWeapon(rifle);
    duel.addActor(actor(1001,1,Infantry,Soft,1,1,2,1,true));
    duel.addActor(actor(2001,2,Infantry,Soft,2,1,2,1,true));
    duel.tick(0);
    assert(count(duel,Shot)==2&&count(duel,Death)==2);
    assert(duel.find(1001)->hp==0&&duel.find(2001)->hp==0);
    duel.tick(1);assert(count(duel,Shot)==0&&count(duel,Death)==0);
}
static std::string scriptedFight(){
    System s(8,5);s.addWeapon(rifle);s.addWeapon(cannon);
    s.addActor(actor(1001,1,Infantry,Soft,1,1,6));
    s.addActor(actor(1002,1,Vehicle,Heavy,1,3,10,2));
    s.addActor(actor(2001,2,Infantry,Soft,3,1,6,1,true));
    s.addActor(actor(2002,2,Vehicle,Light,4,3,8,2,true));
    std::ostringstream result;
    for(int t=0;t<12;t++){
        if(t==0){assert(s.orderAttack(1001,2001));assert(s.orderAttack(1002,2002));}
        if(t==4){s.cancel(1001);assert(s.orderAttack(1001,2001));}
        if(t==6)s.find(1002)->position={2,3};
        s.tick(t);
        for(const Event& e:s.events())result<<t<<':'<<e.type<<':'<<e.source<<':'<<e.target<<':'<<e.weapon<<':'<<e.value<<';';
    }
    for(const Actor& a:s.actors())result<<a.id<<'='<<a.hp<<','<<a.focus<<';';
    return result.str();
}
static void contractEvents(){
    courier::State state;courier::Combat combat;rts::Contract sim(state,combat);
    state.units[0].p={8,2};state.units[1].p={1,3};
    const rts::Command attack={1,7,rts::PLAYER_HOUSE,1001,rts::CommandKind::Attack,{10,2},2001};
    const rts::Command reject={1,8,rts::PLAYER_HOUSE,1001,rts::CommandKind::Attack,{0,0},1002};
    assert(sim.enqueue(attack).code==rts::ResultCode::Accepted);
    assert(sim.enqueue(reject).code==rts::ResultCode::BadTarget);
    sim.process(1);sim.publish();
    for(int t=1;t<=3;t++)courier::tickCombat(state,combat);
    const rts::Snapshot result=sim.publish();
    int shots=0,hits=0,damage=0;
    for(const rts::Event& e:result.events){
        if(e.kind==rts::EventKind::Shot){++shots;assert(e.sourceId==1001&&e.entity==2001&&e.weaponId==1);}
        if(e.kind==rts::EventKind::Hit)++hits;
        if(e.kind==rts::EventKind::Damage){++damage;assert(e.value==1);}
    }
    assert(shots==1&&hits==1&&damage==1&&state.units[2].hp==2);
    assert(rts::json(result).find("\"type\":\"damage\"")!=std::string::npos);
    assert(sim.publish().events.empty()); // no duplicate on a repeated browser frame
}
static void armoredDefeatDrill(){
    courier::State state;courier::Combat combat;combat.drill=true;
    state.units[2].p={3,2};state.units[2].hp=8;
    state.units[3].p={4,4};state.units[3].hp=8;
    rts::Contract sim(state,combat);
    const rts::Command invalid={1,21,rts::PLAYER_HOUSE,1001,rts::CommandKind::Attack,{3,2},2001};
    assert(sim.enqueue(invalid).code==rts::ResultCode::BadTarget);
    assert(sim.view().entities[2].kind==rts::Kind::Vehicle);
    sim.publish();
    bool sawDamage=false,sawDeath=false;
    for(int tick=0;tick<100&&state.phase==0;tick++){
        courier::tickCombat(state,combat);
        const rts::Snapshot snapshot=sim.publish();
        for(const rts::Event& e:snapshot.events){
            if(e.kind==rts::EventKind::Damage)sawDamage=true;
            if(e.kind==rts::EventKind::Death)sawDeath=true;
        }
    }
    assert(state.phase==2&&sawDamage&&sawDeath);
    assert(state.units[2].hp==8&&state.units[3].hp==8);
}

int main(){
    rules();armorAndLineOfSight();splashAndSimultaneous();contractEvents();armoredDefeatDrill();
    assert(scriptedFight()==scriptedFight());
    std::cout<<"PASS: R03 weapons, range, cooldown, LOS, masks, armor, splash, cancellation, deaths, simultaneous hits and deterministic replay\n";
}

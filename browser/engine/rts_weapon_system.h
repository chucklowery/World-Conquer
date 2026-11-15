#pragma once
// R03: deterministic, media-independent weapon simulation. Positions, owners,
// armor and HP are supplied by the authoritative C++ world, never the HUD.
// All arithmetic is integer and actor iteration is stable by EntityId.
#include <algorithm>
#include <cstdlib>
#include <cstdint>
#include <vector>

namespace rtscombat {
enum TargetClass { Infantry=1, Vehicle=2, Structure=4 };
enum Armor { Soft, Light, Heavy };
enum DamageType { SmallArms, Explosive, Piercing };
enum Effect { Instant, Projectile };
enum FriendlyFire { EnemiesOnly, SplashAll };
enum EventType { Shot, Hit, Damage, Death };

struct Point { int x,y; };
inline int distance(Point a,Point b){return std::abs(a.x-b.x)+std::abs(a.y-b.y);}
struct Weapon {
    uint16_t id;
    int range,cooldown,damage,targetMask;
    DamageType type;
    Effect effect;
    int travelTicks,splashRadius,firstTick;
    bool lineOfSight,phaseLocked;
    FriendlyFire friendlyFire;
};
struct Actor {
    uint32_t id;
    uint16_t house,team;
    TargetClass targetClass;
    Armor armor;
    Point position;
    int hp;
    uint16_t weapon;
    bool autoAcquire;
    uint32_t focus;
    int lastShot;
};
struct Event {
    EventType type;
    uint64_t tick;
    uint32_t source,target;
    uint16_t weapon;
    int x,y,value;
};
struct Missile {
    uint64_t impactTick;
    uint32_t source,target;
    uint16_t weapon;
    uint16_t team;
    Point impact;
};

// Percent multipliers: small arms cannot penetrate heavy armor; explosive
// attacks are useful against light armor; piercing attacks favor vehicles.
inline int damageAgainst(int base,DamageType type,Armor armor){
    static const int modifiers[3][3]={{100,50,0},{100,125,75},{75,100,150}};
    return base*modifiers[static_cast<int>(type)][static_cast<int>(armor)]/100;
}

class System {
    int width_,height_;
    std::vector<uint8_t> terrain_;
    std::vector<Weapon> weapons_;
    std::vector<Actor> actors_;
    std::vector<Missile> missiles_;
    std::vector<Event> events_;

    const Weapon* weapon(uint16_t id) const {
        for(const Weapon& w:weapons_)if(w.id==id)return &w;
        return nullptr;
    }
    bool blocked(int x,int y) const {
        return x<0||y<0||x>=width_||y>=height_||terrain_[y*width_+x]!=0;
    }
    bool visible(Point a,Point b) const {
        // Integer Bresenham; endpoints are actors and not terrain blockers.
        int dx=std::abs(b.x-a.x),dy=std::abs(b.y-a.y);
        int sx=a.x<b.x?1:-1,sy=a.y<b.y?1:-1,err=dx-dy;
        int x=a.x,y=a.y;
        while(x!=b.x||y!=b.y){
            const int twice=2*err;
            if(twice>-dy){err-=dy;x+=sx;}
            if(twice<dx){err+=dx;y+=sy;}
            if((x!=b.x||y!=b.y)&&blocked(x,y))return false;
        }
        return true;
    }
    bool opponent(const Actor& attacker,const Actor& target,const Weapon& w) const {
        return attacker.id!=target.id&&target.hp>0&&attacker.team!=target.team&&
            (w.targetMask&target.targetClass)!=0;
    }
    bool inRange(const Actor& attacker,const Actor& target,const Weapon& w) const {
        return distance(attacker.position,target.position)<=w.range&&
            (!w.lineOfSight||visible(attacker.position,target.position));
    }
    void hit(const Missile& shot,const Weapon& w){
        for(Actor& victim:actors_){
            if(victim.hp<=0||distance(victim.position,shot.impact)>w.splashRadius||
               !(w.targetMask&victim.targetClass)||
               (w.friendlyFire==EnemiesOnly&&victim.team==shot.team))continue;
            const int amount=std::min(victim.hp,damageAgainst(w.damage,w.type,victim.armor));
            if(amount<=0)continue;
            events_.push_back({Hit,shot.impactTick,shot.source,victim.id,w.id,
                               victim.position.x,victim.position.y,amount});
            events_.push_back({Damage,shot.impactTick,shot.source,victim.id,w.id,
                               victim.position.x,victim.position.y,amount});
            victim.hp-=amount;
            if(victim.hp==0)events_.push_back({Death,shot.impactTick,shot.source,victim.id,w.id,
                                               victim.position.x,victim.position.y,0});
        }
    }
public:
    System(int width=18,int height=11):width_(width),height_(height),terrain_(width*height,0){}
    bool setTerrain(const std::vector<uint8_t>& terrain){
        if(terrain.size()!=terrain_.size())return false;
        terrain_=terrain;return true;
    }
    bool addWeapon(const Weapon& w){
        if(!w.id||w.range<0||w.cooldown<=0||w.damage<0||w.targetMask<=0||
           w.travelTicks<0||w.splashRadius<0||w.firstTick<0||weapon(w.id)||
           (w.effect==Instant&&w.travelTicks!=0))return false;
        weapons_.push_back(w);return true;
    }
    bool addActor(const Actor& actor){
        if(!actor.id||actor.hp<0||!weapon(actor.weapon)||blocked(actor.position.x,actor.position.y)||
           find(actor.id))return false;
        actors_.push_back(actor);
        std::sort(actors_.begin(),actors_.end(),[](const Actor& a,const Actor& b){return a.id<b.id;});
        return true;
    }
    Actor* find(uint32_t id){for(Actor& a:actors_)if(a.id==id)return &a;return nullptr;}
    const Actor* find(uint32_t id) const {for(const Actor& a:actors_)if(a.id==id)return &a;return nullptr;}
    bool canAttack(uint32_t source,uint32_t target) const {
        const Actor* a=find(source),*b=find(target);
        if(!a||!b||a->hp<=0)return false;
        const Weapon* w=weapon(a->weapon);
        return w&&opponent(*a,*b,*w);
    }
    bool orderAttack(uint32_t source,uint32_t target){
        if(!canAttack(source,target))return false;
        find(source)->focus=target;return true;
    }
    void cancel(uint32_t source){Actor* a=find(source);if(a)a->focus=0;}
    int rangeFor(uint32_t source) const {
        const Actor* a=find(source);const Weapon* w=a?weapon(a->weapon):nullptr;
        return w?w->range:0;
    }
    const std::vector<Actor>& actors() const {return actors_;}
    const std::vector<Event>& events() const {return events_;}
    const std::vector<Missile>& projectiles() const {return missiles_;}

    void tick(uint64_t tick){
        events_.clear();
        std::vector<Missile> impacts;
        // Snapshot every eligible shot BEFORE applying damage. Two units that
        // shoot on the same tick both fire, even if each kills the other.
        for(Actor& a:actors_){
            if(a.hp<=0)continue;
            const Weapon* w=weapon(a.weapon);
            if(!w||tick<static_cast<uint64_t>(w->firstTick)||
               (w->phaseLocked&&(tick-static_cast<uint64_t>(w->firstTick))%w->cooldown!=0)||
               (a.lastShot>=0&&tick-static_cast<uint64_t>(a.lastShot)<static_cast<uint64_t>(w->cooldown)))continue;
            const Actor* target=find(a.focus);
            if(!target||!opponent(a,*target,*w)||!inRange(a,*target,*w)){
                target=nullptr;
                if(a.autoAcquire)for(const Actor& candidate:actors_){
                    if(opponent(a,candidate,*w)&&inRange(a,candidate,*w)&&
                       (!target||distance(a.position,candidate.position)<distance(a.position,target->position)||
                        (distance(a.position,candidate.position)==distance(a.position,target->position)&&candidate.id<target->id)))
                        target=&candidate;
                }
            }
            if(!target)continue;
            a.lastShot=static_cast<int>(tick);
            events_.push_back({Shot,tick,a.id,target->id,w->id,target->position.x,target->position.y,0});
            const Missile m={tick+static_cast<uint64_t>(w->travelTicks),a.id,target->id,w->id,a.team,target->position};
            if(w->effect==Instant)impacts.push_back(m);
            else missiles_.push_back(m);
        }
        for(const Missile& m:missiles_)if(m.impactTick<=tick)impacts.push_back(m);
        missiles_.erase(std::remove_if(missiles_.begin(),missiles_.end(),
                       [tick](const Missile& m){return m.impactTick<=tick;}),missiles_.end());
        std::stable_sort(impacts.begin(),impacts.end(),[](const Missile& a,const Missile& b){
            if(a.impactTick!=b.impactTick)return a.impactTick<b.impactTick;
            if(a.source!=b.source)return a.source<b.source;
            return a.target<b.target;
        });
        for(const Missile& m:impacts){
            const Weapon* w=weapon(m.weapon);
            if(w)hit(m,*w);
        }
        // Invalid orders and bullets from destroyed emitters are cleaned up.
        // Already-launched bullets are retained: they can land after death.
        for(Actor& a:actors_)if(a.focus&&!canAttack(a.id,a.focus))a.focus=0;
    }
};
} // namespace rtscombat

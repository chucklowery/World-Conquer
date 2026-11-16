#pragma once
// R02 deterministic, bounded navigation/order scheduler. The browser adapter
// supplies live InfantryClass positions and dispatches each reserved waypoint
// through FootClass::Assign_Destination. This is native C++ simulation code;
// no JavaScript movement or duplicate browser physics exists.
#include "native_slice_core.h"
#include <array>
#include <algorithm>
#include <cstdint>
#include <vector>

namespace orders {
static const int WIDTH=18,HEIGHT=11,CELLS=WIDTH*HEIGHT,COUNT=4;
static const int MAX_SEARCHES_PER_TICK=2,MAX_EXPANSIONS_PER_SEARCH=CELLS;
static const int MAX_QUEUE=8,STALLED_TICKS=24,BLOCKED_TICKS=90;
// R04 uses variable-size map storage. This intentionally fixed-size R02
// diagnostic accepts only Courier's native 18x11 footprint, without silently
// truncating another map or changing the bounded A* controller contract.
inline bool fixedTerrain(const courier::State& source,std::array<bool,CELLS>& out){
    if(source.width!=WIDTH||source.height!=HEIGHT||source.blocked.size()!=CELLS)return false;
    std::copy(source.blocked.begin(),source.blocked.end(),out.begin());
    return true;
}
enum class Kind { Move,AttackMove,Stop,Hold,Guard,Patrol,Attack };
enum class Status { Idle,Moving,Waiting,Holding,Guarding,Patrolling,Attacking,Unreachable,Dead };
enum class Code { Accepted,BadActor,Dead,BadTarget,Blocked,Unreachable,QueueFull };
inline const char* name(Kind k) {
    switch(k){case Kind::Move:return "move";case Kind::AttackMove:return "attack_move";
        case Kind::Stop:return "stop";case Kind::Hold:return "hold";
        case Kind::Guard:return "guard";case Kind::Patrol:return "patrol";
        case Kind::Attack:return "attack";}
    return "unknown";
}
inline const char* name(Status s) {
    switch(s){case Status::Idle:return "idle";case Status::Moving:return "moving";
        case Status::Waiting:return "waiting";case Status::Holding:return "holding";
        case Status::Guarding:return "guarding";case Status::Patrolling:return "patrolling";
        case Status::Attacking:return "attacking";
        case Status::Unreachable:return "unreachable";case Status::Dead:return "dead";}
    return "unknown";
}
inline const char* name(Code c) {
    switch(c){case Code::Accepted:return "accepted";case Code::BadActor:return "bad_actor";
        case Code::Dead:return "dead";case Code::BadTarget:return "bad_target";
        case Code::Blocked:return "blocked";case Code::Unreachable:return "unreachable";
        case Code::QueueFull:return "queue_full";}
    return "unknown";
}
struct Order {
    Kind kind;
    courier::Point target;
    int guard; // Guard: friendly index; Attack: hostile index; otherwise -1
};
struct Request { uint64_t tick,sequence;int actor;Order order;bool append; };
struct Feedback { uint64_t sequence;int actor;Code code; };
struct Activation { uint64_t sequence;int actor;Kind kind; };
struct Queued { Order order;uint64_t sequence; };
struct Unit {
    courier::Point position;
    bool alive,hasOrder,inFlight;
    courier::Point waypoint,patrolStart;
    Order current;
    Status status;
    std::vector<Queued> queued;
    std::vector<courier::Point> path;
    int stalled,blocked;
    uint64_t activeSequence;
    Unit():position{0,0},alive(true),hasOrder(false),inFlight(false),
        waypoint{0,0},patrolStart{0,0},current{Kind::Stop,{0,0},-1},
        status(Status::Idle),stalled(0),blocked(0),activeSequence(0){}
};
struct Budget {
    int searches,expansions,maxOpen,issued;
    Budget():searches(0),expansions(0),maxOpen(0),issued(0){}
};
struct Move {int actor;courier::Point waypoint;};

class Controller {
    int width_,height_,cells_;
    std::vector<uint8_t> terrain_;
    std::vector<uint8_t> costs_;
    std::vector<Unit> units_;
    std::vector<Request> pending_;
    std::vector<Feedback> feedback_;
    std::vector<Activation> activations_;
    Budget budget_;
    uint64_t tick_;
    int cell(courier::Point p) const {return p.y*width_+p.x;}
    bool inside(courier::Point p) const {
        return p.x>=0&&p.x<width_&&p.y>=0&&p.y<height_;
    }
    bool clear(courier::Point p) const {return inside(p)&&!terrain_[cell(p)];}
    bool occupied(courier::Point p,int except) const {
        for(size_t i=0;i<units_.size();i++)if(static_cast<int>(i)!=except&&units_[i].alive&&
            (units_[i].position==p||(units_[i].inFlight&&units_[i].waypoint==p)))
            return true;
        return false;
    }
    // A* over the actual staged passability grid, fixed tie-breaking by
    // (f, h, insertion index). One cell is expanded at most once, with no
    // unbounded recursion or allocation inside the search loop.
    std::vector<courier::Point> search(int actor,courier::Point goal,bool dynamic){
        ++budget_.searches;
        const courier::Point start=units_[actor].position;
        if(!clear(goal))return {};
        const int source=cell(start),dest=cell(goal);
        // Weighted edges cost up to three; a shortest simple path may cross
        // cells_-1 rough cells. A unit-cost sentinel truncates valid routes.
        std::vector<int> g(cells_,cells_*3+1),prev(cells_,-1),serial(cells_,0);
        std::vector<uint8_t> closed(cells_,0),open(cells_,0);
        g[source]=0;prev[source]=source;open[source]=true;
        int opened=1,issued=1;
        const courier::Point dirs[]={{1,0},{0,1},{-1,0},{0,-1}};
        while(opened&&budget_.expansions<MAX_SEARCHES_PER_TICK*std::min(cells_,512)){
            int best=-1,bf=100000,bh=100000,bs=100000;
            for(int n=0;n<cells_;n++)if(open[n]){
                const courier::Point p{n%width_,n/width_};
                const int h=courier::distance(p,goal),f=g[n]+h;
                if(f<bf||(f==bf&&(h<bh||(h==bh&&serial[n]<bs)))){
                    best=n;bf=f;bh=h;bs=serial[n];
                }
            }
            if(best<0)break;
            open[best]=false;--opened;closed[best]=true;
            ++budget_.expansions;
            if(best==dest){
                std::vector<courier::Point> result;
                for(int n=dest;n!=source;n=prev[n])result.push_back({n%width_,n/width_});
                std::reverse(result.begin(),result.end());
                return result;
            }
            const courier::Point p{best%width_,best/width_};
            for(courier::Point d:dirs){
                const courier::Point next{p.x+d.x,p.y+d.y};
                if(!clear(next)||(dynamic&&occupied(next,actor)))continue;
                const int n=cell(next);
                if(closed[n]||g[best]+costs_[n]>=g[n])continue;
                g[n]=g[best]+costs_[n];prev[n]=best;
                if(!open[n]){open[n]=true;++opened;serial[n]=issued++;}
            }
            budget_.maxOpen=std::max(budget_.maxOpen,opened);
        }
        return {};
    }
    bool connected(int actor,courier::Point target) const {
        if(units_[actor].position==target)return true;
        // Static connectivity is checked at admission; this secondary BFS
        // avoids charging the per-tick dynamic replanning budget.
        std::vector<uint8_t> visited(cells_,0);
        std::vector<int> queue(cells_);
        int head=0,tail=0;
        queue[tail++]=cell(units_[actor].position);
        visited[cell(units_[actor].position)]=true;
        const courier::Point dirs[]={{1,0},{0,1},{-1,0},{0,-1}};
        while(head<tail){
            const int c=queue[head++];
            if(c==cell(target))return true;
            const courier::Point p{c%width_,c/width_};
            for(courier::Point d:dirs){
                const courier::Point n{p.x+d.x,p.y+d.y};
                if(clear(n)&&!visited[cell(n)]){
                    visited[cell(n)]=true;queue[tail++]=cell(n);
                }
            }
        }
        return false;
    }
    void clearOrder(Unit& u,Status status=Status::Idle){
        u.hasOrder=false;u.inFlight=false;u.path.clear();u.queued.clear();
        u.stalled=u.blocked=0;u.status=status;u.activeSequence=0;
    }
    void activate(int actor,const Order& o,uint64_t sequence){
        Unit& u=units_[actor];
        u.current=o;u.hasOrder=true;u.inFlight=false;u.path.clear();u.activeSequence=sequence;
        u.stalled=u.blocked=0;
        if(o.kind==Kind::Patrol)u.patrolStart=u.position;
        u.status=o.kind==Kind::Hold?Status::Holding:
            o.kind==Kind::Guard?Status::Guarding:
            o.kind==Kind::Patrol?Status::Patrolling:
            o.kind==Kind::Attack?Status::Attacking:Status::Moving;
        activations_.push_back({sequence,actor,o.kind});
    }
    void complete(int actor){
        Unit& u=units_[actor];
        u.hasOrder=false;u.inFlight=false;u.path.clear();
        u.stalled=u.blocked=0;
        if(!u.queued.empty()){
            const Queued next=u.queued.front();u.queued.erase(u.queued.begin());
            activate(actor,next.order,next.sequence);
        }else{u.status=Status::Idle;u.activeSequence=0;}
    }
    Code admit(const Request& r,bool reserve=true) const {
        if(r.actor<0||static_cast<size_t>(r.actor)>=units_.size())return Code::BadActor;
        const Unit& u=units_[r.actor];
        if(!u.alive)return Code::Dead;
        if(r.order.kind==Kind::Guard||r.order.kind==Kind::Attack){
            if(r.order.guard<0||static_cast<size_t>(r.order.guard)>=units_.size()||r.order.guard==r.actor||
               !units_[r.order.guard].alive)return Code::BadTarget;
        }else if(r.order.kind==Kind::Move||r.order.kind==Kind::AttackMove||
                 r.order.kind==Kind::Patrol){
            if(!inside(r.order.target))return Code::BadTarget;
            if(!clear(r.order.target))return Code::Blocked;
            if(!connected(r.actor,r.order.target))return Code::Unreachable;
        }
        if(reserve&&pending_.size()>=128)return Code::QueueFull;
        bool has=u.hasOrder;
        size_t queued=u.queued.size();
        if(reserve)for(const Request& p:pending_){
            if(p.actor!=r.actor||p.tick>r.tick||
               (p.tick==r.tick&&p.sequence>=r.sequence))continue;
            if(p.order.kind==Kind::Stop){has=false;queued=0;}
            else if(!p.append){has=true;queued=0;}
            else if(!has)has=true;
            else ++queued;
        }
        if(r.append&&has&&queued>=MAX_QUEUE)return Code::QueueFull;
        return Code::Accepted;
    }
public:
    Controller():width_(WIDTH),height_(HEIGHT),cells_(CELLS),
                 terrain_(CELLS,0),costs_(CELLS,1),units_(COUNT),tick_(0){}
    void reset(const std::array<bool,CELLS>& terrain,
               const std::array<courier::Point,COUNT>& positions){
        width_=WIDTH;height_=HEIGHT;cells_=CELLS;
        terrain_.assign(terrain.begin(),terrain.end());
        costs_.assign(CELLS,1);
        units_.assign(COUNT,Unit());
        pending_.clear();feedback_.clear();activations_.clear();tick_=0;budget_=Budget();
        for(int i=0;i<COUNT;i++)units_[i].position=positions[i];
    }
    // R18 runtime shape: any bounded map and 1..256 stable actor slots.
    // Input validation is atomic; legacy four-unit reset above remains intact.
    bool resetDynamic(int width,int height,const std::vector<uint8_t>& terrain,
                      const std::vector<courier::Point>& positions){
        if(width<8||height<8||width>128||height>128||width*height>4096||
           terrain.size()!=static_cast<size_t>(width*height)||
           positions.empty()||positions.size()>256)return false;
        for(uint8_t tile:terrain)if(tile>1)return false;
        for(size_t i=0;i<positions.size();i++){
            const courier::Point p=positions[i];
            if(p.x<0||p.y<0||p.x>=width||p.y>=height||terrain[p.y*width+p.x])return false;
            for(size_t j=0;j<i;j++)if(positions[j]==p)return false;
        }
        width_=width;height_=height;cells_=width*height;
        terrain_=terrain;units_.assign(positions.size(),Unit());
        costs_.assign(cells_,1);
        for(size_t i=0;i<positions.size();i++)units_[i].position=positions[i];
        pending_.clear();feedback_.clear();activations_.clear();tick_=0;budget_=Budget();return true;
    }
    size_t count() const {return units_.size();}
    int width() const {return width_;}
    int height() const {return height_;}
    bool addUnit(courier::Point position){
        if(units_.size()>=256||!clear(position)||occupied(position,-1))return false;
        Unit unit;unit.position=position;units_.push_back(unit);return true;
    }
    const Unit& unit(int index) const {return units_[index];}
    const Budget& budget() const {return budget_;}
    uint64_t tick() const {return tick_;}
    bool passable(courier::Point p) const {return clear(p);}
    Code preview(const Request& request) const {return admit(request);}
    void updateTerrain(const std::array<bool,CELLS>& terrain){
        terrain_.assign(terrain.begin(),terrain.end());
    }
    bool updateTerrainDynamic(const std::vector<uint8_t>& terrain){
        if(terrain.size()!=terrain_.size())return false;
        for(uint8_t value:terrain)if(value>1)return false;
        terrain_=terrain;return true;
    }
    bool setMovementCosts(const std::vector<uint8_t>& costs){
        if(costs.size()!=terrain_.size())return false;
        for(size_t i=0;i<costs.size();i++)
            if(terrain_[i]?(costs[i]!=0):(costs[i]<1||costs[i]>3))return false;
        costs_=costs;return true;
    }
    std::vector<Feedback> takeFeedback(){std::vector<Feedback> out;out.swap(feedback_);return out;}
    std::vector<Activation> takeActivations(){std::vector<Activation> out;out.swap(activations_);return out;}
    Code enqueue(const Request& r){
        const Code code=admit(r);
        if(code==Code::Accepted)pending_.push_back(r);
        else feedback_.push_back({r.sequence,r.actor,code});
        return code;
    }
    void update(int actor,courier::Point position,bool alive){
        Unit& u=units_[actor];
        if(!alive){u.alive=false;clearOrder(u,Status::Dead);return;}
        if(!u.alive)return; // dead units never resurrect outside reset
        u.position=position;
        if(u.inFlight&&u.waypoint==position){
            u.inFlight=false;u.stalled=0;u.blocked=0;
            if(!u.path.empty()&&u.path.front()==position)u.path.erase(u.path.begin());
        }
    }
    // Target death must also invalidate queued follow/attack commands; the
    // world must never revive them from its previous order snapshot.
    void cancelDependent(int target){
        for(size_t i=0;i<units_.size();i++){
            Unit& u=units_[i];
            if(u.hasOrder&&(u.current.kind==Kind::Guard||u.current.kind==Kind::Attack)&&
               u.current.guard==target)clearOrder(u);
            u.queued.erase(std::remove_if(u.queued.begin(),u.queued.end(),
                [target](const Queued& q){return (q.order.kind==Kind::Guard||
                    q.order.kind==Kind::Attack)&&q.order.guard==target;}),u.queued.end());
        }
    }
    void cancelActor(int actor){
        if(actor>=0&&static_cast<size_t>(actor)<units_.size())clearOrder(units_[actor]);
    }
    std::vector<Move> step(uint64_t tick){
        tick_=tick;budget_=Budget();
        std::stable_sort(pending_.begin(),pending_.end(),[](const Request& a,const Request& b){
            if(a.tick!=b.tick)return a.tick<b.tick;
            if(a.sequence!=b.sequence)return a.sequence<b.sequence;
            return a.actor<b.actor;
        });
        size_t done=0;
        while(done<pending_.size()&&pending_[done].tick<=tick){
            const Request r=pending_[done++];
            const Code code=admit(r,false); // state now includes earlier activated orders
            feedback_.push_back({r.sequence,r.actor,code});
            if(code!=Code::Accepted)continue;
            Unit& u=units_[r.actor];
            if(r.order.kind==Kind::Stop){clearOrder(u);activations_.push_back({r.sequence,r.actor,Kind::Stop});continue;}
            if(!r.append){u.queued.clear();activate(r.actor,r.order,r.sequence);}
            else if(!u.hasOrder)activate(r.actor,r.order,r.sequence);
            else u.queued.push_back({r.order,r.sequence});
        }
        pending_.erase(pending_.begin(),pending_.begin()+done);
        std::vector<Move> moves;
        // Rotate path-search priority so a crowded early actor cannot
        // consume both searches on every tick and starve the rest.
        const size_t first=tick==0?0:static_cast<size_t>((tick-1)%units_.size());
        for(size_t offset=0;offset<units_.size();offset++){
            const size_t i=(first+offset)%units_.size();
            Unit& u=units_[i];
            if(!u.alive||!u.hasOrder)continue;
            if(u.current.kind==Kind::Hold)continue;
            if(u.current.kind==Kind::Attack){
                if(!units_[u.current.guard].alive)complete(i);
                continue;
            }
            courier::Point goal=u.current.target;
            if(u.current.kind==Kind::Guard){
                const Unit& target=units_[u.current.guard];
                if(!target.alive){complete(i);continue;}
                goal=target.position;
                if(courier::distance(u.position,goal)<=2){
                    u.status=Status::Guarding;u.path.clear();continue;
                }
                // Guard a friendly without trying to occupy its cell.
                const courier::Point dirs[]={{1,0},{0,1},{-1,0},{0,-1}};
                bool found=false;
                for(courier::Point d:dirs){
                    const courier::Point n{goal.x+d.x,goal.y+d.y};
                    if(clear(n)&&!occupied(n,i)){goal=n;found=true;break;}
                }
                if(!found){u.status=Status::Waiting;continue;}
            }
            if(u.current.kind==Kind::Patrol&&u.position==goal&&!u.inFlight){
                const courier::Point prior=u.current.target;
                u.current.target=u.patrolStart;u.patrolStart=prior;
                goal=u.current.target;u.path.clear();
            }
            if(u.position==goal&&!u.inFlight){
                if(u.current.kind==Kind::Move||u.current.kind==Kind::AttackMove)complete(i);
                continue;
            }
            if(!clear(goal)){
                clearOrder(u,Status::Unreachable);
                feedback_.push_back({0,static_cast<int>(i),Code::Blocked});continue;
            }
            if(u.inFlight){
                if(++u.stalled<=STALLED_TICKS)continue;
                u.inFlight=false;u.path.clear();u.stalled=0;
                u.blocked+=STALLED_TICKS;
                if(u.blocked>=BLOCKED_TICKS){
                    clearOrder(u,Status::Unreachable);
                    feedback_.push_back({0,static_cast<int>(i),Code::Unreachable});continue;
                }
            }
            if(!u.path.empty()&&(!clear(u.path.front())||
                occupied(u.path.front(),i)))u.path.clear();
            bool searched=false;
            if(u.path.empty()&&budget_.searches<MAX_SEARCHES_PER_TICK){
                u.path=search(i,goal,true);
                searched=true;
            }
            if(u.path.empty()){
                u.status=Status::Waiting;
                // Exhausting the global search budget is not evidence that
                // this unit's destination is unreachable. Count only actual
                // failed replans toward its timeout.
                if(searched&&++u.blocked>=BLOCKED_TICKS){
                    clearOrder(u,Status::Unreachable);
                    feedback_.push_back({0,static_cast<int>(i),Code::Unreachable});
                }
                continue;
            }
            const courier::Point next=u.path.front();
            if(occupied(next,i)){u.status=Status::Waiting;continue;}
            u.waypoint=next;u.inFlight=true;u.stalled=0;u.status=
                u.current.kind==Kind::Patrol?Status::Patrolling:
                u.current.kind==Kind::Guard?Status::Guarding:Status::Moving;
            moves.push_back({static_cast<int>(i),next});++budget_.issued;
        }
        return moves;
    }
};
}

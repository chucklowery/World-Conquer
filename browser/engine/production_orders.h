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
enum class Kind { Move,AttackMove,Stop,Hold,Guard,Patrol };
enum class Status { Idle,Moving,Waiting,Holding,Guarding,Patrolling,Unreachable,Dead };
enum class Code { Accepted,BadActor,Dead,BadTarget,Blocked,Unreachable,QueueFull };
inline const char* name(Kind k) {
    switch(k){case Kind::Move:return "move";case Kind::AttackMove:return "attack_move";
        case Kind::Stop:return "stop";case Kind::Hold:return "hold";
        case Kind::Guard:return "guard";case Kind::Patrol:return "patrol";}
    return "unknown";
}
inline const char* name(Status s) {
    switch(s){case Status::Idle:return "idle";case Status::Moving:return "moving";
        case Status::Waiting:return "waiting";case Status::Holding:return "holding";
        case Status::Guarding:return "guarding";case Status::Patrolling:return "patrolling";
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
    int guard; // index of a live friendly unit; -1 for all other orders
};
struct Request { uint64_t tick,sequence;int actor;Order order;bool append; };
struct Feedback { uint64_t sequence;int actor;Code code; };
struct Unit {
    courier::Point position;
    bool alive,hasOrder,inFlight;
    courier::Point waypoint,patrolStart;
    Order current;
    Status status;
    std::vector<Order> queued;
    std::vector<courier::Point> path;
    int stalled,blocked;
    Unit():position{0,0},alive(true),hasOrder(false),inFlight(false),
        waypoint{0,0},patrolStart{0,0},current{Kind::Stop,{0,0},-1},
        status(Status::Idle),stalled(0),blocked(0){}
};
struct Budget {
    int searches,expansions,maxOpen,issued;
    Budget():searches(0),expansions(0),maxOpen(0),issued(0){}
};
struct Move {int actor;courier::Point waypoint;};

class Controller {
    std::array<bool,CELLS> terrain_;
    std::array<Unit,COUNT> units_;
    std::vector<Request> pending_;
    std::vector<Feedback> feedback_;
    Budget budget_;
    uint64_t tick_;
    static int cell(courier::Point p){return p.y*WIDTH+p.x;}
    bool inside(courier::Point p) const {
        return p.x>=0&&p.x<WIDTH&&p.y>=0&&p.y<HEIGHT;
    }
    bool clear(courier::Point p) const {return inside(p)&&!terrain_[cell(p)];}
    bool occupied(courier::Point p,int except) const {
        for(int i=0;i<COUNT;i++)if(i!=except&&units_[i].alive&&
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
        std::array<int,CELLS> g,prev,serial;
        std::array<bool,CELLS> closed,open;
        g.fill(CELLS+1);prev.fill(-1);serial.fill(0);
        closed.fill(false);open.fill(false);
        g[source]=0;prev[source]=source;open[source]=true;
        int opened=1,issued=1;
        const courier::Point dirs[]={{1,0},{0,1},{-1,0},{0,-1}};
        while(opened&&budget_.expansions<MAX_SEARCHES_PER_TICK*MAX_EXPANSIONS_PER_SEARCH){
            int best=-1,bf=100000,bh=100000,bs=100000;
            for(int n=0;n<CELLS;n++)if(open[n]){
                const courier::Point p{n%WIDTH,n/WIDTH};
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
                for(int n=dest;n!=source;n=prev[n])result.push_back({n%WIDTH,n/WIDTH});
                std::reverse(result.begin(),result.end());
                return result;
            }
            const courier::Point p{best%WIDTH,best/WIDTH};
            for(courier::Point d:dirs){
                const courier::Point next{p.x+d.x,p.y+d.y};
                if(!clear(next)||(dynamic&&occupied(next,actor)))continue;
                const int n=cell(next);
                if(closed[n]||g[best]+1>=g[n])continue;
                g[n]=g[best]+1;prev[n]=best;
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
        std::array<bool,CELLS> visited;visited.fill(false);
        std::array<int,CELLS> queue;
        int head=0,tail=0;
        queue[tail++]=cell(units_[actor].position);
        visited[cell(units_[actor].position)]=true;
        const courier::Point dirs[]={{1,0},{0,1},{-1,0},{0,-1}};
        while(head<tail){
            const int c=queue[head++];
            if(c==cell(target))return true;
            const courier::Point p{c%WIDTH,c/WIDTH};
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
        u.stalled=u.blocked=0;u.status=status;
    }
    void activate(int actor,const Order& o){
        Unit& u=units_[actor];
        u.current=o;u.hasOrder=true;u.inFlight=false;u.path.clear();
        u.stalled=u.blocked=0;
        if(o.kind==Kind::Patrol)u.patrolStart=u.position;
        u.status=o.kind==Kind::Hold?Status::Holding:
            o.kind==Kind::Guard?Status::Guarding:
            o.kind==Kind::Patrol?Status::Patrolling:Status::Moving;
    }
    void complete(int actor){
        Unit& u=units_[actor];
        u.hasOrder=false;u.inFlight=false;u.path.clear();
        u.stalled=u.blocked=0;
        if(!u.queued.empty()){
            const Order next=u.queued.front();u.queued.erase(u.queued.begin());
            activate(actor,next);
        }else u.status=Status::Idle;
    }
    Code admit(const Request& r) const {
        if(r.actor<0||r.actor>=COUNT)return Code::BadActor;
        const Unit& u=units_[r.actor];
        if(!u.alive)return Code::Dead;
        if(r.order.kind==Kind::Guard){
            if(r.order.guard<0||r.order.guard>=COUNT||r.order.guard==r.actor||
               !units_[r.order.guard].alive)return Code::BadTarget;
        }else if(r.order.kind==Kind::Move||r.order.kind==Kind::AttackMove||
                 r.order.kind==Kind::Patrol){
            if(!inside(r.order.target))return Code::BadTarget;
            if(!clear(r.order.target))return Code::Blocked;
            if(!connected(r.actor,r.order.target))return Code::Unreachable;
        }
        if(r.append&&u.queued.size()>=MAX_QUEUE)return Code::QueueFull;
        return Code::Accepted;
    }
public:
    Controller():tick_(0){terrain_.fill(false);}
    void reset(const std::array<bool,CELLS>& terrain,
               const std::array<courier::Point,COUNT>& positions){
        terrain_=terrain;pending_.clear();feedback_.clear();tick_=0;budget_=Budget();
        for(int i=0;i<COUNT;i++){units_[i]=Unit();units_[i].position=positions[i];}
    }
    const Unit& unit(int index) const {return units_[index];}
    const Budget& budget() const {return budget_;}
    uint64_t tick() const {return tick_;}
    bool passable(courier::Point p) const {return clear(p);}
    void updateTerrain(const std::array<bool,CELLS>& terrain){terrain_=terrain;}
    std::vector<Feedback> takeFeedback(){std::vector<Feedback> out;out.swap(feedback_);return out;}
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
            const Code code=admit(r); // death, terrain and prior orders can change validity
            feedback_.push_back({r.sequence,r.actor,code});
            if(code!=Code::Accepted)continue;
            Unit& u=units_[r.actor];
            if(r.order.kind==Kind::Stop){clearOrder(u);continue;}
            if(!r.append){u.queued.clear();activate(r.actor,r.order);}
            else if(!u.hasOrder)activate(r.actor,r.order);
            else u.queued.push_back(r.order);
        }
        pending_.erase(pending_.begin(),pending_.begin()+done);
        std::vector<Move> moves;
        for(int i=0;i<COUNT;i++){
            Unit& u=units_[i];
            if(!u.alive||!u.hasOrder)continue;
            if(u.current.kind==Kind::Hold)continue;
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
                feedback_.push_back({0,i,Code::Blocked});continue;
            }
            if(u.inFlight){
                if(++u.stalled<=STALLED_TICKS)continue;
                u.inFlight=false;u.path.clear();u.stalled=0;
                u.blocked+=STALLED_TICKS;
                if(u.blocked>=BLOCKED_TICKS){
                    clearOrder(u,Status::Unreachable);
                    feedback_.push_back({0,i,Code::Unreachable});continue;
                }
            }
            if(!u.path.empty()&&(!clear(u.path.front())||
                occupied(u.path.front(),i)))u.path.clear();
            if(u.path.empty()&&budget_.searches<MAX_SEARCHES_PER_TICK)
                u.path=search(i,goal,true);
            if(u.path.empty()){
                u.status=Status::Waiting;
                if(++u.blocked>=BLOCKED_TICKS){
                    clearOrder(u,Status::Unreachable);
                    feedback_.push_back({0,i,Code::Unreachable});
                }
                continue;
            }
            const courier::Point next=u.path.front();
            if(occupied(next,i)){u.status=Status::Waiting;continue;}
            u.waypoint=next;u.inFlight=true;u.stalled=0;u.status=
                u.current.kind==Kind::Patrol?Status::Patrolling:
                u.current.kind==Kind::Guard?Status::Guarding:Status::Moving;
            moves.push_back({i,next});++budget_.issued;
        }
        return moves;
    }
};
}

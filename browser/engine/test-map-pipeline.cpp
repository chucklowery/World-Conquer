#include "courier_world_plan.h"
#include "simulation_contract.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <iterator>

static std::string read(const char* path){
    std::ifstream file(path,std::ios::binary);
    assert(file);
    return std::string(std::istreambuf_iterator<char>(file),std::istreambuf_iterator<char>());
}

static void exercise(const char* path,int width,int height,const std::string& id){
    const std::string source=read(path);
    courier::State state;
    assert(courier::loadMap(state,source));
    assert(state.width==width&&state.height==height&&state.mapId==id);
    assert(state.terrain.size()==static_cast<size_t>(width*height));
    assert(state.resources.size()==2);
    assert(!(state.units[0].p==state.units[1].p));
    for(const courier::Resource& r:state.resources){
        assert(r.amount>0&&courier::inside(state,r.p));
    }
    for(int i=0;i<4;i++)assert(courier::inside(state,state.units[i].p));
    const std::vector<courier::Point> pathToExit=courier::route(state,0,state.exit);
    assert(!pathToExit.empty()&&pathToExit.back()==state.exit);
    int totalCost=0;
    for(courier::Point p:pathToExit){
        assert(courier::inside(state,p));
        totalCost+=courier::movementCost(state.terrain[p.y*width+p.x]);
    }
    assert(totalCost>=static_cast<int>(pathToExit.size()));
    courier::WorldPlan plan={};
    assert(courier::planWorld(state,16,16,128,128,plan));
    assert(plan.cells.size()==state.terrain.size());
    assert(plan.units[0]==(16+state.units[0].p.y)*128+16+state.units[0].p.x);
    assert(!courier::planWorld(state,128-width+1,16,128,128,plan));
    courier::Combat combat;
    rts::Contract snapshot(state,combat);
    assert(snapshot.terrainAt({width-1,height-1})==rts::Terrain::Clear);
    assert(snapshot.terrainAt({width,height-1})==rts::Terrain::Outside);
    const rts::Snapshot start=snapshot.publish();
    assert(start.version==2&&start.width==width&&start.height==height);
    assert(start.tiles.size()==state.terrain.size()&&start.resources.size()==2);
    const std::string encoded=rts::json(start);
    assert(encoded.find("\"id\":\""+id+"\"")!=std::string::npos);
    assert(encoded.find("\"resources\":[{")!=std::string::npos);
    const rts::Command blocked={1,1,rts::PLAYER_HOUSE,1001,rts::CommandKind::Move,
        {width,height},0};
    assert(snapshot.enqueue(blocked).code==rts::ResultCode::BadTarget);
    assert(courier::assignDestination(state,0,state.exit));
    const std::string previous=rts::json(snapshot.view());
    for(const std::string& bad:{source+"\n",source.substr(0,source.size()-3),
         std::string(65537,'X'),std::string("WC-MAP 3\n")+source.substr(9),
         source.substr(0,source.size()-1)+"\r",source+"unit S 1 1\n"}){
        assert(!courier::loadMap(state,bad));
        assert(rts::json(snapshot.view())==previous); // invalid input is atomic
    }
    for(int i=0;i<5;i++)courier::tick(state);
    assert(state.frame==5);
    assert(courier::loadMap(state,source));
    assert(state.frame==0&&!state.hasNav[0]&&state.mapId==id);
}

int main(){
    exercise("game/content/missions/ridge-pass.map",16,10,"ridge-pass");
    exercise("game/content/missions/marsh-border.map",24,14,"marsh-border");
    std::cout<<"PASS: R04 versioned native parser, weighted traversal, MapClass placement plan, "
        "snapshot, invalid-map atomicity and restart\n";
}

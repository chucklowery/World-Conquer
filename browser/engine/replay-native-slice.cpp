#include "native_slice_core.h"
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

int main(int argc,char** argv){
    if(argc!=3)return 2;
    std::ifstream mapFile(argv[1]),input(argv[2]);
    if(!mapFile||!input)return 2;
    std::ostringstream data;data<<mapFile.rdbuf();
    courier::State s;
    if(!courier::loadMap(s,data.str()))return 2;
    std::string line,verb;int a,b;
    while(std::getline(input,line)){
        if(line.empty()||line[0]=='#')continue;
        std::istringstream command(line);
        if(!(command>>verb>>a))return 3;
        if(verb=="tick"){
            if(a<0||a>10000||(command>>verb))return 3;
            for(int i=0;i<a;i++)courier::tick(s);
        }else if(verb=="select"||verb=="move"){
            if(!(command>>b)||(command>>line))return 3;
            if(verb=="select"){
                bool found=false;
                for(int i=0;i<2;i++)if(s.units[i].hp>0&&s.units[i].p==courier::Point{a,b})found=true;
                if(!found)return 4;
            }else if(!courier::inside(s,{a,b}))return 4;
            courier::click(s,{a,b});
        }else return 3;
    }
    std::cout<<s.frame<<' '<<s.selected<<' '<<s.cargo<<' '<<s.phase;
    for(int i=0;i<4;i++)std::cout<<' '<<s.units[i].p.x<<' '<<s.units[i].p.y<<' '<<s.units[i].hp;
    for(int i=0;i<2;i++)std::cout<<' '<<(s.hasNav[i]?1:0);
    std::cout<<'\n';
}

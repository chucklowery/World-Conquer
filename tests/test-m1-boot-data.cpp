// Original M1 CPS uses engine LCW; font checks reflect common/font.cpp's header layout.
#include "lcw.h"
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>
static unsigned u16(const std::vector<uint8_t>& b,size_t n){
    return unsigned(b.at(n))|(unsigned(b.at(n+1))<<8);
}
static unsigned u32(const std::vector<uint8_t>& b,size_t n){
    return u16(b,n)|(u16(b,n+2)<<16);
}
static std::vector<uint8_t> read(const char* file){
    std::ifstream input(file,std::ios::binary);
    return {std::istreambuf_iterator<char>(input),std::istreambuf_iterator<char>()};
}
int main(int argc,char** argv){
    if(argc!=3)return 1;
    const auto font=read(argv[1]);
    if(font.size()<1300||u16(font,0)!=font.size()||font[2]!=0||font[3]!=5)return 2;
    const unsigned offsets=u16(font,6),widths=u16(font,8),heights=u16(font,12);
    if(u16(font,4)!=16||font[17]!=255||font[18]!=7||font[19]!=5)return 3;
    for(unsigned c=0;c<256;c++){
        const unsigned offset=u16(font,offsets+c*2);
        const unsigned rows=u16(font,heights+c*2)>>8;
        const unsigned cols=font.at(widths+c);
        if(cols!=5||rows!=7||offset+rows*((cols+1)/2)>font.size())return 4;
    }
    const auto cps=read(argv[2]);
    if(cps.size()<15||u16(cps,0)!=cps.size()-2||cps[2]!=4||u32(cps,4)!=64000)return 5;
    std::vector<uint8_t> pixels(64000);
    if(LCW_Uncompress(cps.data()+10,pixels.data(),pixels.size())!=64000)return 6;
    for(const auto pixel:pixels)if(pixel!=5)return 7;
    std::puts("PASS: generated font header and engine LCW picture decode");
    return 0;
}

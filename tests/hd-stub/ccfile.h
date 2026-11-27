// Stand-in for common/ccfile.h in tests/test-hd-layer.cpp: no files exist,
// so the HD layer only sees sheets registered with HD::Add_Sheet.
#pragma once
class CCFileClass
{
public:
    CCFileClass(const char*)
    {
    }
    int Is_Available(int = false)
    {
        return 0;
    }
    long Size()
    {
        return 0;
    }
    int Read(void*, int)
    {
        return 0;
    }
};

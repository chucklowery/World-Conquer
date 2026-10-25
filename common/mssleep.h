/** 
* @file
* @brief  Cross platform wrapper to create a sleep function with millisecond precision.
*/

#ifndef MSSLEEP_H
#define MSSLEEP_H

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#elif defined(__MINGW32__) && !defined(__MINGW64_VERSION_MAJOR)
#include <winbase.h>
#elif defined(_WIN32)
#include <synchapi.h>
#else /* Assuming recent posix*/
#ifndef __USE_POSIX199309
#define __USE_POSIX199309 1
#endif
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 199309L
#endif
#include <time.h>
#endif

/**
 * Yield the current thread for at least us microseconds.
 */
static inline void us_sleep(unsigned us)
{
#ifdef __EMSCRIPTEN__
    // nanosleep on a WASM main thread would block rendering and input.
    emscripten_sleep((us + 999) / 1000);
#elif defined(_WIN32)
    Sleep((us + 999) / 1000);
#else
    struct timespec ts;
    ts.tv_sec = us / 1000000;
    ts.tv_nsec = (us % 1000000) * 1000;
    nanosleep(&ts, NULL);
#endif
}

/**
 * Yield the current thread for at least ms milliseconds.
 */
static inline void ms_sleep(unsigned ms)
{
#ifdef __EMSCRIPTEN__
    emscripten_sleep(ms);
#elif defined(_WIN32)
    Sleep(ms);
#else
    struct timespec ts;
    ts.tv_sec = ms / 1000;
    ts.tv_nsec = (ms % 1000) * 1000000;
    nanosleep(&ts, NULL);
#endif
}

#endif /* MSSLEEP_H */

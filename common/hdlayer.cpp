// HD sprite layer: see hdlayer.h.
#ifdef WC_HD
#include "hdlayer.h"
// tests/test-hd-layer.cpp builds without the file layer.
#ifdef WC_HD_TEST_FILES
#include WC_HD_TEST_FILES
#else
#include "ccfile.h"
#endif

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <string>
#include <unordered_map>
#include <vector>

const char* WC_Shape_Name(const void* data); // ccfile.cpp (MIX loader registry)

namespace HD
{

    namespace
    {

        // NAME.HD2 (tools/content/art/hd.js):
        //   0  "WCHD"
        //   4  u16 scale, u16 frame count, u16 base width, u16 base height
        //   12 u32 offset of each frame (0 = empty frame)
        //   frame data: (width*scale) x (height*scale) palette indices, run-length
        //   coded: 0x00 n = n transparent pixels (n 1-255), any other byte = itself.
        struct Sheet
        {
            int scale = 0;
            int w = 0, h = 0; // base (logical) frame size
            std::vector<std::vector<unsigned char>> frames;
        };

        struct Record
        {
            int group;
            const Sheet* sheet;                 // null: draw the logical frame below, scaled
            std::vector<unsigned char> logical; // w x h, when there is no sheet
            int w;
            int frame;
            int x, y;           // frame top-left on the page (logical pixels)
            int cx, cy, cw, ch; // visible part on the page
            const unsigned char* ghostLookup;
            const unsigned char* fade;
            int fadeCount;
            std::vector<unsigned char> before, after; // cw x ch page pixels
        };

        int scale_ = 1;
        unsigned generation = 0; // bumped whenever the records change
        std::vector<Record> records;
        std::vector<Record> pending; // between Begin and End

        unsigned u16(const unsigned char* p)
        {
            return p[0] | (p[1] << 8);
        }
        unsigned u32(const unsigned char* p)
        {
            return p[0] | (p[1] << 8) | (p[2] << 16) | ((unsigned)p[3] << 24);
        }

        std::unordered_map<std::string, Sheet*>& Sheets()
        {
            static std::unordered_map<std::string, Sheet*> sheets;
            return sheets;
        }

        std::string Base_Name(const char* shape_name)
        {
            std::string base(shape_name);
            size_t dot = base.rfind('.');
            if (dot != std::string::npos)
                base.resize(dot);
            return base;
        }

        // Decodes NAME.HD2; returns null (and remembers it) when there is none.
        const Sheet* Find(const char* shape_name)
        {
            auto& sheets = Sheets();
            std::string base = Base_Name(shape_name);
            auto it = sheets.find(base);
            if (it != sheets.end())
                return it->second;
            Sheet* sheet = nullptr;
            std::string name = base + ".HD2";
            CCFileClass file(name.c_str());
            if (file.Is_Available()) {
                std::vector<unsigned char> data(file.Size());
                if (!data.empty() && file.Read(data.data(), (int)data.size()) == (int)data.size() && data.size() >= 12
                    && memcmp(data.data(), "WCHD", 4) == 0) {
                    sheet = new Sheet;
                    sheet->scale = u16(&data[4]);
                    int count = u16(&data[6]);
                    sheet->w = u16(&data[8]);
                    sheet->h = u16(&data[10]);
                    size_t size = (size_t)sheet->w * sheet->scale * sheet->h * sheet->scale;
                    bool ok = sheet->scale == scale_ && data.size() >= 12 + 4 * (size_t)count;
                    for (int f = 0; ok && f < count; f++) {
                        std::vector<unsigned char> px(size, 0);
                        size_t at = u32(&data[12 + 4 * f]), out = 0;
                        while (at && out < size && at < data.size()) {
                            unsigned char b = data[at++];
                            if (b == 0) {
                                if (at >= data.size()) {
                                    ok = false;
                                    break;
                                }
                                out += data[at++];
                            } else
                                px[out++] = b;
                        }
                        sheet->frames.push_back(std::move(px));
                    }
                    if (!ok) {
                        printf("[hd] %s rejected (scale %d, presenting at %d)\n", name.c_str(), sheet->scale, scale_);
                        delete sheet;
                        sheet = nullptr;
                    } else
                        printf(
                            "[hd] %s %d frames %dx%d at %dx\n", name.c_str(), count, sheet->w, sheet->h, sheet->scale);
                    fflush(stdout);
                }
            }
            sheets[base] = sheet;
            return sheet;
        }

        void Snapshot(const Blit& b, const Record& r, std::vector<unsigned char>& out)
        {
            out.resize((size_t)r.cw * r.ch);
            for (int row = 0; row < r.ch; row++) {
                const unsigned char* src = b.window + (size_t)(r.cy - b.windowY + row) * b.pitch + (r.cx - b.windowX);
                memcpy(&out[(size_t)row * r.cw], src, r.cw);
            }
        }

        std::vector<Blit> pendingBlits;

        // One line per sheet and kind, for the browser tests.
        void Report_Once(const char* kind, const Sheet* sheet, const char* name, const Blit& b)
        {
            static std::unordered_map<std::string, bool> reported;
            std::string key = std::string(kind) + name;
            if (reported[key])
                return;
            reported[key] = true;
            printf("%s %s frame %d size %dx%d sheet %dx%d frames %d\n",
                   kind,
                   name,
                   b.frame,
                   b.w,
                   b.h,
                   sheet->w,
                   sheet->h,
                   (int)sheet->frames.size());
            fflush(stdout);
        }

    } // namespace

    void Add_Sheet(const char* shape_name, int scale, int w, int h, const unsigned char* const* frames, int count)
    {
        Sheet* sheet = new Sheet;
        sheet->scale = scale;
        sheet->w = w;
        sheet->h = h;
        for (int f = 0; f < count; f++)
            sheet->frames.emplace_back(frames[f], frames[f] + (size_t)w * scale * h * scale);
        Sheets()[Base_Name(shape_name)] = sheet;
    }

    int Scale()
    {
        return scale_;
    }

    void Set_Scale(int scale)
    {
        scale_ = scale < 1 ? 1 : (scale > 4 ? 4 : scale);
    }

    void Clear(int group)
    {
        size_t n = records.size();
        records.erase(
            std::remove_if(records.begin(), records.end(), [group](const Record& r) { return r.group == group; }),
            records.end());
        if (records.size() != n)
            generation++;
    }

    void Clear_Area(int group, int x, int y, int w, int h)
    {
        size_t n = records.size();
        records.erase(std::remove_if(records.begin(),
                                     records.end(),
                                     [=](const Record& r) {
                                         return r.group == group && r.cx < x + w && x < r.cx + r.cw && r.cy < y + h
                                                && y < r.cy + r.ch;
                                     }),
                      records.end());
        if (records.size() != n)
            generation++;
    }

    int Begin(const Blit& b)
    {
        if (scale_ < 2 || !b.shapefile || !b.window)
            return -1;
        const char* name = WC_Shape_Name(b.shapefile);
        if (!name)
            return -1;
        const Sheet* sheet = Find(name);
        if (!sheet && !(b.ghostLookup && b.pixels))
            return -1;
        if (sheet && (b.frame < 0 || b.frame >= (int)sheet->frames.size() || sheet->w != b.w || sheet->h != b.h)) {
            // A sheet that does not match its SHP: the browser tests fail on it.
            Report_Once("[hd-reject]", sheet, name, b);
            return -1;
        }
        Record r;
        r.group = b.group;
        r.sheet = sheet;
        r.w = b.w;
        if (!sheet)
            r.logical.assign(b.pixels, b.pixels + (size_t)b.w * b.h);
        r.frame = b.frame;
        r.x = b.windowX + b.x;
        r.y = b.windowY + b.y;
        int x0 = r.x > b.windowX ? r.x : b.windowX;
        int y0 = r.y > b.windowY ? r.y : b.windowY;
        int x1 = r.x + b.w < b.windowX + b.windowW ? r.x + b.w : b.windowX + b.windowW;
        int y1 = r.y + b.h < b.windowY + b.windowH ? r.y + b.h : b.windowY + b.windowH;
        if (x1 <= x0 || y1 <= y0) {
            // Drawn wholly outside the window (the audit still logs the draw).
            if (sheet)
                Report_Once("[hd-offscreen]", sheet, name, b);
            return -1;
        }
        r.cx = x0;
        r.cy = y0;
        r.cw = x1 - x0;
        r.ch = y1 - y0;
        r.ghostLookup = b.ghostLookup;
        r.fade = b.fade;
        r.fadeCount = b.fadeCount;
        Snapshot(b, r, r.before);
        pending.push_back(std::move(r));
        pendingBlits.push_back(b);
        return (int)pending.size() - 1;
    }

    void End(int token)
    {
        if (token < 0 || token != (int)pending.size() - 1)
            return;
        Record r = std::move(pending.back());
        Blit b = pendingBlits.back();
        pending.pop_back();
        pendingBlits.pop_back();
        Snapshot(b, r, r.after);
        static std::unordered_map<const Sheet*, bool> reported;
        if (r.sheet && !reported[r.sheet]) {
            reported[r.sheet] = true;
            printf("[hd-draw] %s\n", WC_Shape_Name(b.shapefile));
            fflush(stdout);
        }
        records.push_back(std::move(r));
        generation++;
    }

    bool Compose(const unsigned char* page, int pitch, int w, int h, unsigned char* out, int out_pitch)
    {
        const int s = scale_;
        /*
        ** The engine presents more often than the page changes. When neither
        ** the page nor the records changed, out already holds this frame.
        */
        static std::vector<unsigned char> last;
        static unsigned last_generation = ~0u;
        static const unsigned char* last_out = nullptr;
        bool same = last_generation == generation && last_out == out && last.size() == (size_t)w * h;
        for (int y = 0; same && y < h; y++)
            same = memcmp(&last[(size_t)y * w], page + (size_t)y * pitch, w) == 0;
        if (same)
            return false;
        last.resize((size_t)w * h);
        for (int y = 0; y < h; y++)
            memcpy(&last[(size_t)y * w], page + (size_t)y * pitch, w);
        last_generation = generation;
        last_out = out;

        for (int y = 0; y < h; y++) {
            const unsigned char* src = page + (size_t)y * pitch;
            unsigned char* dst = out + (size_t)(y * s) * out_pitch;
            if (s == 2) {
                for (int x = 0; x < w; x++) {
                    dst[2 * x] = src[x];
                    dst[2 * x + 1] = src[x];
                }
            } else {
                for (int x = 0; x < w; x++)
                    memset(dst + x * s, src[x], s);
            }
            for (int sy = 1; sy < s; sy++)
                memcpy(out + (size_t)(y * s + sy) * out_pitch, dst, (size_t)w * s);
        }
        /*
        ** Which recorded pixels are still on screen. Walking the records from
        ** the last drawn down, "expected" holds what the page showed just
        ** before the records above were drawn: a record owns a pixel if its
        ** "after" is that value, and then hands its own "before" further down.
        ** A pixel something unrecorded drew over ends the chain there.
        */
        const short BROKEN = -1;
        static std::vector<short> expected;
        static std::vector<unsigned char> owns; // all records' masks, back to back
        static std::vector<size_t> at;          // each record's mask offset
        static std::vector<char> drawn;
        static std::vector<unsigned> based; // stamp: pixel already has its base
        static unsigned stamp = 0;
        expected.resize((size_t)w * h);
        for (int y = 0; y < h; y++) {
            const unsigned char* src = page + (size_t)y * pitch;
            short* e = &expected[(size_t)y * w];
            for (int x = 0; x < w; x++)
                e[x] = src[x];
        }
        size_t total = 0;
        at.resize(records.size());
        for (size_t i = 0; i < records.size(); i++) {
            at[i] = total;
            total += (size_t)records[i].cw * records[i].ch;
        }
        owns.resize(total);
        drawn.assign(records.size(), 0);
        for (size_t i = records.size(); i-- > 0;) {
            const Record& r = records[i];
            unsigned char* mask = owns.data() + at[i];
            int painted = 0, kept = 0;
            for (int row = 0; row < r.ch; row++) {
                const int py = r.cy + row;
                unsigned char* m = mask + (size_t)row * r.cw;
                if (py < 0 || py >= h) {
                    memset(m, 0, r.cw);
                    continue;
                }
                const unsigned char* af = &r.after[(size_t)row * r.cw];
                const unsigned char* bf = &r.before[(size_t)row * r.cw];
                short* e = &expected[(size_t)py * w];
                // Columns off the page own nothing.
                const int c0 = r.cx < 0 ? -r.cx : 0;
                const int c1 = r.cx + r.cw > w ? w - r.cx : r.cw;
                if (c0 > 0)
                    memset(m, 0, c0);
                if (c1 < r.cw)
                    memset(m + (c1 > 0 ? c1 : 0), 0, r.cw - (c1 > 0 ? c1 : 0));
                for (int col = c0; col < c1; col++) {
                    const int px = r.cx + col;
                    const bool valid = e[px] == af[col];
                    m[col] = valid;
                    const bool paints = af[col] != bf[col];
                    painted += paints;
                    kept += paints & valid;
                    e[px] = valid ? bf[col] : BROKEN;
                }
            }
            /*
            ** A sprite whose own pixels are mostly gone (the screen changed
            ** without a redraw: score screen, menus) is not repainted, so
            ** pixels that merely happen to match stay as they are, and the
            ** chain ends where it painted.
            */
            if (kept * 2 >= painted) {
                drawn[i] = 1;
                continue;
            }
            for (int row = 0; row < r.ch; row++) {
                const int py = r.cy + row;
                if (py < 0 || py >= h)
                    continue;
                for (int col = 0; col < r.cw; col++) {
                    const int px = r.cx + col;
                    size_t k = (size_t)row * r.cw + col;
                    if (px >= 0 && px < w && mask[k] && r.after[k] != r.before[k])
                        expected[(size_t)py * w + px] = BROKEN;
                }
            }
        }
        /*
        ** Then the sprites in draw order, from their HD frames. The first
        ** sprite to own a pixel lays down what was under it.
        */
        based.resize((size_t)w * h, 0);
        if (++stamp == 0) {
            std::fill(based.begin(), based.end(), 0);
            stamp = 1;
        }
        for (size_t i = 0; i < records.size(); i++) {
            if (!drawn[i])
                continue;
            const Record& r = records[i];
            const unsigned char* mask = owns.data() + at[i];
            const unsigned char* hd = r.sheet ? r.sheet->frames[r.frame].data() : nullptr;
            const int hw = r.w * s;
            const bool plain = !r.ghostLookup && !r.fade;
            for (int row = 0; row < r.ch; row++) {
                const int py = r.cy + row;
                const unsigned char* m = mask + (size_t)row * r.cw;
                for (int col = 0; col < r.cw; col++) {
                    if (!m[col])
                        continue;
                    const int px = r.cx + col;
                    const size_t p = (size_t)py * w + px;
                    unsigned char* d0 = out + (size_t)(py * s) * out_pitch + px * s;
                    if (based[p] != stamp) {
                        based[p] = stamp;
                        const unsigned char under = r.before[(size_t)row * r.cw + col];
                        for (int sy = 0; sy < s; sy++)
                            for (int sx = 0; sx < s; sx++)
                                d0[(size_t)sy * out_pitch + sx] = under;
                    }
                    if (hd && plain && s == 2) {
                        // The common case: an opaque-or-transparent 2x2 block.
                        const unsigned char* l0 = hd + (size_t)((py - r.y) * 2) * hw + (px - r.x) * 2;
                        const unsigned char* l1 = l0 + hw;
                        unsigned char* d1 = d0 + out_pitch;
                        if (l0[0])
                            d0[0] = l0[0];
                        if (l0[1])
                            d0[1] = l0[1];
                        if (l1[0])
                            d1[0] = l1[0];
                        if (l1[1])
                            d1[1] = l1[1];
                        continue;
                    }
                    for (int sy = 0; sy < s; sy++) {
                        unsigned char* dst = out + (size_t)(py * s + sy) * out_pitch + px * s;
                        const unsigned char* line =
                            hd ? hd + (size_t)((py - r.y) * s + sy) * hw + (px - r.x) * s : nullptr;
                        for (int sx = 0; sx < s; sx++) {
                            unsigned char v = hd ? line[sx] : r.logical[(size_t)(py - r.y) * r.w + (px - r.x)];
                            // HD-transparent: whatever is under the sprite shows.
                            if (v == 0)
                                continue;
                            if (!plain) {
                                // Shadows darken what is under them, in HD.
                                if (r.ghostLookup && r.ghostLookup[v] != 0xFF)
                                    v = r.ghostLookup[256 + dst[sx] + r.ghostLookup[v] * 256];
                                for (int f = 0; r.fade && f < r.fadeCount; f++)
                                    v = r.fade[v];
                            }
                            dst[sx] = v;
                        }
                    }
                }
            }
        }
        return true;
    }

} // namespace HD
#endif

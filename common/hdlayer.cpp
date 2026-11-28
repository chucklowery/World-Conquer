// HD sprite layer: see hdlayer.h.
#ifdef WC_HD
#include "hdlayer.h"
// tests/test-hd-layer.cpp builds without the file layer.
#ifdef WC_HD_TEST_FILES
#include WC_HD_TEST_FILES
#else
#include "ccfile.h"
#endif

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
            const Sheet* sheet;
            int frame;
            int x, y;           // frame top-left on the page (logical pixels)
            int cx, cy, cw, ch; // visible part on the page
            const unsigned char* ghostLookup;
            const unsigned char* fade;
            int fadeCount;
            std::vector<unsigned char> before, after; // cw x ch page pixels
        };

        int scale_ = 1;
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

    void Clear()
    {
        records.clear();
    }

    int Begin(const Blit& b)
    {
        if (scale_ < 2 || !b.shapefile || !b.window)
            return -1;
        const char* name = WC_Shape_Name(b.shapefile);
        if (!name)
            return -1;
        const Sheet* sheet = Find(name);
        if (!sheet)
            return -1;
        if (b.frame < 0 || b.frame >= (int)sheet->frames.size() || sheet->w != b.w || sheet->h != b.h) {
            // A sheet that does not match its SHP: the browser tests fail on it.
            Report_Once("[hd-reject]", sheet, name, b);
            return -1;
        }
        Record r;
        r.sheet = sheet;
        r.frame = b.frame;
        r.x = b.windowX + b.x;
        r.y = b.windowY + b.y;
        int x0 = r.x > b.windowX ? r.x : b.windowX;
        int y0 = r.y > b.windowY ? r.y : b.windowY;
        int x1 = r.x + b.w < b.windowX + b.windowW ? r.x + b.w : b.windowX + b.windowW;
        int y1 = r.y + b.h < b.windowY + b.windowH ? r.y + b.h : b.windowY + b.windowH;
        if (x1 <= x0 || y1 <= y0) {
            // Drawn wholly outside the window (the audit still logs the draw).
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
        if (!reported[r.sheet]) {
            reported[r.sheet] = true;
            printf("[hd-draw] %s\n", WC_Shape_Name(b.shapefile));
            fflush(stdout);
        }
        records.push_back(std::move(r));
    }

    void Compose(const unsigned char* page, int pitch, int w, int h, unsigned char* out, int out_pitch)
    {
        const int s = scale_;
        for (int y = 0; y < h; y++) {
            const unsigned char* src = page + (size_t)y * pitch;
            for (int sy = 0; sy < s; sy++) {
                unsigned char* dst = out + (size_t)(y * s + sy) * out_pitch;
                for (int x = 0; x < w; x++)
                    for (int sx = 0; sx < s; sx++)
                        *dst++ = src[x];
            }
        }
        for (const Record& r : records) {
            /*
            ** A sprite whose own pixels are mostly gone from the page (the
            ** screen changed without a tactical redraw: score screen, menus)
            ** is not repainted, so pixels that merely happen to match stay
            ** as they are.
            */
            int painted = 0, kept = 0;
            for (int row = 0; row < r.ch; row++) {
                const unsigned char* line = page + (size_t)(r.cy + row) * pitch + r.cx;
                for (int col = 0; col < r.cw; col++) {
                    size_t k = (size_t)row * r.cw + col;
                    if (r.after[k] != r.before[k]) {
                        painted++;
                        kept += line[col] == r.after[k];
                    }
                }
            }
            if (kept * 2 < painted)
                continue;
            const Sheet& sheet = *r.sheet;
            const unsigned char* hd = sheet.frames[r.frame].data();
            const int hw = sheet.w * s;
            for (int row = 0; row < r.ch; row++) {
                int py = r.cy + row;
                if (py < 0 || py >= h)
                    continue;
                for (int col = 0; col < r.cw; col++) {
                    int px = r.cx + col;
                    if (px < 0 || px >= w)
                        continue;
                    size_t k = (size_t)row * r.cw + col;
                    // Only where the page still shows what this blit left.
                    if (page[(size_t)py * pitch + px] != r.after[k])
                        continue;
                    const unsigned char under = r.before[k];
                    const bool painted = r.after[k] != under;
                    for (int sy = 0; sy < s; sy++) {
                        const unsigned char* line = hd + (size_t)((py - r.y) * s + sy) * hw + (px - r.x) * s;
                        unsigned char* dst = out + (size_t)(py * s + sy) * out_pitch + px * s;
                        for (int sx = 0; sx < s; sx++) {
                            unsigned char v = line[sx];
                            if (v == 0) {
                                // The logical frame covered this pixel and the HD one
                                // does not: show what was under the sprite.
                                if (painted)
                                    dst[sx] = under;
                                continue;
                            }
                            if (r.ghostLookup && r.ghostLookup[v] != 0xFF)
                                v = r.ghostLookup[256 + under + r.ghostLookup[v] * 256];
                            for (int f = 0; r.fade && f < r.fadeCount; f++)
                                v = r.fade[v];
                            dst[sx] = v;
                        }
                    }
                }
            }
        }
    }

} // namespace HD
#endif

"""MAMA — My Amazing Market Area — дневна обработка на отворените данни на КЗП „Колко струва“.

Сваля https://kolkostruva.bg/opendata_files/ГГГГ-ММ-ДД.zip (по един CSV на верига)
и записва компактни JSON файлове, които приложението чете:

  v1/meta.json          дата, вериги, категории, групи, градове
  v1/city/<ЕКАТТЕ>.json  най-ниската цена на всеки продукт по вериги в града
  v1/national.json      медианни цени по вериги и категории (за индекса)
  v1/hist.json          история на медианите по вериги и категории (до 120 дни)
  v1/news.json          новини за цени и пазаруване (Google News RSS)

Само стандартната библиотека на Python 3.11+.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import statistics
import sys
import time
import zipfile
import zlib
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
BASE_URL = "https://kolkostruva.bg/opendata_files"
UA = ("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36")
HIST_DAYS = 120
BACKFILL_DAYS = 14

CATEGORIES = {
    1: "Хляб бял", 2: "Хляб „Добруджа“", 3: "Хляб ръжен и пълнозърнест", 4: "Хляб типов",
    5: "Кори за баница", 6: "Прясно мляко", 7: "Кисело мляко", 8: "Сирене краве насипно",
    9: "Сирене краве пакетирано", 10: "Кашкавал насипен", 11: "Кашкавал пакетиран",
    12: "Краве масло", 13: "Извара насипна", 14: "Извара пакетирана", 15: "Пиле цяло",
    16: "Пилешко филе", 17: "Пилешки бут", 18: "Свинска плешка", 19: "Свински бут",
    20: "Свинско филе", 21: "Свински врат", 22: "Свинско за готвене", 23: "Телешки шол",
    24: "Телешко за готвене", 25: "Кайма", 26: "Кренвирши и наденици",
    27: "Колбаси варени и шунка", 28: "Колбаси сурово-сушени", 29: "Скумрия",
    30: "Риба", 31: "Яйца M", 32: "Яйца L", 33: "Боб", 34: "Леща", 35: "Ориз",
    36: "Макаронени изделия", 37: "Спагети", 38: "Захар", 39: "Сол", 40: "Брашно тип 500",
    41: "Брашно други", 42: "Олио слънчогледово", 43: "Маслиново масло", 44: "Оцет винен",
    45: "Оцет ябълков", 46: "Боб консерва", 47: "Грах консерва", 48: "Домати консерва",
    49: "Лютеница", 50: "Лимони", 51: "Портокали", 52: "Банани", 53: "Ябълки", 54: "Домати",
    55: "Лук", 56: "Моркови", 57: "Зеле", 58: "Краставици", 59: "Чесън", 60: "Гъби",
    61: "Картофи", 62: "Маслини", 63: "Бебешка каша", 64: "Бебешко пюре",
    65: "Адаптирано мляко", 66: "Бисквити", 67: "Кроасани", 68: "Баници", 69: "Шоколад",
    70: "Кафе мляно", 71: "Кафе на зърна", 72: "Чай", 73: "Минерална вода", 74: "Бира",
    75: "Вино бяло", 76: "Вино червено", 77: "Ракия", 78: "Цигари", 79: "Препарат за съдове",
    80: "Четки за зъби", 81: "Паста за зъби", 82: "Шампоан", 83: "Сапун", 84: "Мокри кърпи",
    85: "Тоалетна хартия", **{c: "Лекарства" for c in range(86, 102)},
}

GROUPS = [
    ("bread", "Хляб и тестени", [1, 2, 3, 4, 5, 68]),
    ("dairy", "Мляко и млечни", [6, 7, 8, 9, 10, 11, 12, 13, 14]),
    ("meat", "Месо и колбаси", list(range(15, 29))),
    ("fish", "Риба и яйца", [29, 30, 31, 32]),
    ("pantry", "Основни храни", list(range(33, 50)) + [62]),
    ("produce", "Плодове и зеленчуци", list(range(50, 62))),
    ("baby", "Бебешки храни", [63, 64, 65]),
    ("sweets", "Сладко и закуски", [66, 67, 69]),
    ("drinks", "Напитки", list(range(70, 78))),
    ("home", "Дом и хигиена", list(range(79, 86)) + [78]),
    ("pharma", "Аптека", list(range(86, 102))),
]

CHAINS = [  # (регулярен израз върху името на файла, id, име)
    (r"ЛИДЛ|LIDL", "lidl", "Lidl"),
    (r"КАУФЛАНД|KAUFLAND", "kaufland", "Kaufland"),
    (r"БИЛЛА|БИЛА|BILLA", "billa", "Billa"),
    (r"ФАНТАСТИКО|FANTASTICO", "fantastico", "Fantastico"),
    (r"Т[\s-]?МАРКЕТ|T[\s-]?MARKET", "tmarket", "T Market"),
    (r"\bCBA\b|\bЦБА\b", "cba", "CBA"),
    (r"МЕТРО|METRO", "metro", "Metro"),
    (r"ПРО\s?МАРКЕТ|PRO\s?MARKET", "promarket", "ProMarket"),
    (r"EBAG|ЕБАГ", "ebag", "eBag"),
    (r"ЛАЛЕ|LALE", "lale", "Лале"),
    (r"ВЕРИГА\s?ОРЕЛ|ОРЕЛ", "orel", "Орел"),
    (r"КАМЕЛИЯ", "kamelia", "Камелия"),
    (r"СОФАРМА|SOPHARMA", "sopharma", "Софарма"),
    (r"АПТЕКИ\s?ЗДРАВЕ|ЗДРАВЕ", "zdrave", "Аптеки Здраве"),
    (r"ДЕНИЦА|DENITSA", "denitsa", "Деница"),
    (r"РЕМЕДИУМ|REMEDIUM", "remedium", "Ремедиум"),
]

NEWS_QUERIES = [  # (група в приложението, заявка към Google News)
    ("prices", "Цени", "цени храни магазини"),
    ("prices", "Цени", "потребителска кошница цени евро"),
    ("promo", "Промоции", "промоции Kaufland Lidl Billa Fantastico"),
    ("promo", "Промоции", "намаления супермаркети брошура"),
    ("checks", "Проверки и санкции", "КЗП проверки санкции търговски вериги"),
    ("checks", "Проверки и санкции", "БАБХ проверка глоба храни"),
    ("recall", "Изтеглени и опасни храни", "изтеглени от пазара храни БАБХ"),
    ("recall", "Изтеглени и опасни храни", "опасни храни RASFF България"),
    ("platform", "Колко струва", "kolkostruva Колко струва портал"),
]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def r2(v: float) -> float:
    return round(v + 1e-9, 2)


# ─── Сваляне ────────────────────────────────────────────────────────────────

def http_get(url: str, timeout=90) -> bytes:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*", "Accept-Language": "bg"})
    with urlopen(req, timeout=timeout) as r:
        return r.read()


def download(day: date, zips: Path) -> Path | None:
    dest = zips / f"{day.isoformat()}.zip"
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    zips.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            data = http_get(f"{BASE_URL}/{day.isoformat()}.zip")
            zipfile.ZipFile(io.BytesIO(data)).testzip()
        except HTTPError as e:
            if e.code in (403, 404):
                log(f"  {day}: няма архив (HTTP {e.code})")
                return None
            log(f"  {day}: HTTP {e.code}, опит {attempt + 1}")
        except (URLError, TimeoutError, OSError, zipfile.BadZipFile) as e:
            log(f"  {day}: {e}, опит {attempt + 1}")
        else:
            dest.write_bytes(data)
            log(f"  {day}: {len(data) / 1e6:.1f} MB")
            return dest
        time.sleep(4 * (attempt + 1))
    return None


# ─── Четене ─────────────────────────────────────────────────────────────────

def norm(s: str) -> str:
    s = (s or "").upper().replace("Ё", "Е")
    s = re.sub(r"(?<=\d),(?=\d)", ".", s)
    return re.sub(r"\s+", " ", s).strip()


def chain_of(filename: str) -> tuple[str, str]:
    stem = re.sub(r"\.csv$", "", filename.rsplit("/", 1)[-1], flags=re.I)
    stem = re.sub(r"_\d+$", "", stem)
    probe = norm(stem)
    for pat, cid, name in CHAINS:
        if re.search(pat, probe):
            return cid, name
    display = re.split(r"\s*\(", stem, maxsplit=1)[0].strip()
    cid = re.sub(r"[^a-z0-9]+", "-", display.lower()).strip("-") or "x"
    if not re.search(r"[a-z]", cid):  # само кирилица → стабилен ключ
        cid = "c" + str(zlib.crc32(probe.encode("utf-8")))
    return cid, (display.title() if display.isupper() else display)


def member_name(info: zipfile.ZipInfo) -> str:
    if info.flag_bits & 0x800:
        return info.filename
    raw = info.filename.encode("cp437", errors="replace")
    for enc in ("utf-8", "cp1251"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return info.filename


def decode(data: bytes) -> str:
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            t = data.decode("cp1251")
            if re.search(r"[А-Яа-я]{3}", t):
                return t
        except UnicodeDecodeError:
            pass
        return data.decode("utf-8-sig", errors="replace")


def num(v: str | None) -> float | None:
    s = re.sub(r"[^\d.]", "", str(v or "").replace(",", "."))
    if not s or s.count(".") > 1:
        return None
    try:
        f = float(s)
    except ValueError:
        return None
    return f if 0 < f < 100000 else None


COLS = {"ekatte": "населено", "store": "обект", "name": "наименование", "code": "код",
        "cat": "категор", "retail": "дребно", "promo": "промоц"}


def columns(header: list[str]) -> dict[str, int]:
    low = [h.strip().lower() for h in header]
    idx: dict[str, int] = {}
    for key, needle in COLS.items():
        for i, h in enumerate(low):
            if i in idx.values():
                continue
            if needle in h and (key != "name" or "код" not in h):
                idx[key] = i
                break
    return idx


def iter_rows(zpath: Path):
    """Дава (chain_id, chain_name, ekatte, store, name, cat, price, retail, is_promo)."""
    with zipfile.ZipFile(zpath) as z:
        for info in z.infolist():
            fname = member_name(info)
            if info.is_dir() or not fname.lower().endswith(".csv"):
                continue
            cid, cname = chain_of(fname)
            try:
                text = decode(z.read(info))
            except (zipfile.BadZipFile, OSError) as e:
                log(f"  ⚠ {fname}: {e}")
                continue
            first = text.split("\n", 1)[0]
            delim = max([",", ";", "\t"], key=first.count)
            reader = csv.reader(io.StringIO(text), delimiter=delim)
            try:
                header = next(reader)
            except StopIteration:
                continue
            c = columns(header)
            if not {"store", "name", "retail"} <= c.keys():
                log(f"  ⚠ {fname}: непознати колони {header}")
                continue
            for rec in reader:
                g = lambda k: rec[c[k]] if k in c and c[k] < len(rec) else ""
                name = re.sub(r"\s+", " ", g("name")).strip()
                retail, promo = num(g("retail")), num(g("promo"))
                if not name or (retail is None and promo is None):
                    continue
                if promo is not None and retail is not None and promo >= retail:
                    promo = None
                m = re.match(r"\s*(\d+)", g("cat") or "")
                cat = int(m.group(1)) if m else 0
                if cat not in CATEGORIES:
                    continue
                ek = re.sub(r"\D", "", g("ekatte"))
                ek = ek.zfill(5) if ek else ""
                price = promo if promo is not None else retail
                yield cid, cname, ek, g("store").strip(), name, cat, price, retail or price, promo is not None


def clean_store(label: str) -> str:
    """„114 - Габрово/ул. Свищовска 68“ → „Габрово, ул. Свищовска 68“."""
    x = re.sub(r"\s+", " ", label or "").strip()
    x = re.sub(r"^[A-Za-zА-Яа-я]{0,3}\d{1,5}\s*[-–—:.]\s*", "", x)
    x = re.sub(r"\s*[/,]\s*", ", ", x).strip(" ,-")
    if x.isupper() and len(x) > 3:
        x = " ".join(w.capitalize() if len(w) > 2 else w.lower() for w in x.split(" "))
    return x or (label or "").strip()


# ─── Обработка ──────────────────────────────────────────────────────────────

def medians_of(zpath: Path) -> dict[str, dict[str, float]]:
    acc: dict[tuple[str, int], list[float]] = {}
    for cid, _, _, _, _, cat, price, _, _ in iter_rows(zpath):
        acc.setdefault((cid, cat), []).append(price)
    out: dict[str, dict[str, float]] = {}
    for (cid, cat), v in acc.items():
        out.setdefault(cid, {})[str(cat)] = r2(statistics.median(v))
    return out


FRESH_DAYS = 7  # верига без данни днес → последният ѝ ден до 7 дни назад


def iter_fresh(zips: Path, days: list[date]):
    """Редовете на всяка верига от най-новия ден, в който е подала данни."""
    done: set[str] = set()
    used: dict[str, str] = {}
    for d in sorted(days, reverse=True)[:FRESH_DAYS]:
        zp = zips / f"{d.isoformat()}.zip"
        if not zp.exists():
            continue
        seen: set[str] = set()
        for row in iter_rows(zp):
            if row[0] in done:
                continue
            seen.add(row[0])
            used[row[0]] = d.isoformat()
            yield row
        done |= seen
    log("  дни по вериги: " + ", ".join(f"{c}={v}" for c, v in sorted(used.items())))
    iter_fresh.used = used


def build_today(zips: Path, days: list[date], day: date, out: Path, ekatte: dict):
    chains: dict[str, str] = {}
    city_items: dict[str, dict[tuple[str, str], list]] = {}
    city_stores: dict[str, dict[str, set]] = {}
    nat: dict[tuple[str, int], list[float]] = {}
    promos: dict[str, list[int]] = {}
    for cid, cname, ek, store, name, cat, price, retail, is_promo in iter_fresh(zips, days):
        chains[cid] = cname
        nat.setdefault((cid, cat), []).append(price)
        pc = promos.setdefault(cid, [0, 0])
        pc[0] += 1
        pc[1] += int(is_promo)
        if not ek:
            continue
        city_stores.setdefault(ek, {}).setdefault(cid, set()).add(store)
        key = (cid, norm(name))
        items = city_items.setdefault(ek, {})
        cur = items.get(key)
        if cur is None:
            items[key] = [cat, cid, name, price, retail, is_promo, {store}]
        else:
            cur[6].add(store)
            if price < cur[3]:
                cur[3], cur[4], cur[5] = price, retail, is_promo

    cities = []
    for ek, items in city_items.items():
        rows = [[it[0], it[1], it[2], r2(it[3]), r2(it[4]), int(it[5]), len(it[6])]
                for it in items.values()]
        rows.sort(key=lambda r: (r[0], r[3]))
        stores = {c: len(s) for c, s in city_stores[ek].items()}
        store_list = {c: sorted(clean_store(x) for x in s) for c, s in city_stores[ek].items()}
        write_json(out / "v1" / "city" / f"{ek}.json",
                   {"date": day.isoformat(), "ekatte": ek, "stores": stores,
                    "storeList": store_list, "items": rows})
        info = ekatte.get(ek)
        if info:
            label, region, lat, lon = f"{info[1]} {info[0]}", info[2], info[4], info[5]
        else:
            label, region, lat, lon = f"ЕКАТТЕ {ek}", "", None, None
        cities.append([ek, label, region, sum(stores.values()), sorted(stores), lat, lon])
    cities.sort(key=lambda c: (-c[3], c[1]))

    national = {}
    for (cid, cat), v in nat.items():
        national.setdefault(cid, {})[str(cat)] = [r2(statistics.median(v)), r2(min(v)), len(v)]
    write_json(out / "v1" / "national.json", {
        "date": day.isoformat(),
        "medians": national,
        "promo": {c: {"rows": p[0], "promo": p[1]} for c, p in promos.items()},
    })
    write_json(out / "v1" / "meta.json", {
        "date": day.isoformat(),
        "generated": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "chains": chains,
        "chainDates": getattr(iter_fresh, "used", {}),
        "categories": {str(k): v for k, v in CATEGORIES.items()},
        "groups": [{"id": g, "name": n, "cats": c} for g, n, c in GROUPS],
        "cities": cities,
        "source": "КЗП, портал „Колко струва“ — отворени данни (kolkostruva.bg/opendata)",
    })
    log(f"  {len(cities)} населени места, {len(chains)} вериги")


def build_history(prev: Path | None, zips: Path, days_with_data: list[date], out: Path):
    hist = {"dates": [], "s": {}}
    if prev and (prev / "v1" / "hist.json").exists():
        try:
            hist = json.loads((prev / "v1" / "hist.json").read_text(encoding="utf-8"))
        except ValueError:
            pass
    known = set(hist["dates"])
    by_day: dict[str, dict] = {}
    for i, d in enumerate(hist["dates"]):
        snap = {}
        for cid, cats in hist["s"].items():
            for cat, series in cats.items():
                if i < len(series) and series[i] is not None:
                    snap.setdefault(cid, {})[cat] = series[i]
        by_day[d] = snap
    for d in days_with_data:
        if d.isoformat() in known:
            continue
        zp = zips / f"{d.isoformat()}.zip"
        if zp.exists():
            log(f"  история: {d}")
            by_day[d.isoformat()] = medians_of(zp)
    dates = sorted(by_day)[-HIST_DAYS:]
    s: dict[str, dict[str, list]] = {}
    for i, d in enumerate(dates):
        for cid, cats in by_day[d].items():
            for cat, v in cats.items():
                s.setdefault(cid, {}).setdefault(cat, [None] * len(dates))[i] = v
    write_json(out / "v1" / "hist.json", {"dates": dates, "s": s})


def build_news(out: Path, prev: Path | None):
    items, seen = [], set()
    for gid, gname, q in NEWS_QUERIES:
        url = f"https://news.google.com/rss/search?q={quote(q)}&hl=bg&gl=BG&ceid=BG:bg"
        try:
            root = ET.fromstring(http_get(url, timeout=30))
        except Exception as e:  # noqa: BLE001
            log(f"  новини: {e}")
            continue
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            src = (it.findtext("source") or "").strip()
            try:
                ts = parsedate_to_datetime(it.findtext("pubDate") or "").astimezone(timezone.utc)
            except (TypeError, ValueError):
                continue
            if src and title.endswith(" - " + src):
                title = title[: -len(src) - 3]
            k = norm(title)[:80]
            if not title or k in seen:
                continue
            seen.add(k)
            items.append({"t": title, "u": link, "s": src, "d": ts.isoformat(timespec="minutes"),
                          "g": gid, "gn": gname})
    if not items and prev and (prev / "v1" / "news.json").exists():
        (out / "v1").mkdir(parents=True, exist_ok=True)
        (out / "v1" / "news.json").write_bytes((prev / "v1" / "news.json").read_bytes())
        return
    items.sort(key=lambda x: x["d"], reverse=True)
    per: dict[str, int] = {}
    kept = []
    for it in items:
        per[it["g"]] = per.get(it["g"], 0) + 1
        if per[it["g"]] <= 15:
            kept.append(it)
    write_json(out / "v1" / "news.json", {"items": kept})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zips", type=Path, default=Path(".cache/zips"))
    ap.add_argument("--prev", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=Path("site"))
    ap.add_argument("--today", default=None, help="ГГГГ-ММ-ДД (за тестове)")
    ap.add_argument("--no-net", action="store_true", help="без сваляне (тестове)")
    a = ap.parse_args()

    ekatte = json.loads((HERE / "ekatte.json").read_text(encoding="utf-8"))
    today = date.fromisoformat(a.today) if a.today else datetime.now(timezone.utc).date()
    have_hist = a.prev and (a.prev / "v1" / "hist.json").exists()
    span = FRESH_DAYS if have_hist else BACKFILL_DAYS
    days = []
    log("Сваляне на архивите на КЗП…")
    for back in range(span + 1):
        d = today - timedelta(days=back)
        zp = a.zips / f"{d.isoformat()}.zip"
        if zp.exists() or (not a.no_net and download(d, a.zips)):
            days.append(d)
    if not days:
        log("Няма нито един архив — оставям предишните данни.")
        sys.exit(3)
    latest = max(days)
    log(f"Най-нови данни: {latest}")
    build_today(a.zips, days, latest, a.out, ekatte)
    build_history(a.prev, a.zips, sorted(days), a.out)
    if not a.no_net:
        build_news(a.out, a.prev)
    elif a.prev and (a.prev / "v1" / "news.json").exists():
        (a.out / "v1" / "news.json").write_bytes((a.prev / "v1" / "news.json").read_bytes())
    log("Готово.")


if __name__ == "__main__":
    main()

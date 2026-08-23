"""Single source of truth for synthetic cargo categories and their keywords.

Used by the dataset generator (to produce realistic descriptions) and by the
preprocessing module (to map free-text cargo descriptions back to a category for
semantic-fit checks). Kept in one place so generation and inference never drift.
"""

from __future__ import annotations

#: Cargo category -> representative Indonesian keywords found in descriptions.
CATEGORIES: dict[str, list[str]] = {
    "tekstil & garmen": [
        "tekstil", "kain", "benang", "garmen", "pakaian jadi", "seragam",
        "konveksi", "sarung", "kain batik",
    ],
    "elektronik": [
        "elektronik", "komponen elektronik", "peralatan listrik", "kabel",
        "lampu", "televisi", "kulkas", "mesin cuci", "modul sirkuit",
    ],
    "makanan & minuman": [
        "makanan olahan", "snack", "minuman", "beras kemasan", "mie instan",
        "minyak goreng", "gula pasir", "teh", "kopi", "biskuit",
    ],
    "bahan bangunan": [
        "semen", "pasir", "bata ringan", "besi beton", "keramik", "cat",
        "gypsum", "baja ringan", "batu bata",
    ],
    "pertanian & pupuk": [
        "pupuk", "pakan ternak", "hasil pertanian", "gabah", "jagung",
        "singkong", "sayuran", "bibit", "pupuk urea",
    ],
    "plastik & kemasan": [
        "kemasan plastik", "botol plastik", "plastik", "karton", "dus",
        "stretch film", "tutup botol", "polybag",
    ],
    "furnitur": [
        "furnitur", "meja", "kursi", "lemari", "rak", "spring bed", "sofa",
        "set meja makan",
    ],
    "otomotif": [
        "suku cadang", "ban", "sparepart", "oli", "aki", "velg", "kaca mobil",
        "amplas", "busi",
    ],
}

#: Aliases that map a normalized cargo description onto a category.
CATEGORY_ALIASES: dict[str, str] = {kw: cat for cat, kws in CATEGORIES.items() for kw in kws}

#: Representative cargo items per category used to compose free-text descriptions.
DESCRIPTION_ITEMS: dict[str, list[str]] = {
    "tekstil & garmen": [
        "gulungan kain katun",
        "karton pakaian jadi",
        "bal benang",
        "seragam kerja siap kirim",
    ],
    "elektronik": [
        "karton komponen elektronik",
        "set televisi LCD",
        "mesin cuci portable",
        "kabel listrik rol",
    ],
    "makanan & minuman": [
        "karton mie instan",
        "galon minuman kemasan",
        "karung beras kemasan",
        "kotak snack ringan",
    ],
    "bahan bangunan": [
        "sak semen",
        "tumpukan bata ringan",
        "ikatan besi beton",
        "kotak keramik lantai",
    ],
    "pertanian & pupuk": [
        "karung pupuk urea",
        "sak gabah panen",
        "krat hasil pertanian",
        "karung pakan ternak",
    ],
    "plastik & kemasan": [
        "bal kemasan plastik",
        "karton botol plastik",
        "gulungan stretch film",
        "dus karton kosong",
    ],
    "furnitur": [
        "set meja dan kursi",
        "lemari kayu jadi",
        "kasur spring bed",
        "rak besi siap rakit",
    ],
    "otomotif": [
        "karton suku cadang mobil",
        "set ban baru",
        "drum oli mesin",
        "kotak aki kering",
    ],
}

#: Accepted-cargo serialization marker for "all types (flexible)".
FLEXIBLE_MARKER = "Semua jenis"

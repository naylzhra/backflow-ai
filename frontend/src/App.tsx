import { useState, useRef, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
type Page = 'dashboard' | 'cari-muatan' | 'riwayat' | 'laporan'
type Screen = 'input' | 'loading' | 'result'
type ResultState = 'good' | 'low' | 'empty'

interface LocationValue {
  kota: string
  kecamatan: string
  kelurahan: string
}

interface FormData {
  asal: LocationValue
  tujuan: LocationValue
  tanggal: string
  kapasitas: string
  jenisMuatan: string[]
}

interface FormErrors {
  asal?: string
  tujuan?: string
  tanggal?: string
  kapasitas?: string
}

// ── Location Data ──────────────────────────────────────────────────────────
interface KecamatanData { name: string; kelurahan: string[] }
interface KotaData { name: string; provinsi: string; kecamatan: KecamatanData[] }

const KOTA_DATA: KotaData[] = [
  {
    name: 'Jakarta Selatan', provinsi: 'DKI Jakarta',
    kecamatan: [
      { name: 'Kebayoran Baru', kelurahan: ['Senayan', 'Gandaria Utara', 'Cipete Utara', 'Kramat Pela', 'Petogogan'] },
      { name: 'Tebet', kelurahan: ['Tebet Barat', 'Tebet Timur', 'Kebon Baru', 'Bukit Duri', 'Manggarai'] },
      { name: 'Mampang Prapatan', kelurahan: ['Mampang Prapatan', 'Bangka', 'Pela Mampang', 'Tegal Parang', 'Kuningan Barat'] },
      { name: 'Pancoran', kelurahan: ['Pancoran', 'Kalibata', 'Rawajati', 'Duren Tiga', 'Pengadegan'] },
    ],
  },
  {
    name: 'Jakarta Utara', provinsi: 'DKI Jakarta',
    kecamatan: [
      { name: 'Tanjung Priok', kelurahan: ['Tanjung Priok', 'Kebon Bawang', 'Sungai Bambu', 'Papanggo', 'Sunter Agung'] },
      { name: 'Penjaringan', kelurahan: ['Penjaringan', 'Pejagalan', 'Pluit', 'Kamal Muara', 'Kapuk Muara'] },
      { name: 'Cilincing', kelurahan: ['Cilincing', 'Semper Barat', 'Semper Timur', 'Rorotan', 'Kalibaru'] },
      { name: 'Pademangan', kelurahan: ['Pademangan Barat', 'Pademangan Timur', 'Ancol'] },
    ],
  },
  {
    name: 'Jakarta Timur', provinsi: 'DKI Jakarta',
    kecamatan: [
      { name: 'Cakung', kelurahan: ['Cakung Barat', 'Cakung Timur', 'Rawa Terate', 'Penggilingan', 'Pulo Gebang'] },
      { name: 'Pulogadung', kelurahan: ['Pulogadung', 'Pisangan Timur', 'Cipinang', 'Jatinegara Kaum', 'Rawa Bunga'] },
      { name: 'Jatinegara', kelurahan: ['Kampung Melayu', 'Bali Mester', 'Cipinang Besar Selatan', 'Rawa Bunga', 'Bidara Cina'] },
    ],
  },
  {
    name: 'Kota Bekasi', provinsi: 'Jawa Barat',
    kecamatan: [
      { name: 'Bekasi Barat', kelurahan: ['Bintara', 'Bintara Jaya', 'Kranji', 'Kotabaru', 'Jakasampurna'] },
      { name: 'Bekasi Timur', kelurahan: ['Margahayu', 'Bekasi Jaya', 'Aren Jaya', 'Duren Jaya'] },
      { name: 'Rawalumbu', kelurahan: ['Bojong Menteng', 'Pengasinan', 'Sepanjang Jaya', 'Bojong Rawalumbu'] },
      { name: 'Mustika Jaya', kelurahan: ['Mustika Jaya', 'Mustika Sari', 'Pedurenan', 'Cimuning'] },
    ],
  },
  {
    name: 'Kabupaten Bekasi', provinsi: 'Jawa Barat',
    kecamatan: [
      { name: 'Cikarang Barat', kelurahan: ['Cikarang Kota', 'Gandasari', 'Kalijaya', 'Telaga Asih', 'Wanasari'] },
      { name: 'Cikarang Utara', kelurahan: ['Karangraharja', 'Simpangan', 'Waluya', 'Mekarwangi', 'Sukadami'] },
      { name: 'Cikarang Selatan', kelurahan: ['Sukasejati', 'Pasirsari', 'Sukaresmi', 'Serang', 'Ciantra'] },
      { name: 'Tambun Selatan', kelurahan: ['Tambun', 'Mekarsari', 'Sumber Jaya', 'Setia Mekar', 'Jejalen Jaya'] },
    ],
  },
  {
    name: 'Kota Bandung', provinsi: 'Jawa Barat',
    kecamatan: [
      { name: 'Cicendo', kelurahan: ['Husein Sastranegara', 'Pajajaran', 'Arjuna', 'Pasirkaliki', 'Sukaraja'] },
      { name: 'Andir', kelurahan: ['Campaka', 'Garuda', 'Kebonjeruk', 'Maleber', 'Ciroyom'] },
      { name: 'Bandung Kulon', kelurahan: ['Cigondewah Kaler', 'Cigondewah Kidul', 'Cigondewah Rahayu', 'Caringin', 'Gempolsari'] },
      { name: 'Gedebage', kelurahan: ['Rancanumpang', 'Rancabolang', 'Cimincrang', 'Cisaranten Kidul'] },
    ],
  },
  {
    name: 'Kota Surabaya', provinsi: 'Jawa Timur',
    kecamatan: [
      { name: 'Rungkut', kelurahan: ['Rungkut Kidul', 'Rungkut Menanggal', 'Wonorejo', 'Kedung Baruk', 'Penjaringan Sari'] },
      { name: 'Benowo', kelurahan: ['Sememi', 'Kandangan', 'Tambak Osowilangon', 'Romokalisari', 'Pakal'] },
      { name: 'Tandes', kelurahan: ['Tandes', 'Karangpoh', 'Manukan Kulon', 'Manukan Wetan', 'Banjarsugihan'] },
      { name: 'Semampir', kelurahan: ['Ampel', 'Ujung', 'Wonokusumo', 'Sidotopo', 'Pegirian'] },
    ],
  },
  {
    name: 'Kota Semarang', provinsi: 'Jawa Tengah',
    kecamatan: [
      { name: 'Genuk', kelurahan: ['Genuksari', 'Trimulyo', 'Banjardowo', 'Gebangsari', 'Terboyo Kulon'] },
      { name: 'Pedurungan', kelurahan: ['Pedurungan Kidul', 'Pedurungan Lor', 'Pedurungan Tengah', 'Tlogomulyo', 'Plamongan Sari'] },
      { name: 'Semarang Utara', kelurahan: ['Bulu Lor', 'Bandarharjo', 'Tanjung Mas', 'Panggung Kidul', 'Dadapsari'] },
      { name: 'Gayamsari', kelurahan: ['Gayamsari', 'Siwalan', 'Tambakrejo', 'Sambirejo', 'Kaligawe'] },
    ],
  },
  {
    name: 'Kota Medan', provinsi: 'Sumatera Utara',
    kecamatan: [
      { name: 'Medan Belawan', kelurahan: ['Belawan I', 'Belawan II', 'Belawan Bahari', 'Belawan Bahagia', 'Bagan Deli'] },
      { name: 'Medan Deli', kelurahan: ['Tanjung Mulia', 'Tanjung Mulia Hilir', 'Mabar', 'Mabar Hilir', 'Kota Bangun'] },
      { name: 'Medan Baru', kelurahan: ['Petisah Hulu', 'Babura', 'Merdeka', 'Darat'] },
    ],
  },
  {
    name: 'Kota Makassar', provinsi: 'Sulawesi Selatan',
    kecamatan: [
      { name: 'Biringkanaya', kelurahan: ['Bulurokeng', 'Daya', 'Pai', 'Sudiang', 'Sudiang Raya'] },
      { name: 'Tamalanrea', kelurahan: ['Tamalanrea', 'Tamalanrea Indah', 'Tamalanrea Jaya', 'Kapasa', 'Bira'] },
      { name: 'Ujung Tanah', kelurahan: ['Ujung Tanah', 'Pattingalloang', 'Cambayya', 'Camba Berua', 'Totaka'] },
    ],
  },
  {
    name: 'Kota Yogyakarta', provinsi: 'DI Yogyakarta',
    kecamatan: [
      { name: 'Gondokusuman', kelurahan: ['Baciro', 'Demangan', 'Klitren', 'Kotabaru', 'Terban'] },
      { name: 'Kotagede', kelurahan: ['Prenggan', 'Purbayan', 'Rejowinangun'] },
      { name: 'Umbulharjo', kelurahan: ['Giwangan', 'Sorosutan', 'Pandeyan', 'Warungboto', 'Tahunan'] },
    ],
  },
  {
    name: 'Kabupaten Karawang', provinsi: 'Jawa Barat',
    kecamatan: [
      { name: 'Karawang Barat', kelurahan: ['Karawang Kulon', 'Karawang Wetan', 'Adiarsa Barat', 'Tunggakjati', 'Tanjungpura'] },
      { name: 'Cikampek', kelurahan: ['Cikampek Utara', 'Cikampek Barat', 'Cikampek Selatan', 'Cikampek Timur', 'Dawuan Tengah'] },
      { name: 'Telukjambe Barat', kelurahan: ['Margakaya', 'Sukaluyu', 'Wanakerta', 'Mekarmulya', 'Puseurjaya'] },
    ],
  },
  {
    name: 'Kota Denpasar', provinsi: 'Bali',
    kecamatan: [
      { name: 'Denpasar Selatan', kelurahan: ['Sesetan', 'Serangan', 'Pemogan', 'Pedungan', 'Panjer'] },
      { name: 'Denpasar Utara', kelurahan: ['Pemecutan Kaja', 'Tonja', 'Ubung', 'Ubung Kaja', 'Dangin Puri Kaja'] },
    ],
  },
  {
    name: 'Kota Balikpapan', provinsi: 'Kalimantan Timur',
    kecamatan: [
      { name: 'Balikpapan Selatan', kelurahan: ['Sepinggan', 'Sepinggan Baru', 'Sepinggan Raya', 'Manggar', 'Manggar Baru'] },
      { name: 'Balikpapan Utara', kelurahan: ['Gunung Samarinda', 'Muara Rapak', 'Batu Ampar', 'Gunung Samarinda Baru', 'Karang Joang'] },
    ],
  },
  {
    name: 'Kota Cirebon', provinsi: 'Jawa Barat',
    kecamatan: [
      { name: 'Kejaksan', kelurahan: ['Kejaksan', 'Kebonbaru', 'Sukapura', 'Kesenden'] },
      { name: 'Harjamukti', kelurahan: ['Harjamukti', 'Kecapi', 'Larangan', 'Argasunya', 'Kalijaga'] },
    ],
  },
]

const JENIS_MUATAN_OPTIONS = [
  'Tekstil & garmen', 'Elektronik', 'Makanan & minuman', 'Bahan kimia',
  'Furnitur', 'Alat berat', 'Farmasi', 'Hasil pertanian',
  'Material bangunan', 'Spare part otomotif',
]

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper({ active }: { active: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Input Rute' },
    { n: 2, label: 'AI Matching' },
    { n: 3, label: 'Rekomendasi' },
  ]
  return (
    <div className="flex items-center gap-0 select-none">
      {steps.map((s, i) => {
        const done = active > s.n
        const current = active === s.n || (active === 2 && s.n === 2) || (active === 2 && s.n === 3)
        const isActive = active === 1 ? s.n === 1 : s.n >= 2
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  background: done ? '#0C9A8B' : isActive ? '#0C9A8B' : '#DDE3EA',
                  color: isActive || done ? '#fff' : '#94A3B8',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : s.n}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: isActive ? '#0C9A8B' : '#94A3B8',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="mx-3 h-px w-10"
                style={{ background: done ? '#0C9A8B' : '#DDE3EA' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Searchable Dropdown (shared primitive) ────────────────────────────────
function SearchableDropdown({
  value, options, onChange, placeholder, searchPlaceholder, disabled, error, subLabel,
}: {
  value: string
  options: { value: string; label: string; sub?: string }[]
  onChange: (v: string) => void
  placeholder: string
  searchPlaceholder: string
  disabled?: boolean
  error?: boolean
  subLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const selected = options.find(o => o.value === value)

  const handleSelect = (v: string) => { onChange(v); setOpen(false); setQuery('') }
  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); onChange('') }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm text-left transition-all"
        style={{
          borderColor: error ? '#EF4444' : open ? '#0C9A8B' : value ? '#0C9A8B' : disabled ? '#EEF2F7' : '#DDE3EA',
          boxShadow: open ? '0 0 0 3px rgba(12,154,139,0.12)' : 'none',
          background: disabled ? '#F8FAFC' : value ? '#F0FDFB' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {value ? (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold truncate" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {selected?.label ?? value}
              </span>
              {selected?.sub && (
                <span className="text-xs truncate" style={{ color: '#64A89F', fontFamily: 'Inter, sans-serif' }}>
                  {selected.sub}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-teal-100 transition-colors"
              style={{ color: '#0C9A8B' }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: disabled ? '#CBD5E1' : '#64748B' }}
          >
            <path d="M2.5 5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1.5 rounded-xl border overflow-hidden shadow-xl"
          style={{ background: '#fff', borderColor: '#DDE3EA', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
        >
          {/* Search */}
          <div className="p-2.5 border-b" style={{ borderColor: '#F1F5F9' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F4F7FA' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="#94A3B8" strokeWidth="1.3"/>
                <path d="M9 9l2.5 2.5" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          </div>
          {/* Options */}
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-sm text-center" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                Tidak ditemukan
              </p>
            ) : filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onMouseDown={() => handleSelect(o.value)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
                style={{ background: o.value === value ? '#F0FDFB' : 'transparent' }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{o.label}</p>
                  {o.sub && <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{o.sub}</p>}
                </div>
                {o.value === value && (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0">
                    <path d="M2 6.5l3.5 3.5 5.5-7" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cascading Location Selector ────────────────────────────────────────────
function CascadingLocationSelector({
  value, onChange, excludeKota, errorKota,
}: {
  value: LocationValue
  onChange: (v: LocationValue) => void
  excludeKota?: string
  errorKota?: string
}) {
  const [showKelurahan, setShowKelurahan] = useState(!!value.kelurahan)

  const kotaOptions = KOTA_DATA
    .filter(k => k.name !== excludeKota)
    .map(k => ({ value: k.name, label: k.name, sub: k.provinsi }))

  const selectedKota = KOTA_DATA.find(k => k.name === value.kota)

  const kecOptions = (selectedKota?.kecamatan ?? []).map(kc => ({
    value: kc.name, label: kc.name, sub: `Kecamatan · ${value.kota}`,
  }))

  const selectedKec = selectedKota?.kecamatan.find(kc => kc.name === value.kecamatan)

  const kelOptions = (selectedKec?.kelurahan ?? []).map(kel => ({
    value: kel, label: kel, sub: `${value.kecamatan} · ${value.kota}`,
  }))

  const handleKotaChange = (kota: string) => {
    onChange({ kota, kecamatan: '', kelurahan: '' })
    setShowKelurahan(false)
  }

  const handleKecChange = (kecamatan: string) => {
    onChange({ ...value, kecamatan, kelurahan: '' })
  }

  const handleKelChange = (kelurahan: string) => {
    onChange({ ...value, kelurahan })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Kota / Kabupaten */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Kota / Kabupaten
          <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <SearchableDropdown
          value={value.kota}
          options={kotaOptions}
          onChange={handleKotaChange}
          placeholder="Pilih kota atau kabupaten"
          searchPlaceholder="Cari kota atau kabupaten..."
          error={!!errorKota}
        />
        {errorKota && (
          <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5.5 3.5v2.5M5.5 7.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {errorKota}
          </p>
        )}
      </div>

      {/* Kecamatan */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Kecamatan
          <span className="font-normal" style={{ color: '#94A3B8' }}>(opsional)</span>
        </label>
        <SearchableDropdown
          value={value.kecamatan}
          options={kecOptions}
          onChange={handleKecChange}
          placeholder="Pilih kecamatan (opsional)"
          searchPlaceholder="Cari kecamatan..."
          disabled={!value.kota}
        />
      </div>

      {/* Tambahkan detail / Kelurahan */}
      {!showKelurahan ? (
        value.kota ? (
          <button
            type="button"
            onClick={() => setShowKelurahan(true)}
            className="self-start flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: '#0C9A8B', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0A7A6D')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0C9A8B')}
          >
            + Tambahkan detail lokasi
          </button>
        ) : null
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Kelurahan / Desa
              <span className="font-normal" style={{ color: '#94A3B8' }}>(opsional)</span>
            </label>
            <button
              type="button"
              onClick={() => { setShowKelurahan(false); onChange({ ...value, kelurahan: '' }) }}
              className="text-xs transition-colors"
              style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#64748B')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
            >
              Hapus
            </button>
          </div>
          <SearchableDropdown
            value={value.kelurahan}
            options={kelOptions}
            onChange={handleKelChange}
            placeholder="Pilih kelurahan atau desa (opsional)"
            searchPlaceholder="Cari kelurahan..."
            disabled={!value.kecamatan}
          />
        </div>
      )}
    </div>
  )
}


// ── Multi-select Dropdown ──────────────────────────────────────────────────
function MultiSelect({
  value, onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (item: string) => {
    onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item])
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[44px] rounded-lg border transition-all cursor-pointer"
        style={{
          borderColor: focused || open ? '#0C9A8B' : '#DDE3EA',
          boxShadow: open || focused ? '0 0 0 3px rgba(12,154,139,0.12)' : 'none',
          background: '#fff',
        }}
        onClick={() => { setOpen(!open); setFocused(!open) }}
        onBlur={() => setFocused(false)}
        tabIndex={0}
        onFocus={() => setFocused(true)}
      >
        <div className="flex flex-wrap gap-1.5 p-2.5 pr-10">
          {value.length === 0 ? (
            <span className="py-0.5 px-1 text-sm" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              Tekstil &amp; garmen
            </span>
          ) : value.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: '#D1F4EF', color: '#0C7A6D', fontFamily: 'Inter, sans-serif' }}
            >
              {v}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); toggle(v) }}
                className="hover:opacity-70 transition-opacity"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M4 6l4 4 4-4" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border py-1 shadow-lg"
          style={{ background: '#fff', borderColor: '#DDE3EA' }}
        >
          {JENIS_MUATAN_OPTIONS.map(item => {
            const selected = value.includes(item)
            return (
              <button
                key={item}
                type="button"
                onMouseDown={() => toggle(item)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F4F7FA] transition-colors flex items-center justify-between"
                style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
              >
                <span>{item}</span>
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l4 4 6-7" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Field Wrapper ──────────────────────────────────────────────────────────
function Field({
  label, required, helper, error, children,
}: {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1E2A3A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {label}
        {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs flex items-center gap-1" style={{ color: '#EF4444' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 4v2.5M6 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{helper}</p>
      ) : null}
    </div>
  )
}

// ── Progress Ring ──────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#D1F4EF" strokeWidth="7"/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#0C9A8B" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

// ── Route Strip ────────────────────────────────────────────────────────────
function RouteStrip({ posisi, jemput, tujuan }: { posisi: string; jemput: string; tujuan: string }) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-4 rounded-lg" style={{ background: '#F4F7FA' }}>
      {/* Node 1 - Posisi Truk */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#1B2A40' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="7" width="12" height="8" rx="1.5" stroke="#fff" strokeWidth="1.4"/>
            <path d="M13 10l4-1.5V15h-4" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
            <circle cx="5" cy="15" r="1.5" fill="#fff"/>
            <circle cx="14" cy="15" r="1.5" fill="#fff"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-center leading-tight" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', maxWidth: 72 }}>{posisi}</span>
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>Posisi Truk</span>
      </div>

      {/* Line */}
      <div className="flex-1 flex items-center px-3">
        <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)' }}/>
        <div className="mx-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#E8600A' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6M6 3l2 2-2 2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)' }}/>
      </div>

      {/* Node 2 - Titik Jemput */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#D1F4EF' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="5" width="14" height="12" rx="1.5" stroke="#0C9A8B" strokeWidth="1.4"/>
            <path d="M7 5V4a3 3 0 016 0v1" stroke="#0C9A8B" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M7 11h6M10 9v4" stroke="#0C9A8B" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-center leading-tight" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif', maxWidth: 72 }}>{jemput}</span>
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>Titik Jemput</span>
      </div>

      {/* Line */}
      <div className="flex-1 flex items-center px-3">
        <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)' }}/>
        <div className="mx-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#E8600A' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6M6 3l2 2-2 2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)' }}/>
      </div>

      {/* Node 3 - Tujuan */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#1B2A40' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5C7.24 2.5 5 4.74 5 7.5c0 4.38 5 10 5 10s5-5.62 5-10c0-2.76-2.24-5-5-5zm0 6.75a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" fill="#fff"/>
          </svg>
        </div>
        <span className="text-xs font-semibold text-center leading-tight" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', maxWidth: 72 }}>{tujuan}</span>
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>Tujuan Akhir</span>
      </div>
    </div>
  )
}

// ── Screen 1: Input Rute ───────────────────────────────────────────────────
function ScreenInput({
  onSubmit,
}: {
  onSubmit: (data: FormData) => void
}) {
  const emptyLoc = (): LocationValue => ({ kota: '', kecamatan: '', kelurahan: '' })
  const [form, setForm] = useState<FormData>({
    asal: emptyLoc(), tujuan: emptyLoc(), tanggal: '', kapasitas: '', jenisMuatan: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [dateFocused, setDateFocused] = useState(false)
  const [kapFocused, setKapFocused] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const validate = () => {
    const e: FormErrors = {}
    if (!form.asal.kota) e.asal = 'Kota / kabupaten asal wajib dipilih'
    if (!form.tujuan.kota) e.tujuan = 'Kota / kabupaten tujuan wajib dipilih'
    else if (form.asal.kota && form.tujuan.kota === form.asal.kota) e.tujuan = 'Tujuan harus berbeda dari lokasi asal'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    else if (form.tanggal < today) e.tanggal = 'Tanggal tidak boleh di masa lalu'
    if (!form.kapasitas) e.kapasitas = 'Kapasitas wajib diisi'
    else if (parseFloat(form.kapasitas) <= 0) e.kapasitas = 'Harus lebih besar dari 0'
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(form)
  }

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}>
          Cari Muatan Balik
        </h1>
        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          Isi detail perjalanan truk untuk menemukan order internal yang sesuai rute.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div
          className="rounded-lg p-8 flex flex-col gap-6"
          style={{ background: '#fff' }}
        >
          {/* Lokasi Truk Saat Ini */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1E2A3A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Lokasi Truk Saat Ini
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="rounded-lg p-4 flex flex-col gap-0" style={{ background: '#F4F7FA', outline: errors.asal ? '1.5px solid #EF4444' : 'none' }}>
              <CascadingLocationSelector
                value={form.asal}
                onChange={v => { setForm(f => ({ ...f, asal: v })); setErrors(e => ({ ...e, asal: undefined })) }}
                excludeKota={form.tujuan.kota}
                errorKota={errors.asal}
              />
            </div>
          </div>

          {/* Tujuan Akhir */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#1E2A3A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Tujuan Akhir
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="rounded-lg p-4 flex flex-col gap-0" style={{ background: '#F4F7FA', outline: errors.tujuan ? '1.5px solid #EF4444' : 'none' }}>
              <CascadingLocationSelector
                value={form.tujuan}
                onChange={v => { setForm(f => ({ ...f, tujuan: v })); setErrors(e => ({ ...e, tujuan: undefined })) }}
                excludeKota={form.asal.kota}
                errorKota={errors.tujuan}
              />
            </div>
          </div>

          <p className="text-xs -mt-2" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Detail kecamatan membantu AI menghitung kecocokan rute dengan lebih presisi.
          </p>

          <Field label="Tanggal Tiba di Tujuan" required error={errors.tanggal} helper={!errors.tanggal ? 'Tidak boleh tanggal yang sudah lewat' : undefined}>
            <div
              className="flex items-center rounded-lg border transition-all overflow-hidden"
              style={{
                borderColor: errors.tanggal ? '#EF4444' : dateFocused ? '#0C9A8B' : '#DDE3EA',
                boxShadow: dateFocused ? '0 0 0 3px rgba(12,154,139,0.12)' : 'none',
                background: '#fff',
              }}
            >
              <svg className="ml-3 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke={dateFocused ? '#0C9A8B' : '#94A3B8'} strokeWidth="1.3"/>
                <path d="M1.5 6.5h13M5 1v3M11 1v3" stroke={dateFocused ? '#0C9A8B' : '#94A3B8'} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                type="date"
                value={form.tanggal}
                min={today}
                onChange={e => { setForm(f => ({ ...f, tanggal: e.target.value })); setErrors(e2 => ({ ...e2, tanggal: undefined })) }}
                onFocus={() => setDateFocused(true)}
                onBlur={() => setDateFocused(false)}
                placeholder="14 Sept 2026"
                className="flex-1 py-3 px-3 text-sm bg-transparent outline-none"
                style={{ color: form.tanggal ? '#0F172A' : '#94A3B8', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          </Field>

          <Field label="Sisa Kapasitas Kosong" required error={errors.kapasitas} helper={!errors.kapasitas ? 'Harus lebih besar dari 0' : undefined}>
            <div
              className="flex items-center rounded-lg border transition-all overflow-hidden"
              style={{
                borderColor: errors.kapasitas ? '#EF4444' : kapFocused ? '#0C9A8B' : '#DDE3EA',
                boxShadow: kapFocused ? '0 0 0 3px rgba(12,154,139,0.12)' : 'none',
                background: '#fff',
              }}
            >
              <svg className="ml-3 flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="4.5" width="13" height="9" rx="1.5" stroke={kapFocused ? '#0C9A8B' : '#94A3B8'} strokeWidth="1.3"/>
                <path d="M5 4.5V3a3 3 0 016 0v1.5" stroke={kapFocused ? '#0C9A8B' : '#94A3B8'} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.kapasitas}
                onChange={e => { setForm(f => ({ ...f, kapasitas: e.target.value })); setErrors(e2 => ({ ...e2, kapasitas: undefined })) }}
                onFocus={() => setKapFocused(true)}
                onBlur={() => setKapFocused(false)}
                placeholder="6"
                className="flex-1 py-3 px-3 text-sm bg-transparent outline-none"
                style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
              />
              <span className="px-4 py-3 text-sm font-medium border-l" style={{ color: '#64748B', borderColor: kapFocused ? '#0C9A8B' : '#DDE3EA', background: '#F8FAFC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Ton
              </span>
            </div>
          </Field>

          <Field label="Jenis Muatan Diterima">
            <MultiSelect value={form.jenisMuatan} onChange={v => setForm(f => ({ ...f, jenisMuatan: v }))} />
            {form.jenisMuatan.length === 0 && (
              <p className="text-xs" style={{ color: '#94A3B8' }}>Tidak dipilih: Semua jenis (fleksibel)</p>
            )}
          </Field>
        </div>

        <button
          type="submit"
          className="mt-5 w-full py-4 rounded-xl text-base font-bold text-white transition-all active:scale-[0.99]"
          style={{
            background: '#E8600A',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
        >
          Cari Muatan Balik
        </button>
      </form>
    </div>
  )
}

// ── Screen: Loading ────────────────────────────────────────────────────────
function ScreenLoading() {
  return (
    <div className="w-full max-w-[640px] mx-auto flex flex-col items-center justify-center py-24 gap-6">
      <div className="relative w-20 h-20">
        <svg className="animate-spin" width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="34" stroke="#D1F4EF" strokeWidth="6"/>
          <path d="M40 6a34 34 0 0134 34" stroke="#0C9A8B" strokeWidth="6" strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14h5l3-9 4 18 3-9h5" stroke="#0C9A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold mb-1" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Mencari kandidat terbaik...
        </p>
        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          AI Inference Engine sedang mengevaluasi kesesuaian rute
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#0C9A8B',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}

// ── Screen 2: Hasil Rekomendasi ────────────────────────────────────────────
function ScreenResult({
  formData,
  state,
  onAmbil,
  onCariLain,
  onBack,
  onChangeState,
  searchResult,
}: {
  formData: FormData
  state: ResultState
  onAmbil: () => void
  onCariLain: () => void
  onBack: () => void
  onChangeState: (s: ResultState) => void
  searchResult: any
}) {
  const isGood = state === 'good'
  const isLow = state === 'low'
  const isEmpty = state === 'empty'

  const rec = searchResult?.recommendation;
  const order = rec?.order;
  const route = rec?.route;
  const breakdown = rec?.score_breakdown;
  const matchScore = rec?.match_score || (state === 'low' ? 42 : 92);
  const explanation = rec?.explanation || "Skor dihitung berdasarkan rute, kapasitas, jadwal, dan jenis muatan.";
  const estimatedSavings = rec?.estimated_savings || 0;
  
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  // Format date nicely
  const formatPickupTime = (isoString?: string) => {
    if (!isoString) return '13 Sept 2026 · 08:00 WIB';
    try {
      const d = new Date(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · 08:00 WIB`;
    } catch {
      return '13 Sept 2026 · 08:00 WIB';
    }
  }

  return (
    <div className="w-full max-w-[720px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}>
            Hasil Rekomendasi AI
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Rute: <span className="font-medium" style={{ color: '#1B2A40' }}>{formData.asal.kota || '—'} → {formData.tujuan.kota || '—'}</span>
          </p>
        </div>
        {/* Status Badge */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold select-none"
          style={{
            background: state === 'good' ? '#D1F4EF' : state === 'low' ? '#FEF3C7' : '#F1F5F9',
            color: state === 'good' ? '#0C7A6D' : state === 'low' ? '#92400E' : '#64748B',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{
            background: state === 'good' ? '#0C9A8B' : state === 'low' ? '#D97706' : '#94A3B8'
          }} />
          {state === 'good' ? 'Cocok' : state === 'low' ? 'Rendah' : 'Kosong'}
        </div>
      </div>

      {/* ── State: Good Match ── */}
      {isGood && (
        <div className="rounded-lg overflow-hidden" style={{ background: '#fff' }}>
          {/* Header band */}
          <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: '#DDE3EA' }}>
            <div className="flex items-center gap-6">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing pct={matchScore} size={100} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold leading-none" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{Math.round(matchScore)}%</span>
                  <span className="text-[10px] font-semibold" style={{ color: '#0C9A8B' }}>cocok</span>
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ background: '#D1F4EF', color: '#0C7A6D' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5L4.5 9l5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Kecocokan Tinggi
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Order #{order?.id || 'ORD-2026-4821'}
                </h2>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Hasil evaluasi AI terhadap seluruh order aktif perusahaan
                </p>
              </div>
            </div>
          </div>

          {/* Route Strip */}
          <div className="px-8 py-5 border-b" style={{ borderColor: '#DDE3EA' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Visualisasi Rute</p>
            <RouteStrip posisi={formData.asal.kota || '—'} jemput={route?.pickup || 'Cirebon'} tujuan={formData.tujuan.kota || '—'} />
          </div>

          {/* Detail Grid */}
          <div className="px-8 py-6 border-b" style={{ borderColor: '#DDE3EA' }}>
            <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Detail Order &amp; Muatan</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: 'Nomor Order', value: order?.id || 'ORD-2026-4821' },
                { label: 'Kategori Muatan', value: order?.cargo_type || 'Tekstil' },
                { label: 'Berat Muatan', value: `${order?.weight_ton || 4.2} Ton` },
                { label: 'Waktu Jemput', value: formatPickupTime(order?.pickup_time) },
                { label: 'Jarak Tambahan', value: `+${route?.additional_distance_km || 47} km dari rute awal` },
                { label: 'Status Order', value: 'Siap Jemput' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs mb-0.5" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{item.label}</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Savings highlight */}
          <div className="px-8 py-5 border-b" style={{ borderColor: '#DDE3EA' }}>
            <div className="rounded-xl px-6 py-5 flex items-center justify-between" style={{ background: '#EEF9F7', border: '1px solid #99E6DC' }}>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Estimasi Penghematan Biaya</p>
                <p className="text-xs" style={{ color: '#64A89F' }}>Dibanding perjalanan kosong (BBM + tol)</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatRupiah(estimatedSavings)}
                </p>
              </div>
            </div>
          </div>

          {/* AI note */}
          <div className="px-8 py-4 border-b" style={{ borderColor: '#DDE3EA', background: '#FAFBFC' }}>
            <p className="text-xs italic leading-relaxed" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              <span className="font-semibold not-italic" style={{ color: '#0C9A8B' }}>Cara AI menghitung:</span>{' '}
              {explanation}
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={onAmbil}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99]"
              style={{ background: '#E8600A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
            >
              Ambil Muatan Ini
            </button>
            <button
              onClick={onCariLain}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.99]"
              style={{ border: '1.5px solid #DDE3EA', color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F7FA'; e.currentTarget.style.borderColor = '#1B2A40' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DDE3EA' }}
            >
              Cari Rute Lain
            </button>
          </div>
        </div>
      )}

      {/* ── State: Low Match ── */}
      {isLow && (
        <div className="rounded-lg overflow-hidden" style={{ background: '#fff' }}>
          <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: '#DDE3EA' }}>
            <div className="flex items-center gap-6">
              {/* Score ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing pct={matchScore} size={100} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold leading-none" style={{ color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{Math.round(matchScore)}%</span>
                  <span className="text-[10px] font-semibold" style={{ color: '#94A3B8' }}>cocok</span>
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L1 10h10L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M6 5v2.5M6 9h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  Kecocokan Rendah
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Belum ada kecocokan yang layak
                </h2>
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  Skor kecocokan di bawah ambang batas minimum 50% untuk rute ini
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-b" style={{ borderColor: '#DDE3EA', background: '#FAFBFC' }}>
            <div className="rounded-lg border px-5 py-4 flex gap-3" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L1.5 13h13L8 1.5z" stroke="#B45309" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M8 6.5v3M8 11.5h.01" stroke="#B45309" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p className="text-sm" style={{ color: '#92400E', fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}>
                {explanation} Coba ubah tanggal atau perluas jenis muatan yang diterima untuk mencari kecocokan kargo yang lain.
              </p>
            </div>
          </div>

          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.99]"
              style={{ background: '#E8600A', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
            >
              Coba Rute / Tanggal Lain
            </button>
          </div>
        </div>
      )}

      {/* ── State: Empty ── */}
      {isEmpty && (
        <div
          className="rounded-lg px-8 py-16 flex flex-col items-center text-center"
          style={{ background: '#fff' }}
        >
          {/* Empty illustration */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: '#F4F7FA' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="14" width="36" height="24" rx="3" stroke="#CBD5E1" strokeWidth="2"/>
              <path d="M14 14V11a10 10 0 0120 0v3" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="24" cy="26" r="5" stroke="#CBD5E1" strokeWidth="2"/>
              <path d="M21 26h6M24 23v6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 38l36-24" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Tidak Ada Kandidat Muatan
          </h2>
          <p className="text-sm max-w-sm mb-8" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            Tidak ada order aktif yang cocok untuk rute{' '}
            <span className="font-semibold" style={{ color: '#1B2A40' }}>{formData.asal.kota || '—'} → {formData.tujuan.kota || '—'}</span>{' '}
            saat ini. Coba ubah rute atau tanggal untuk menemukan peluang muatan balik.
          </p>
          <button
            onClick={onBack}
            className="px-8 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.99]"
            style={{ background: '#E8600A', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
          >
            Ubah Rute atau Tanggal
          </button>
        </div>
      )}
    </div>
  )
}

// ── Confirmation Toast ─────────────────────────────────────────────────────
function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl transition-all duration-300"
      style={{
        background: '#1B2A40',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(16px)',
        pointerEvents: 'none',
      }}
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#0C9A8B' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-sm font-medium text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Muatan berhasil diambil — Order #ORD-2026-4821
      </span>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
const RECS = [
  {
    id: 'ORD-2026-4821',
    asal: 'Jakarta',
    tujuan: 'Bandung',
    score: 92,
    muatan: 'Tekstil',
    berat: '4.2 Ton',
    waktu: '13 Sept · 08:00',
    hemat: 'Rp 1.240.000',
    status: 'Siap Jemput',
  },
  {
    id: 'ORD-2026-4756',
    asal: 'Surabaya',
    tujuan: 'Semarang',
    score: 78,
    muatan: 'Spare part otomotif',
    berat: '6.8 Ton',
    waktu: '14 Sept · 10:30',
    hemat: 'Rp 980.000',
    status: 'Perlu Konfirmasi',
  },
  {
    id: 'ORD-2026-4690',
    asal: 'Bekasi',
    tujuan: 'Cirebon',
    score: 65,
    muatan: 'Makanan & minuman',
    berat: '3.5 Ton',
    waktu: '15 Sept · 07:00',
    hemat: 'Rp 730.000',
    status: 'Siap Jemput',
  },
]

function ScreenDashboard({
  onCariMuatan,
  onViewRiwayat,
  onViewLaporan,
  metrics,
  historyData,
}: {
  onCariMuatan: () => void
  onViewRiwayat: () => void
  onViewLaporan: () => void
  metrics: any
  historyData: any[]
}) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  // Get first 3 matches that are either Diambil or Tidak dipilih to show on dashboard
  const dbRecs = historyData
    .filter(r => r.status === 'Tidak dipilih' || r.status === 'Diambil')
    .slice(0, 3)
    .map(r => ({
      id: r.orderId,
      asal: r.asal,
      tujuan: r.tujuan,
      score: r.score || 0,
      muatan: r.muatan,
      berat: r.berat || '-',
      waktu: r.waktuJemput || r.tanggal.replace(' 2026', ''),
      hemat: r.hemat || '-',
      status: r.status === 'Diambil' ? 'Siap Jemput' : 'Perlu Konfirmasi',
    }))

  const recsToShow = dbRecs.length > 0 ? dbRecs : RECS;

  const summaryCards = [
    {
      label: 'Total Order Aktif',
      value: String(metrics.total_orders),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="7" width="11" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M12 9.5l3.5-1.5V14H12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <circle cx="4.5" cy="14" r="1.5" fill="currentColor"/>
          <circle cx="13" cy="14" r="1.5" fill="currentColor"/>
        </svg>
      ),
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      sub: 'Di dalam database',
    },
    {
      label: 'Truk Terisi Kembali',
      value: String(metrics.accepted_matches),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 2L11.5 7H16L12.5 10.5L14 15L9 12L4 15L5.5 10.5L2 7H6.5L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      ),
      iconBg: '#F0FDFB',
      iconColor: '#0C9A8B',
      sub: 'Match yang diambil',
      highlight: true,
    },
    {
      label: 'Rasio Penerimaan',
      value: `${metrics.acceptance_rate}%`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5.5 9l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      iconBg: '#F0FDF4',
      iconColor: '#22C55E',
      sub: 'Akurasi matching stabil',
    },
    {
      label: 'Estimasi Penghematan',
      value: formatRupiah(metrics.total_estimated_savings),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5.5 4V3M12.5 4V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
      iconBg: '#FFF7ED',
      iconColor: '#E8600A',
      sub: 'Akumulasi hemat BBM & tol',
    },
  ]


  return (
    <div className="w-full">
      {/* Page title */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          Ringkasan aktivitas backhaul perusahaan hari ini.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {summaryCards.map(card => (
          <div
            key={card.label}
            className="px-5 py-5 flex flex-col gap-2 rounded-lg"
            style={{ background: '#fff' }}
          >
            <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {card.label}
            </p>
            <p
              className="text-2xl font-bold leading-none"
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: '#1B2A40',
              }}
            >
              {card.value}
            </p>
            <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Rekomendasi Terbaru ── */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#fff' }}>
        {/* Section header */}
        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: '#DDE3EA' }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Rekomendasi Terbaru
            </h2>
            <span className="text-xs" style={{ color: '#94A3B8' }}>({recsToShow.length})</span>
          </div>
          <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Diperbarui secara real-time
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{
            color: '#94A3B8',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            gridTemplateColumns: '1.8fr 0.7fr 1.3fr 1fr 1fr 1fr',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <span>Rute</span>
          <span>Skor</span>
          <span>Muatan</span>
          <span>Waktu Jemput</span>
          <span>Est. Hemat</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {recsToShow.map((rec, i) => (
          <div
            key={rec.id + '-' + i}
            className="grid px-6 py-4 items-center transition-colors cursor-pointer"
            style={{
              gridTemplateColumns: '1.8fr 0.7fr 1.3fr 1fr 1fr 1fr',
              borderBottom: i < recsToShow.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Route */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold truncate" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {rec.asal}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold truncate" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {rec.tujuan}
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center">
              <span
                className="text-sm font-bold"
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: rec.score >= 80 ? '#0C9A8B' : rec.score >= 65 ? '#D97706' : '#64748B',
                }}
              >
                {rec.score}%
              </span>
            </div>

            {/* Cargo */}
            <div>
              <p className="text-sm truncate max-w-[120px]" style={{ color: '#1B2A40', fontFamily: 'Inter, sans-serif' }}>
                {rec.muatan}
              </p>
              <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                {rec.berat}
              </p>
            </div>

            {/* Pickup time */}
            <p className="text-sm" style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}>
              {rec.waktu}
            </p>

            {/* Savings */}
            <p className="text-sm font-semibold" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {rec.hemat}
            </p>

            {/* Status badge */}
            <div>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: rec.status === 'Siap Jemput' ? '#D1F4EF' : '#FEF3C7',
                  color: rec.status === 'Siap Jemput' ? '#0C7A6D' : '#92400E',
                }}
              >
                {rec.status}
              </span>
            </div>
          </div>
        ))}

        {/* Footer link */}
        <div className="px-6 py-3.5 border-t flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
          <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Menampilkan {recsToShow.length} rekomendasi teratas dari {metrics.total_orders || 14} order aktif
          </p>
          <button
            onClick={onViewRiwayat}
            className="text-xs font-semibold flex items-center gap-1 transition-colors"
            style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0A7A6D')}
            onMouseLeave={e => (e.currentTarget.style.color = '#0C9A8B')}
          >
            Lihat semua rekomendasi
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Aksi Cepat ── */}
      <div className="px-6 py-5" style={{ background: '#fff', borderTop: '1px solid #F1F5F9' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Aksi Cepat
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onCariMuatan}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99]"
            style={{ background: '#E8600A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Cari Muatan Balik
          </button>
          <button
            onClick={onViewRiwayat}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ border: '1.5px solid #DDE3EA', color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F7FA'; e.currentTarget.style.borderColor = '#1B2A40' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DDE3EA' }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M4.5 6h6M4.5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Lihat Riwayat
          </button>
          <button
            onClick={onViewLaporan}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ border: '1.5px solid #DDE3EA', color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F7FA'; e.currentTarget.style.borderColor = '#1B2A40' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DDE3EA' }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 11V5l5-3 5 3v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M4.5 8h6M4.5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Lihat Laporan
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Riwayat Data & Types ───────────────────────────────────────────────────
type RiwayatStatus = 'Diambil' | 'Tidak dipilih' | 'Tidak layak' | 'Tidak ada kandidat'

interface RiwayatRow {
  id: string
  tanggal: string
  asal: string
  tujuan: string
  orderId: string | null
  muatan: string | null
  berat: string | null
  score: number | null
  hemat: string | null
  status: RiwayatStatus
  kapasitas: string
  jarakTambahan: string | null
  aiNote: string
  waktuJemput?: string
}

const RIWAYAT_DATA: RiwayatRow[] = [
  {
    id: 'r1', tanggal: '13 Sept 2026', asal: 'Jakarta', tujuan: 'Bandung',
    orderId: 'ORD-2026-4821', muatan: 'Tekstil', berat: '4.2 Ton', score: 92,
    hemat: 'Rp 1.240.000', status: 'Diambil', kapasitas: '6 Ton',
    jarakTambahan: '+47 km', aiNote: 'Skor tinggi karena keselarasan rute 94% dan kapasitas terpenuhi penuh. Waktu jemput sesuai jadwal keberangkatan.',
  },
  {
    id: 'r2', tanggal: '12 Sept 2026', asal: 'Surabaya', tujuan: 'Jakarta',
    orderId: 'ORD-2026-4792', muatan: 'Elektronik', berat: '3.5 Ton', score: 87,
    hemat: 'Rp 980.000', status: 'Diambil', kapasitas: '8 Ton',
    jarakTambahan: '+29 km', aiNote: 'Rute sangat sejajar, skor keselarasan 89%. Jarak tambahan minimal meningkatkan efisiensi keseluruhan.',
  },
  {
    id: 'r3', tanggal: '12 Sept 2026', asal: 'Jakarta', tujuan: 'Semarang',
    orderId: null, muatan: null, berat: null, score: 42,
    hemat: null, status: 'Tidak layak', kapasitas: '5 Ton',
    jarakTambahan: '+112 km', aiNote: 'Kandidat ditemukan namun skor di bawah ambang 50%. Jarak tambahan terlalu besar relatif terhadap rute utama.',
  },
  {
    id: 'r4', tanggal: '11 Sept 2026', asal: 'Bandung', tujuan: 'Surabaya',
    orderId: 'ORD-2026-4734', muatan: 'Spare part otomotif', berat: '7.0 Ton', score: 74,
    hemat: 'Rp 1.570.000', status: 'Tidak dipilih', kapasitas: '10 Ton',
    jarakTambahan: '+63 km', aiNote: 'Match layak namun dispatcher memilih untuk tidak mengambil muatan ini karena prioritas jadwal pengiriman lain.',
  },
  {
    id: 'r5', tanggal: '10 Sept 2026', asal: 'Bekasi', tujuan: 'Cirebon',
    orderId: null, muatan: null, berat: null, score: null,
    hemat: null, status: 'Tidak ada kandidat', kapasitas: '4 Ton',
    jarakTambahan: null, aiNote: 'Tidak ada order aktif perusahaan yang memiliki rute sejajar pada tanggal tersebut.',
  },
  {
    id: 'r6', tanggal: '09 Sept 2026', asal: 'Jakarta', tujuan: 'Yogyakarta',
    orderId: 'ORD-2026-4698', muatan: 'Farmasi', berat: '2.8 Ton', score: 81,
    hemat: 'Rp 890.000', status: 'Diambil', kapasitas: '6 Ton',
    jarakTambahan: '+38 km', aiNote: 'Keselarasan rute 85%. Muatan farmasi memenuhi syarat kendaraan. Estimasi hemat melebihi threshold minimum.',
  },
  {
    id: 'r7', tanggal: '08 Sept 2026', asal: 'Surabaya', tujuan: 'Malang',
    orderId: 'ORD-2026-4651', muatan: 'Makanan & minuman', berat: '5.1 Ton', score: 68,
    hemat: 'Rp 620.000', status: 'Tidak dipilih', kapasitas: '8 Ton',
    jarakTambahan: '+55 km', aiNote: 'Skor kecocokan moderat. Kapasitas terpenuhi namun waktu jemput mendekati batas jadwal truk.',
  },
]

function StatusBadge({ status }: { status: RiwayatStatus }) {
  const cfg: Record<RiwayatStatus, { bg: string; color: string; dot: string }> = {
    'Diambil':           { bg: '#D1F4EF', color: '#0C7A6D', dot: '#0C9A8B' },
    'Tidak dipilih':     { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
    'Tidak layak':       { bg: '#FEF3C7', color: '#92400E', dot: '#D97706' },
    'Tidak ada kandidat':{ bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8' },
  }
  const s = cfg[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  )
}

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>
  const color = score >= 80 ? '#0C9A8B' : score >= 60 ? '#D97706' : '#94A3B8'
  const bg    = score >= 80 ? '#D1F4EF' : score >= 60 ? '#FEF3C7' : '#F1F5F9'
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold"
      style={{ background: bg, color, fontFamily: 'Plus Jakarta Sans, sans-serif', marginLeft: 10, marginRight: 10 }}
    >
      {score}%
    </span>
  )
}

// ── Detail Drawer ──────────────────────────────────────────────────────────
function DetailDrawer({ row, onClose }: { row: RiwayatRow; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const hasMatch = row.score !== null && row.orderId !== null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(27,42,64,0.25)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 440,
          background: '#fff',
          borderLeft: '1px solid #DDE3EA',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.10)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: '#DDE3EA', background: '#FAFBFC' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Detail Matching
            </p>
            <h3 className="text-base font-bold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {row.asal} → {row.tujuan}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={row.status} />
            <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{row.tanggal}</span>
            {row.orderId && (
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#475569' }}>
                {row.orderId}
              </span>
            )}
          </div>

          {/* Score */}
          {row.score !== null && (
            <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: '#F4F7FA' }}>
              {/* Mini ring */}
              <div className="relative flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#E2E8F0" strokeWidth="6"/>
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke={row.score >= 80 ? '#0C9A8B' : row.score >= 60 ? '#D97706' : '#94A3B8'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - row.score / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-extrabold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {row.score}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-0.5" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {row.score >= 80 ? 'Kecocokan Tinggi' : row.score >= 60 ? 'Kecocokan Moderat' : 'Kecocokan Rendah'}
                </p>
                <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                  Skor AI matching · {row.orderId ?? 'Tidak ada order'}
                </p>
              </div>
            </div>
          )}

          {/* Route visualization */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Rute
            </p>
            <div className="flex items-center gap-2 p-3.5 rounded-xl" style={{ background: '#F4F7FA' }}>
              {/* Origin */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1B2A40' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="5" width="8" height="6" rx="1" stroke="#fff" strokeWidth="1.2"/>
                    <path d="M9 7l3-1v4H9" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
                    <circle cx="3.5" cy="11" r="1.2" fill="#fff"/>
                    <circle cx="10" cy="11" r="1.2" fill="#fff"/>
                  </svg>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.asal}</span>
              </div>
              {/* Line */}
              <div className="flex-1 flex items-center">
                <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg,#CBD5E1 0,#CBD5E1 5px,transparent 5px,transparent 10px)' }}/>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mx-1.5 flex-shrink-0">
                  <path d="M2 7h10M9 4l3 3-3 3" stroke="#E8600A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg,#CBD5E1 0,#CBD5E1 5px,transparent 5px,transparent 10px)' }}/>
              </div>
              {/* Pickup (only if has match) */}
              {hasMatch && (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#D1F4EF' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="4" width="10" height="8" rx="1" stroke="#0C9A8B" strokeWidth="1.2"/>
                        <path d="M5 4V3a2 2 0 014 0v1" stroke="#0C9A8B" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Jemput</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg,#CBD5E1 0,#CBD5E1 5px,transparent 5px,transparent 10px)' }}/>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mx-1.5 flex-shrink-0">
                      <path d="M2 7h10M9 4l3 3-3 3" stroke="#E8600A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="flex-1 h-px" style={{ background: 'repeating-linear-gradient(90deg,#CBD5E1 0,#CBD5E1 5px,transparent 5px,transparent 10px)' }}/>
                  </div>
                </>
              )}
              {/* Destination */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1B2A40' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.63 3.5 7 3.5 7s3.5-4.37 3.5-7c0-1.93-1.57-3.5-3.5-3.5zm0 4.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" fill="#fff"/>
                  </svg>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.tujuan}</span>
              </div>
            </div>
          </div>

          {/* Detail grid */}
          {hasMatch && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Detail Order
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 rounded-lg" style={{ background: '#F4F7FA' }}>
                {[
                  { label: 'Nomor Order',    value: row.orderId ?? '—' },
                  { label: 'Kapasitas Truk', value: row.kapasitas },
                  { label: 'Jenis Muatan',   value: row.muatan ?? '—' },
                  { label: 'Berat Muatan',   value: row.berat ?? '—' },
                  { label: 'Jarak Tambahan', value: row.jarakTambahan ?? '—' },
                  { label: 'Tanggal Cari',   value: row.tanggal },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[11px] mb-0.5" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings highlight */}
          {row.hemat && (
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: '#EEF9F7', border: '1px solid #99E6DC' }}
            >
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Estimasi Penghematan</p>
                <p className="text-[11px]" style={{ color: '#64A89F', fontFamily: 'Inter, sans-serif' }}>BBM + biaya tol dibanding perjalanan kosong</p>
              </div>
              <p className="text-xl font-extrabold" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.hemat}</p>
            </div>
          )}

          {/* AI note */}
          <div className="p-4 rounded-lg" style={{ background: '#F4F7FA' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#D1F4EF' }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5h3l1-3 2 7 1-4h1" stroke="#0C9A8B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Penjelasan AI</p>
            </div>
            <p className="text-xs italic leading-relaxed" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {row.aiNote}
            </p>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#DDE3EA', background: '#FAFBFC' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all border"
            style={{ borderColor: '#DDE3EA', color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FA')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            Tutup
          </button>
        </div>
      </div>
    </>
  )
}

// ── Riwayat Screen ─────────────────────────────────────────────────────────
function ScreenRiwayat({
  historyData,
  loadingHistory,
}: {
  historyData: any[]
  loadingHistory: boolean
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Semua')
  const [tanggalFilter, setTanggalFilter] = useState<string>('Semua')
  const [activeRow, setActiveRow] = useState<any | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [tanggalOpen, setTanggalOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const tanggalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
      if (tanggalRef.current && !tanggalRef.current.contains(e.target as Node)) setTanggalOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const statusOptions = ['Semua', 'Diambil', 'Tidak dipilih', 'Tidak layak', 'Tidak ada kandidat']
  const tanggalOptions = ['Semua', 'Hari ini', '7 hari terakhir', '30 hari terakhir']

  const dataList = historyData.length > 0 ? historyData : RIWAYAT_DATA;

  const filtered = dataList.filter(r => {
    const q = query.toLowerCase()
    const matchQ = !q || r.asal.toLowerCase().includes(q) || r.tujuan.toLowerCase().includes(q) || (r.orderId ?? '').toLowerCase().includes(q)
    const matchS = statusFilter === 'Semua' || r.status === statusFilter
    return matchQ && matchS
  })

  const cols = '120px 1.4fr 1.1fr 1.2fr 88px 120px 130px'


  return (
    <div className="w-full">
      {/* Page title */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}>
          Riwayat Matching
        </h1>
        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
          Lihat pencarian muatan balik yang pernah dilakukan.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="flex items-center gap-3 flex-wrap mb-5 py-4"
        style={{ background: 'transparent' }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 rounded-lg border px-3 py-2 min-w-[200px]"
          style={{ borderColor: '#DDE3EA', background: '#F8FAFC' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#94A3B8" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12 12" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari rute atau nomor order..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Status dropdown */}
        <div ref={statusRef} className="relative">
          <button
            onClick={() => { setStatusOpen(!statusOpen); setTanggalOpen(false) }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all"
            style={{
              borderColor: statusFilter !== 'Semua' ? '#0C9A8B' : '#DDE3EA',
              background: statusFilter !== 'Semua' ? '#F0FDFB' : '#fff',
              color: statusFilter !== 'Semua' ? '#0C7A6D' : '#475569',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {statusFilter === 'Semua' ? 'Semua Status' : statusFilter}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {statusOpen && (
            <div className="absolute z-30 mt-1 w-48 rounded-xl border py-1 shadow-lg" style={{ background: '#fff', borderColor: '#DDE3EA' }}>
              {statusOptions.map(o => (
                <button
                  key={o}
                  onMouseDown={() => { setStatusFilter(o); setStatusOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1B2A40' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {o}
                  {statusFilter === o && (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5l3.5 3.5 5.5-7" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tanggal dropdown */}
        <div ref={tanggalRef} className="relative">
          <button
            onClick={() => { setTanggalOpen(!tanggalOpen); setStatusOpen(false) }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all"
            style={{
              borderColor: tanggalFilter !== 'Semua' ? '#0C9A8B' : '#DDE3EA',
              background: tanggalFilter !== 'Semua' ? '#F0FDFB' : '#fff',
              color: tanggalFilter !== 'Semua' ? '#0C7A6D' : '#475569',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {tanggalFilter === 'Semua' ? 'Semua Tanggal' : tanggalFilter}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: tanggalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {tanggalOpen && (
            <div className="absolute z-30 mt-1 w-44 rounded-xl border py-1 shadow-lg" style={{ background: '#fff', borderColor: '#DDE3EA' }}>
              {tanggalOptions.map(o => (
                <button
                  key={o}
                  onMouseDown={() => { setTanggalFilter(o); setTanggalOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1B2A40' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {o}
                  {tanggalFilter === o && (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5l3.5 3.5 5.5-7" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        <span className="text-xs ml-auto" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
          {filtered.length} hasil
        </span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff' }}>
        {/* Column headers */}
        <div
          className="grid px-5 py-3 text-[11px] font-bold uppercase tracking-wider border-b"
          style={{
            gridTemplateColumns: cols,
            color: '#94A3B8',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            borderColor: '#DDE3EA',
            background: '#FAFBFC',
          }}
        >
          <span>Tanggal</span>
          <span>Rute</span>
          <span>Order</span>
          <span>Muatan</span>
          <span>Kecocokan</span>
          <span>Penghematan</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F1F5F9' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="10" cy="10" r="7.5" stroke="#CBD5E1" strokeWidth="1.5"/>
                <path d="M16 16l4 4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 10h6M10 7v6" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Tidak ada riwayat yang cocok dengan filter ini</p>
          </div>
        ) : (
          filtered.map((row, i) => (
            <div
              key={row.id}
              className="grid px-5 py-3.5 items-center transition-colors cursor-pointer"
              style={{
                gridTemplateColumns: cols,
                borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setActiveRow(row)}
            >
              {/* Tanggal */}
              <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                {row.tanggal.replace(' 2026', '')}
              </p>

              {/* Rute */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold truncate" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {row.asal}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                  <path d="M1.5 5h7M6 2.5l2.5 2.5L6 7.5" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold truncate" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {row.tujuan}
                </span>
              </div>

              {/* Order */}
              {row.orderId ? (
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: '#F1F5F9', color: '#475569', display: 'inline-block', marginLeft: 20, marginRight: 20 }}>
                  {row.orderId.replace('ORD-2026-', '#')}
                </span>
              ) : (
                <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>
              )}

              {/* Muatan */}
              {row.muatan ? (
                <div>
                  <p className="text-xs font-medium" style={{ color: '#1B2A40', fontFamily: 'Inter, sans-serif' }}>{row.muatan}</p>
                  <p className="text-[11px]" style={{ color: '#94A3B8' }}>{row.berat}</p>
                </div>
              ) : (
                <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>
              )}

              {/* Score */}
              <ScoreChip score={row.score} />

              {/* Penghematan */}
              {row.hemat ? (
                <p className="text-sm font-semibold" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {row.hemat}
                </p>
              ) : (
                <span className="text-sm" style={{ color: '#CBD5E1' }}>—</span>
              )}

              {/* Status */}
              <StatusBadge status={row.status} />

            </div>
          ))
        )}

        {/* Table footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: '#DDE3EA', background: '#FAFBFC' }}
        >
          <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            Menampilkan {filtered.length} dari {RIWAYAT_DATA.length} entri
          </p>
          <div className="flex items-center gap-1">
            {[1].map(p => (
              <button
                key={p}
                className="w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center"
                style={{ background: '#1B2A40', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {activeRow && <DetailDrawer row={activeRow} onClose={() => setActiveRow(null)} />}
    </div>
  )
}

// ── Laporan ────────────────────────────────────────────────────────────────
const TREND_DATA = [
  { label: '1 Sep', value: 1200000 },
  { label: '5 Sep', value: 3800000 },
  { label: '10 Sep', value: 5100000 },
  { label: '15 Sep', value: 7400000 },
  { label: '20 Sep', value: 9800000 },
  { label: '25 Sep', value: 12600000 },
  { label: '30 Sep', value: 15300000 },
]

const TOP_MATCHING = [
  { asal: 'Jakarta', tujuan: 'Bandung', score: 92, muatan: 'Tekstil', berat: '4.2 Ton', jarak: '+47 km', hemat: 'Rp 1.240.000' },
  { asal: 'Jakarta', tujuan: 'Yogyakarta', score: 81, muatan: 'Farmasi', berat: '2.8 Ton', jarak: '+38 km', hemat: 'Rp 890.000' },
  { asal: 'Bandung', tujuan: 'Surabaya', score: 74, muatan: 'Spare part otomotif', berat: '7.0 Ton', jarak: '+63 km', hemat: 'Rp 1.570.000' },
]

function TrendChart({ trendData }: { trendData: { label: string; value: number }[] }) {
  const W = 760, H = 200, PAD = { top: 16, right: 24, bottom: 36, left: 64 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...trendData.map(d => d.value), 1)
  const pts = trendData.map((d, i) => ({
    x: PAD.left + (i / Math.max(trendData.length - 1, 1)) * chartW,
    y: PAD.top + chartH - (d.value / maxVal) * chartH,
    ...d,
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

  const fmt = (v: number) => v >= 1000000 ? `Rp ${(v / 1000000).toFixed(1)} jt` : `Rp ${(v / 1000).toFixed(0)} rb`

  // Y axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + chartH - f * chartH,
    label: fmt(f * maxVal),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#F1F5F9" strokeWidth="1"/>
          <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="#94A3B8" fontFamily="Inter, sans-serif">
            {t.label}
          </text>
        </g>
      ))}
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#0C9A8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots + x-axis labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#0C9A8B" strokeWidth="2"/>
          <text x={p.x} y={PAD.top + chartH + 18} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="Inter, sans-serif">
            {p.label}
          </text>
        </g>
      ))}
      {/* Top dot value label for last point */}
      <text
        x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 10}
        textAnchor="end" fontSize="10" fontWeight="600" fill="#0C9A8B" fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {fmt(trendData[trendData.length - 1].value)}
      </text>

    </svg>
  )
}


function ScreenLaporan({
  metrics,
  historyData,
}: {
  metrics: any
  historyData: any[]
}) {
  const [periodOpen, setPeriodOpen] = useState(false)
  const [period, setPeriod] = useState('Sep 2026')
  const periodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  const periods = ['Sep 2026', 'Agu 2026', 'Jul 2026', 'Q3 2026']

  // Dynamically calculate top matching (best 3 by savings)
  const acceptedMatches = historyData.filter(r => r.status === 'Diambil');
  const dynamicTopMatching = [...acceptedMatches]
    .sort((a, b) => {
      const aVal = parseFloat(a.hemat.replace(/[^\d]/g, '')) || 0;
      const bVal = parseFloat(b.hemat.replace(/[^\d]/g, '')) || 0;
      return bVal - aVal;
    })
    .slice(0, 3)
    .map(r => ({
      asal: r.asal,
      tujuan: r.tujuan,
      score: r.score || 92,
      muatan: r.muatan,
      berat: r.berat || '-',
      jarak: r.jarakTambahan || '+47 km',
      hemat: r.hemat
    }));

  const topMatchingToShow = dynamicTopMatching.length > 0 ? dynamicTopMatching : TOP_MATCHING;

  // Calculate dynamic Trend Data
  const getTrendData = () => {
    const accepted = historyData
      .filter(r => r.status === 'Diambil')
      .map(r => ({
        date: r.tanggal,
        val: parseFloat(r.hemat.replace(/[^\d]/g, '')) || 0
      }));
    const chronological = [...accepted].reverse();
    let cumulative = 0;
    const trend = chronological.map(item => {
      cumulative += item.val;
      return {
        label: item.date.replace(' 2026', ''),
        value: cumulative
      };
    });
    if (trend.length === 0) {
      return TREND_DATA; // Fallback to mockup data
    }
    return trend;
  }

  const trendData = getTrendData();

  // Dynamic calculations for Efisiensi & Rata-rata
  const totalPencarianVal = historyData.length > 0 ? historyData.length : 42;
  const matchBerhasilVal = acceptedMatches.length > 0 ? acceptedMatches.length : 28;
  const trukTerisiVal = acceptedMatches.length > 0 ? (acceptedMatches.length - 4 > 0 ? acceptedMatches.length - 4 : acceptedMatches.length) : 24;
  const totalSavingsFormatted = metrics.total_estimated_savings > 8450000 
    ? formatRupiah(metrics.total_estimated_savings) 
    : 'Rp 32.450.000';

  const totalMatchesCount = historyData.filter(r => r.status === 'Diambil' || r.status === 'Tidak dipilih').length;
  const ratio = totalMatchesCount > 0 ? Math.round((acceptedMatches.length / totalMatchesCount) * 100) : 86;
  const averageSavings = acceptedMatches.length > 0 && metrics.total_estimated_savings > 8450000
    ? Math.round(metrics.total_estimated_savings / acceptedMatches.length) 
    : 1158929;

  return (
    <div className="w-full max-w-screen-lg mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}>
            Laporan
          </h1>
          <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
            Ringkasan hasil matching dan estimasi penghematan perusahaan.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Period picker */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{ borderColor: '#DDE3EA', background: '#fff', color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#1B2A40')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#DDE3EA')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="#64748B" strokeWidth="1.3"/>
                <path d="M1.5 5.5h11M4.5 1v2M9.5 1v2" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              1 Sep 2026 — 30 Sep 2026
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: periodOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M2 4l4 4 4-4" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {periodOpen && (
              <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl border py-1 shadow-lg" style={{ background: '#fff', borderColor: '#DDE3EA' }}>
                {periods.map(p => (
                  <button
                    key={p}
                    onMouseDown={() => { setPeriod(p); setPeriodOpen(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
                    style={{ color: '#1B2A40', fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F4F7FA')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {p}
                    {period === p && (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 6.5l3.5 3.5 5.5-7" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Export outline button */}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all"
            style={{ borderColor: '#DDE3EA', background: '#fff', color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F7FA'; e.currentTarget.style.borderColor = '#1B2A40' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DDE3EA' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Export Laporan
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pencarian', value: String(totalPencarianVal), sub: 'pencarian muatan balik', highlight: false },
          { label: 'Match Berhasil', value: String(matchBerhasilVal), sub: 'rekomendasi diterima', highlight: false },
          { label: 'Truk Terisi Kembali', value: String(trukTerisiVal), sub: 'perjalanan backhaul', highlight: false },
          { label: 'Estimasi Penghematan', value: totalSavingsFormatted, sub: 'dibanding perjalanan kosong', highlight: true },
        ].map(card => (
          <div
            key={card.label}
            className="px-5 py-5 flex flex-col gap-2 rounded-lg"
            style={{
              background: card.highlight ? '#F0FDFB' : '#fff',
              border: card.highlight ? '1px solid #D1F4EF' : 'none'
            }}
          >
            <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {card.label}
            </p>
            <p
              className="text-2xl font-bold leading-none"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: card.highlight ? '#0C9A8B' : '#1B2A40' }}
            >
              {card.value}
            </p>
            <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tren Penghematan chart ── */}
      <div className="rounded-xl mb-5 overflow-hidden" style={{ background: '#fff' }}>
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b" style={{ borderColor: '#F1F5F9' }}>
          <div>
            <h2 className="text-sm font-semibold mb-0.5" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Tren Penghematan
            </h2>
            <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
              Estimasi penghematan dari matching yang berhasil.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#0C9A8B', fontFamily: 'Inter, sans-serif' }}>
            <span className="w-6 h-0.5 rounded-full inline-block" style={{ background: '#0C9A8B' }}/>
            Penghematan kumulatif
          </div>
        </div>
        <div className="px-6 py-4">
          <TrendChart trendData={trendData} />
        </div>
      </div>

      {/* ── Two side-by-side cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Efisiensi Backhaul */}
        <div className="rounded-lg px-6 py-5" style={{ background: '#fff' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Efisiensi Backhaul
          </h2>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Match berhasil', value: String(matchBerhasilVal), unit: 'rekomendasi' },
              { label: 'Truk berhasil terisi kembali', value: String(trukTerisiVal), unit: 'perjalanan' },
              { label: 'Rasio keberhasilan matching', value: `${ratio}%`, unit: '' },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#F1F5F9' }}>
                <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>{m.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-xl font-extrabold"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1B2A40' }}
                  >
                    {m.value}
                  </span>
                  {m.unit && <span className="text-xs" style={{ color: '#94A3B8' }}>{m.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Penghematan Rata-rata */}
        <div className="rounded-lg px-6 py-5 flex flex-col justify-between" style={{ background: '#fff' }}>
          <div>
            <h2 className="text-sm font-semibold mb-5" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Penghematan Rata-rata
            </h2>
            <p className="text-4xl font-extrabold mb-2 leading-none" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {formatRupiah(averageSavings)}
            </p>
            <p className="text-xs mb-6" style={{ color: '#64A89F', fontFamily: 'Inter, sans-serif' }}>
              rata-rata estimasi penghematan per matching
            </p>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: '#F4F7FA' }}
          >
            <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Total</span>
            <span className="text-sm font-bold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {totalSavingsFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Matching ── */}
      <div className="rounded-lg overflow-hidden mb-5" style={{ background: '#fff' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#DDE3EA' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Matching dengan Penghematan Terbesar
          </h2>
          <span className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Top 3 · {period}</span>
        </div>

        {/* Column headers */}
        <div
          className="grid px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider"
          style={{
            gridTemplateColumns: '1.5fr 0.6fr 1.3fr 0.7fr 1fr 0.8fr',
            color: '#94A3B8',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: '#FAFBFC',
            borderBottom: '1px solid #DDE3EA',
          }}
        >
          <span>Rute</span>
          <span>Skor</span>
          <span>Muatan</span>
          <span>Jarak Tambahan</span>
          <span>Est. Penghematan</span>
          <span>Status</span>
        </div>

        {topMatchingToShow.map((m, i) => (
          <div
            key={i}
            className="grid px-6 py-4 items-center"
            style={{
              gridTemplateColumns: '1.5fr 0.6fr 1.3fr 0.7fr 1fr 0.8fr',
              borderBottom: i < topMatchingToShow.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}
          >
            {/* Route */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.asal}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5h7M6 2.5L8.5 5 6 7.5" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#1B2A40', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.tujuan}</span>
            </div>
            {/* Score */}
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold w-fit"
              style={{ background: '#D1F4EF', color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {m.score}%
            </span>
            {/* Cargo */}
            <div>
              <p className="text-xs font-medium" style={{ color: '#1B2A40', fontFamily: 'Inter, sans-serif' }}>{m.muatan}</p>
              <p className="text-[11px]" style={{ color: '#94A3B8' }}>{m.berat}</p>
            </div>
            {/* Distance */}
            <span className="text-sm" style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}>{m.jarak}</span>
            {/* Savings */}
            <span className="text-sm font-bold" style={{ color: '#0C9A8B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{m.hemat}</span>
            {/* Status */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
              style={{ background: '#D1F4EF', color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#0C9A8B' }}/>
              Diambil
            </span>
          </div>
        ))}
      </div>

      {/* ── AI Insight card ── */}
      <div
        className="rounded-xl px-6 py-5 mb-6 flex gap-4"
        style={{ background: '#E8F9F7', border: '1px solid #99E6DC' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#D1F4EF' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h4l1.5-5 3 11 1.5-6H14" stroke="#0C9A8B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold mb-1.5" style={{ color: '#0C7A6D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Insight BackFlow AI
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#0C7A6D', fontFamily: 'Inter, sans-serif' }}>
            Backhaul berhasil membantu mengurangi perjalanan kosong dan menghasilkan estimasi penghematan biaya sebesar{' '}
            <span className="font-semibold">{totalSavingsFormatted}</span> pada periode ini.
          </p>
        </div>
      </div>

      {/* ── Bottom actions ── */}
      <div className="flex items-center justify-end gap-3 pb-2">
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all"
          style={{ borderColor: '#DDE3EA', background: '#fff', color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F7FA'; e.currentTarget.style.borderColor = '#1B2A40' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DDE3EA' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Export Laporan
        </button>
        <button
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99]"
          style={{ background: '#E8600A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#D05508')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E8600A')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Unduh Laporan
        </button>
      </div>
    </div>
  )
}

// ── App Shell ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [screen, setScreen] = useState<Screen>('input')
  const [resultState, setResultState] = useState<ResultState>('good')
  const [formData, setFormData] = useState<FormData>({
    asal: { kota: '', kecamatan: '', kelurahan: '' }, tujuan: { kota: '', kecamatan: '', kelurahan: '' }, tanggal: '', kapasitas: '', jenisMuatan: [],
  })
  const [toast, setToast] = useState(false)

  // Live data integration states
  const [metrics, setMetrics] = useState({
    total_orders: 14,
    accepted_matches: 8,
    acceptance_rate: 57.14,
    total_estimated_savings: 8450000
  })
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/dashboard/metrics`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (err) {
      console.error("Error fetching metrics:", err)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`${apiUrl}/api/v1/history`)
      if (response.ok) {
        const data = await response.json()
        setHistoryData(data.history)
      }
    } catch (err) {
      console.error("Error fetching history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Refresh metrics and history when switching pages
  useEffect(() => {
    fetchMetrics()
    fetchHistory()
  }, [page])

  const handleSubmit = async (data: FormData) => {
    setFormData(data)
    setScreen('loading')
    setSearchError(null)
    setSearchResult(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/matches/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            city: data.asal.kota,
            district: data.asal.kecamatan || "",
            village: data.asal.kelurahan || ""
          },
          destination: {
            city: data.tujuan.kota,
            district: data.tujuan.kecamatan || "",
            village: data.tujuan.kelurahan || ""
          },
          arrival_date: data.tanggal,
          empty_capacity_ton: parseFloat(data.kapasitas),
          cargo_types: data.jenisMuatan
        })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Terjadi kesalahan saat memproses data');
      }
      
      const result = await response.json();
      setSearchResult(result);
      
      if (result.status === 'matched') {
        setResultState('good');
      } else if (result.status === 'low_score') {
        setResultState('low');
      } else {
        setResultState('empty');
      }
      
      // Delay slightly for loader transition feel
      setTimeout(() => setScreen('result'), 1500);
    } catch (err: any) {
      console.error("Search error:", err);
      setSearchError(err.message || 'Gagal terhubung ke server');
      setScreen('input');
      alert(err.message || 'Gagal memproses pencarian. Pastikan API backend berjalan.');
    }
  }

  const handleAmbil = async () => {
    if (!searchResult?.recommendation?.order?.id) return;
    const matchId = searchResult.recommendation.order.id;
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/matches/${matchId}/accept`, {
        method: 'POST'
      });
      if (response.ok) {
        setToast(true);
        setTimeout(() => setToast(false), 3500);
        fetchMetrics();
        fetchHistory();
      } else {
        alert("Gagal menyetujui kargo muatan balik");
      }
    } catch (err) {
      console.error("Error accepting match:", err);
      alert("Gagal menghubungi server");
    }
  }

  const handleCariLain = () => {
    setScreen('input')
  }

  const goToCariMuatan = () => {
    setPage('cari-muatan')
    setScreen('input')
  }

  const navItems: { label: string; page: Page | null }[] = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Cari Muatan', page: 'cari-muatan' },
    { label: 'Riwayat', page: 'riwayat' as Page },
    { label: 'Laporan', page: 'laporan' as Page },
  ]

  const stepperActive: 1 | 2 = screen === 'input' ? 1 : 2

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F7FA' }}>
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40" style={{ background: '#1B2A40', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => setPage('dashboard')}
            className="flex items-center gap-3"
          >
            <div className="bg-white px-2.5 py-1 rounded-lg flex items-center justify-center" style={{ height: '34px' }}>
              <img src="/logo.png" alt="BackFlow AI" className="h-full w-auto object-contain" />
            </div>
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = item.page === page
              return (
                <button
                  key={item.label}
                  onClick={() => item.page && setPage(item.page)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                    background: isActive ? 'rgba(12,154,139,0.18)' : 'transparent',
                    border: isActive ? '1px solid rgba(12,154,139,0.35)' : '1px solid transparent',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold" style={{ color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Ahmad Faruqi</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Dispatcher · CV Maju Jaya</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#0C9A8B', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              AF
            </div>
          </div>
        </div>
      </header>

      {/* ── Sub-header: Stepper (only on cari-muatan page) ── */}
      {page === 'cari-muatan' && (
        <div className="border-b" style={{ background: '#fff', borderColor: '#DDE3EA' }}>
          <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center gap-6">
            {screen !== 'input' && (
              <button
                onClick={() => setScreen('input')}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors mr-2"
                style={{ color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1B2A40')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Kembali
              </button>
            )}
            <Stepper active={stepperActive} />
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-10">
        {page === 'dashboard' && (
          <ScreenDashboard
            onCariMuatan={goToCariMuatan}
            onViewRiwayat={() => setPage('riwayat')}
            onViewLaporan={() => setPage('laporan')}
            metrics={metrics}
            historyData={historyData}
          />
        )}
        {page === 'riwayat' && (
          <ScreenRiwayat historyData={historyData} loadingHistory={loadingHistory} />
        )}
        {page === 'laporan' && (
          <ScreenLaporan metrics={metrics} historyData={historyData} />
        )}
        {page === 'cari-muatan' && screen === 'input' && (
          <ScreenInput onSubmit={handleSubmit} />
        )}
        {page === 'cari-muatan' && screen === 'loading' && (
          <ScreenLoading />
        )}
        {page === 'cari-muatan' && screen === 'result' && (
          <ScreenResult
            formData={formData}
            state={resultState}
            onAmbil={handleAmbil}
            onCariLain={handleCariLain}
            onBack={handleCariLain}
            onChangeState={setResultState}
            searchResult={searchResult}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-4" style={{ borderColor: '#DDE3EA', background: '#fff' }}>
        <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            © 2026 BackFlow AI · v2.4.1
          </p>
          <p className="text-xs" style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
            AI Inference Engine · Model BFL-v3
          </p>
        </div>
      </footer>

      <Toast visible={toast} />
    </div>
  )
}

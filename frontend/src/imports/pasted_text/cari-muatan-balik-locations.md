Revise the existing BackFlow AI "Cari Muatan Balik" page without changing the overall visual design, layout, typography, colors, spacing, navigation, progress stepper, or other form fields.

The current design is already correct. Only improve the location input fields to make them more precise and suitable for Indonesian logistics operations.

LOCATION INPUT UX

Replace the current simple "Titik Asal" and "Titik Tujuan" text inputs with structured cascading location selectors.

Use this hierarchy:

Kota / Kabupaten → Kecamatan → Kelurahan / Desa

However, do NOT make all three levels mandatory.

The required behavior is:

1. Kota / Kabupaten is REQUIRED.
2. Kecamatan is OPTIONAL.
3. Kelurahan / Desa is OPTIONAL and should only appear when the user chooses to add more location detail.

This should feel like a logistics location selector, not a long administrative address form.

--------------------------------
TITIK ASAL
--------------------------------

Change the label to:

"Lokasi Truk Saat Ini *"

First field:

"Kota / Kabupaten *"

Use a searchable dropdown / combobox.

Placeholder:

"Pilih kota atau kabupaten"

Example selected value:

"Jakarta Selatan"

The dropdown should contain Indonesian cities and regencies.

When the city/regency is selected, enable the Kecamatan dropdown.

Second field:

"Kecamatan"

Use a searchable dropdown / combobox.

Placeholder:

"Pilih kecamatan (opsional)"

This dropdown must only show kecamatan belonging to the selected Kota / Kabupaten.

Do not make this field required.

If no kecamatan is selected, the user can still continue with the form.

Below the Kecamatan field, show a subtle text action:

"+ Tambahkan detail lokasi"

When clicked, reveal the third field:

"Kelurahan / Desa"

Use a searchable dropdown / combobox.

Placeholder:

"Pilih kelurahan atau desa (opsional)"

This field must only show locations belonging to the selected Kecamatan.

Kelurahan / Desa is optional.

If the user has not selected a Kecamatan, the Kelurahan / Desa field should remain unavailable.

--------------------------------
TITIK TUJUAN
--------------------------------

Use exactly the same cascading location pattern.

Change the label to:

"Tujuan Akhir *"

First field:

"Kota / Kabupaten *"

Placeholder:

"Pilih kota atau kabupaten"

Second field:

"Kecamatan"

Placeholder:

"Pilih kecamatan (opsional)"

Below it:

"+ Tambahkan detail lokasi"

When expanded:

"Kelurahan / Desa"

Placeholder:

"Pilih kelurahan atau desa (opsional)"

The destination city/regency must be different from the origin city/regency.

--------------------------------
DROPDOWN BEHAVIOR
--------------------------------

All location dropdowns should be searchable.

When the dropdown opens, show a compact search field at the top.

Example:

Search:
[ 🔍 Cari kota atau kabupaten... ]

Then show matching results.

For hierarchical results, clearly communicate the hierarchy.

Example:

Bandung
Kota Bandung · Jawa Barat

Cicendo
Kecamatan Cicendo · Kota Bandung

Do not display a huge list of all Indonesian locations at once.

Use dependent dropdown behavior:

Kota / Kabupaten
    ↓
Kecamatan
    ↓
Kelurahan / Desa

When a parent location changes, reset the dependent child fields.

For example:

If the user changes Kota / Kabupaten,
clear the selected Kecamatan and Kelurahan / Desa.

If the user changes Kecamatan,
clear the selected Kelurahan / Desa.

--------------------------------
VISUAL DESIGN
--------------------------------

Keep the existing BackFlow AI visual language exactly.

Do NOT redesign the page.

Keep:
- dark navy header
- teal AI/matching accent
- orange primary CTA
- very light gray page background
- white form card
- subtle border
- subtle shadow
- rounded corners
- strong sans-serif typography
- desktop-first layout
- generous whitespace
- existing 3-step progress indicator

The new location selectors should visually match the existing input fields.

Use a small chevron icon on the right side of every dropdown.

Do not use floating labels.

Labels remain above the inputs.

Required fields use a small red asterisk.

Optional fields explicitly display "(opsional)" in the label or placeholder.

--------------------------------
HELPER TEXT
--------------------------------

Under the location section, add a very subtle helper text:

"Detail kecamatan membantu AI menghitung kecocokan rute dengan lebih presisi."

Keep this text small and secondary.

Do not over-explain the location hierarchy.

--------------------------------
IMPORTANT UX PRINCIPLE
--------------------------------

The dispatcher should be able to complete the form quickly using only:

Kota / Kabupaten Asal
+
Kota / Kabupaten Tujuan

Additional location precision should be available through Kecamatan and optionally Kelurahan / Desa, but should never become a mandatory burden.

The page should still feel like:

"Masukkan kondisi perjalanan → AI mencari muatan balik terbaik"

rather than:

"Isi formulir alamat lengkap."

Do not add a map.
Do not add GPS tracking.
Do not add address autocomplete.
Do not add street address fields.
Do not add latitude/longitude fields.
Do not add additional logistics fields.

Only improve the existing location selection UX.
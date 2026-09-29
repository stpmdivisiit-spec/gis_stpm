// ==========================================
// 1. KONFIGURASI GLOBAL & VARIABEL
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwbEe00oqifJUoDsk7FuidVeOHa513hO2mAIEGCuk5a09RtPersY97LuLO624RPk_g/exec';

let isAdmin = false; 
let drawControl = null; 
let fiturSedangDigambar = null;
let draftSession = { markers: [], shapes: [] };
let databaseUtama = { markers: [], shapes: [] };
let isMeasuring = false;
let measureType = 'distance';
let objekSedangDiedit = null; // Memori untuk Edit Objek

const modalDataInstance = new bootstrap.Modal(document.getElementById('modalData'));
const modalLogin = new bootstrap.Modal(document.getElementById('modalLogin'));
const modalConfirm = new bootstrap.Modal(document.getElementById('modalConfirm'));
const modalSearch = new bootstrap.Modal(document.getElementById('modalSearch'));
let confirmCallback = null;

// ==========================================
// 1.1 FUNGSI LANDING PAGE
// ==========================================
function closeLandingSplash() {
    const splash = document.getElementById('landing-splash');
    if(splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }
}

// ==========================================
// 1.2 DATA MASTER KATEGORI & IKON
// ==========================================
const defaultCategories = {
    "Administrasi Pemerintahan": ["Kantor Bupati/Wali Kota", "Kantor Camat", "Kantor Kepala Desa", "Balai Desa", "Kantor Dinas/Instansi", "Polsek/Pos Polisi", "Koramil", "Posyandu", "Puskesmas"],
    "Batas Wilayah & Tata Ruang": ["Batas Kabupaten/Kota", "Batas Kecamatan", "Batas Desa/Kelurahan", "Batas Dusun", "Batas Lingkungan/RW", "Batas RT", "Wilayah Adat / Ulayat", "Hutan Lindung", "Hutan Produksi", "Area Konservasi"],
    "Penggunaan Lahan & Ekonomi": ["Lahan Pertanian", "Area Persawahan", "Ladang / Tegalan", "Area Perkebunan", "Area Peternakan", "Area Perikanan / Tambak", "Pasar Tradisional", "Pusat Perdagangan", "Kawasan Industri", "UMKM / Sentra Produksi"],
    "Sosial, Budaya & Kependudukan": ["Permukiman Padat Penduduk", "Permukiman Reguler", "Rumah Adat / Bale", "Tempat Ibadah", "Pemakaman Umum", "Situs Sejarah / Budaya", "Wilayah Komunitas / Suku Tertentu", "Area Rawan Bencana"],
    "Infrastruktur & Fasilitas Umum": ["Jalan Raya / Nasional", "Jalan Desa", "Jembatan", "Pelabuhan / Dermaga", "Terminal / Halte", "Fasilitas Pendidikan (SD/SMP/SMA)", "Fasilitas Kesehatan", "Sumber Air Bersih", "Saluran Irigasi / Sungai", "Menara Telekomunikasi / BTS", "Fasilitas Listrik / Gardu"]
};

const iconList = [
    { class: 'fa-location-dot', name: 'Titik Lokasi (Default)', desc: 'Penanda lokasi standar' },
    { class: 'fa-building-columns', name: 'Kantor Pemerintahan', desc: 'Balai Desa, Kantor Camat, Bupati' },
    { class: 'fa-house-flag', name: 'Rumah Adat / Balai', desc: 'Fasilitas adat, balai pertemuan warga' },
    { class: 'fa-map-location-dot', name: 'Batas Wilayah / Adat', desc: 'Penanda zona, batas desa, ulayat' },
    { class: 'fa-wheat-awn', name: 'Pertanian / Sawah', desc: 'Area persawahan, ladang, panen' },
    { class: 'fa-seedling', name: 'Perkebunan', desc: 'Lahan perkebunan, area hijau, bibit' },
    { class: 'fa-cow', name: 'Peternakan', desc: 'Kawasan kandang, peternakan warga' },
    { class: 'fa-fish-fins', name: 'Perikanan / Tambak', desc: 'Area budidaya ikan, nelayan, pesisir' },
    { class: 'fa-tree', name: 'Hutan / Ruang Terbuka', desc: 'Hutan lindung, area konservasi, taman' },
    { class: 'fa-water', name: 'Sumber Air / Sungai', desc: 'Mata air, irigasi, sungai, danau' },
    { class: 'fa-users', name: 'Demografi / Penduduk', desc: 'Kepadatan penduduk, wilayah komunitas' },
    { class: 'fa-house', name: 'Permukiman Warga', desc: 'Area perumahan, rumah warga' },
    { class: 'fa-shop', name: 'Pasar / Ekonomi', desc: 'Pasar desa, toko, sentra ekonomi UMKM' },
    { class: 'fa-road', name: 'Jalan Raya / Akses', desc: 'Infrastruktur jalan raya, jalan desa' },
    { class: 'fa-bridge-water', name: 'Jembatan', desc: 'Infrastruktur penghubung, jembatan' },
    { class: 'fa-house-medical', name: 'Fasilitas Kesehatan', desc: 'Puskesmas, Posyandu, Klinik desa' },
    { class: 'fa-school', name: 'Fasilitas Pendidikan', desc: 'Sekolah, Pesantren' },
    { class: 'fa-place-of-worship', name: 'Tempat Ibadah', desc: 'Ikon umum tempat ibadah agama' },
    { class: 'fa-monument', name: 'Situs Budaya', desc: 'Monumen, peninggalan sejarah, makam' },
    { class: 'fa-tower-cell', name: 'Menara / BTS', desc: 'Infrastruktur telekomunikasi desa' },
    { class: 'fa-bolt', name: 'Fasilitas Listrik', desc: 'Gardu listrik, penerangan jalan' },
    { class: 'fa-triangle-exclamation', name: 'Rawan Bencana', desc: 'Titik longsor, banjir, zona bahaya' }
];

let kategoriSelect = new TomSelect("#form-kategori", { create: true, sortField: false, placeholder: "Cari atau ketik kategori baru..." });

let iconSelect = new TomSelect("#form-icon", {
    valueField: 'class', labelField: 'name', searchField: ['name', 'class', 'desc'], options: iconList, create: true, 
    render: {
        option: function(data, escape) {
            return `<div class="d-flex align-items-center p-2 border-bottom border-secondary border-opacity-25">
                        <div class="fs-3 text-primary me-3 text-center" style="width: 40px;"><i class="fa-solid ${escape(data.class)}"></i></div>
                        <div><div class="fw-bold text-light">${escape(data.name)}</div><div class="small text-secondary" style="font-size:0.75rem;">${escape(data.desc || 'Ikon kustom')} | <code>${escape(data.class)}</code></div></div>
                    </div>`;
        },
        item: function(data, escape) {
            return `<div class="d-flex align-items-center fw-bold"><i class="fa-solid ${escape(data.class)} me-2 text-primary fs-5"></i> ${escape(data.name)}</div>`;
        }
    }
});
iconSelect.setValue('fa-location-dot');

// ==========================================
// 1.5 TOAST & CONFIRM MODALS
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    let icon = type === 'success' ? 'fa-circle-check text-success' : (type === 'warning' ? 'fa-triangle-exclamation text-warning' : (type === 'danger' ? 'fa-circle-xmark text-danger' : 'fa-circle-info text-primary'));
    toast.innerHTML = `<i class="fa-solid ${icon} fs-5"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); toast.addEventListener('animationend', () => toast.remove()); }, 3500);
}

function showConfirm(message, callback) {
    document.getElementById('confirm-msg').innerText = message;
    confirmCallback = callback;
    modalConfirm.show();
}

document.addEventListener('DOMContentLoaded', () => {
    const btnConfirm = document.getElementById('btn-confirm-yes');
    if (btnConfirm) btnConfirm.addEventListener('click', () => { modalConfirm.hide(); if(confirmCallback) confirmCallback(); });
});

// ==========================================
// 2. INISIASI MAPBOX
// ==========================================
mapboxgl.accessToken = 'pk.eyJ1Ijoib3pub3ZlbCIsImEiOiJjbXVocDg0eTgwYTV6MnhvZHR3eml5MzhxIn0.YRY8_U6ir9nL6BrEi6IbLw';
const STYLE_STREET = 'mapbox://styles/mapbox/dark-v11';
const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';

const map = new mapboxgl.Map({
    container: 'map', style: STYLE_STREET, center: [121.662, -8.840], zoom: 14, pitch: 60, bearing: -20, preserveDrawingBuffer: true
});

// ==========================================
// 3. KONTROL TOOLBAR (RESTRICTED)
// ==========================================
class GISExtendedToolbar {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        
        const toolGroups = [
            [
                { id: 'tool-identify', icon: 'fa-hand-pointer', title: 'Select / Identify', action: () => { map.getCanvas().style.cursor = 'default'; if(drawControl) drawControl.changeMode('simple_select'); } },
                { id: 'tool-coord', icon: 'fa-location-crosshairs', title: 'Coordinate Picker', action: () => toggleCoordinatePicker() }
            ],
            [
                { id: 'tool-marker', icon: 'fa-map-pin', title: 'Add Marker', adminOnly: true, action: () => { drawControl.changeMode('draw_point'); } },
                { id: 'tool-polyline', icon: 'fa-route', title: 'Add Polyline', adminOnly: true, action: () => { drawControl.changeMode('draw_line_string'); } },
                { id: 'tool-polygon', icon: 'fa-draw-polygon', title: 'Add Polygon', adminOnly: true, action: () => { drawControl.changeMode('draw_polygon'); } },
                { id: 'tool-rect', icon: 'fa-vector-square', title: 'Create Rectangle', adminOnly: true, action: () => { generateShape('rectangle'); } },
                { id: 'tool-circle', icon: 'fa-circle-notch', title: 'Create Circle', adminOnly: true, action: () => { generateShape('circle'); } }
            ],
            [
                { id: 'tool-delete', icon: 'fa-trash', title: 'Delete Selected', adminOnly: true, action: () => { 
                    showConfirm('Hapus objek ini dari draft?', () => { drawControl.trash(); showToast('Objek dihapus dari draft', 'success'); }); 
                } },
                { id: 'tool-clear', icon: 'fa-eraser', title: 'Clear Draft', adminOnly: true, action: () => { if(drawControl) drawControl.deleteAll(); } }
            ],
            [
                { id: 'tool-meas-dist', icon: 'fa-ruler', title: 'Measure Distance', action: () => startMeasurement('distance') },
                { id: 'tool-meas-area', icon: 'fa-ruler-combined', title: 'Measure Area', action: () => startMeasurement('area') },
                { id: 'tool-meas-clear', icon: 'fa-broom', title: 'Clear Measure', action: () => { stopMeasurement(); } } 
            ],
            [
                { id: 'tool-search', icon: 'fa-magnifying-glass', title: 'Search Object', action: () => promptSearch() },
                { id: 'tool-gps', icon: 'fa-crosshairs', title: 'My Location', action: () => locateUser() },
                { id: 'tool-fullext', icon: 'fa-expand', title: 'Full Extent', action: () => map.flyTo({ center: [121.662, -8.840], zoom: 13.5, pitch: 60 }) }
            ]
        ];

        toolGroups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'tool-group';
            let isAllAdminOnly = true;
            
            group.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'gis-toolbar-btn'; 
                btn.title = t.title; 
                btn.innerHTML = `<i class="fa-solid ${t.icon}"></i>`;
                
                if(t.adminOnly) { btn.classList.add('admin-only-tool', 'd-none'); } 
                else { isAllAdminOnly = false; }
                
                btn.onclick = (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.gis-toolbar-btn').forEach(b => b.classList.remove('active-tool'));
                    btn.classList.add('active-tool'); 
                    t.action();
                };
                groupDiv.appendChild(btn);
            });
            if(isAllAdminOnly) groupDiv.classList.add('admin-only-group', 'd-none');
            this._container.appendChild(groupDiv);
        });
        return this._container;
    }
    onRemove() { this._container.parentNode.removeChild(this._container); this._map = undefined; }
}

// ==========================================
// 4. MAP EVENTS & RENDERING
// ==========================================
map.addControl(new GISExtendedToolbar(), 'top-right');

map.on('load', async () => {
    if(API_URL.includes('PASTE')) return document.getElementById('navigasi-container').innerHTML = '<div class="text-danger small">Masukkan API_URL Apps Script!</div>';

    drawControl = new MapboxDraw({ 
        displayControlsDefault: false, controls: { polygon: true, line_string: true, point: true, trash: true }, defaultMode: 'simple_select' 
    });
    map.addControl(drawControl, 'bottom-right');
    
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', calculateMeasurement);

    renderGedung3DBawaan();
    await ambilDataDariServer();
});

function handleDrawCreate(e) {
    if(isMeasuring) { calculateMeasurement(e); return; }
    if(isAdmin) {
        fiturSedangDigambar = e.features[0];
        document.getElementById('form-koordinat').value = '';
        kategoriSelect.clear(); 
        modalDataInstance.show();
    } else {
        drawControl.deleteAll();
    }
}

function ubahModePeta(mode) {
    document.getElementById('btn-mode-street').classList.remove('active');
    document.getElementById('btn-mode-satellite').classList.remove('active');
    document.getElementById('btn-mode-' + mode).classList.add('active');
    
    map.setStyle(mode === 'satellite' ? STYLE_SATELLITE : STYLE_STREET);
    map.once('style.load', () => { if(mode === 'street') renderGedung3DBawaan(); renderObjekKePeta(); });
}

function renderGedung3DBawaan() {
    if(!map.getLayer('add-3d-buildings')) {
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find((l) => l.type === 'symbol' && l.layout['text-field'])?.id;
        map.addLayer({
            'id': 'add-3d-buildings', 'source': 'composite', 'source-layer': 'building', 'filter': ['==', 'extrude', 'true'], 
            'type': 'fill-extrusion', 'minzoom': 14,
            'paint': { 'fill-extrusion-color': '#343a40', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'min_height'], 'fill-extrusion-opacity': 0.8 }
        }, labelLayerId);
    }
}

// ==========================================
// 5. SERVER DATA & UI NAVIGASI
// ==========================================
async function ambilDataDariServer() {
    try {
        const respon = await fetch(API_URL);
        const rawData = await respon.json();
        
        databaseUtama.shapes = rawData.shapes || [];
        databaseUtama.markers = rawData.markers || [];
        
        kategoriSelect.clearOptions();
        kategoriSelect.clearOptionGroups();

        for (const [groupName, catArray] of Object.entries(defaultCategories)) {
            kategoriSelect.addOptionGroup(groupName, {label: groupName});
            catArray.forEach(cat => kategoriSelect.addOption({value: cat, text: cat, optgroup: groupName}));
        }

        if(rawData.categories) {
            for (const [groupName, catArray] of Object.entries(rawData.categories)) {
                kategoriSelect.addOptionGroup(groupName, {label: groupName}); 
                catArray.forEach(cat => kategoriSelect.addOption({value: cat, text: cat, optgroup: groupName}));
            }
        }
        renderMenuKategori();
        renderObjekKePeta();
    } catch (err) { showToast("Gagal memuat data dari Server.", "danger"); }
}

function renderMenuKategori() {
    const wadah = document.getElementById('navigasi-container');
    wadah.innerHTML = '';
    const semuaData = [...databaseUtama.shapes, ...databaseUtama.markers, ...draftSession.shapes, ...draftSession.markers];
    if(semuaData.length === 0) { wadah.innerHTML = '<span class="text-secondary small">Belum ada data tersimpan.</span>'; return; }
    
    const grupKategori = {};
    semuaData.forEach(item => { if(!grupKategori[item.Kategori]) grupKategori[item.Kategori] = []; grupKategori[item.Kategori].push(item); });
    
    for (const [kategori, isiArray] of Object.entries(grupKategori)) {
        const btnKat = document.createElement('div'); btnKat.className = 'kategori-header';
        btnKat.innerHTML = `<span><i class="fa-solid fa-layer-group text-primary me-2"></i> ${kategori}</span> <i class="fa-solid fa-chevron-down small opacity-50"></i>`;
        
        const subWadah = document.createElement('div'); subWadah.className = 'submenu-container';
        
        isiArray.forEach(item => {
            const itemLok = document.createElement('div'); itemLok.className = 'lokasi-item';
            const ikon = item.Icon || 'fa-draw-polygon';
            const tag = item.isDraft ? '<span class="badge bg-danger ms-2" style="font-size:0.6rem;">DRAFT</span>' : '';
            itemLok.innerHTML = `<div class="lokasi-icon"><i class="fa-solid ${ikon}"></i></div> <div class="text-truncate" style="max-width:80%;"><strong>${item.Nama}</strong>${tag}</div>`;
            itemLok.onclick = () => sorotDanTampilkanDetail(item);
            subWadah.appendChild(itemLok);
        });

        btnKat.onclick = () => subWadah.classList.toggle('aktif');
        wadah.appendChild(btnKat); wadah.appendChild(subWadah);
    }
}

// PANEL DETAIL ADVANCED DENGAN TURF.JS & AKSI CRUD
function sorotDanTampilkanDetail(item) {
    let lng, lat, area = 0, length = 0, geomType = 'Point';
    
    if (item.Lat) { 
        lng = parseFloat(item.Lng); lat = parseFloat(item.Lat); geomType = 'Point';
    } else if (item.GeoJSON) {
        const geojsonObj = JSON.parse(item.GeoJSON);
        geomType = geojsonObj.type; 
        const p = turf.centroid({type: 'Feature', geometry: geojsonObj}); 
        lng = p.geometry.coordinates[0]; lat = p.geometry.coordinates[1]; 
        
        if (geomType.includes('Polygon')) area = turf.area({type: 'Feature', geometry: geojsonObj});
        else if (geomType === 'LineString') length = turf.length({type: 'Feature', geometry: geojsonObj}, {units: 'kilometers'});
    }
    
    map.flyTo({ center: [lng, lat], zoom: 17, pitch: 50, duration: 2500, essential: true });
    
    document.getElementById('detail-id').innerText = item.ID || '-';
    document.getElementById('detail-nama').innerText = item.Nama || 'Tanpa Nama';
    document.getElementById('detail-kategori').innerText = item.Kategori || '-';
    document.getElementById('detail-deskripsi').innerText = item.Deskripsi || 'Tidak ada keterangan detail.';
    document.getElementById('detail-koordinat').innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    const tstamp = item.Timestamp ? new Date(item.Timestamp).toLocaleString('id-ID') : 'Belum Sinkron';
    document.getElementById('detail-timestamp').innerText = tstamp;
    document.getElementById('detail-status').innerText = item.Status === 'Deleted' ? 'Menunggu Hapus' : (item.isDraft ? 'Draft (Belum Save)' : 'Aktif');

    const geomContainer = document.getElementById('detail-geom-info');
    let geomHtml = '';
    if (geomType.includes('Polygon')) {
        geomHtml = `<i class="fa-solid fa-draw-polygon text-primary me-2"></i> Geometri: Area Teritorial<br>
                    <i class="fa-solid fa-ruler-combined text-primary me-2 mt-2"></i> Luas Area: <b>${area.toFixed(2)} m&sup2;</b>`;
        if(item.WarnaArea) geomHtml += `<br><i class="fa-solid fa-fill-drip text-primary me-2 mt-2"></i> Fill: <span style="color:${item.WarnaArea}"><b>${item.WarnaArea}</b></span> (Opacity: ${item.Opacity||'N/A'})`;
    } else if (geomType === 'LineString') {
        geomHtml = `<i class="fa-solid fa-route text-primary me-2"></i> Geometri: Garis/Jalur<br>
                    <i class="fa-solid fa-ruler text-primary me-2 mt-2"></i> Panjang: <b>${(length * 1000).toFixed(2)} Meter</b>`;
        if(item.WarnaGaris) geomHtml += `<br><i class="fa-solid fa-paint-roller text-primary me-2 mt-2"></i> Stroke: <span style="color:${item.WarnaGaris}"><b>${item.WarnaGaris}</b></span>`;
    } else {
        geomHtml = `<i class="fa-solid fa-location-dot text-primary me-2"></i> Geometri: Titik Penanda<br>
                    <i class="fa-solid fa-icons text-primary me-2 mt-2"></i> Ikon Marker: <code>${item.Icon || 'fa-location-dot'}</code>`;
    }
    geomContainer.innerHTML = geomHtml;

    document.getElementById('btn-zoom-obj').onclick = () => map.flyTo({ center: [lng, lat], zoom: 19, pitch: 60 });
    document.getElementById('btn-edit-obj').onclick = () => prosesEditObjek(item);
    document.getElementById('btn-delete-obj').onclick = () => prosesHapusObjek(item);
    document.getElementById('detail-box').style.display = 'block';
}

function renderObjekKePeta() {
    const poligonGabungan = [...databaseUtama.shapes, ...draftSession.shapes].filter(s => s.Status !== 'Deleted');
    const markerGabungan = [...databaseUtama.markers, ...draftSession.markers].filter(m => m.Status !== 'Deleted');

    if(map.getLayer('fill-poligon')) { map.removeLayer('fill-poligon'); map.removeLayer('garis-poligon'); }
    if(map.getSource('sumber-poligon')) map.removeSource('sumber-poligon');
    
    const fiturGeom = poligonGabungan.map(s => ({ type:'Feature', geometry: JSON.parse(s.GeoJSON) }));
    map.addSource('sumber-poligon', { type: 'geojson', data: {type: 'FeatureCollection', features: fiturGeom} });
    
    map.addLayer({ 'id': 'fill-poligon', 'type': 'fill', 'source': 'sumber-poligon', 'paint': { 'fill-color': '#0d6efd', 'fill-opacity': 0.3 }});
    map.addLayer({ 'id': 'garis-poligon', 'type': 'line', 'source': 'sumber-poligon', 'paint': { 'line-color': '#6ea8fe', 'line-width': 2 }});

    document.querySelectorAll('.custom-marker').forEach(m => m.remove());
    markerGabungan.forEach(m => {
        const el = document.createElement('div'); el.className = `custom-marker ${m.isDraft ? 'marker-draft' : ''}`;
        el.innerHTML = `<i class="fa-solid ${m.Icon || 'fa-location-dot'}"></i>`;
        el.onclick = () => sorotDanTampilkanDetail(m);
        new mapboxgl.Marker(el).setLngLat([parseFloat(m.Lng), parseFloat(m.Lat)]).addTo(map);
    });
}

// ==========================================
// 6. ADMIN, OTENTIKASI & DRAFT GAMBAR
// ==========================================
function prosesLogin() {
    if(document.getElementById('login-user').value === 'admin' && document.getElementById('login-pass').value === 'stpm2026') {
        isAdmin = true; 
        modalLogin.hide();
        
        document.getElementById('btn-login').classList.add('d-none'); 
        document.getElementById('btn-logout').classList.remove('d-none');
        document.getElementById('draft-box').classList.remove('d-none');
        document.getElementById('public-welcome-text').classList.add('d-none');
        
        document.querySelectorAll('.admin-only-tool').forEach(el => el.classList.remove('d-none'));
        document.querySelectorAll('.admin-only-group').forEach(el => el.classList.remove('d-none'));
        
        map.flyTo({ pitch: 0, bearing: 0, duration: 1500 });
        showToast('Login berhasil. Mode Admin & Alat Menggambar telah dibuka.', 'success');
    } else {
        showToast('Username atau Password salah!', 'danger');
    }
}

function logoutAdmin() { location.reload(); }

function tarikKoordinatPeta() {
    if (!fiturSedangDigambar) return;
    const t = fiturSedangDigambar.geometry.type; 
    const i = document.getElementById('form-koordinat');
    if (t === 'Point') i.value = `${fiturSedangDigambar.geometry.coordinates[1].toFixed(6)}, ${fiturSedangDigambar.geometry.coordinates[0].toFixed(6)}`;
    else { const p = turf.centroid(fiturSedangDigambar); i.value = `${p.geometry.coordinates[1].toFixed(6)}, ${p.geometry.coordinates[0].toFixed(6)} (Pusat Area)`; }
    i.style.color = "#ffffff";
}

function batalGambarDraft() { 
    if(drawControl) drawControl.deleteAll(); 
    objekSedangDiedit = null;
    modalDataInstance.hide(); 
}

// CRUD Edit Data
function prosesEditObjek(item) {
    objekSedangDiedit = item;
    document.getElementById('form-nama').value = item.Nama || '';
    document.getElementById('form-deskripsi').value = item.Deskripsi || '';
    
    kategoriSelect.addOption({value: item.Kategori, text: item.Kategori});
    kategoriSelect.setValue(item.Kategori);
    
    if (item.Lat) {
        iconSelect.setValue(item.Icon || 'fa-location-dot');
        document.getElementById('form-icon').closest('.mb-3').style.display = 'block';
        document.getElementById('form-koordinat').value = `${item.Lat}, ${item.Lng}`;
    } else {
        document.getElementById('form-icon').closest('.mb-3').style.display = 'none';
        document.getElementById('form-koordinat').value = `Data Geometri Terkunci (Hanya Edit Metadata)`;
    }
    
    document.getElementById('detail-box').style.display = 'none';
    modalDataInstance.show();
}

// CRUD Hapus Data (Soft Delete)
function prosesHapusObjek(item) {
    showConfirm(`Hapus permanen data "${item.Nama}"? Data akan ditandai untuk dihapus pada server.`, () => {
        const deletedObj = { ...item, Status: 'Deleted', isDraft: true };
        if (item.Lat) {
            draftSession.markers.push(deletedObj);
            databaseUtama.markers = databaseUtama.markers.filter(m => m.ID !== item.ID);
        } else {
            draftSession.shapes.push(deletedObj);
            databaseUtama.shapes = databaseUtama.shapes.filter(s => s.ID !== item.ID);
        }
        
        document.getElementById('detail-box').style.display = 'none';
        renderMenuKategori(); renderObjekKePeta();
        document.getElementById('draft-counter').innerText = `${draftSession.markers.length + draftSession.shapes.length} Antrean (Termasuk Hapus)`;
        showToast('Objek dihilangkan dari peta. Jangan lupa klik Simpan Permanen!', 'warning');
    });
}

function simpanKeDraftMemori() {
    const nama = document.getElementById('form-nama').value || 'Tanpa Nama';
    const kategori = document.getElementById('form-kategori').value;
    const deskripsi = document.getElementById('form-deskripsi').value;

    if (objekSedangDiedit) {
        const updatedObj = { ...objekSedangDiedit, Nama: nama, Kategori: kategori, Deskripsi: deskripsi, Status: 'Active', isDraft: true };
        if (updatedObj.Lat) {
            updatedObj.Icon = document.getElementById('form-icon').value;
            const draftIndex = draftSession.markers.findIndex(m => m.ID === updatedObj.ID);
            if(draftIndex > -1) draftSession.markers[draftIndex] = updatedObj; else draftSession.markers.push(updatedObj);
            databaseUtama.markers = databaseUtama.markers.filter(m => m.ID !== updatedObj.ID);
        } else {
            const draftIndex = draftSession.shapes.findIndex(s => s.ID === updatedObj.ID);
            if(draftIndex > -1) draftSession.shapes[draftIndex] = updatedObj; else draftSession.shapes.push(updatedObj);
            databaseUtama.shapes = databaseUtama.shapes.filter(s => s.ID !== updatedObj.ID);
        }
        objekSedangDiedit = null;
        showToast('Perubahan metadata dialihkan ke Draft.', 'success');
    } else {
        if(!document.getElementById('form-koordinat').value || !fiturSedangDigambar) return showToast('Ambil koordinat peta terlebih dahulu!', 'warning');
        const objBaru = { ID: Date.now().toString(), Nama: nama, Kategori: kategori, Deskripsi: deskripsi, Status: 'Active', isDraft: true };
        if (fiturSedangDigambar.geometry.type === 'Point') { 
            objBaru.Icon = document.getElementById('form-icon').value; objBaru.Lat = fiturSedangDigambar.geometry.coordinates[1]; objBaru.Lng = fiturSedangDigambar.geometry.coordinates[0]; draftSession.markers.push(objBaru); 
        } else { 
            objBaru.GeoJSON = JSON.stringify(fiturSedangDigambar.geometry); draftSession.shapes.push(objBaru); 
        }
        showToast('Objek baru berhasil masuk Draft.', 'success');
    }
    
    modalDataInstance.hide(); 
    if(drawControl) drawControl.deleteAll();
    renderMenuKategori(); renderObjekKePeta();
    document.getElementById('draft-counter').innerText = `${draftSession.markers.length + draftSession.shapes.length} Antrean Perubahan`;
}

async function kirimDraftKeServer() {
    const total = draftSession.markers.length + draftSession.shapes.length;
    if(total === 0) return showToast("Belum ada draft untuk disimpan.", "warning");
    showConfirm(`Kirim permanen ${total} objek ini ke Google Spreadsheet?`, async () => {
        document.getElementById('draft-counter').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim data...';
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'save_bulk', data: draftSession }) });
            showToast("Penyimpanan berhasil! Layar akan dimuat ulang.", "success"); setTimeout(() => location.reload(), 1500);
        } catch(e) { 
            showToast("Proses selesai! Layar akan dimuat ulang.", "success"); setTimeout(() => location.reload(), 1500);
        }
    });
}

// ==========================================
// 7. FUNGSI NYATA GIS TOOLBAR
// ==========================================
function generateShape(type) {
    if(!drawControl) return;
    const center = map.getCenter(); let shape;
    if(type === 'circle') shape = turf.circle([center.lng, center.lat], 0.2, {steps: 32, units: 'kilometers'});
    else if (type === 'rectangle') { const pt = turf.point([center.lng, center.lat]); const buffered = turf.buffer(pt, 0.2, {units: 'kilometers'}); shape = turf.bboxPolygon(turf.bbox(buffered)); }
    if(shape) { shape.id = Date.now().toString(); drawControl.add(shape); showToast(`Bentuk ${type} dibuat di tengah layar.`, 'success'); }
}

function locateUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 18, pitch: 0 }); new mapboxgl.Marker({color: 'red'}).setLngLat([pos.coords.longitude, pos.coords.latitude]).addTo(map); showToast("Lokasi Anda ditemukan.", "success"); },
            (err) => showToast("Izin lokasi ditolak atau GPS tidak aktif.", "danger")
        );
    } else showToast("Browser Anda tidak mendukung Geolocation.", "danger");
}

function promptSearch() { document.getElementById('search-input').value = ''; modalSearch.show(); }

function executeSearch() {
    let q = document.getElementById('search-input').value; modalSearch.hide(); if(!q) return;
    const hasil = [...databaseUtama.shapes, ...databaseUtama.markers].find(item => item.Nama && item.Nama.toLowerCase().includes(q.toLowerCase()));
    if(hasil) { sorotDanTampilkanDetail(hasil); showToast(`Lokasi "${hasil.Nama}" ditemukan!`, 'success'); } 
    else showToast("Objek tidak ditemukan dalam database.", "warning");
}

let coordActive = false;
function toggleCoordinatePicker() {
    coordActive = !coordActive; const overlay = document.getElementById('coord-overlay');
    if(coordActive) { overlay.classList.remove('d-none'); map.getCanvas().style.cursor = 'crosshair'; map.on('mousemove', updateCoords); } 
    else { overlay.classList.add('d-none'); map.getCanvas().style.cursor = 'default'; map.off('mousemove', updateCoords); }
}
function updateCoords(e) { document.getElementById('hover-lat').innerText = e.lngLat.lat.toFixed(6); document.getElementById('hover-lng').innerText = e.lngLat.lng.toFixed(6); }

function startMeasurement(type) {
    if(!drawControl) return showToast('Modul draw belum dimuat.', 'danger');
    isMeasuring = true; measureType = type;
    document.getElementById('measure-overlay').classList.remove('d-none');
    document.getElementById('measure-text').innerText = `Ukur ${type === 'area' ? 'Luas' : 'Jarak'}... (Mulai Gambar)`;
    drawControl.changeMode(type === 'area' ? 'draw_polygon' : 'draw_line_string');
}

function calculateMeasurement(e) {
    if(!isMeasuring) return;
    const data = drawControl.getAll();
    if(data.features.length > 0) {
        const feature = data.features[data.features.length - 1]; 
        if (measureType === 'distance' && feature.geometry.type === 'LineString') document.getElementById('measure-text').innerText = `Jarak: ${(turf.length(feature, {units: 'kilometers'}) * 1000).toFixed(2)} Meter`;
        else if (measureType === 'area' && feature.geometry.type === 'Polygon') document.getElementById('measure-text').innerText = `Luas: ${turf.area(feature).toFixed(2)} Meter Persegi`;
    }
}

function stopMeasurement() {
    isMeasuring = false; document.getElementById('measure-overlay').classList.add('d-none');
    if(drawControl && !isAdmin) drawControl.deleteAll();
}

// ==========================================
// 8. EKSPOR DOKUMEN (PDF & JPG)
// ==========================================
function exportKePDF() {
    showToast("Sedang mengekspor ke PDF, harap tunggu...", "info");
    html2canvas(document.getElementById('map-container'), { useCORS: true }).then(canvas => {
        pdfMake.createPdf({
            pageOrientation: 'landscape',
            content: [
                { text: 'SISTEM INFORMASI GEOGRAFIS (GIS)', fontSize: 18, bold: true, color: '#0d6efd', alignment: 'center' },
                { text: 'GIS Tata Ruang Wilayah / Desa', fontSize: 12, italics: true, alignment: 'center', margin: [0, 0, 0, 15] },
                { image: canvas.toDataURL('image/jpeg', 0.9), width: 750, alignment: 'center', margin: [0, 0, 0, 15] },
                { text: 'Laporan Ringkasan Objek Terdaftar:', fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
                { table: { headerRows: 1, widths: ['*', 'auto', 'auto'], body: [['Nama Objek', 'Kategori', 'Status Data'], ...[...databaseUtama.shapes, ...databaseUtama.markers].map(i => [i.Nama, i.Kategori, 'Tersinkronisasi'])] } }
            ],
            footer: function(currentPage, pageCount) { return { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'center', fontSize: 9, color: '#777', margin: [0, 10, 0, 0] }; }
        }).download(`GIS_Peta_Wilayah_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}
function exportKeJPG() {
    showToast("Mengekspor gambar...", "info");
    html2canvas(document.getElementById('map-container'), { useCORS: true }).then(canvas => {
        const link = document.createElement('a'); link.download = `GIS_Peta_${new Date().getTime()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9); link.click();
    });
}
// ==========================================
// 1. KONFIGURASI GLOBAL & VARIABEL
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwbEe00oqifJUoDsk7FuidVeOHa513hO2mAIEGCuk5a09RtPersY97LuLO624RPk_g/exec';

let isAdmin = false; 
let drawControl = null; 
let fiturSedangDigambar = null;
let draftSession = { markers: [], shapes: [] };
let databaseUtama = { markers: [], shapes: [] };

// Variabel Pengukuran (Measure)
let isMeasuring = false;
let measureType = 'distance'; // 'distance' atau 'area'

// Inisiasi UI Frameworks (Termasuk Modal Custom Baru)
const modalDataInstance = new bootstrap.Modal(document.getElementById('modalData'));
const modalLogin = new bootstrap.Modal(document.getElementById('modalLogin'));
const modalConfirm = new bootstrap.Modal(document.getElementById('modalConfirm'));
const modalSearch = new bootstrap.Modal(document.getElementById('modalSearch'));
let confirmCallback = null;

// Inisiasi Picker Kategori dengan Live Search
let kategoriSelect = new TomSelect("#form-kategori", {
    create: true, // Mengizinkan Admin mengetik kategori baru 
    sortField: false, 
    placeholder: "Cari atau ketik kategori baru..."
});

// ==========================================
// 1.5. SISTEM NOTIFIKASI & KONFIRMASI KUSTOM (TOAST)
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return; // Mencegah error jika div belum siap
    
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let icon = 'fa-circle-info text-primary';
    if(type === 'success') icon = 'fa-circle-check text-success';
    if(type === 'warning') icon = 'fa-triangle-exclamation text-warning';
    if(type === 'danger') icon = 'fa-circle-xmark text-danger';

    toast.innerHTML = `<i class="fa-solid ${icon} fs-5"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Hilangkan toast setelah 3.5 detik
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

function showConfirm(message, callback) {
    document.getElementById('confirm-msg').innerText = message;
    confirmCallback = callback;
    modalConfirm.show();
}

// Menempelkan event klik pada tombol konfirmasi "Ya" (Hanya di-load setelah DOM siap)
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirm = document.getElementById('btn-confirm-yes');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            modalConfirm.hide();
            if(confirmCallback) confirmCallback();
        });
    }
});

// ==========================================
// 2. INISIASI MAPBOX
// ==========================================
mapboxgl.accessToken = 'pk.eyJ1Ijoib3pub3ZlbCIsImEiOiJjbXVocDg0eTgwYTV6MnhvZHR3eml5MzhxIn0.YRY8_U6ir9nL6BrEi6IbLw';
const STYLE_STREET = 'mapbox://styles/mapbox/dark-v11';
const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';

const map = new mapboxgl.Map({
    container: 'map',
    style: STYLE_STREET,
    center: [121.662, -8.840],
    zoom: 14,
    pitch: 60,
    bearing: -20,
    preserveDrawingBuffer: true
});

// ==========================================
// 3. KONTROL TOOLBAR EXTENDED GIS (MODULAR)
// ==========================================
class GISExtendedToolbar {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        
        // Array 2D untuk memisahkan ke dalam "tool-group"
        const toolGroups = [
            // GROUP 1: Selection & Pointer
            [
                { id: 'tool-identify', icon: 'fa-hand-pointer', title: 'Select / Identify', action: () => { map.getCanvas().style.cursor = 'default'; if(drawControl) drawControl.changeMode('simple_select'); } },
                { id: 'tool-coord', icon: 'fa-location-crosshairs', title: 'Coordinate Picker', action: () => toggleCoordinatePicker() }
            ],
            // GROUP 2: Drawing (Batasi Fungsi jika bukan Admin)
            [
                { id: 'tool-marker', icon: 'fa-map-pin', title: 'Add Marker', action: () => { if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); drawControl.changeMode('draw_point'); } },
                { id: 'tool-polyline', icon: 'fa-route', title: 'Add Polyline', action: () => { if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); drawControl.changeMode('draw_line_string'); } },
                { id: 'tool-polygon', icon: 'fa-draw-polygon', title: 'Add Polygon', action: () => { if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); drawControl.changeMode('draw_polygon'); } },
                { id: 'tool-rect', icon: 'fa-vector-square', title: 'Create Rectangle', action: () => { if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); generateShape('rectangle'); } },
                { id: 'tool-circle', icon: 'fa-circle-notch', title: 'Create Circle', action: () => { if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); generateShape('circle'); } }
            ],
            // GROUP 3: Editing
            [
                { id: 'tool-delete', icon: 'fa-trash', title: 'Delete Selected', action: () => { 
                    if(!isAdmin) return showToast('Login Admin diperlukan', 'warning'); 
                    showConfirm('Hapus objek ini dari draft?', () => { 
                        drawControl.trash(); 
                        showToast('Objek berhasil dihapus dari draft', 'success'); 
                    }); 
                } },
                { id: 'tool-clear', icon: 'fa-eraser', title: 'Clear Draft/Measure', action: () => { if(drawControl) drawControl.deleteAll(); stopMeasurement(); } }
            ],
            // GROUP 4: Measurement (Bisa dipakai semua pengguna)
            [
                { id: 'tool-meas-dist', icon: 'fa-ruler', title: 'Measure Distance', action: () => startMeasurement('distance') },
                { id: 'tool-meas-area', icon: 'fa-ruler-combined', title: 'Measure Area', action: () => startMeasurement('area') }
            ],
            // GROUP 5: Navigation & GPS
            [
                { id: 'tool-search', icon: 'fa-magnifying-glass', title: 'Search Object', action: () => promptSearch() },
                { id: 'tool-gps', icon: 'fa-crosshairs', title: 'My Location', action: () => locateUser() },
                { id: 'tool-fullext', icon: 'fa-expand', title: 'Full Extent', action: () => map.flyTo({ center: [121.662, -8.840], zoom: 13.5, pitch: 60 }) }
            ]
        ];

        // Looping pembuatan DOM berdasarkan grup
        toolGroups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'tool-group';
            
            group.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'gis-toolbar-btn'; 
                btn.title = t.title; 
                btn.innerHTML = `<i class="fa-solid ${t.icon}"></i>`;
                
                btn.onclick = (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.gis-toolbar-btn').forEach(b => b.classList.remove('active-tool'));
                    btn.classList.add('active-tool'); 
                    t.action();
                };
                groupDiv.appendChild(btn);
            });
            this._container.appendChild(groupDiv);
        });

        return this._container;
    }
    
    onRemove() { 
        this._container.parentNode.removeChild(this._container); 
        this._map = undefined; 
    }
}

// ==========================================
// 4. MAP EVENTS & RENDERING
// ==========================================
map.addControl(new GISExtendedToolbar(), 'top-right');

map.on('load', async () => {
    if(API_URL.includes('PASTE')) {
        return document.getElementById('navigasi-container').innerHTML = '<div class="text-danger small">Masukkan API_URL Apps Script!</div>';
    }

    // Inisialisasi Mapbox Draw DI AWAL agar tool Measure (Ukur) bisa langsung dipakai
    drawControl = new MapboxDraw({ 
        displayControlsDefault: false, 
        controls: { polygon: true, line_string: true, point: true, trash: true }, 
        defaultMode: 'simple_select' 
    });
    map.addControl(drawControl, 'bottom-right'); // Disembunyikan fiturnya di bottom right karena UI toolbar kita kustom
    
    // Listener saat shape digambar
    map.on('draw.create', handleDrawCreate);
    map.on('draw.update', calculateMeasurement);

    renderGedung3DBawaan();
    await ambilDataDariServer();
});

function handleDrawCreate(e) {
    if(isMeasuring) {
        calculateMeasurement(e);
        return;
    }
    // Jika bukan mengukur, maka masuk mode admin (Data Properti Baru)
    if(isAdmin) {
        fiturSedangDigambar = e.features[0];
        document.getElementById('form-koordinat').value = '';
        kategoriSelect.clear(); 
        modalDataInstance.show();
    } else {
        drawControl.deleteAll(); // Hapus jika bukan admin mencoba menggambar
    }
}

function ubahModePeta(mode) {
    document.getElementById('btn-mode-street').classList.remove('active');
    document.getElementById('btn-mode-satellite').classList.remove('active');
    document.getElementById('btn-mode-' + mode).classList.add('active');
    
    const newStyle = mode === 'satellite' ? STYLE_SATELLITE : STYLE_STREET;
    map.setStyle(newStyle);
    
    map.once('style.load', () => {
        if(mode === 'street') renderGedung3DBawaan();
        renderObjekKePeta();
    });
}

function renderGedung3DBawaan() {
    if(!map.getLayer('add-3d-buildings')) {
        const layers = map.getStyle().layers;
        const labelLayerId = layers.find((l) => l.type === 'symbol' && l.layout['text-field'])?.id;
        
        map.addLayer({
            'id': 'add-3d-buildings', 
            'source': 'composite', 
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'], 
            'type': 'fill-extrusion', 
            'minzoom': 14,
            'paint': { 
                'fill-extrusion-color': '#343a40', 
                'fill-extrusion-height': ['get', 'height'], 
                'fill-extrusion-base': ['get', 'min_height'], 
                'fill-extrusion-opacity': 0.8 
            }
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
        
        // Memisahkan data dari struktur server baru
        databaseUtama.shapes = rawData.shapes || [];
        databaseUtama.markers = rawData.markers || [];
        databaseUtama.lines = rawData.lines || []; 
        
        // Render Optgroup dinamis ke TomSelect
        if(rawData.categories) {
            kategoriSelect.clearOptions();
            kategoriSelect.clearOptionGroups();
            for (const [groupName, catArray] of Object.entries(rawData.categories)) {
                kategoriSelect.addOptionGroup(groupName, {label: groupName});
                catArray.forEach(cat => {
                    kategoriSelect.addOption({value: cat, text: cat, optgroup: groupName});
                });
            }
        }
        renderMenuKategori();
        renderObjekKePeta();
    } catch (err) { 
        document.getElementById('navigasi-container').innerHTML = '<span class="text-danger small">Gagal memuat data dari Spreadsheet. Pastikan Apps Script aktif.</span>'; 
    }
}

function renderMenuKategori() {
    const wadah = document.getElementById('navigasi-container');
    wadah.innerHTML = '';
    
    const semuaData = [...databaseUtama.shapes, ...databaseUtama.markers, ...draftSession.shapes, ...draftSession.markers];
    if(semuaData.length === 0) { 
        wadah.innerHTML = '<span class="text-secondary small">Belum ada data tersimpan.</span>'; 
        return; 
    }
    
    const grupKategori = {};
    semuaData.forEach(item => { 
        if(!grupKategori[item.Kategori]) grupKategori[item.Kategori] = []; 
        grupKategori[item.Kategori].push(item); 
    });
    
    for (const [kategori, isiArray] of Object.entries(grupKategori)) {
        const btnKat = document.createElement('div'); 
        btnKat.className = 'kategori-header';
        btnKat.innerHTML = `<span><i class="fa-solid fa-layer-group text-primary me-2"></i> ${kategori}</span> <i class="fa-solid fa-chevron-down small opacity-50"></i>`;
        
        const subWadah = document.createElement('div'); 
        subWadah.className = 'submenu-container';
        
        isiArray.forEach(item => {
            const itemLok = document.createElement('div'); 
            itemLok.className = 'lokasi-item';
            
            const ikon = item.Icon || 'fa-draw-polygon';
            const tag = item.isDraft ? '<span class="badge bg-danger ms-2" style="font-size:0.6rem;">DRAFT</span>' : '';
            
            itemLok.innerHTML = `<div class="lokasi-icon"><i class="fa-solid ${ikon}"></i></div> <div class="text-truncate" style="max-width:80%;"><strong>${item.Nama}</strong>${tag}</div>`;
            itemLok.onclick = () => sorotDanTampilkanDetail(item);
            
            subWadah.appendChild(itemLok);
        });

        btnKat.onclick = () => subWadah.classList.toggle('aktif');
        wadah.appendChild(btnKat); 
        wadah.appendChild(subWadah);
    }
}

function sorotDanTampilkanDetail(item) {
    let lng, lat;
    if (item.Lat) { 
        lng = parseFloat(item.Lng); 
        lat = parseFloat(item.Lat); 
    } else { 
        const p = turf.centroid({type: 'Feature', geometry: JSON.parse(item.GeoJSON)}); 
        lng = p.geometry.coordinates[0]; 
        lat = p.geometry.coordinates[1]; 
    }
    
    map.flyTo({ center: [lng, lat], zoom: 17, pitch: 50, duration: 2500, essential: true });
    
    document.getElementById('detail-nama').innerText = item.Nama;
    document.getElementById('detail-kategori').innerText = item.Kategori;
    document.getElementById('detail-deskripsi').innerText = item.Deskripsi || 'Tidak ada deskripsi.';
    document.getElementById('detail-koordinat').innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('detail-box').style.display = 'block';
}

function renderObjekKePeta() {
    const poligonGabungan = [...databaseUtama.shapes, ...draftSession.shapes];
    const markerGabungan = [...databaseUtama.markers, ...draftSession.markers];

    if(map.getLayer('fill-poligon')) { 
        map.removeLayer('fill-poligon'); 
        map.removeLayer('garis-poligon'); 
    }
    
    if(map.getSource('sumber-poligon')) {
        map.removeSource('sumber-poligon');
    }
    
    const fiturGeom = poligonGabungan.map(s => ({ type:'Feature', geometry: JSON.parse(s.GeoJSON) }));
    map.addSource('sumber-poligon', { type: 'geojson', data: {type: 'FeatureCollection', features: fiturGeom} });
    
    map.addLayer({ 'id': 'fill-poligon', 'type': 'fill', 'source': 'sumber-poligon', 'paint': { 'fill-color': '#0d6efd', 'fill-opacity': 0.3 }});
    map.addLayer({ 'id': 'garis-poligon', 'type': 'line', 'source': 'sumber-poligon', 'paint': { 'line-color': '#6ea8fe', 'line-width': 2 }});

    document.querySelectorAll('.custom-marker').forEach(m => m.remove());
    markerGabungan.forEach(m => {
        const el = document.createElement('div'); 
        el.className = `custom-marker ${m.isDraft ? 'marker-draft' : ''}`;
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
        
        map.flyTo({ pitch: 0, bearing: 0, duration: 1500 });
        showToast('Login berhasil. Mode Admin aktif.', 'success');
    } else {
        showToast('Username atau Password salah!', 'danger');
    }
}

function logoutAdmin() { location.reload(); }

function tarikKoordinatPeta() {
    if (!fiturSedangDigambar) return;
    
    const t = fiturSedangDigambar.geometry.type; 
    const i = document.getElementById('form-koordinat');
    
    if (t === 'Point') {
        i.value = `${fiturSedangDigambar.geometry.coordinates[1].toFixed(6)}, ${fiturSedangDigambar.geometry.coordinates[0].toFixed(6)}`;
    } else { 
        const p = turf.centroid(fiturSedangDigambar); 
        i.value = `${p.geometry.coordinates[1].toFixed(6)}, ${p.geometry.coordinates[0].toFixed(6)} (Pusat Area)`; 
    }
    
    i.style.color = "#ffffff";
}

function batalGambarDraft() { 
    if(drawControl) drawControl.deleteAll(); 
    modalDataInstance.hide(); 
}

function simpanKeDraftMemori() {
    if(!document.getElementById('form-koordinat').value) return showToast('Ambil koordinat terlebih dahulu!', 'warning');
    
    const obj = {
        ID: Date.now().toString(), 
        Nama: document.getElementById('form-nama').value || 'Tanpa Nama',
        Kategori: document.getElementById('form-kategori').value, 
        Deskripsi: document.getElementById('form-deskripsi').value, 
        isDraft: true
    };
    
    if (fiturSedangDigambar.geometry.type === 'Point') { 
        obj.Icon = document.getElementById('form-icon').value; 
        obj.Lat = fiturSedangDigambar.geometry.coordinates[1]; 
        obj.Lng = fiturSedangDigambar.geometry.coordinates[0]; 
        draftSession.markers.push(obj); 
    } else { 
        obj.GeoJSON = JSON.stringify(fiturSedangDigambar.geometry); 
        draftSession.shapes.push(obj); 
    }
    
    modalDataInstance.hide(); 
    if(drawControl) drawControl.deleteAll();
    
    renderMenuKategori(); 
    renderObjekKePeta();
    document.getElementById('draft-counter').innerText = `${draftSession.markers.length + draftSession.shapes.length} Objek Draft`;
    showToast('Berhasil ditambahkan ke sesi Draft.', 'success');
}

async function kirimDraftKeServer() {
    const total = draftSession.markers.length + draftSession.shapes.length;
    if(total === 0) return showToast("Belum ada draft untuk disimpan.", "warning");
    
    showConfirm(`Kirim permanen ${total} objek ini ke Google Spreadsheet?`, async () => {
        document.getElementById('draft-counter').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim data...';
        
        try {
            await fetch(API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'save_bulk', data: draftSession }) 
            });
            showToast("Penyimpanan berhasil! Layar akan dimuat ulang.", "success"); 
            setTimeout(() => location.reload(), 1500);
        } catch(e) { 
            // Fallback (Kadang fetch no-cors melempar error meskipun sukses)
            showToast("Proses selesai! Layar akan dimuat ulang.", "success"); 
            setTimeout(() => location.reload(), 1500);
        }
    });
}

// ==========================================
// 7. FUNGSI NYATA GIS TOOLBAR (Ukur, Cari, Geolocation)
// ==========================================

// -- A. GENERATOR SHAPE (Rectangle & Circle via Turf) --
function generateShape(type) {
    if(!drawControl) return;
    const center = map.getCenter();
    let shape;
    if(type === 'circle') {
        shape = turf.circle([center.lng, center.lat], 0.2, {steps: 32, units: 'kilometers'});
    } else if (type === 'rectangle') {
        const pt = turf.point([center.lng, center.lat]);
        const buffered = turf.buffer(pt, 0.2, {units: 'kilometers'});
        shape = turf.bboxPolygon(turf.bbox(buffered));
    }
    
    if(shape) {
        shape.id = Date.now().toString();
        drawControl.add(shape);
        showToast(`Bentuk ${type} dibuat di tengah layar. Geser kursor untuk mengedit sudutnya.`, 'success');
    }
}

// -- B. GEOLOCATION (GPS) --
function locateUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 18, pitch: 0 });
                new mapboxgl.Marker({color: 'red'})
                    .setLngLat([pos.coords.longitude, pos.coords.latitude])
                    .addTo(map);
                showToast("Lokasi Anda ditemukan.", "success");
            },
            (err) => showToast("Izin lokasi ditolak atau GPS tidak aktif.", "danger")
        );
    } else {
        showToast("Browser Anda tidak mendukung Geolocation.", "danger");
    }
}

// -- C. PENCARIAN OBJEK LOKAL (Modal Base) --
function promptSearch() {
    document.getElementById('search-input').value = '';
    modalSearch.show();
}

function executeSearch() {
    let q = document.getElementById('search-input').value;
    modalSearch.hide();
    
    if(!q) return;
    q = q.toLowerCase();
    
    const semuaData = [...databaseUtama.shapes, ...databaseUtama.markers];
    const hasil = semuaData.find(item => item.Nama && item.Nama.toLowerCase().includes(q));
    
    if(hasil) {
        sorotDanTampilkanDetail(hasil);
        showToast(`Lokasi "${hasil.Nama}" ditemukan!`, 'success');
    } else {
        showToast("Objek tidak ditemukan dalam database.", "warning");
    }
}

// -- D. COORDINATE PICKER REALTIME --
let coordActive = false;
function toggleCoordinatePicker() {
    coordActive = !coordActive;
    const overlay = document.getElementById('coord-overlay');
    if(coordActive) {
        overlay.classList.remove('d-none');
        map.getCanvas().style.cursor = 'crosshair';
        map.on('mousemove', updateCoords);
    } else {
        overlay.classList.add('d-none');
        map.getCanvas().style.cursor = 'default';
        map.off('mousemove', updateCoords);
    }
}
function updateCoords(e) {
    document.getElementById('hover-lat').innerText = e.lngLat.lat.toFixed(6);
    document.getElementById('hover-lng').innerText = e.lngLat.lng.toFixed(6);
}

// -- E. MEASURE TOOLS (Distance & Area) --
function startMeasurement(type) {
    if(!drawControl) return showToast('Modul draw belum dimuat.', 'danger');
    isMeasuring = true;
    measureType = type;
    
    document.getElementById('measure-overlay').classList.remove('d-none');
    document.getElementById('measure-text').innerText = `Ukur ${type === 'area' ? 'Luas' : 'Jarak'}... (Mulai Gambar)`;
    
    drawControl.changeMode(type === 'area' ? 'draw_polygon' : 'draw_line_string');
}

function calculateMeasurement(e) {
    if(!isMeasuring) return;
    const data = drawControl.getAll();
    if(data.features.length > 0) {
        const feature = data.features[data.features.length - 1]; 
        if (measureType === 'distance' && feature.geometry.type === 'LineString') {
            const distance = turf.length(feature, {units: 'kilometers'});
            document.getElementById('measure-text').innerText = `Jarak: ${(distance * 1000).toFixed(2)} Meter`;
        } else if (measureType === 'area' && feature.geometry.type === 'Polygon') {
            const area = turf.area(feature);
            document.getElementById('measure-text').innerText = `Luas: ${area.toFixed(2)} Meter Persegi`;
        }
    }
}

function stopMeasurement() {
    isMeasuring = false;
    document.getElementById('measure-overlay').classList.add('d-none');
    if(drawControl && !isAdmin) drawControl.deleteAll(); // Hapus garis ukur setelah selesai bagi guest
}

// ==========================================
// 8. EKSPOR DOKUMEN (PDF & JPG)
// ==========================================
function exportKePDF() {
    showToast("Sedang mengekspor ke PDF, harap tunggu...", "info");
    html2canvas(document.getElementById('map-container'), { useCORS: true }).then(canvas => {
        const dataImage = canvas.toDataURL('image/jpeg', 0.9);
        const docDefinition = {
            pageOrientation: 'landscape',
            content: [
                { text: 'SISTEM INFORMASI GEOGRAFIS (GIS)', fontSize: 18, bold: true, color: '#0d6efd', alignment: 'center' },
                { text: 'Kampus STPM Santa Ursula Ende - Flores NTT', fontSize: 12, italics: true, alignment: 'center', margin: [0, 0, 0, 15] },
                { image: dataImage, width: 750, alignment: 'center', margin: [0, 0, 0, 15] },
                { text: 'Laporan Ringkasan Objek Terdaftar:', fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
                {
                    table: {
                        headerRows: 1, widths: ['*', 'auto', 'auto'],
                        body: [
                            ['Nama Objek / Gedung', 'Kategori Geografis', 'Status Data'],
                            ...[...databaseUtama.shapes, ...databaseUtama.markers].map(i => [i.Nama, i.Kategori, 'Tersinkronisasi'])
                        ]
                    }
                }
            ],
            footer: function(currentPage, pageCount) { 
                return { 
                    text: `Dicetak melalui Web GIS STPM Ende - Halaman ${currentPage} dari ${pageCount}`, 
                    alignment: 'center', fontSize: 9, color: '#777', margin: [0, 10, 0, 0] 
                }; 
            }
        };
        pdfMake.createPdf(docDefinition).download(`GIS_STPM_Ende_${new Date().toISOString().slice(0,10)}.pdf`);
    });
}

function exportKeJPG() {
    showToast("Mengekspor gambar...", "info");
    html2canvas(document.getElementById('map-container'), { useCORS: true }).then(canvas => {
        const link = document.createElement('a'); 
        link.download = `GIS_STPM_${new Date().getTime()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9); 
        link.click();
    });
}
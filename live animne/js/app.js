// ==================== MAIN APPLICATION ====================

// Inisialisasi AOS
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 800,
        once: true
    });
}

// Hide loader
function hideLoader() {
    setTimeout(() => {
        const loader = document.getElementById('loaderWrapper');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 800);
}

// Initialize all components
async function init() {
    try {
        // Inisialisasi IndexedDB
        await initIndexedDB();
        
        // Load fallback videos jika diperlukan
        await loadFallbackVideos();
        
        // Load semua video
        await loadAllVideos();
        
        // Setup UI components
        setupCategories();
        setupSearch();
        setupModal();
        setupLogo();
        setupCleanButton(); // Tombol bersihkan video rusak
        
        // Auto cleanup saat startup (opsional)
        setTimeout(async () => {
            const videos = await getAllVideos();
            const invalidVideos = videos.filter(v => v.isValid === false);
            if (invalidVideos.length > 0) {
                console.log(`Found ${invalidVideos.length} invalid videos, cleaning up...`);
                await checkAndRemoveInvalidVideos();
                await loadAllVideos();
            }
        }, 2000);
        
        // Hide loader
        hideLoader();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Gagal memuat aplikasi: ' + error.message);
    }
}

// Start application
init();
// Tambahkan di awal init()
console.log('App starting...');
console.log('Checking DOM elements:');
console.log('- videoGridContainer:', document.getElementById('videoGridContainer'));
console.log('- mainPlayer:', document.getElementById('mainPlayer'));
console.log('- uploadBtn:', document.getElementById('uploadBtn'));

// Tambahkan test video setelah load
setTimeout(async () => {
    const videos = await getAllVideos();
    if (videos.length > 0) {
        console.log('First video available:', videos[0].title);
        // Uncomment untuk test play otomatis (optional)
        // await playVideo(videos[0]);
    }
}, 3000);
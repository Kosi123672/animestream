// ==================== UI COMPONENTS ====================
let allVideos = [];
let currentCategory = "all";
let searchKeyword = "";

// Render video grid dengan debug
function renderVideoGrid() {
    console.log('Rendering video grid, total videos:', allVideos.length);
    
    let filtered = [...allVideos];
    
    // Filter hanya video yang valid
    filtered = filtered.filter(v => v.isValid !== false);
    
    // Filter kategori
    if (currentCategory !== "all") {
        filtered = filtered.filter(v => v.category === currentCategory);
    }
    
    // Filter search
    if (searchKeyword.trim() !== "") {
        const kw = searchKeyword.trim().toLowerCase();
        filtered = filtered.filter(v => v.title.toLowerCase().includes(kw));
    }
    
    const grid = document.getElementById('videoGridContainer');
    const resultCountSpan = document.getElementById('resultCount');
    
    if (!grid) {
        console.error('Video grid container not found');
        return;
    }
    
    resultCountSpan.innerText = `${filtered.length} video`;
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-result">
                <i class="fas fa-video-slash" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                <h3>Tidak ada video</h3>
                <p style="margin-top: 10px; color: #aaa;">Upload video baru atau ubah pencarian</p>
                <button onclick="document.getElementById('uploadBtn').click()" style="margin-top: 20px; padding: 10px 20px; background: #ff4d6d; border: none; border-radius: 40px; color: white; cursor: pointer;">
                    <i class="fas fa-upload"></i> Upload Video
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filtered.map(video => `
        <div class="video-card" data-id="${video.id}">
            <div class="delete-video" onclick="event.stopPropagation(); deleteVideo('${video.id}')">
                <i class="fas fa-trash"></i>
            </div>
            <div class="thumb">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/400x225/ff4d6d/ffffff?text=Thumbnail+Error'">
                ${video.duration ? `<div class="duration">${video.duration}</div>` : ''}
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
            <div class="card-info">
                <h3>${escapeHtml(video.title.substring(0, 80))}</h3>
                <div class="meta">
                    <span><i class="fas fa-tag"></i> ${video.category.toUpperCase()}</span>
                    <span><i class="fas fa-eye"></i> ${video.views || 0} views</span>
                    ${video.uploader === "user" ? '<span class="uploader-badge"><i class="fas fa-user"></i> Upload Anda</span>' : ''}
                </div>
                <div class="meta">
                    <span><i class="far fa-calendar"></i> ${new Date(video.uploadedAt).toLocaleDateString('id-ID')}</span>
                    ${video.fileSize ? `<span class="file-size"><i class="fas fa-hdd"></i> ${video.fileSize}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners dengan debugging
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (!e.target.closest('.delete-video')) {
                const videoId = card.getAttribute('data-id');
                console.log('Video card clicked, ID:', videoId);
                const video = allVideos.find(v => v.id === videoId);
                if (video) {
                    console.log('Found video:', video.title);
                    await playVideo(video);
                } else {
                    console.error('Video not found with ID:', videoId);
                }
            }
        });
    });
}

// Escape HTML untuk keamanan
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update storage info
async function updateStorageInfo() {
    try {
        const videos = await getAllVideos();
        const validVideos = videos.filter(v => v.isValid !== false);
        let totalSize = 0;
        
        videos.forEach(video => {
            if (video.videoData && video.isValid !== false) {
                totalSize += video.videoData.length * 0.75;
            }
        });
        
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        const invalidCount = videos.length - validVideos.length;
        const storageInfo = document.getElementById('storageInfo');
        
        if (storageInfo) {
            let invalidHtml = '';
            if (invalidCount > 0) {
                invalidHtml = `<span style="color: #ff4d6d;"> | ${invalidCount} rusak</span>`;
            }
            storageInfo.innerHTML = `<i class="fas fa-database"></i> ${validVideos.length} video | ${sizeInMB} MB${invalidHtml}`;
        }
    } catch (error) {
        console.error('Error getting storage info:', error);
    }
}

// Load semua video ke memory
async function loadAllVideos() {
    try {
        allVideos = await getAllVideos();
        console.log('Loaded videos:', allVideos.length);
        updateStorageInfo();
        renderVideoGrid();
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Setup category tabs
function setupCategories() {
    const categories = [
        { name: '✨ Semua', value: 'all' },
        { name: '📺 Anime', value: 'anime' },
        { name: '⚔️ Action', value: 'action' },
        { name: '✨ Fantasy', value: 'fantasy' },
        { name: '💖 Romance', value: 'romance' },
        { name: '🎬 Movie', value: 'movie' },
        { name: '📁 Upload', value: 'other' }
    ];
    
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <button class="cat-btn ${currentCategory === cat.value ? 'active' : ''}" data-cat="${cat.value}">
            ${cat.name}
        </button>
    `).join('');
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.getAttribute('data-cat');
            renderVideoGrid();
            
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Setup search
function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchKeyword = searchInput.value;
            renderVideoGrid();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchKeyword = searchInput.value;
                renderVideoGrid();
            }
        });
    }
}

// Setup logo reload
function setupLogo() {
    const logo = document.getElementById('logo');
    if (logo) {
        logo.addEventListener('click', () => {
            location.reload();
        });
    }
}

// Setup clean button
function setupCleanButton() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    const cleanBtn = document.createElement('button');
    cleanBtn.className = 'clean-btn';
    cleanBtn.innerHTML = '<i class="fas fa-broom"></i> Bersihkan Video Rusak';
    cleanBtn.style.cssText = `
        background: #ff4d6d20;
        border: 1px solid #ff4d6d;
        padding: 0.5rem 1rem;
        border-radius: 40px;
        color: #ff4d6d;
        cursor: pointer;
        transition: 0.3s;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    
    cleanBtn.onmouseenter = () => {
        cleanBtn.style.background = '#ff4d6d';
        cleanBtn.style.color = 'white';
    };
    
    cleanBtn.onmouseleave = () => {
        cleanBtn.style.background = '#ff4d6d20';
        cleanBtn.style.color = '#ff4d6d';
    };
    
    cleanBtn.onclick = async () => {
        await showCleanupDialog();
    };
    
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn && uploadBtn.parentNode) {
        uploadBtn.parentNode.insertBefore(cleanBtn, uploadBtn);
    }
}

// Show cleanup dialog
async function showCleanupDialog() {
    const modal = document.createElement('div');
    modal.className = 'cleanup-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="background: #12121a; border-radius: 24px; padding: 2rem; max-width: 500px; width: 90%; border: 1px solid #ff4d6d;">
            <h2 style="color: #ff4d6d; margin-bottom: 1rem;">
                <i class="fas fa-broom"></i> Bersihkan Video Rusak
            </h2>
            <p style="margin-bottom: 1rem;">Memeriksa dan menghapus video yang tidak dapat diputar...</p>
            <div style="background: #1e1e2a; border-radius: 8px; height: 8px; overflow: hidden; margin: 1rem 0;">
                <div id="cleanupProgress" style="width: 0%; height: 100%; background: linear-gradient(135deg, #ff4d6d, #ffb347); transition: width 0.3s;"></div>
            </div>
            <p id="cleanupStatus" style="font-size: 0.8rem; color: #aaa; margin-bottom: 1rem;">Memulai pemeriksaan...</p>
            <div style="display: flex; gap: 1rem;">
                <button id="cancelCleanup" style="flex: 1; padding: 0.8rem; background: #1e1e2a; border: none; border-radius: 40px; color: white; cursor: pointer;">Batal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const progressBar = modal.querySelector('#cleanupProgress');
    const statusText = modal.querySelector('#cleanupStatus');
    const cancelBtn = modal.querySelector('#cancelCleanup');
    
    let cancelled = false;
    
    cancelBtn.onclick = () => {
        cancelled = true;
        modal.remove();
    };
    
    try {
        const result = await checkAndRemoveInvalidVideos((current, total, title) => {
            if (cancelled) return;
            const percent = (current / total) * 100;
            progressBar.style.width = percent + '%';
            statusText.innerHTML = `Memeriksa (${current}/${total}): ${title.substring(0, 40)}...`;
        });
        
        if (!cancelled) {
            statusText.innerHTML = `✅ Selesai! Ditemukan ${result.removed} video rusak dan telah dihapus.`;
            progressBar.style.width = '100%';
            
            await loadAllVideos();
            
            setTimeout(() => {
                modal.remove();
            }, 2000);
        }
    } catch (error) {
        statusText.innerHTML = `❌ Error: ${error.message}`;
        setTimeout(() => {
            modal.remove();
        }, 2000);
    }
}
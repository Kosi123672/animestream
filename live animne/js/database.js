// ==================== KONFIGURASI INDEXEDDB ====================
const DB_NAME = 'AnimeStreamDB';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

let db = null;

// Inisialisasi IndexedDB
async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB connected');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(VIDEO_STORE)) {
                const videoStore = db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
                videoStore.createIndex('category', 'category', { unique: false });
                videoStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                videoStore.createIndex('title', 'title', { unique: false });
                videoStore.createIndex('isValid', 'isValid', { unique: false });
                console.log('Video store created');
            }
        };
    });
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Tambah video ke IndexedDB
async function addVideo(video) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEO_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.add(video);
        
        request.onsuccess = () => resolve(video);
        request.onerror = () => reject(request.error);
    });
}

// Update video
async function updateVideo(video) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEO_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.put(video);
        
        request.onsuccess = () => resolve(video);
        request.onerror = () => reject(request.error);
    });
}

// Hapus video
async function deleteVideoFromDB(videoId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEO_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.delete(videoId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Hapus multiple video
async function deleteMultipleVideos(videoIds) {
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);
    
    const promises = videoIds.map(id => {
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
    
    return Promise.all(promises);
}

// Get semua video
async function getAllVideos() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEO_STORE], 'readonly');
        const store = transaction.objectStore(VIDEO_STORE);
        const index = store.index('uploadedAt');
        const request = index.openCursor(null, 'prev');
        const videos = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                videos.push(cursor.value);
                cursor.continue();
            } else {
                resolve(videos);
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Dapatkan durasi video
function getVideoDuration(videoDataURL) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const minutes = Math.floor(video.duration / 60);
            const seconds = Math.floor(video.duration % 60);
            resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve('N/A');
        video.src = videoDataURL;
    });
}

// Cek validitas video (apakah bisa diputar)
async function checkVideoValidity(video) {
    return new Promise((resolve) => {
        if (video.source === "upload" && video.videoData) {
            const testVideo = document.createElement('video');
            testVideo.preload = 'metadata';
            
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000);
            
            testVideo.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            testVideo.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            testVideo.src = video.videoData;
        } else if (video.source === "youtube" && video.youtubeId) {
            // Cek YouTube video dengan thumbnail
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000);
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            img.src = `https://img.youtube.com/vi/${video.youtubeId}/0.jpg`;
        } else {
            resolve(false);
        }
    });
}

// Cek dan hapus video yang tidak valid
async function checkAndRemoveInvalidVideos(onProgress) {
    const videos = await getAllVideos();
    const invalidVideos = [];
    
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        if (onProgress) {
            onProgress(i + 1, videos.length, video.title);
        }
        
        // Skip jika sudah ditandai invalid sebelumnya
        if (video.isValid === false) {
            invalidVideos.push(video.id);
            continue;
        }
        
        const isValid = await checkVideoValidity(video);
        
        if (!isValid) {
            invalidVideos.push(video.id);
            
            // Update status di database
            video.isValid = false;
            await updateVideo(video);
        } else {
            video.isValid = true;
            await updateVideo(video);
        }
    }
    
    if (invalidVideos.length > 0) {
        await deleteMultipleVideos(invalidVideos);
    }
    
    return {
        removed: invalidVideos.length,
        total: videos.length
    };
}

// Load fallback videos
async function loadFallbackVideos() {
    const videos = await getAllVideos();
    
    if (videos.length === 0) {
        const fallbackVideos = [
            {
                id: generateId(),
                title: "Attack on Titan - Trailer Final Season",
                category: "action",
                description: "Trailer resmi Attack on Titan Final Season",
                source: "youtube",
                youtubeId: "cihHMArN5B8",
                thumbnail: "https://img.youtube.com/vi/cihHMArN5B8/hqdefault.jpg",
                uploader: "system",
                uploadedAt: new Date().toISOString(),
                views: 0,
                duration: "2:30",
                isValid: true
            },
            {
                id: generateId(),
                title: "Jujutsu Kaisen - Best Fight Scenes",
                category: "action",
                description: "Kompilasi scene pertarungan terbaik Jujutsu Kaisen",
                source: "youtube",
                youtubeId: "ynrKxGMh5hA",
                thumbnail: "https://img.youtube.com/vi/ynrKxGMh5hA/hqdefault.jpg",
                uploader: "system",
                uploadedAt: new Date().toISOString(),
                views: 0,
                duration: "5:45",
                isValid: true
            },
            {
                id: generateId(),
                title: "Frieren: Beyond Journey's End",
                category: "fantasy",
                description: "Trailer anime Frieren",
                source: "youtube",
                youtubeId: "Q2NJs_aMqsc",
                thumbnail: "https://img.youtube.com/vi/Q2NJs_aMqsc/hqdefault.jpg",
                uploader: "system",
                uploadedAt: new Date().toISOString(),
                views: 0,
                duration: "1:52",
                isValid: true
            },
            {
                id: generateId(),
                title: "Your Name - Kimi no Na wa",
                category: "romance",
                description: "Trailer film anime Your Name",
                source: "youtube",
                youtubeId: "xU47nhruN-Q",
                thumbnail: "https://img.youtube.com/vi/xU47nhruN-Q/hqdefault.jpg",
                uploader: "system",
                uploadedAt: new Date().toISOString(),
                views: 0,
                duration: "2:15",
                isValid: true
            },
            {
                id: generateId(),
                title: "Demon Slayer: Mugen Train",
                category: "movie",
                description: "Trailer film Demon Slayer",
                source: "youtube",
                youtubeId: "ATJYac_dORw",
                thumbnail: "https://img.youtube.com/vi/ATJYac_dORw/hqdefault.jpg",
                uploader: "system",
                uploadedAt: new Date().toISOString(),
                views: 0,
                duration: "1:45",
                isValid: true
            }
        ];
        
        for (const video of fallbackVideos) {
            await addVideo(video);
        }
    }
}
// Tambahkan fungsi untuk debug
async function debugVideoData(videoId) {
    const video = await getVideoById(videoId);
    if (video) {
        console.log('Video debug info:', {
            id: video.id,
            title: video.title,
            source: video.source,
            hasVideoData: !!video.videoData,
            videoDataLength: video.videoData ? video.videoData.length : 0,
            videoDataPrefix: video.videoData ? video.videoData.substring(0, 100) : 'none',
            isValid: video.isValid
        });
    }
    return video;
}

// Get video by ID
async function getVideoById(videoId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([VIDEO_STORE], 'readonly');
        const store = transaction.objectStore(VIDEO_STORE);
        const request = store.get(videoId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
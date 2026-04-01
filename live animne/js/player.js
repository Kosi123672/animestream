// ==================== VIDEO PLAYER HANDLER ====================
let currentPlayer = null;

// Fungsi untuk memastikan video element berfungsi dengan baik
function createVideoElement(src, title) {
    const videoElement = document.createElement('video');
    videoElement.id = 'mainPlayer';
    videoElement.controls = true;
    videoElement.style.width = '100%';
    videoElement.style.aspectRatio = '16 / 9';
    videoElement.style.backgroundColor = '#000';
    
    // Tambahkan poster/thumbnail jika ada
    if (title) {
        videoElement.setAttribute('aria-label', title);
    }
    
    // Buat source element
    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    videoElement.appendChild(source);
    
    // Fallback text
    videoElement.innerHTML = 'Your browser does not support the video tag.';
    
    return videoElement;
}

// Play video dengan error handling yang lebih baik
async function playVideo(video) {
    console.log('Attempting to play video:', video.title);
    
    const wrapper = document.querySelector('.video-wrapper');
    const oldPlayer = document.getElementById('mainPlayer');
    
    if (!wrapper) {
        console.error('Video wrapper not found');
        return;
    }
    
    try {
        // Hapus player lama dengan aman
        if (oldPlayer) {
            oldPlayer.remove();
        }
        
        if (video.source === "upload" && video.videoData) {
            console.log('Playing uploaded video');
            
            // Cek apakah videoData valid
            if (!video.videoData || video.videoData.length < 100) {
                throw new Error('Data video tidak valid atau corrupt');
            }
            
            // Buat video element baru
            const videoElement = document.createElement('video');
            videoElement.id = 'mainPlayer';
            videoElement.controls = true;
            videoElement.style.width = '100%';
            videoElement.style.aspectRatio = '16 / 9';
            videoElement.style.backgroundColor = '#000';
            videoElement.style.borderRadius = '24px';
            
            // Set source
            videoElement.src = video.videoData;
            
            // Event listeners untuk debugging
            videoElement.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded, duration:', videoElement.duration);
                document.getElementById('currentPlayingTitle').innerHTML = `<i class="fas fa-play-circle"></i> NOW PLAYING — ${video.title}`;
            });
            
            videoElement.addEventListener('canplay', () => {
                console.log('Video can play now');
            });
            
            videoElement.addEventListener('error', (e) => {
                console.error('Video element error:', e);
                const errorMsg = videoElement.error ? 
                    `Error code: ${videoElement.error.code} - ${videoElement.error.message}` : 
                    'Unknown error';
                console.error(errorMsg);
                
                // Tampilkan pesan error yang lebih informatif
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    text-align: center;
                    background: rgba(0,0,0,0.8);
                    padding: 20px;
                    border-radius: 12px;
                    z-index: 10;
                `;
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff4d6d; margin-bottom: 10px; display: block;"></i>
                    <p style="margin-bottom: 10px;">Video tidak dapat diputar</p>
                    <small>File mungkin corrupt atau format tidak didukung</small>
                    <br>
                    <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px; background: #ff4d6d; border: none; border-radius: 20px; color: white; cursor: pointer;">Tutup</button>
                `;
                videoElement.parentElement.appendChild(errorDiv);
            });
            
            videoElement.addEventListener('loadstart', () => {
                console.log('Video load started');
            });
            
            // Append ke wrapper
            wrapper.appendChild(videoElement);
            currentPlayer = videoElement;
            
            // Coba play dengan penanganan autoplay
            try {
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.log('Autoplay was prevented:', e);
                        // Tampilkan tombol play manual jika autoplay diblokir
                        const playBtn = document.createElement('div');
                        playBtn.style.cssText = `
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: rgba(255,77,109,0.9);
                            width: 80px;
                            height: 80px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            z-index: 20;
                            transition: 0.3s;
                        `;
                        playBtn.innerHTML = '<i class="fas fa-play" style="font-size: 32px; color: white; margin-left: 5px;"></i>';
                        playBtn.onclick = () => {
                            videoElement.play();
                            playBtn.remove();
                        };
                        wrapper.appendChild(playBtn);
                        
                        setTimeout(() => {
                            if (playBtn.parentElement) playBtn.remove();
                        }, 5000);
                    });
                }
            } catch (e) {
                console.log('Play failed:', e);
            }
            
        } else if (video.source === "youtube" && video.youtubeId) {
            console.log('Playing YouTube video:', video.youtubeId);
            
            // Cek koneksi YouTube
            const checkImg = new Image();
            let timeoutId;
            
            const showYouTubePlayer = () => {
                const iframe = document.createElement('iframe');
                iframe.id = 'mainPlayer';
                iframe.src = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&controls=1&rel=0&modestbranding=1&enablejsapi=1`;
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.style.width = '100%';
                iframe.style.aspectRatio = '16 / 9';
                iframe.style.border = 'none';
                iframe.style.borderRadius = '24px';
                
                wrapper.appendChild(iframe);
                currentPlayer = iframe;
                
                document.getElementById('currentPlayingTitle').innerHTML = `<i class="fas fa-play-circle"></i> NOW PLAYING — ${video.title}`;
            };
            
            const showError = () => {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #1e1e2a;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                `;
                errorDiv.innerHTML = `
                    <i class="fab fa-youtube" style="font-size: 64px; color: #ff4d6d; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px;">Video YouTube Tidak Tersedia</h3>
                    <p style="margin-bottom: 20px; color: #aaa;">Video mungkin telah dihapus atau di-private</p>
                    <button onclick="if(confirm('Hapus video ini dari daftar?')) deleteVideo('${video.id}')" style="padding: 10px 20px; background: #ff4d6d; border: none; border-radius: 40px; color: white; cursor: pointer;">
                        <i class="fas fa-trash"></i> Hapus Video
                    </button>
                `;
                wrapper.appendChild(errorDiv);
                currentPlayer = errorDiv;
            };
            
            // Set timeout untuk cek koneksi
            timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                showError();
            }, 5000);
            
            checkImg.onload = () => {
                clearTimeout(timeoutId);
                showYouTubePlayer();
            };
            
            checkImg.onerror = () => {
                clearTimeout(timeoutId);
                showError();
            };
            
            checkImg.src = `https://img.youtube.com/vi/${video.youtubeId}/0.jpg`;
            return; // Tunggu callback
        }
        
        // Update judul dan views
        document.getElementById('currentPlayingTitle').innerHTML = `<i class="fas fa-play-circle"></i> NOW PLAYING — ${video.title}`;
        
        // Tambah views
        if (video.views !== undefined) {
            video.views = (video.views || 0) + 1;
            await updateVideo(video);
            
            // Refresh grid
            if (typeof renderVideoGrid === 'function') {
                renderVideoGrid();
            }
        }
        
        // Scroll ke player
        document.querySelector('.live-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Play video error:', error);
        
        // Tampilkan error di player
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #1e1e2a;
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            width: 100%;
            aspect-ratio: 16 / 9;
        `;
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #ff4d6d; margin-bottom: 20px;"></i>
            <h3 style="margin-bottom: 10px;">Gagal Memutar Video</h3>
            <p style="margin-bottom: 20px; color: #aaa;">${error.message || 'Terjadi kesalahan saat memutar video'}</p>
            <button onclick="if(confirm('Hapus video ini dari daftar?')) deleteVideo('${video.id}')" style="padding: 10px 20px; background: #ff4d6d; border: none; border-radius: 40px; color: white; cursor: pointer;">
                <i class="fas fa-trash"></i> Hapus Video
            </button>
        `;
        
        const wrapper = document.querySelector('.video-wrapper');
        if (wrapper) {
            // Hapus player lama
            const oldPlayer = document.getElementById('mainPlayer');
            if (oldPlayer) oldPlayer.remove();
            wrapper.appendChild(errorDiv);
            currentPlayer = errorDiv;
        }
    }
}

// Delete video dengan refresh
async function deleteVideo(videoId) {
    if (confirm('Apakah Anda yakin ingin menghapus video ini?')) {
        try {
            await deleteVideoFromDB(videoId);
            await loadAllVideos();
            
            // Reset player ke video default
            const wrapper = document.querySelector('.video-wrapper');
            if (wrapper) {
                const defaultVideo = document.createElement('video');
                defaultVideo.id = 'mainPlayer';
                defaultVideo.controls = true;
                defaultVideo.style.width = '100%';
                defaultVideo.style.aspectRatio = '16 / 9';
                defaultVideo.innerHTML = '<source src="" type="video/mp4">';
                defaultVideo.poster = 'https://via.placeholder.com/1920x1080/1e1e2a/ff4d6d?text=No+Video+Selected';
                
                const oldPlayer = document.getElementById('mainPlayer');
                if (oldPlayer) oldPlayer.remove();
                wrapper.appendChild(defaultVideo);
                currentPlayer = defaultVideo;
            }
            
            document.getElementById('currentPlayingTitle').innerHTML = `<i class="fas fa-play-circle"></i> NOW PLAYING — Pilih video untuk diputar`;
        } catch (error) {
            console.error('Delete error:', error);
            alert('Gagal menghapus video: ' + error.message);
        }
    }
}

// Play video dari URL (untuk testing)
async function testPlayVideoUrl(videoUrl, title) {
    const wrapper = document.querySelector('.video-wrapper');
    const oldPlayer = document.getElementById('mainPlayer');
    
    if (oldPlayer) oldPlayer.remove();
    
    const videoElement = document.createElement('video');
    videoElement.id = 'mainPlayer';
    videoElement.controls = true;
    videoElement.style.width = '100%';
    videoElement.style.aspectRatio = '16 / 9';
    videoElement.src = videoUrl;
    
    wrapper.appendChild(videoElement);
    currentPlayer = videoElement;
    
    videoElement.play().catch(e => console.log('Autoplay blocked:', e));
    document.getElementById('currentPlayingTitle').innerHTML = `<i class="fas fa-play-circle"></i> NOW PLAYING — ${title}`;
}
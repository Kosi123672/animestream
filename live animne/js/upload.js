// ==================== UPLOAD HANDLER ====================
// Read file as DataURL dengan progress
function readFileAsDataURL(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        
        if (onProgress) {
            reader.onprogress = onProgress;
        }
        
        reader.readAsDataURL(file);
    });
}

// Upload video dengan IndexedDB
async function uploadVideoWithIndexedDB(event) {
    event.preventDefault();
    
    const title = document.getElementById('videoTitle').value;
    const category = document.getElementById('videoCategory').value;
    const description = document.getElementById('videoDescription').value;
    const videoFile = document.getElementById('videoFile').files[0];
    const thumbnailFile = document.getElementById('thumbnailFile').files[0];
    
    if (!title || !videoFile) {
        alert('Mohon isi judul dan pilih file video!');
        return;
    }
    
    // Cek ukuran file
    if (videoFile.size > 500 * 1024 * 1024) {
        alert('Ukuran video terlalu besar! Maksimal 500MB.');
        return;
    }
    
    const submitBtn = document.getElementById('submitUpload');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    submitBtn.disabled = true;
    progressBar.classList.add('active');
    
    try {
        // Baca file video
        const videoData = await readFileAsDataURL(videoFile, (progress) => {
            const percent = (progress.loaded / progress.total) * 50;
            progressFill.style.width = percent + '%';
        });
        
        progressFill.style.width = '50%';
        
        // Baca thumbnail
        let thumbnailData = null;
        if (thumbnailFile) {
            thumbnailData = await readFileAsDataURL(thumbnailFile);
        }
        
        progressFill.style.width = '75%';
        
        // Dapatkan durasi video
        const duration = await getVideoDuration(videoData);
        
        progressFill.style.width = '90%';
        
        // Buat objek video
        const newVideo = {
            id: generateId(),
            title: title,
            category: category,
            description: description,
            source: "upload",
            videoData: videoData,
            thumbnail: thumbnailData || `https://via.placeholder.com/400x225/1e1e2a/ff4d6d?text=${encodeURIComponent(title.substring(0, 20))}`,
            uploader: "user",
            uploadedAt: new Date().toISOString(),
            views: 0,
            duration: duration,
            fileSize: formatFileSize(videoFile.size)
        };
        
        // Simpan ke IndexedDB
        await addVideo(newVideo);
        
        progressFill.style.width = '100%';
        
        setTimeout(() => {
            // Tutup modal
            document.getElementById('uploadModal').classList.remove('active');
            document.getElementById('uploadForm').reset();
            progressBar.classList.remove('active');
            progressFill.style.width = '0%';
            submitBtn.disabled = false;
            
            // Refresh tampilan
            if (typeof loadAllVideos === 'function') {
                loadAllVideos();
            }
            
            alert('Video berhasil diupload ke IndexedDB!');
        }, 500);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Gagal upload video: ' + error.message);
        progressBar.classList.remove('active');
        progressFill.style.width = '0%';
        submitBtn.disabled = false;
    }
}

// Setup modal upload
function setupModal() {
    const uploadBtn = document.getElementById('uploadBtn');
    const modal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelUpload');
    const form = document.getElementById('uploadForm');
    
    uploadBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
        document.getElementById('progressBar').classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            form.reset();
            document.getElementById('progressBar').classList.remove('active');
        }
    });
    
    form.addEventListener('submit', uploadVideoWithIndexedDB);
}
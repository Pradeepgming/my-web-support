// Function to update step indicator
function updateSteps(currentStep) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Function to handle file upload
async function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    
    updateSteps(1);
    const progressBar = document.querySelector('.upload-progress');
    const progressFill = document.querySelector('.progress-fill');
    const uploadResult = document.querySelector('.upload-result');
    const previewContainer = document.getElementById('previewContainer');
    const acceptBtn = document.querySelector('.accept-btn');
    const gameContainer = document.getElementById('gamePreview');
    
    // Reset UI
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    uploadResult.style.display = 'none';
    previewContainer.classList.remove('show');
    gameContainer.innerHTML = '';
    
    if (acceptBtn) {
        acceptBtn.disabled = true;
    }
    
    try {
        const processedFiles = [];
        let gameFile = null;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            await new Promise((resolve, reject) => {
                reader.onload = async (e) => {
                    try {
                        const progress = ((i + 1) / files.length) * 100;
                        progressFill.style.width = `${progress}%`;
                        
                        if (file.name.toLowerCase().endsWith('.zip')) {
                            const zipFiles = await handleZipFile(file);
                            processedFiles.push(...zipFiles);
                            
                            const gameFiles = zipFiles.filter(f => 
                                f.name.toLowerCase().endsWith('.html') || 
                                f.name.toLowerCase().endsWith('.htm')
                            );
                            if (gameFiles.length > 0) {
                                gameFile = gameFiles[0];
                            }
                        } else {
                            processedFiles.push({
                                name: file.name,
                                content: e.target.result
                            });
                            
                            if (file.name.toLowerCase().endsWith('.html') || 
                                file.name.toLowerCase().endsWith('.htm')) {
                                gameFile = {
                                    name: file.name,
                                    content: e.target.result
                                };
                            }
                        }
                        resolve();
                    } catch (error) {
                        console.error('Error processing file:', error);
                        reject(error);
                    }
                };
                
                reader.onerror = reject;
                
                if (file.name.toLowerCase().endsWith('.zip')) {
                    reader.readAsArrayBuffer(file);
                } else {
                    reader.readAsText(file);
                }
            });
        }
        
        window.uploadedFiles = processedFiles;
        window.gameFile = gameFile;
        
        progressBar.style.display = 'none';
        uploadResult.style.display = 'block';
        
        if (acceptBtn) {
            acceptBtn.disabled = false;
        }
        
        updateSteps(2);
        
    } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Please try again.');
        progressBar.style.display = 'none';
        uploadResult.style.display = 'none';
        if (acceptBtn) {
            acceptBtn.disabled = true;
        }
    }
}

// Function to handle file acceptance
function acceptFiles() {
    const files = window.uploadedFiles;
    const gameFile = window.gameFile;
    
    if (!files || files.length === 0) {
        alert('No files to accept!');
        return;
    }
    
    updateSteps(3);
    
    if (gameFile) {
        createGamePreview(gameFile.content);
    }
    
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.classList.add('show');
    
    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.name, file.content);
    });
    
    zip.generateAsync({ type: 'blob' }).then(content => {
        const downloadLink = document.querySelector('.download-link');
        const url = URL.createObjectURL(content);
        downloadLink.href = url;
        downloadLink.download = 'files.zip';
    });
    
    document.querySelector('.upload-result').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

// Function to create game preview
function createGamePreview(content) {
    const gameContainer = document.getElementById('gamePreview');
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    
    gameContainer.innerHTML = '';
    gameContainer.appendChild(iframe);
}

// Function to handle ZIP file
async function handleZipFile(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        const files = [];
        
        for (let filename in zip.files) {
            if (!zip.files[filename].dir) {
                const content = await zip.files[filename].async('string');
                files.push({
                    name: filename,
                    content: content
                });
            }
        }
        
        return files;
    } catch (error) {
        console.error('Error processing ZIP file:', error);
        throw error;
    }
}

// Function to generate custom link
function generateCustomLink() {
    const customUrl = document.getElementById('customUrl').value;
    const usePassword = document.getElementById('passwordProtection').checked;
    const password = usePassword ? document.getElementById('filePassword').value : '';
    
    if (usePassword && !password) {
        alert('Please enter a password');
        return;
    }
    
    const urlHash = customUrl || generateShortHash();
    const gameFile = window.gameFile;
    
    if (gameFile) {
        let content = gameFile.content;
        
        if (usePassword) {
            content = wrapWithPasswordProtection(content, password);
        }
        
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const viewLink = document.querySelector('.view-link');
        viewLink.href = url;
        
        const shortUrlDiv = document.getElementById('shortUrl');
        const shortUrlText = document.getElementById('shortUrlText');
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        const finalUrl = `${baseUrl}#${urlHash}${usePassword ? ':protected' : ''}`;
        
        shortUrlText.textContent = finalUrl;
        shortUrlDiv.style.display = 'flex';
        
        localStorage.setItem(`url_${urlHash}`, JSON.stringify({
            url: url,
            password: usePassword ? password : null,
            content: content
        }));
    }
}

// Function to wrap content with password protection
function wrapWithPasswordProtection(content, password) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Protected Content</title>
            <style>
                .password-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .password-screen.hidden {
                    display: none;
                }
                .password-form {
                    text-align: center;
                }
                .password-input {
                    margin: 10px 0;
                    padding: 8px;
                }
                .submit-btn {
                    padding: 8px 16px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div id="passwordScreen" class="password-screen">
                <div class="password-form">
                    <h2>Protected Content</h2>
                    <input type="password" id="password" class="password-input" placeholder="Enter password">
                    <button onclick="checkPassword()" class="submit-btn">Submit</button>
                </div>
            </div>
            <div id="content" style="display:none">
                ${content}
            </div>
            <script>
                function checkPassword() {
                    const password = document.getElementById('password').value;
                    if (password === '${password}') {
                        document.getElementById('passwordScreen').classList.add('hidden');
                        document.getElementById('content').style.display = 'block';
                    } else {
                        alert('Incorrect password');
                    }
                }
            </script>
        </body>
        </html>
    `;
}

// Function to generate a short hash
function generateShortHash(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = '';
    for (let i = 0; i < length; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

// Function to copy short URL
function copyShortUrl() {
    const shortUrl = document.getElementById('shortUrlText').textContent;
    navigator.clipboard.writeText(shortUrl).then(() => {
        alert('URL copied to clipboard!');
    });
}

// URL Shortener
function shortenUrl() {
    const longUrl = document.getElementById('longUrl').value;
    if (!longUrl) {
        alert('Please enter a URL');
        return;
    }
    const result = document.getElementById('shortUrlResult');
    result.style.display = 'block';
    result.innerHTML = `
        <div class="alert alert-success">
            <strong>Shortened URL:</strong><br>
            <a href="${longUrl}" target="_blank">https://short.url/${Math.random().toString(36).substr(2, 6)}</a>
        </div>
    `;
}

// Website Viewer
function viewWebsite() {
    const url = document.getElementById('viewUrl').value;
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    window.open(url, '_blank');
}

// File Downloader
function downloadFile() {
    const url = document.getElementById('fileUrl').value;
    if (!url) {
        alert('Please enter a file URL');
        return;
    }
    window.open(url, '_blank');
}

// QR Code Generator
function generateQR() {
    const text = document.getElementById('qrText').value;
    if (!text) {
        alert('Please enter text or URL');
        return;
    }
    const qrResult = document.getElementById('qrResult');
    qrResult.innerHTML = '';
    
    QRCode.toCanvas(text, { width: 200 }, function(error, canvas) {
        if (error) {
            alert('Error generating QR code');
            return;
        }
        qrResult.appendChild(canvas);
        
        // Add download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-custom mt-3';
        downloadBtn.style.maxWidth = '200px';
        downloadBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download QR';
        downloadBtn.onclick = function() {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL();
            link.click();
        };
        qrResult.appendChild(downloadBtn);
    });
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Handle password protection toggle
    document.getElementById('passwordProtection').addEventListener('change', function(e) {
        const passwordInput = document.getElementById('passwordInput');
        if (e.target.checked) {
            passwordInput.classList.add('show');
        } else {
            passwordInput.classList.remove('show');
            document.getElementById('filePassword').value = '';
        }
    });

    // File input change handler
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(Array.from(files));
        }
    });

    // Check for shared URL on page load
    const hash = window.location.hash.substring(1);
    if (hash) {
        const [urlHash, protection] = hash.split(':');
        const urlData = localStorage.getItem(`url_${urlHash}`);
        
        if (urlData) {
            const data = JSON.parse(urlData);
            if (data.content) {
                const blob = new Blob([data.content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.location.href = url;
            }
        }
    }
});

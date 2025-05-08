document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectedFile = document.getElementById('selectedFile');
    const uploadButton = document.getElementById('uploadButton');
    const progressBar = document.getElementById('progressBar');
    const status = document.getElementById('status');
    
    // API Configuration - Replace with your actual API Gateway endpoint
    const API_ENDPOINT = 'https://jqy6bnq0td.execute-api.us-east-1.amazonaws.com/DEV/upload';
    const SUMMARIES_API_ENDPOINT = 'https://jqy6bnq0td.execute-api.us-east-1.amazonaws.com/DEV/summaries';

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        uploadArea.classList.add('highlight');
    }
    
    function unhighlight() {
        uploadArea.classList.remove('highlight');
    }
    
    // Handle file drop
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFiles(files);
    }
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    // Click on upload area to trigger file input
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle selected files
    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            
            // Check if file is a PDF
            if (file.type !== 'application/pdf') {
                status.textContent = 'Error: Please select a PDF file';
                status.className = 'status error';
                selectedFile.innerHTML = '<p>No file selected</p>';
                uploadButton.disabled = true;
                return;
            }
            
            // Display file information
            selectedFile.innerHTML = `
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
            `;
            
            // Enable upload button
            uploadButton.disabled = false;
            
            // Clear any previous status
            status.textContent = '';
            status.className = 'status';
            
            // Display PDF preview
            displayPDF(file);
        }
    }
    
    // Display PDF in the viewer
    function displayPDF(file) {
        const pdfViewer = document.getElementById('pdfViewer');
        const pdfViewerContainer = document.getElementById('pdfViewerContainer');
        const pdfFileName = document.getElementById('pdfFileName');
        
        // Create object URL for the file
        const objectURL = URL.createObjectURL(file);
        
        // Set the src attribute of the iframe
        pdfViewer.src = objectURL;
        
        // Display the file name
        pdfFileName.textContent = file.name;
        
        // Show the PDF viewer container
        pdfViewerContainer.classList.add('active');
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Handle file upload
    uploadButton.addEventListener('click', function() {
        const file = fileInput.files[0];
    
        if (!file) {
            status.textContent = 'Please select a file first';
            status.className = 'status error';
            return;
        }
    
        // Create unique file name
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}-${file.name}`;
    
        // Call upload function with file and fileName
        uploadFile(file, fileName);
    });
    
    // Upload file to API Gateway
    function uploadFile(file, fileName) {
        const reader = new FileReader();
        const email = document.getElementById("emailInput").value;
    
        if (!email) {
            status.textContent = 'Please enter your email address';
            status.className = 'status error';
            return;
        }
        
        // Show loading status
        status.textContent = 'Uploading...';
        status.className = 'status loading';
        
        reader.onload = function () {
            const base64Data = reader.result.split(',')[1];
    
            fetch("https://jqy6bnq0td.execute-api.us-east-1.amazonaws.com/DEV/upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fileName: fileName,
                    contentType: file.type,
                    base64Data: base64Data,
                    email: email
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log("Upload successful:", data);
                status.textContent = "Upload successful! Your paper is being processed.";
                status.className = "status success";
                
                // Keep PDF viewer visible - don't reset form entirely
                uploadButton.disabled = true;
                
                // Load summaries after a short delay
                setTimeout(loadSummaries, 1000);
            })
            .catch(err => {
                console.error("Upload error:", err);
                status.textContent = "Upload failed. Please try again.";
                status.className = "status error";
            });
        };
    
        reader.readAsDataURL(file);
    }

    // Load and display summaries in grid format
    function loadSummaries() {
        fetch(SUMMARIES_API_ENDPOINT)
            .then(res => res.json())
            .then(response => {
                // Parse the body (which is a JSON-encoded string)
                const data = JSON.parse(response.body);
    
                const summariesContainer = document.getElementById('summariesContainer');
                summariesContainer.innerHTML = '';
    
                if (data.length === 0) {
                    summariesContainer.innerHTML = '<div class="no-summaries">No research paper summaries found.</div>';
                    return;
                }
    
                data.forEach(item => {
                    // Extract filename from S3 key (remove timestamp prefix)
                    const originalFilename = item.s3_key.split('-').slice(1).join('-');
                    
                    const summaryCard = document.createElement('div');
                    summaryCard.className = 'summary-card';
                    summaryCard.innerHTML = `
                        <h3 title="${originalFilename}">${originalFilename}</h3>
                        <div class="summary-content">
                            <p>${item.s}</p>
                        </div>
                    `;
                    summariesContainer.appendChild(summaryCard);
                });
            })
            .catch(err => {
                console.error('Error fetching summaries:', err);
                const summariesContainer = document.getElementById('summariesContainer');
                summariesContainer.innerHTML = '<div class="no-summaries">Error loading summaries. Please refresh the page.</div>';
            });
    }
    
    // Call on page load
    loadSummaries();
});
// This script handles the popup UI

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const imageInput = document.getElementById('imageInput');
  const fileInputContainer = document.getElementById('fileInputContainer');
  const preview = document.getElementById('preview');
  const sendButton = document.getElementById('sendButton');
  const captureTabButton = document.getElementById('captureTab');
  const status = document.getElementById('status');
  const pageStatus = document.getElementById('pageStatus');
  
  // Variables
  let imageData = null;
  let isConstructBillPage = false;
  
  // Check if current page is a ConstructBill page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // Update UI based on URL
    if (activeTab.url && (
        activeTab.url.includes('constructbill') || 
        activeTab.url.includes('replit.app') || 
        activeTab.url.includes('localhost')
      )) {
      // It looks like a ConstructBill page from the URL, now check with content script
      chrome.tabs.sendMessage(activeTab.id, {
        action: "checkPage"
      }, function(response) {
        if (chrome.runtime.lastError) {
          // Content script not available
          showPageStatus('Not on a ConstructBill page where images can be sent', 'not-available');
          isConstructBillPage = false;
        } else if (response && response.isConstructBillPage) {
          showPageStatus('Ready to send images to ConstructBill', 'available');
          isConstructBillPage = true;
        } else {
          showPageStatus('Not on a ConstructBill page where images can be sent', 'not-available');
          isConstructBillPage = false;
        }
      });
    } else {
      showPageStatus('Not on a ConstructBill page where images can be sent', 'not-available');
      isConstructBillPage = false;
    }
  });
  
  // Set up drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileInputContainer.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    fileInputContainer.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    fileInputContainer.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    fileInputContainer.classList.add('dragover');
  }
  
  function unhighlight() {
    fileInputContainer.classList.remove('dragover');
  }
  
  fileInputContainer.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      handleFiles(files);
    }
  }
  
  // Handle click on the drop area
  fileInputContainer.addEventListener('click', function() {
    imageInput.click();
  });
  
  // Handle file selection through the input
  imageInput.addEventListener('change', function() {
    if (imageInput.files.length > 0) {
      handleFiles(imageInput.files);
    }
  });
  
  function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        imageData = e.target.result;
        preview.src = imageData;
        preview.style.display = 'block';
        sendButton.disabled = false;
      };
      
      reader.readAsDataURL(file);
    }
  }
  
  // Handle send button click
  sendButton.addEventListener('click', function() {
    if (!imageData) {
      showStatus('Please select an image first', 'error');
      return;
    }
    
    sendImageToPage(imageData);
  });
  
  // Handle capture tab button click
  captureTabButton.addEventListener('click', function() {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      if (chrome.runtime.lastError) {
        showStatus('Failed to capture tab: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      imageData = dataUrl;
      preview.src = imageData;
      preview.style.display = 'block';
      sendButton.disabled = false;
      
      showStatus('Tab captured successfully!', 'success');
    });
  });
  
  // Send image to page
  function sendImageToPage(imageData) {
    // Find the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      // Send the image data to the content script
      chrome.tabs.sendMessage(activeTab.id, {
        action: "sendImage",
        imageData: imageData
      }, function(response) {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.success) {
          showStatus('Image sent successfully!', 'success');
        } else {
          showStatus('Failed to send image. Make sure you are on a ConstructBill page.', 'error');
        }
      });
    });
  }
  
  // Function to show status messages
  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(function() {
      status.style.display = 'none';
    }, 5000);
  }
  
  // Function to show page status
  function showPageStatus(message, type) {
    pageStatus.textContent = message;
    pageStatus.className = 'page-status ' + type;
  }
});

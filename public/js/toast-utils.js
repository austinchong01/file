// Toast utility functions
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  const toastId = "toast-" + Date.now();

  const bgClass = type === "success" ? "bg-success" : "bg-danger";
  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas ${icon} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML("beforeend", toastHtml);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
  toast.show();

  // Remove toast element after it's hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

function deleteFolderHandler(button) {
  const folderId = button.getAttribute('data-folder-id');
  const folderName = button.getAttribute('data-folder-name');
  deleteFolder(folderId, folderName, button);
}

function deleteFolder(folderId, folderName, button) {
  if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
    return;
  }

  // Show loading state
  const originalHtml = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  button.disabled = true;

  fetch(`/folders/${folderId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showToast(data.message, "success");
        
        // Redirect after a short delay to show the toast
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      } else {
        showToast(data.message, "error");
        button.innerHTML = originalHtml;
        button.disabled = false;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showToast("Error deleting folder", "error");
      button.innerHTML = originalHtml;
      button.disabled = false;
    });
}

function handleUpload(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  
  // Show loading state
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  submitButton.disabled = true;
  
  fetch(form.action, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast(data.message, 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
      modal.hide();
      // Reset form
      form.reset();
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1000);
    } else {
      showToast(data.message, 'error');
      submitButton.innerHTML = originalHtml;
      submitButton.disabled = false;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Error uploading file', 'error');
    submitButton.innerHTML = originalHtml;
    submitButton.disabled = false;
  });
}

function handleFolderCreate(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  
  // Show loading state
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  submitButton.disabled = true;
  
  fetch(form.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast(data.message, 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('folderModal'));
      modal.hide();
      // Reset form
      form.reset();
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1000);
    } else {
      showToast(data.message, 'error');
      submitButton.innerHTML = originalHtml;
      submitButton.disabled = false;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Error creating folder', 'error');
    submitButton.innerHTML = originalHtml;
    submitButton.disabled = false;
  });
}

function deleteFileHandler(button) {
  const fileId = button.getAttribute('data-file-id');
  const fileName = button.getAttribute('data-file-name');
  deleteFile(fileId, fileName, button);
}

function deleteFile(fileId, fileName, button) {
  if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
    return;
  }

  // Show loading state
  const originalHtml = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  button.disabled = true;

  fetch(`/files/${fileId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showToast(data.message, "success");
        
        // Check if redirect URL is provided
        if (data.redirectUrl) {
          // Redirect after a short delay to show the toast
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1000);
        } else {
          // Original behavior - remove file card from page
          setTimeout(() => {
            const fileCard = button.closest(".col-md-3");
            if (fileCard) {
              fileCard.remove();
            }
          }, 500);
        }
      } else {
        showToast(data.message, "error");
        button.innerHTML = originalHtml;
        button.disabled = false;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showToast("Error deleting file", "error");
      button.innerHTML = originalHtml;
      button.disabled = false;
    });
}

function openRenameModal(button) {
  const folderId = button.getAttribute('data-folder-id');
  const folderName = button.getAttribute('data-folder-name');
  
  // Set the folder ID in the hidden input
  document.getElementById('renameFolderId').value = folderId;
  
  // Pre-fill the current folder name
  document.getElementById('newFolderName').value = folderName;
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('renameFolderModal'));
  modal.show();
  
  // Focus and select the text in the input for easy editing
  setTimeout(() => {
    const input = document.getElementById('newFolderName');
    input.focus();
    input.select();
  }, 500);
}

function handleFolderRename(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  
  // Show loading state
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renaming...';
  submitButton.disabled = true;
  
  fetch(form.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast(data.message, 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('renameFolderModal'));
      modal.hide();
      // Reset form
      form.reset();
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1000);
    } else {
      showToast(data.message, 'error');
      submitButton.innerHTML = originalHtml;
      submitButton.disabled = false;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Error renaming folder', 'error');
    submitButton.innerHTML = originalHtml;
    submitButton.disabled = false;
  });
}

function openRenameFileModal(button) {
  const fileId = button.getAttribute('data-file-id');
  const fileName = button.getAttribute('data-file-name');
  
  // Set the file ID in the hidden input
  document.getElementById('renameFileId').value = fileId;
  
  // Pre-fill the current file name
  document.getElementById('newFileName').value = fileName;
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('renameFileModal'));
  modal.show();
  
  // Focus and select the text in the input for easy editing
  setTimeout(() => {
    const input = document.getElementById('newFileName');
    input.focus();
    input.select();
  }, 500);
}

function handleFileRename(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalHtml = submitButton.innerHTML;
  
  // Show loading state
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renaming...';
  submitButton.disabled = true;
  
  fetch(form.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(formData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast(data.message, 'success');
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('renameFileModal'));
      modal.hide();
      // Reset form
      form.reset();
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1000);
    } else {
      showToast(data.message, 'error');
      submitButton.innerHTML = originalHtml;
      submitButton.disabled = false;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Error renaming file', 'error');
    submitButton.innerHTML = originalHtml;
    submitButton.disabled = false;
  });
}

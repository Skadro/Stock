document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const status = document.getElementById('status');

    if (!fileInput || !uploadButton || !status) return;

    uploadButton.addEventListener('click', () => {
        const files = fileInput.files;
        if (files.length === 0) {
            status.textContent = 'No file selected.';
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('media', files[i]);
        }

        fetch('/stock', {
            method: 'POST',
            body: formData
        })
            .then((res) => {
                fileInput.files = null;

                if (!res.ok) {
                    status.style.color = 'red';
                    status.textContent = 'Upload failed';
                    return;
                }
                status.style.color = 'green';
                status.textContent = `${files.length} file(s) have been uploaded`;
            }).catch(error => {
                fileInput.files = null;
                console.error('Error:', error);
                status.style.color = 'red';
                status.textContent = 'Upload failed';
            });
    });
});

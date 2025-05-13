document.addEventListener('DOMContentLoaded', () => {
    const deleteBtn = document.getElementById('delete-btn');

    if (!deleteBtn) return;

    deleteBtn.addEventListener('click', () => {
        const formData = new FormData().append('media', document.URL);

        fetch('/stock', {
            method: 'DELETE',
            body: formData
        })
            .then(() => document.URL = '/stock').catch(error => console.error('Error:', error));
    });
});

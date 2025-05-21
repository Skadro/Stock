document.addEventListener('DOMContentLoaded', () => {
    const deleteBtn = document.getElementById('delete-btn');

    if (!deleteBtn) return;

    deleteBtn.addEventListener('click', () => fetch('/stock', {
        method: 'DELETE',
        body: document.URL
    })
        .then((res) => {
            if (res.ok) document.location.href = '/stock';
        }).catch(error => console.error('Error:', error)));
});

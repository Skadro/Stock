document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    if (!saveButton || !status) return;

    saveButton.addEventListener('click', () => {
        const username = document.getElementById("username-box").value;
        const email = document.getElementById("email-box").value;
        const password = document.getElementById("password-box").value;
        const confirm_password = document.getElementById("confirm-password-box").value;
        const display_name = document.getElementById("display-name-box").value;
        const avatar = document.getElementById("avatar-box").value;
        const bio = document.getElementById("bio-box").value;

        const body = {
            username: username,
            email: email,
            password: password,
            confirm_password: confirm_password,
            display_name: display_name,
            avatar: avatar,
            bio: bio
        }

        fetch('/profile/edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
            .then(async (_res) => {
                //const json = await res.json();
                status.style.color = 'green';
                status.textContent = `Settings updated`;
            }).catch(error => {
                console.error('Error:', error);
                status.style.color = 'red';
                status.textContent = 'Error';
            });
    });
});

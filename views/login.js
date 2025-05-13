document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('error');
    const errorUsernameEmail = document.getElementById('error-username-email');
    const errorPassword = document.getElementById('error-password');

    if (!submitButton || !errorMessage || !errorUsernameEmail || !errorPassword) return;

    function submit() {
        const username_email = document.getElementById('username-email').value;
        const password = document.getElementById('password').value;

        if ((username_email && password) && (typeof username_email === 'string' && typeof password === 'string') && (username_email.length > 0 && password.length > 0)) {
            const formData = {
                username_email: username_email,
                password: password
            };

            try {
                fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                }).then(async (response) => {
                    if (response.ok) {
                        const text = await response.text();

                        errorMessage.textContent = null;
                        errorUsernameEmail.textContent = null;
                        errorPassword.textContent = null;

                        if (text === 'found') {
                            errorMessage.style.color = 'green';
                            errorMessage.textContent = 'Logged in';
                            setTimeout(() => window.location.href = '/', 1500);
                        } else if (text === 'notfound') errorMessage.textContent = 'Invalid credentials';
                    } else errorMessage.textContent = `${response.status} status`;
                }).catch(error => console.error(error));
            } catch (error) {
                console.error(error);
            }
        } else {
            if (!username_email || typeof username_email !== 'string' || username_email.length < 1) errorUsernameEmail.textContent = 'Invalid username or email';
            else errorUsernameEmail.textContent = null;

            if (!password || typeof password !== 'string' || password.length < 1) errorPassword.textContent = 'Invalid password';
            else errorPassword.textContent = null;
        }
    }

    submitButton.addEventListener('click', () => submit());
    document.addEventListener('keypress', (ev) => {
        if (ev.code === 'Enter') submit();
    });
});
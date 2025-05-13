document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('error');
    const errorUsername = document.getElementById('error-username');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');

    if (!submitButton || !errorMessage || !errorUsername || !errorEmail || !errorPassword) return;

    function submit() {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if ((username && email && password) && (typeof username === 'string' && typeof email === 'string' && typeof password === 'string') && (username.length > 0 && email.length > 0 && password.length > 0)) {
            const formData = {
                username: username,
                email: email,
                password: password
            };

            try {
                fetch('/signup', {
                    method: 'SEARCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                }).then(async (response) => {
                    const text = await response.text();

                    errorMessage.textContent = null;
                    errorUsername.textContent = null;
                    errorEmail.textContent = null;
                    errorPassword.textContent = null;

                    if (text === 'notfound') {
                        fetch('/signup', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(formData)
                        })
                            .then(response => {
                                if (response.ok) {
                                    errorMessage.style.color = 'green';
                                    errorMessage.textContent = 'Account created';
                                    setTimeout(() => window.location.href = '/login', 1500);
                                } else errorMessage.textContent = `${response.status} status`;
                            })
                            .then(data => {
                                if (data && data.error) errorMessage.textContent = data.error;
                            })
                            .catch(error => console.error(error));
                    } else if (text === 'found') errorMessage.textContent = 'User already exists';
                }).catch(error => console.error(error));
            } catch (error) {
                console.error(error);
            }
        } else {
            if (!username || typeof username !== 'string' || username.length < 1) errorUsername.textContent = 'Invalid username';
            else errorUsername.textContent = null;

            if (!email || typeof email !== 'string' || email.length < 1) errorEmail.textContent = 'Invalid email';
            else errorEmail.textContent = null;

            if (!password || typeof password !== 'string' || password.length < 1) errorPassword.textContent = 'Invalid password';
            else errorPassword.textContent = null;
        }
    }

    submitButton.addEventListener('click', () => submit());
    document.addEventListener('keypress', (ev) => {
        if (ev.code === 'Enter') submit();
    });
});
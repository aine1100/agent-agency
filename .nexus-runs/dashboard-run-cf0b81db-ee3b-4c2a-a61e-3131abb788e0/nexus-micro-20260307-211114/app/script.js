document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username.trim() === '' || password.trim() === '') {
        alert('Please fill in both fields.');
    } else {
        alert('Login successful (this is a mock response).');
        // Here, you would typically handle the login logic, like calling an API.
    }
});

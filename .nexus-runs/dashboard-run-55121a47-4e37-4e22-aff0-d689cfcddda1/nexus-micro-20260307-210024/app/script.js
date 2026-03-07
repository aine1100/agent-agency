document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent page refresh
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    if (username === "" || password === "") {
        alert("Please fill in both fields.");
    } else {
        alert("Login successful! (This is a clone, no real authentication.)");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    const renderTasks = () => {
        taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = task.completed ? "completed" : "";

            const span = document.createElement("span");
            span.textContent = task.text;
            span.onclick = () => toggleTask(index);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.onclick = () => deleteTask(index);

            li.appendChild(span);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    };

    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText) {
            tasks.push({ text: taskText, completed: false });
            taskInput.value = "";
            updateLocalStorage();
            renderTasks();
        }
    };

    const toggleTask = (index) => {
        tasks[index].completed = !tasks[index].completed;
        updateLocalStorage();
        renderTasks();
    };

    const deleteTask = (index) => {
        tasks.splice(index, 1);
        updateLocalStorage();
        renderTasks();
    };

    const updateLocalStorage = () => {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    };

    addTaskBtn.addEventListener("click", addTask);
    renderTasks();
});

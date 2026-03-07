document.addEventListener('DOMContentLoaded', loadTasks);

const taskInput = document.getElementById('taskName');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

addTaskBtn.addEventListener('click', addTask);

function addTask() {
    const taskName = taskInput.value.trim();
    if (taskName === '') {
        alert('Task name cannot be empty');
        return;
    }

    const tasks = getTasksFromLocalStorage();
    tasks.push({ name: taskName });
    saveTasksToLocalStorage(tasks);
    taskInput.value = '';
    renderTasks();
}

function loadTasks() {
    renderTasks();
}

function renderTasks() {
    const tasks = getTasksFromLocalStorage();
    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.textContent = task.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteTask(index);

        li.appendChild(deleteBtn);
        taskList.appendChild(li);
    });
}

function deleteTask(index) {
    const tasks = getTasksFromLocalStorage();
    tasks.splice(index, 1);
    saveTasksToLocalStorage(tasks);
    renderTasks();
}

function getTasksFromLocalStorage() {
    const tasks = localStorage.getItem('tasks');
    return tasks ? JSON.parse(tasks) : [];
}

function saveTasksToLocalStorage(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.textContent = task.text;
            li.className = task.completed ? 'completed' : '';
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = task.completed ? 'Undo' : 'Complete';
            toggleBtn.onclick = () => toggleTask(index);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete';
            deleteBtn.onclick = () => deleteTask(index);
            li.appendChild(toggleBtn);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    }

    function addTask() {
        const taskText = taskInput.value;
        if (taskText) {
            tasks.push({ text: taskText, completed: false });
            localStorage.setItem('tasks', JSON.stringify(tasks));
            taskInput.value = '';
            renderTasks();
        }
    }

    function toggleTask(index) {
        tasks[index].completed = !tasks[index].completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    addTaskBtn.onclick = addTask;

    renderTasks();
});

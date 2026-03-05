(() => {
  "use strict";

  // Constants for localStorage key
  const STORAGE_KEY = "simple_todo_app_tasks";

  // Elements
  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");
  const taskList = document.getElementById("task-list");

  // State: tasks array [{id:string, text:string, completed:boolean}]
  let tasks = [];

  // Generate unique id for tasks
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Save tasks state to localStorage
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks", e);
    }
  }

  // Load tasks state from localStorage
  function loadTasks() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          tasks = parsed.filter(task => 
              typeof task.id === "string" &&
              typeof task.text === "string" &&
              typeof task.completed === "boolean"
          );
        }
      }
    } catch (e) {
      console.error("Failed to load tasks", e);
      tasks = [];
    }
  }

  // Create a single task DOM element
  function createTaskElement(task) {
    const li = document.createElement("li");
    li.setAttribute("role", "listitem");
    li.tabIndex = -1;

    // Label for checkbox and text
    const label = document.createElement("label");
    label.className = "task-label";

    // Checkbox input
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-checked", task.completed.toString());
    checkbox.setAttribute("aria-label", task.completed ? `Mark task "${task.text}" as incomplete` : `Mark task "${task.text}" as complete`);

    // Text span
    const span = document.createElement("span");
    span.className = "task-text";
    if (task.completed) {
      span.classList.add("completed");
    }
    span.textContent = task.text;
    span.setAttribute("tabindex", "-1");

    label.appendChild(checkbox);
    label.appendChild(span);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete-button";
    deleteBtn.setAttribute("aria-label", `Delete task "${task.text}"`);
    deleteBtn.title = "Delete task";
    deleteBtn.type = "button";
    deleteBtn.textContent = "×"; // multiplication sign as "x"

    li.append(label, deleteBtn);

    // Event listeners for interaction
    checkbox.addEventListener("change", () => {
      toggleTaskCompletion(task.id);
    });

    deleteBtn.addEventListener("click", () => {
      deleteTask(task.id);
    });

    return li;
  }

  // Render all tasks
  function renderTasks() {
    taskList.innerHTML = "";
    if (tasks.length === 0) {
      const noTasksMsg = document.createElement("li");
      noTasksMsg.textContent = "No tasks. Add one above!";
      noTasksMsg.style.fontStyle = "italic";
      noTasksMsg.style.color = "#6b7280";
      noTasksMsg.setAttribute("aria-live", "polite");
      taskList.appendChild(noTasksMsg);
      return;
    }
    for (const task of tasks) {
      const taskEl = createTaskElement(task);
      taskList.appendChild(taskEl);
    }
  }

  // Add a new task
  function addTask(text) {
    if (!text.trim()) return;
    const newTask = {
      id: generateId(),
      text: text.trim(),
      completed: false,
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
  }

  // Toggle completion state of a task
  function toggleTaskCompletion(taskId) {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
  }

  // Delete a task
  function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderTasks();
  }

  // Form submission handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    if (text.trim()) {
      addTask(text);
      input.value = "";
      input.focus();
    }
  });

  // Keyboard accessibility: allow enter or space on label to toggle checkbox
  taskList.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target.classList.contains("task-label") || target.closest(".task-label")) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const checkbox = target.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      }
    }
  });

  // Initial load
  loadTasks();
  renderTasks();
})();

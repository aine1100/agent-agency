import { useState, useEffect } from 'https://unpkg.com/react@17/umd/react.development.js';
import { createRoot } from 'https://unpkg.com/react-dom@17/umd/react-dom.development.js';

function App() {
    const [tasks, setTasks] = useState(JSON.parse(localStorage.getItem('tasks')) || []);
    const [taskText, setTaskText] = useState('');

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = () => {
        if (taskText.trim() !== '') {
            const newTask = { id: Date.now(), text: taskText, completed: false };
            setTasks([...tasks, newTask]);
            setTaskText('');
        }
    };

    const toggleTaskCompletion = (id) => {
        setTasks(tasks.map(task => (
            task.id === id ? { ...task, completed: !task.completed } : task
        )));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    return (
        <div>
            <h1>Restaurant Management Task List</h1>
            <input
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Add a new task"
            />
            <button onClick={addTask}>Add Task</button>
            <ul className="task-list">
                {tasks.map(task => (
                    <li key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                        />
                        <span>{task.text}</span>
                        <button onClick={() => deleteTask(task.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const root = createRoot(document.getElementById('app'));
root.render(<App />);

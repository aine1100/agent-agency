import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const App = () => {
    const [tasks, setTasks] = useState([]);
    const [taskInput, setTaskInput] = useState('');

    useEffect(() => {
        const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        setTasks(storedTasks);
    }, []);

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = () => {
        if (taskInput.trim()) {
            setTasks([...tasks, { text: taskInput, completed: false }]);
            setTaskInput('');
        }
    };

    const toggleTask = index => {
        const newTasks = [...tasks];
        newTasks[index].completed = !newTasks[index].completed;
        setTasks(newTasks);
    };

    const deleteTask = index => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
    };

    return (
        <div className="container">
            <h1>Restaurant Management Tasks</h1>
            <input
                type="text"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                placeholder="Add a new task..."
            />
            <button onClick={addTask}>Add Task</button>
            <div>
                {tasks.map((task, index) => (
                    <div key={index} className={`task ${task.completed ? 'completed' : ''}`}>
                        <span onClick={() => toggleTask(index)}>{task.text}</span>
                        <button onClick={() => deleteTask(index)}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));

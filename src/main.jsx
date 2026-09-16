import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './style.css';

// 不使用 StrictMode：其开发模式的双挂载会让整个 3D 花园场景构建两次
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

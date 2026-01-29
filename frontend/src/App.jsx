import { useEffect, useState } from "react";

function App() {
  const [socket, setSocket] = useState(null);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const newSocket = new WebSocket("ws://localhost:8000/ws/simulation");

    newSocket.onmessage = (event) => {
      // Add the new message to our log history
      setLogs((prev) => [...prev, `Server: ${event.data}`]);
    };

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // 🚀 Our "Send" function stays here, outside the effect!
  const sendMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(input);
      setLogs((prev) => [...prev, `You: ${input}`]);
      setInput(""); // Clear the box
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Shadow Instructor 🥷</h1>

      <div style={{ marginBottom: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a test message..."
        />
        <button onClick={sendMessage}>Send to Bridge</button>
      </div>

      <div
        style={{
          background: "#f0f0f0",
          padding: "10px",
          height: "200px",
          overflowY: "scroll",
        }}
      >
        {logs.map((log, i) => (
          <p key={i}>{log}</p>
        ))}
      </div>
    </div>
  );
}

export default App;

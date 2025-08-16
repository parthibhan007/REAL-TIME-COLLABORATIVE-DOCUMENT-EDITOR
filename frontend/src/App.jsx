import React, { useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export default function App(){
  const editorRef = useRef();
  const quillRef = useRef();
  const [socket, setSocket] = useState(null);
  const [docId, setDocId] = useState('default-doc');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const s = io(SERVER);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = document.createElement('div');
      editorRef.current.style.height = '70vh';
      document.getElementById('editor-container').appendChild(editorRef.current);

      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: { toolbar: [['bold','italic'], [{ 'header': [1,2,3,false] }], ['link','image','code-block']] }
      });

      // local change -> send delta
      quillRef.current.on('text-change', (delta, oldDelta, source) => {
        if (source !== 'user') return;
        if (socket) {
          socket.emit('send-delta', { docId, delta });
        }
      });

      // cursor selection
      quillRef.current.on('selection-change', (range, oldRange, source) => {
        if (source !== 'user') return;
        if (socket) socket.emit('cursor-update', { docId, cursor: range });
      });
    }
  }, [editorRef, socket, docId]);

  // socket handlers
  useEffect(() => {
    if (!socket) return;
    socket.emit('join-doc', { docId, user: { id: 'user-' + Math.floor(Math.random()*9999), name: 'Guest' } });

    socket.on('doc-load', ({ ops }) => {
      if (!quillRef.current) return;
      quillRef.current.setContents(ops.length ? ops : [{ insert: '\n' }]);
    });

    socket.on('receive-delta', ({ delta }) => {
      if (!quillRef.current) return;
      quillRef.current.updateContents(delta);
    });

    socket.on('presence-update', (presence) => {
      setUsers(presence.map(p => p.user || { name: 'Anonymous' }));
    });

    socket.on('cursor-update', ({ id, user, cursor }) => {
      // simple console log — in production you would render remote cursors visually
      console.log('remote cursor', id, user, cursor);
    });

    socket.on('presence-leave', ({ id, user }) => {
      console.log('left', id, user);
    });

    return () => {
      socket.off('doc-load');
      socket.off('receive-delta');
      socket.off('presence-update');
      socket.off('cursor-update');
      socket.off('presence-leave');
    }
  }, [socket, docId]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <h1>Real-time Collaborative Editor — Starter</h1>
      <div style={{ marginBottom: 10 }}>
        <label>
          Document ID:
          <input value={docId} onChange={e=>setDocId(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
        <div style={{ float: 'right' }}>
          <strong>Active users:</strong> {users.map(u=>u.name).join(', ')}
        </div>
      </div>
      <div id="editor-container" />
      <div style={{ marginTop: 12 }}>
        <small>Notes: This starter demonstrates delta-based synchronization using Quill + Socket.IO. It is intended as a foundation to add CRDT/OT, auth, persistence rules, revision history, and more advanced features.</small>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  // Pobierz notatki z backendu przy ładowaniu komponentu
  useEffect(() => {
    fetchNotes().then();
  }, []);

  // Funkcja do pobierania notatek z backendu
  const fetchNotes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/notes');
      setNotes(response.data);
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error);
    }
  };

  // Funkcja do dodawania nowej notatki
  const addNote = async () => {
    try {
      if (title && content){
        await axios.post('http://localhost:3000/notes', { title, content });
        // Po dodaniu notatki odśwież listę notatek
        await fetchNotes();
        // Wyczyść pola formularza
        setTitle('');
        setContent('');
      } else if (!title) {
        setError('Add Title');
      }  else if (!content) {
        setError('Add Message');
      }
    } catch (error) {
      setError('Unexpected error');
      console.error('Unexpected error:', error);
    }
  };

  // Funkcja do usuwania notatki
  const deleteNote = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/notes/${id}`);
      // Po usunięciu notatki odśwież listę notatek
      await fetchNotes();
    } catch (error) {
      console.error('Błąd podczas usuwania notatki:', error);
    }
  };

  return (
      <div>
        <h1 className="title">Notion Notes</h1>

        <div className="form">
          <div className="form-group">
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            <textarea
                placeholder="Content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
            ></textarea>
          </div>
          <span className="error-message">{error}</span>
          <div className="form-actions">
            <button onClick={addNote}>Add Note</button>
          </div>
      </div>

        {/* Wyświetlanie istniejących notatek */}
        <div>
          <h2 className="notes-list-title">My Notes:</h2>
          <div className="notes-list">
            {notes.length > 0 && notes.map((note) => (
                <div className="note" key={note.id}>
                  <div className="note-title">
                    {note.properties.Name.title[0].text.content}
                    <br/>
                    <small className="date">{note.properties.Date.date.start}</small>
                  </div>
                  <hr className="split"/>
                  <p className="text">{note.children[0].paragraph.rich_text[0].text.content}</p>
                  <button onClick={() => deleteNote(note.id)} className="delete-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            strokeLinejoin="round"/>
                      <path
                          d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            strokeLinejoin="round"/>
                      <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            strokeLinejoin="round"/>
                    </svg>
                    Delete
                  </button>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
}

export default App;

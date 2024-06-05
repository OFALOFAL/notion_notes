import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContents, setEditContents] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/notes');
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async () => {
    try {
      if (title && content) {
        // Dzielimy treść notatki na osobne dzieci
        const contentBlocks = content.split('\n').filter(block => block.trim() !== ''); // Podziel treść notatki na bloki po znaku nowej linii
        // Tworzymy dzieci dla notatki
        const children = contentBlocks.map(block => ({
          "object": "block",
          "type": "paragraph",
          "paragraph": {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": block,
                  "link": null
                }
              }
            ]
          }
        }));

        // Tworzymy notatkę z podziałem treści na dzieci
        await axios.post('http://localhost:3000/notes', { title, children });
        await fetchNotes();
        setTitle('');
        setContent('');
        setError('');
      } else {
        setError('Please add both title and content.');
      }
    } catch (error) {
      setError('Unexpected error');
      console.error('Unexpected error:', error);
    }
  };

  const deleteNote = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/notes/${id}`);
      await fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.properties.Name.title[0].text.content);
    const updatedContents = [];
    for (const child of note.children) {
      const richText = child.paragraph && child.paragraph.rich_text;
      if (richText && richText.length > 0) {
        const textContents = richText.map(item => item.plain_text);
        updatedContents.push(textContents);
        updatedContents.push("[BLOCK-END]");
      }
    }

    console.log(updatedContents)
    setEditContents(updatedContents);
  };

  const updateNote = async (id) => {
    try {
      await axios.put(`http://localhost:3000/notes/${id}`, { title: editTitle, content: editContents.join('\n') });
      await fetchNotes();
      setEditingNoteId(null);
      setEditTitle('');
      setEditContents([]);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleEditContentChange = (index, value) => {
    const newEditContents = [...editContents];
    newEditContents[index] = value;
    setEditContents(newEditContents);
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

        <div>
          <h2 className="notes-list-title">My Notes:</h2>
          <div className="notes-list">
            {notes.length > 0 && notes.map((note) => (
                <div className="note" key={note.id}>
                  {editingNoteId === note.id ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        updateNote(note.id);
                      }}>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                        />
                        {editContents.map((content, index) => (
                            content !== "[BLOCK-END]" && (
                                <textarea
                                  key={index}
                                  value={content}
                                  onChange={(e) => handleEditContentChange(index, e.target.value)}
                              ></textarea>
                            )
                        ))}
                        <div className="form-actions">
                          <button type="submit">Save</button>
                          <button type="button" className="cancel-button" onClick={() => setEditingNoteId(null)}>Cancel</button>
                        </div>
                      </form>
                  ) : (
                      <div>
                        <div className="note-title">
                          {note.properties.Name.title[0].text.content}
                          <br />
                          <small className="date">{note.properties.Date.date.start}</small>
                        </div>
                        <hr className="split" />
                        {note.children.map(child => (
                            <p key={child.id} className="text">
                              {child.paragraph && child.paragraph.rich_text.length > 0
                                  ? child.paragraph.rich_text[0].text.content
                                  : 'No content'}
                            </p>
                        ))}
                        <button onClick={() => startEditingNote(note)} className="edit-button">Edit</button>
                        <button onClick={() => deleteNote(note.id)} className="delete-button">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path
                                d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            />
                            <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Delete
                        </button>
                      </div>
                  )}
                </div>
            ))}
          </div>
        </div>
      </div>
  );
}

export default App;

require('dotenv').config();

const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const { Client } = require('@notionhq/client');
const path = require("path");
const fs = require("fs");

app.use(express.json());
app.use(cors());

const notionToken = process.env.NOTION_TOKEN;
const database_id = process.env.NOTION_DATABASE;
const notion = new Client({ auth: notionToken });

const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

async function getBlocks(block_id) {
    let { results: children } = await notion.blocks.children.list({ block_id });
    for (const child of children) {
        const grandchildren = await getBlocks(child.id);
        child.children = grandchildren;
    }
    return children;
}

app.get('/notes', async (req, res) => {
    try {
        const { results: pages } = await notion.databases.query({ database_id: database_id });

        for (const page of pages) {
            const blocks = await getBlocks(page.id);
            page.children = blocks;
        }

        // Write the result to file.
        const outputFile = path.join(__dirname, "notion-export.json");
        fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2));

        res.send(pages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/notes', async (req, res) => {
    try {
        const { title, content } = req.body;
        const response = await axios.post('https://api.notion.com/v1/pages', {
                parent: { database_id: database_id },
                properties: {
                    "Date": {
                        "type": "date",
                        "date": {
                            "start": getCurrentDate(),
                            "end": null,
                            "time_zone": null
                        }
                    },
                    "Name": {
                        "type": "title",
                        "title": [
                            {
                                "type": "text",
                                "text": {
                                    "content": title,
                                    "link": null
                                },
                                "annotations": {
                                    "bold": false,
                                    "italic": false,
                                    "strikethrough": false,
                                    "underline": false,
                                    "code": false,
                                    "color": "default"
                                }
                            }
                        ]
                    }
                },
                children: [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "type": "text",
                                    "text": {
                                        "content": content,
                                        "link": null
                                    },
                                    "annotations": {
                                        "bold": false,
                                        "italic": false,
                                        "strikethrough": false,
                                        "underline": false,
                                        "code": false,
                                        "color": "default"
                                    }
                                }
                            ],
                            "color": "default"
                        }
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });

        res.status(201).send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint do usuwania notatek
app.delete('/notes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await axios.delete(`https://api.notion.com/v1/blocks/${id}`, {
            headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28'
            }
        });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Pobierz dzieci dla konkretnej notatki
app.get('/notes/:id/children', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`https://api.notion.com/v1/blocks/${id}/children`, {
            headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28'
            }
        });
        res.json(response.data.results);
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).send('Error fetching children');
    }
});

// Zaktualizuj notatkę i jej dzieci
app.put('/notes/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    const parsedContent = content.split("[BLOCK-END]")

    const strippedContent = parsedContent.map((content, index) => {
        if (index === 0) {
            // Jeśli to pierwszy element, usuń tylko znak nowej linii z końca
            return content.trimEnd();
        } else {
            // W przeciwnym razie usuń znaki nowej linii z początku i końca
            return content.trim();
        }
    });

    try {
        // Zaktualizuj tytuł notatki
        await axios.patch(`https://api.notion.com/v1/pages/${id}`, {
            properties: {
                "Name": {
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": title,
                                "link": null
                            }
                        }
                    ]
                }
            }
        }, {
            headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28'
            }
        });

        // Pobierz dzieci notatki
        const childrenResponse = await axios.get(`https://api.notion.com/v1/blocks/${id}/children`, {
            headers: {
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28'
            }
        });

        const children = childrenResponse.data.results;

        let i = 0;
        // Zaktualizuj każde dziecko
        for (const child of children) {
            await axios.patch(`https://api.notion.com/v1/blocks/${child.id}`, {
                paragraph: {
                    rich_text: [
                        {
                            "type": "text",
                            "text": {
                                "content": strippedContent[i],
                                "link": null
                            }
                        }
                    ]
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });
            i++;
        }

        res.status(200).send('Note updated successfully');
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).send('Error updating note');
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

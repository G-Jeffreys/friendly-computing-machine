# Product Requirements Document (PRD)

## Project Name
**WordWise** – An AI-Powered Writing Assistant for Academia

---

## Overview
A web-based AI assistant that helps academics, researchers, and graduate students write, revise, and polish scholarly documents. The product integrates AI features like academic tone enhancement, contextual expansion, citation retrieval, and slide generation, tailored specifically for the needs of formal academic communication.

---

## Goals
- Enable precise, high-quality academic writing
- Reduce time spent on manual citation and research
- Assist in summarizing or transforming papers into presentation formats
- Offer context-aware expansions and improvements suited for peer-reviewed publishing

---

## Target Users
- Graduate students
- Academic researchers
- Professors
- Authors of peer-reviewed publications

---

## Core Features

### 1. Academic Tone Suggestions
- **Description**: Suggests improvements to phrasing, formality, and tone in academic writing.
- **Tech**: OpenAI API (LLMs), custom prompt engineering
- **Input**: Raw user text
- **Output**: Rewritten text with improved academic tone

### 2. Citation Hunter
- **Description**: Retrieves academic sources (OpenAlex, Scimago) relevant to user-input text.
- **Tech**: Fetches data from citation APIs, formats search queries using LLMs
- **Input**: Paragraph or claim
- **Output**: List of citation suggestions with metadata (title, authors, journal, date)

### 3. Slide Deck Generator
- **Description**: Converts sections of academic writing into slide content
- **Tech**: LLM prompt engineering + slide structuring logic
- **Input**: Paper or abstract
- **Output**: Structured bullet points suitable for slide presentation

### 4. Contextual Definition Expander
- **Description**: Defines terms or expands on jargon with academically-appropriate clarity
- **Tech**: OpenAI + glossary-type logic
- **Input**: Highlighted term or sentence
- **Output**: Clear, extended academic definition with optional examples

### 5. Rich Text Editor & Utilities
- **Syntax highlighting**
- **Spell check / grammar tools** (basic)
- **Style suggestions / readability analysis**
- **Dark/light mode**

---

## Tech Stack

### Frontend
- Framework: **Next.js (React + TypeScript)**
- Styling: **Tailwind CSS**
- Components: Custom React + shadcn/ui

### Backend / APIs
- LLM: **OpenAI API** (for NLP tasks)
- Citation: **OpenAlex**, **Scimago Journal Rank**
- Auth/Storage: **Supabase**
- DB Interface: **Drizzle ORM**

### Tooling
- Testing: **Jest**, **Playwright**
- CI/CD: **Vercel** (live deployment)
- Code quality: **Husky**, **Prettier**, **ESLint**

---

## Stretch Goals

### Enhanced Slide Deck Generator
- Add slide templates (title, content, charts)
- Export as **.pptx** or **.pdf**
- Include speaker notes

### Citation Integration Improvements
- Add **auto-citation formatting** (APA, MLA, Chicago)
- In-text citation insertion
- BibTeX export

---

## Success Criteria
Although this project is for personal education and exploration, success can be evaluated by:
- Stability and performance of all AI modules
- Usability of the interface for academic writing
- Integration depth of citation and slide tools
- Alignment of tone suggestions with scholarly standards

---

## Known Limitations
- LLM responses may occasionally lack verifiability
- Citation APIs may have rate limits or gaps
- Not yet integrated with platforms like Zotero, Overleaf, or LaTeX

---

## Future Considerations
- Offline mode for writing
- Collaboration support (commenting, track changes)
- Integration with submission tools (e.g., arXiv uploader, journal databases)
- Advanced revision history / diff tools

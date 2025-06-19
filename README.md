# Quizient

[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![version](https://img.shields.io/github/package-json/v/mamlaki/quizient)](package.json)
[![issues](https://img.shields.io/github/issues/mamlaki/quizient)](https://github.com/mamlaki/quizient/issues)
[![pull-requests](https://img.shields.io/github/issues-pr/mamlaki/quizient)](https://github.com/mamlaki/quizient/pulls)
[![deploy status](https://img.shields.io/badge/GitHubPages-%23121011?logo=github)](https://mamlaki.github.io/quizient)
[![LinkedIn](https://custom-icon-badges.demolab.com/badge/LinkedIn-0A66C2?logo=linkedin-white&logoColor=fff)](https://www.linkedin.com/in/melek-redwan/)

> **Quizient** turns ordinary spreadsheets into Moodle®-compatible XML files within seconds—entirely in your browser.


## Table of Contents
  1. [Table of Contents](#table-of-contents)
  2. [Why Quizient?](#why-quizient)
  3. [Website](#website)
  4. [Quick Start](#quick-start)
  5. [Usage Guide](#usage-guide)
  6. [Features](#features)
  7. [Spreadsheet Template](#spreadsheet-template)
  8. [Acknowledgments](#acknowledgments)
  9. [Contact](#contact)
  10. [License](#license)
       * [Third-Party Licenses](#third-party-licenses)

## Why Quizient?
Moodle's XML import format is powerful—but authoring the file(s) by hand, especially when dealing with large question-banks, can be tedious.

Quizient helps by letting you:
* Keep questions organized within a spreadsheet (Excel, LibreOffice, Google Sheets export, CSV, etc.)
* Easily drag and drop several spreadsheets at once into the browser
* Review the parsed questions before instantly downloading a ready-to-import Moodle® XML file.

The entire conversion process runs client-side, meaning no data ever leaves your machine.

## Website
A public build is available via **GitHub Pages**:
🔗 https://mamlaki.github.io/quizient/

## Quick Start
```zsh
# Clone
git clone https://github.com/mamlaki/quizient.git

# Go to the repo folder
cd quizient

# Install dependencies
npm install   # or pnpm install or yarn install

# Run in development
npm run dev   # starts Vite on https://localhost:5173
```

## Usage Guide
1. **Choose a template to download from the dropdown** or use your own spreadsheet that follows the required column [rules](#spreadsheet-template).
2. Drag your file(s) into the drop zone (or click the zone to select files).
3. Review the uploaded files and then press **Convert**.
4. Wait for the **log** to finish verifying the file.
5. Use the **Preview** pane to:
   * Search for keywords
   * Filter by question type
   * Sort by question name
6. Hit **Download**, you should get a file called `questions.xml` (this can be renamed to anything).
7. In Moodle, go to a course and then *Activity -> Question bank -> Import -> Choose **Moodle XML Format** under **File format*** and then upload the file.

## Features
* 📄 **Supported formats** – `.xlsx`, `.xls`, `.ods`, `.csv`
* ❓ **Supported Moodle question types** – Multiple-Choice, True/False, Short-Answer (with alternate answer and wildcard support) 
* 💻 **Batch processing** – Convert several spreadsheets at once (limits: 5 MiB/file, 5000 rows/session)
* 📝 **Question preview** – Search, filter, sort, and look through parsed questions before downloading
* 🔒 **Privacy** – Client-side conversion, data doesn't leave the browser
* 🌗 **Themes** – Auto-detects system theme preference. Offers light, dark, and "Black Out" modes.

## Spreadsheet Template
Quizient comes with ready-to-use templates that can be downloaded directly and found under `public/`:

| Format | File |
|--------|------|
| Excel | [`public/quizient_template.xlsx`](public/quizient_template.xlsx) |
| Excel 97–2004 | [`public/quizient_template.xls`](public/quizient_template.xls) |
| OpenDocument | [`public/quizient_template.ods`](public/quizient_template.ods) | 
| CSV | [`public/quizient_template.csv`](public/quizient_template.csv) |

Each row represents a question. Different questions require different rows:

| Column | Description | Required |
|--------|-------------|----------|
| `Type` | `MC`, `truefalse`, `shortanswer` | ✅ |
| `Title` | Moodle question title (e.g., Q1_CanadaCap) | ✅ | 
| `Question` | The question itself (e.g., What is the capital of Canada?) | ✅ | 
| `OptionA–D` | `MC` answer options | ✅ `MC` | 
| `Correct` | `truefalse` answer (e.g., TRUE, FALSE)| ✅ `truefalse` |
| `Correct1–` | `shortanswer` answers | 🟡 `shortanswer` |
| `UseCase` | `shortanswer` Case-sensitivity (`1` for case-sensitive) (`0` by default) | 🟡 `shortanswer` |

## Acknowledgments
Made possible using:
* [**Vite**](https://vite.dev/)
* [**TypeScript**](https://www.typescriptlang.org/)
* [**SheetJS**](https://sheetjs.com/)
* [**fast-xml-parser**](https://github.com/NaturalIntelligence/fast-xml-parser#readme)
* [**DOMPurify**](https://github.com/cure53/DOMPurify)
* [**Formspree**](https://formspree.io/)
* [**Tailwind CSS**](https://tailwindcss.com/)
* [**Lucide**](https://lucide.dev/)
* [**GitHub Pages**](https://pages.github.com/)


## Contact
Feel free to reach out to me for any reason whatsoever :-)!
* **Email**: melekredwan@icloud.com
* **LinkedIn**: https://www.linkedin.com/in/melek-redwan/
* **Quizient-Specific Bugs/Issues:** [GitHub Issues](https://github.com/mamlaki/quizient/issues)

## License
This project is licensed under the MIT License – see [`LICENSE`](LICENSE) for details.
### Third-Party Licenses
All third-party libraries are distributed under their respective licenses.

The full list of third-party libraries distributed and the full text of each of their licsenses are provided in [`third-party-licences.md`](third-party-licenses.md).
<br>
<br>
<br>
Moodle® is a registered trademark of Moodle Pty Ltd. 

Quizient is not affiliated with or endorsed by Moodle Pty Ltd.
# SignAgy PDF

A modern, fast, and secure browser-based application to upload PDF documents, draw custom mouse/touch signatures, place them across any page, and instantly download the signed PDF.

![SignAgy PDF App](https://img.shields.org/badge/Status-Active-brightgreen)
![License](https://img.shields.org/badge/License-MIT-blue)

---

## 🌟 Key Features

- 📄 **PDF Upload & Visual Preview**: Load multi-page PDF documents locally with real-time browser rendering.
- ✍️ **Interactive Drawing Pad**: Smooth mouse/touch signature canvas with selectable ink colors (Black, Blue, Red).
- 📑 **Multi-Page Signature Support**: Navigate between pages and place signatures on specific pages.
- 🎯 **Drag-and-Drop Repositioning**: Intuitively drag signatures to align them perfectly on the document.
- 🗑️ **Individual Signature Removal**: Easily delete any placed signature overlay before exporting.
- 💾 **Client-Side Processing & Download**: Signatures are merged into the PDF entirely in your browser using `pdf-lib` without sending files to external servers.

---

## 🚀 Live Access & Local Running

### Local Development
To launch and use the application locally:

```bash
# Clone the repository
git clone git@github.com:JacobCarynx/SignAgyPDF.git
cd SignAgyPDF

# Install dependencies
npm install

# Run the development server
npm run dev
```

Once running, access the application locally at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ Built With

- **React** (Vite framework)
- **PDF.js** (In-browser rendering)
- **pdf-lib** (Client-side PDF modification)
- **Lucide React** (Modern UI Icons)
- **Canvas Confetti** (Completion celebrations)

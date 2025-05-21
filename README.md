# Stock

A simple media management API for uploading, processing, and organizing photos and videos in user-specific galleries.

## Description

`Stock` is a RESTful API built with Express.js written in TypeScript. It provides endpoints for user authentication, media upload (photos & videos), automatic processing (thumbnails, transcoding), and gallery management.

## Features

* **User Authentication & Session Management**

  * Sessions stored in MySQL (`express-session`, `express-mysql-session`)
  * Secure cookies
* **Environment Configuration**

  * Load database configuration and other sensitive settings from `.env` via `dotenv`
  * Other API options are found in `config.json`
* **HTTP Security & Optimization**

  * Security headers with `helmet`
  * Response compression via `compression`
  * CORS control with `cors`
* **Media Upload & Processing**

  * File uploads with `multer`
  * MIME type detection with `mime`
  * Thumbnail generation & video transcoding via `fluent-ffmpeg`
* **Bulk Upload**

  * ZIP archive extraction with `zip-lib`
* **Dynamic HTML Views**

  * Server-side rendering with `ejs`

## Prerequisites

* Node.js v21+ and npm
* MySQL server

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Skadro/Stock.git
   cd Stock
   ```
2. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

1. Rename the `.env_template` file to `.env`.
2. Configure the variables inside the file
3. Rename the `config.json_template` file to `config.json`
4. Configure the options inside the file

## Usage

* **Start the server**:

  ```bash
  npm run start
  ```
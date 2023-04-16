BeDownloader
==========================
Bulk image downloader for Behance URLs (projects, moodboards, profiles, likes).  
Written with Electron, Puppeteer and other JS libraries.

## Features
- Parses provided URLs, finds projects, and then downloads all images from those projects.
- Downloads full-size original images if it available.
- Writes information about project into downloaded images (JPEG metadata).
- Keeps history for all downloaded projects.
- Has ability to skip downloading a project if its URL is found in history.
- Portable app, don't need installation.

## Usage
- Download portable app and run it (only for Windows users currently).  
- Or download repository, install all dependencies, then run 'npm start' (for JS developers).

## Notes
- App settings and download history stored in {UserFolder}/.bedownloader  
- Skipping projects by download history can be disabled in config.ini (true by default).

## Screenshot
![screenshot](screenshots/launched.png)

## Todo
- Support for download embeded 360-degree panoramas from kuula.co.
- Mac and Linux versions.

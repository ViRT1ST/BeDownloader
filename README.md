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

## Usage for Windows users
- Download portable app and run it.  
- Or, if you don't want to use compiled app, use the same instructions as for Mac and Linux users.

## Usage for Mac and Linux users
```
1. Download and install Node.js v18.16.0 or newer.
2. Download repository archive and unpack it.
3. Go to unpacked folder and run 'npm i' in terminal to install all JavaScript dependencies.
4. Open "app\js\config.js" in text editor and change "const isDevMode = false" from false to true.
5. Then run 'npm start' to start app.
```

## Skipping projects by download history
Can be enabled in "settings\config.ini" (false by default).

## Issues with downloading NSFW projects
Project with adult content require user authorization to access them.
So, in this case, you need login in Behance in your browser and copy auth token from Chrome DevTools.
Then you need paste it in "settings\config.ini".
Here screenshots how to do it:
[Take token from browser](screenshots/token_from_chrome.png) | [Paste token to config.ini](screenshots/token_in_config.png) 


## Screenshot
![screenshot](screenshots/launched.png)

BeDownloader
===

Bulk image downloader for Behance URLs (projects, moodboards, profiles, likes, modules).\
Written with Electron, Puppeteer and other JS libraries.

## Features

* Parses provided URLs, finds projects, and then downloads all images from those projects.
* Downloads full-size original images if it available.
* Writes information about project into downloaded images (JPEG metadata).
* Keeps history for all downloaded projects.
* Has ability to skip downloading a project if its URL is found in history.
* Portable app, don't need installation.

## Usage as portable app (for Windows users only)

* Download portable app and run it

## Usage as Node.js project (for Windows, Linux and MacOS users)

```
1. Download and install Node.js v20.9.0 or newer.
2. Download repository archive and unpack it.
3. Go to unpacked folder and run "npm install" in terminal to install all project's dependencies.
4. Run "npm run dev" in terminal to start app.
```

## User options in config.ini file (in settings folder)

> **skipProjectsByHistory**\
> If set to "true" and you download a project that already exists in history.txt file, it will be skipped.\
> Default is "false".

> **downloadModulesAsGalleries**\
> If set to "true", all individual images saved in moodboards will be downloaded as a full projects with all images.\
> Default is "false".

> **showBrowser**\
> If set to "true", version of Chrome included with the app will be visible.\
> Chrome is used in app for scraping information from projects on Behance site.\
> Default is "false". Not recommended to use "true" (can cause issues with scraping data).

> **useSystemInstalledChrome**\
> if set to "true" then your Chrome installed in Windows will be used for scraping data.\
> if you want use your Chrome with all your settings, cookies and plugins then you can try this.\
> This for Windows users only and may not work at all (if no Chrome installed or it's version is too old).\
> Browser must be closed before app run to work.\
> Default is "false". 

> **turboMode**\
> Alternate mode for navigating between pages.\
> if set to "true" it will use option "timeoutBetweenPagesInTurboMode" for timeouts.\
> This can work better for people with old hardware.\
> Default is "false".

> **timeoutBetweenPagesInTurboMode**\
> Number in milliseconds.\
> "5000" will be ok for fast connections and fast computers.\
> On slow connections or with old computers maybe need to increase to "20000" or higher.\
> Default is "10000" (10 seconds).

> **localStorageToken**\
> Required for downloading adult projects.\
> Or you can use "useSystemInstalledChrome" option and use your Chrome where you are authorized in Behance.\
> Default is "none". 



## Issues with downloading adult NSFW projects

Projects with adult content requires user authorization to access them.\
So, in this case, app requires your Behance account token to download these projects.\
Here instructions how to get it and use it with app:

* Login into your Behance account in your browser.
* Open Chrome DevTools (Ctrl+Shift+I).
* Navigate to "Local Storage" and copy token from it (as showed in
    [screenshot](screenshots/token_from_chrome.png)).
* Open "settings\\config.ini" and paste copied string into it (as showed in
    [screenshot](screenshots/token_in_config.png)).

After this you can launch app and download any projects.

## Screenshot

![screenshot](screenshots/launched.png)
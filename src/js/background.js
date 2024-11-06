let flagLoader = false;
let flagWork = false;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendProgress(message)
    sendResponse(flagLoader);
});

function sendProgress(message) {
    if (flagLoader) {
        sendUserMessage({ "message": "Progress", "content": message.percent });
    } else if (message.success === false) {
        flagLoader = false;
        if (message.content) {
            sendUserMessage({ "message": "Error", "content": chrome.i18n.getMessage("message_userBreak") });
        } else {
            sendUserMessage({ "message": "Error", "content": chrome.i18n.getMessage("message_errorLoad") });
        }
    } else {
        sendUserMessage({ "message": "Break" });
    }
}

function sendUserMessage(message) {
    self.clients.matchAll().then(function (clients) {
        clients.forEach(function (client) {
            client.postMessage(message);
        });
    });
}

self.addEventListener('message', async (event) => {
    if (event.data.message === "start_load") {
        flagLoader = !flagLoader;
        if (flagLoader) {
            await startLoadVideo(event.data.content)
        }
    }
});

async function startLoadVideo(tab_ID) {
    console.log("startLoadVideo called");
    if (flagWork) {
        return
    }
    flagWork = true;
    const key = tab_ID.toString();
    const data = await chrome.storage.local.get([key]);
    const video = data[key].dataVideo

    if (data[key].displaySettings.load_all_series) {
        const seasons = data[key].dataPlayer.seasons;
        const episodes = data[key].dataPlayer.episodes;
        const videoConfig = data[key].displaySettings;
        for (let s of seasons.slice(seasons.indexOf(videoConfig.season_start))) {
            let sliceIndex = (s === videoConfig.season_start) ? episodes[s].indexOf(videoConfig.episode_start) : 0;
            for (let e of episodes[s].slice(sliceIndex)) {
                if (!flagLoader) {
                    break
                }
                const dict = {
                    "film_id": video.film_id,
                    "translator_id": videoConfig.translator_id,
                    "season_id": s,
                    "episode_id": e,
                    "action": video.action,
                    "quality": videoConfig.quality,
                    "filename": video.filename
                }
                await initLoadVideo(tab_ID, dict)
            }
        }

    } else {
        const dict = {
            "film_id": video.film_id,
            "translator_id": video.translator_id,
            "season_id": video.season_id,
            "episode_id": video.episode_id,
            "action": video.action,
            "quality": data[key].displaySettings.quality,
            "filename": video.filename
        }
        await initLoadVideo(tab_ID, dict)
    }
    flagLoader = false;
    flagWork = false;
    sendProgress("")
}

async function initLoadVideo(tab_ID, settingsVideo) {
    const targetTab = { tabId: tab_ID, allFrames: false };

    let videoInfo = await chrome.scripting.executeScript({
        target: targetTab,
        func: injectLoader,
        args: [settingsVideo],
    })
    url = videoInfo[0].result
    if (!url) {
        sendUserMessage({ "message": "Error", "content": chrome.i18n.getMessage("message_noDataVideo") })
        flagLoader = false;
        return false
    }

    if (!videoInfo[0].result.response.subtitle) {
        sendUserMessage({ "message": "Error", "content": chrome.i18n.getMessage("message_noSubtitles") })
        flagLoader = false;
        return false
    }
  
    openVideoPage(videoInfo)

    return true
}

function openVideoPage(videoInfo) {
    videoPageUrl = chrome.runtime.getURL("src/html/page/index.html")
    chrome.tabs.create({
        url: videoPageUrl,
        active: false
    }, (tab) => {
        setTimeout(()=>{
            // отправить список URL в новую вкладку
            chrome.tabs.sendMessage(tab.id, videoInfo, (resp) => {
                // сделать вкладку активной
                chrome.tabs.update(tab.id, {active: true});
            })
          },1500)
    });
}

function injectLoader(videoSettings) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/js/injection_scripts/loader.js');
        script.dataset.args = JSON.stringify(videoSettings);
        document.documentElement.appendChild(script);

        const intervalId = setInterval(() => {
            if (script.dataset.result !== undefined) {
                clearInterval(intervalId);
                const result = JSON.parse(script.dataset.result);
                document.documentElement.removeChild(script);
                resolve(result);
            }
        }, 30);
    });
}

